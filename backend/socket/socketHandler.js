import User from "../models/User.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Canvas from "../models/Canvas.js";
import jwt from "jsonwebtoken";

export const initializeSocket = (io) => {
  // Store active users
  const activeUsers = new Map();

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const { token, sessionId } = socket.handshake.auth;

      if (!token) {
        if (sessionId) {
          socket.isAnonymous = true;
          socket.tempSessionId = sessionId;
          return next();
        }
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      socket.isAnonymous = false;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on("connection", async (socket) => {
    if (socket.isAnonymous) {
      console.log(`🔗 Anonymous QR session connected: ${socket.tempSessionId}`);
      socket.join(socket.tempSessionId);
      return;
    }

    console.log(`✅ User connected: ${socket.userId}`);

    try {
      // Update user status to online
      await User.findByIdAndUpdate(socket.userId, {
        status: 'online',
        socketId: socket.id,
        lastSeen: Date.now(),
      });

      // Add to active users
      activeUsers.set(socket.userId, socket.id);

      // Notify all contacts that user is online
      const user = socket.user; // populated in middleware
      const shouldShowLastSeen = user.settings?.lastSeenVisibility !== 'nobody';

      socket.broadcast.emit('user-status-changed', {
        userId: socket.userId,
        status: 'online',
        lastSeen: shouldShowLastSeen ? Date.now() : null,
      });

      // User setup - join their personal room
      socket.join(socket.userId);

      // Join all conversation rooms
      const conversations = await Conversation.find({
        participants: socket.userId,
      });

      conversations.forEach(conv => {
        socket.join(conv._id.toString());
        console.log(`👤 User ${socket.userId} auto-joined room: ${conv._id}`);
      });

      // Mark all pending messages as delivered for this user across all their chats
      const pendingMessages = await Message.find({
        conversationId: { $in: conversations.map(c => c._id) },
        sender: { $ne: socket.userId },
        status: 'sent'
      });

      for (const msg of pendingMessages) {
        await msg.markAsDelivered(socket.userId);
        // Notify the sender
        io.to(msg.sender.toString()).emit('message-status-updated', {
          messageId: msg._id,
          status: 'delivered',
          userId: socket.userId
        });
      }

      // Handle joining a specific conversation
      socket.on("join-conversation", async (conversationId) => {
        socket.join(conversationId);
        console.log(`👤 User ${socket.userId} joined conversation: ${conversationId}`);

        // Mark all messages as delivered
        const messages = await Message.find({
          conversationId,
          sender: { $ne: socket.userId },
          status: 'sent',
        });

        for (const message of messages) {
          await message.markAsDelivered(socket.userId);

          // Notify sender about delivery
          io.to(message.sender.toString()).emit('message-status-updated', {
            messageId: message._id,
            status: 'delivered',
            userId: socket.userId,
          });
        }
      });

      // Handle leaving a conversation
      socket.on("leave-conversation", (conversationId) => {
        socket.leave(conversationId);
        console.log(`👋 User ${socket.userId} left conversation: ${conversationId}`);
      });

      // Handle typing indicator
      socket.on("typing", ({ conversationId }) => {
        socket.to(conversationId).emit("user-typing", {
          userId: socket.userId,
          conversationId,
          userName: socket.user.name,
        });
      });

      // Handle stop typing indicator
      socket.on("stop-typing", ({ conversationId }) => {
        socket.to(conversationId).emit("user-stopped-typing", {
          userId: socket.userId,
          conversationId,
        });
      });

      // Handle message reactions
      socket.on("add-reaction", async ({ messageId, emoji }) => {
        try {
          const message = await Message.findById(messageId);
          if (message) {
            await message.addReaction(socket.userId, emoji);

            // Notify all conversation participants
            io.to(message.conversationId.toString()).emit("reaction-added", {
              messageId,
              userId: socket.userId,
              emoji,
            });
          }
        } catch (error) {
          console.error("Error adding reaction:", error);
        }
      });

      // Handle removing reactions
      socket.on("remove-reaction", async ({ messageId }) => {
        try {
          const message = await Message.findById(messageId);
          if (message) {
            await message.removeReaction(socket.userId);

            io.to(message.conversationId.toString()).emit("reaction-removed", {
              messageId,
              userId: socket.userId,
            });
          }
        } catch (error) {
          console.error("Error removing reaction:", error);
        }
      });

      // Handle voice/video call signals
      socket.on("call-user", ({ to, offer, callType }) => {
        io.to(to).emit("incoming-call", {
          from: socket.userId,
          fromUser: {
            _id: socket.userId,
            name: socket.user.name,
            avatar: socket.user.avatar,
          },
          offer,
          callType, // 'voice' or 'video'
        });

        // Auto-cancel call after 45 seconds if not answered
        const callTimeout = setTimeout(() => {
          // Remove the once listeners before emitting to avoid stale handlers
          socket.off("answer-call", clearCallTimeout);
          socket.off("reject-call", clearCallTimeout);
          socket.off("end-call", clearCallTimeout);
          socket.off("disconnect", clearCallTimeout);
          socket.emit("call-timeout", { to });
          io.to(to).emit("call-cancelled", { from: socket.userId });
        }, 45000);

        // Clear timeout if call is answered, rejected, or ended
        const clearCallTimeout = () => {
          clearTimeout(callTimeout);
          socket.off("answer-call", clearCallTimeout);
          socket.off("reject-call", clearCallTimeout);
          socket.off("end-call", clearCallTimeout);
          socket.off("disconnect", clearCallTimeout);
        };
        socket.once("answer-call", clearCallTimeout);
        socket.once("reject-call", clearCallTimeout);
        socket.once("end-call", clearCallTimeout);
        socket.once("disconnect", clearCallTimeout);
      });

      socket.on("answer-call", ({ to, answer }) => {
        io.to(to).emit("call-answered", {
          from: socket.userId,
          answer,
        });
      });

      socket.on("reject-call", ({ to }) => {
        io.to(to).emit("call-rejected", {
          from: socket.userId,
        });
      });

      socket.on("end-call", ({ to }) => {
        io.to(to).emit("call-ended", {
          from: socket.userId,
        });
      });

      socket.on("ice-candidate", ({ to, candidate }) => {
        io.to(to).emit("ice-candidate", {
          from: socket.userId,
          candidate,
        });
      });

      // Handle message editing
      socket.on("edit-message", async ({ messageId, newContent }) => {
        try {
          const message = await Message.findOne({
            _id: messageId,
            sender: socket.userId,
          });

          if (message) {
            message.content = newContent;
            message.edited = true;
            message.editedAt = Date.now();
            await message.save();

            io.to(message.conversationId.toString()).emit("message-edited", {
              messageId,
              newContent,
              editedAt: message.editedAt,
            });
          }
        } catch (error) {
          console.error("Error editing message:", error);
        }
      });

      // Handle message starring
      socket.on("star-message", async ({ messageId }) => {
        try {
          const message = await Message.findById(messageId);
          if (message && !message.starred.includes(socket.userId)) {
            message.starred.push(socket.userId);
            await message.save();

            socket.emit("message-starred", { messageId });
          }
        } catch (error) {
          console.error("Error starring message:", error);
        }
      });

      socket.on("unstar-message", async ({ messageId }) => {
        try {
          const message = await Message.findById(messageId);
          if (message) {
            message.starred = message.starred.filter(
              id => id.toString() !== socket.userId
            );
            await message.save();

            socket.emit("message-unstarred", { messageId });
          }
        } catch (error) {
          console.error("Error unstarring message:", error);
        }
      });

      // Handle message read receipts
      socket.on("mark-messages-read", async ({ conversationId }) => {
        try {
          const messages = await Message.find({
            conversationId,
            sender: { $ne: socket.userId },
          });

          const user = await User.findById(socket.userId);
          for (const message of messages) {
            if (!message.readBy.some(r => r.userId.toString() === socket.userId)) {
              await message.markAsRead(socket.userId);

              // Notify sender ONLY if current user has read receipts enabled
              if (user.settings?.readReceipts !== false) {
                io.to(message.sender.toString()).emit("message-read", {
                  messageId: message._id,
                  readBy: socket.userId,
                  readAt: Date.now(),
                });
              }
            }
          }

          // Reset unread count
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            await conversation.resetUnread(socket.userId);
            // Notify all devices of the current user
            io.to(socket.userId).emit("unread-count-reset", { conversationId });
          }
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      });

      // Handle recording status (for voice messages)
      socket.on("recording-voice", ({ conversationId }) => {
        socket.to(conversationId).emit("user-recording-voice", {
          userId: socket.userId,
          conversationId,
        });
      });

      socket.on("stopped-recording-voice", ({ conversationId }) => {
        socket.to(conversationId).emit("user-stopped-recording-voice", {
          userId: socket.userId,
          conversationId,
        });
      });

      // ─── Clipboard Sync ────────────────────────────────────────────
      // Client emits this to instantly broadcast a clipboard item to all
      // of the same user's OTHER connected sessions without a round-trip
      // through the REST API. The REST route still handles persistence.
      socket.on("clipboard:push", (payload) => {
        // Emit to the user's personal room EXCEPT the sender socket
        socket.to(socket.userId).emit("clipboard:new-item", {
          ...payload,
          fromSocket: true, // flag: already persisted by the REST call
        });
        console.log(`📋 Clipboard push from user ${socket.userId}: type=${payload.type}`);
      });

      // ─── Drawing Canvas ─────────────────────────────────────────────
      socket.on("draw", async (data) => {
        const { conversationId, ...drawData } = data;
        
        // Broadcast to everyone in the conversation room except the sender
        socket.to(conversationId).emit("draw", {
          ...drawData,
          userId: socket.userId
        });

        // Persist stroke segment to DB
        try {
          await Canvas.updateOne(
            { conversationId },
            { 
              $push: { 
                strokes: { 
                  ...drawData, 
                  userId: socket.userId 
                } 
              },
              $set: { lastUpdated: new Date() }
            },
            { upsert: true }
          );
        } catch (err) {
          console.error("Error saving stroke:", err);
        }
      });

      socket.on("mouse-move", (data) => {
        const { conversationId, x, y } = data;
        socket.to(conversationId).emit("mouse-move", {
          userId: socket.userId,
          userName: socket.user.name,
          x,
          y
        });
      });

      socket.on("get-canvas-state", async ({ conversationId }) => {
        try {
          const canvas = await Canvas.findOne({ conversationId });
          socket.emit("canvas-state", canvas ? canvas.strokes : []);
        } catch (err) {
          console.error("Error fetching canvas state:", err);
          socket.emit("canvas-state", []);
        }
      });

      socket.on("clear-canvas", async ({ conversationId }) => {
        try {
          await Canvas.deleteOne({ conversationId });
          socket.to(conversationId).emit("clear-canvas");
        } catch (err) {
          console.error("Error clearing canvas:", err);
        }
      });

      // Handle disconnect
      socket.on("disconnect", async () => {
        if (socket.isAnonymous) {
          console.log(`❌ QR session disconnected: ${socket.tempSessionId}`);
          return;
        }

        console.log(`❌ User disconnected: ${socket.userId}`);

        // Remove from active users
        activeUsers.delete(socket.userId);

        // Update user status to offline
        await User.findByIdAndUpdate(socket.userId, {
          status: 'offline',
          lastSeen: Date.now(),
          socketId: '',
        });

        // Broadcast offline status
        const currentUser = await User.findById(socket.userId);
        const shouldShowLS = currentUser?.settings?.lastSeenVisibility !== 'nobody';

        socket.broadcast.emit('user-status-changed', {
          userId: socket.userId,
          status: 'offline',
          lastSeen: shouldShowLS ? Date.now() : null,
        });
      });

    } catch (error) {
      console.error("Socket connection error:", error);
    }
  });

  return io;
};