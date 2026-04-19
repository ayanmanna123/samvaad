import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Smile, Phone, Video, MoreVertical, Search, X, Plus,
  Trash2, LogOut, Settings, Image as ImageIcon, Users,
  ChevronDown, ChevronLeft, File as FileIcon, MessageSquare, Check, Clipboard, Lock,
  Mic, StopCircle, Play, Pause, Reply, PhoneCall, Archive, CircleDot, Megaphone, Rss, Clock, Eye, EyeOff
} from "lucide-react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import socketService from "../services/socket";
import NewChatModal from "../components/NewChatModal";
import ContactSyncGateway from "../components/ContactSyncGateway";
import MessageItem from "../components/Chat/MessageItem";
import EmojiPicker from "../components/Chat/EmojiPicker";
import PollModal from "../components/Chat/PollModal";
import ScheduleModal from "../components/Chat/ScheduleModal";
import CodeModal from "../components/Chat/CodeModal";
import GroupInfoModal from "../components/GroupInfoModal";
import EphemeralModal from "../components/Chat/EphemeralModal";
import LoadingScreen from "../components/LoadingScreen";
import TypingIndicator from "../components/Chat/TypingIndicator";
import CallInterface from "../components/Chat/CallInterface";
import ClipboardSync from "../components/Chat/ClipboardSync";
import WallpaperModal from "../components/Chat/WallpaperModal";
import TimeCapsuleModal from "../components/Chat/TimeCapsuleModal";
import SettingsPanel from "../components/SettingsPanel";
import ConvertTaskModal from "../components/Chat/ConvertTaskModal";
import TaskPanel from "../components/Chat/TaskPanel";
import StatusPanel from "../components/Chat/StatusPanel";
import ProfileSidebarPanel from "../components/Chat/ProfileSidebarPanel";
import SettingsSidebarPanel from "../components/Chat/SettingsSidebarPanel";
import Avatar from "../components/Chat/Avatar";
import VibeBackgrounds from "../components/Vibes/VibeBackgrounds";
import MagicEffectManager from "../components/Magic/MagicEffectManager";
import { useVibe } from "../context/VibeContext";
import { getUsers } from "../services/chatAPI";
import { ListTodo, Sparkles, Wind } from "lucide-react";
import MobileChatApp from "./MobileChatApp";
import DrawingCanvas from "../components/Chat/DrawingCanvas";

/* ───────────────────────── helpers ───────────────────────── */
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
const fmtDate = (d) => {
  if (!d) return "";
  const now = new Date(); const date = new Date(d);
  const diff = Math.floor((now - date) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtLastSeen = (ls) => {
  if (!ls) return "Last seen: unknown";
  const date = new Date(ls);
  const now = new Date();
  const diff = Math.floor((now - date) / 86400000);
  let datePart;
  if (diff === 0) datePart = "today";
  else if (diff === 1) datePart = "yesterday";
  else if (diff < 7) datePart = date.toLocaleDateString("en-US", { weekday: "long" });
  else datePart = date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `Last seen ${datePart} at ${timePart}`;
};



/* ─── BG options ─── */
const BG_OPTIONS = [
  { id: "default", label: "Default", cls: "chatbg-default" },
  { id: "gradient", label: "Gradient", cls: "chatbg-gradient" },
  { id: "midnight", label: "Midnight", cls: "chatbg-midnight" },
  { id: "ocean", label: "Ocean", cls: "chatbg-ocean" },
  { id: "forest", label: "Forest", cls: "chatbg-forest" },
  { id: "doodle", label: "Pattern", cls: "chatbg-doodle" },
];

/* ═══════════════════════════ MAIN COMPONENT ═══════════════════════════ */
const Chat = ({ token }) => {
  const {
    conversations, selectedConversation, setSelectedConversation,
    messages, loading, typingUsers, recordingVoice,
    sendMessage, sendMediaMessage, createNewConversation,
    handleTyping, handleStopTyping,
    getConversationName, getConversationAvatar, isUserOnline, getLastSeen,
    addReaction, notification, setNotification,
    userId, conversationWallpapers, setConversationWallpaper,
    incomingCall, activeCall, setActiveCall, createGroupConversation, groupInvite, setGroupInvite, respondGroupInvite,
    clearChat, deleteMessage, editMessage, forwardMessage, syncContacts,
    addTask, fetchTasks, toggleTaskStatus, removeTask,
    togglePin, toggleArchive, searchMessages, getConversationMedia,
    statuses
  } = useChat();

  const { user, logout, updateProfile, updateSettings, uploadAvatar, updateAppLock } = useAuth();
  const { activeVibe, setActiveVibe, vibes } = useVibe();

  /* ─── Local state ─── */
  const [newMessage, setNewMessage] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showTimeCapsuleModal, setShowTimeCapsuleModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showEphemeralModal, setShowEphemeralModal] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showConvertTaskModal, setShowConvertTaskModal] = useState(false);
  const [convertingMessage, setConvertingMessage] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
  const [chatBg, setChatBg] = useState(() => localStorage.getItem("samvaad-chatbg") || "default");
  const [, setTick] = useState(0);
  const [showClipboard, setShowClipboard] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [forwardMessageData, setForwardMessageData] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [mediaTab, setMediaTab] = useState("media"); // "media", "files", "links"
  const [conversationMedia, setConversationMedia] = useState([]);
  const [globalSearchMessages, setGlobalSearchMessages] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [activeRailTab, setActiveRailTab] = useState("chats"); // chats, calls, status, channels, groups, gallery
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const [canvasMinHeight, setCanvasMinHeight] = useState(0);

  const categories = ["All Chats", "Groups", "Contacts"];

  // Compute stats
  const unreadChatsCount = useMemo(() =>
    conversations.reduce((acc, c) => {
      const isArchived = c.archivedBy?.some(id => (id._id || id) === userId);
      // Count for the main badge if not archived
      return !isArchived ? acc + (c.unreadCount?.[userId] || 0) : acc;
    }, 0)
    , [conversations, userId]);

  const archivedCount = useMemo(() =>
    conversations.filter(c => c.archivedBy?.includes(userId)).length
    , [conversations, userId]);

  const unreadCallsCount = useMemo(() => {
    // For now, show badge if there's a pending incoming call
    return (incomingCall && !activeCall) ? 1 : 0;
  }, [incomingCall, activeCall]);

  const hasNewStatuses = useMemo(() => {
    return statuses.some(group =>
      group.user._id !== userId &&
      group.items.some(item => !item.seenBy?.some(s => (s.user._id || s.user) === userId))
    );
  }, [statuses, userId]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageContainerRef = useRef(null);
  const moreMenuRef = useRef(null);
  const sidebarMenuRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Ensure mobile sidebar is open if no chat selected on mobile
  useEffect(() => {
    if (!selectedConversation && window.innerWidth <= 768) {
      setMobileShowSidebar(true);
    }
  }, [selectedConversation]);

  // Force relative-time re-render every minute
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false);
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(e.target)) setShowSidebarMenu(false);
      // Close mobile more menu on outside click
      if (showMobileMoreMenu && !e.target.closest('.sv-mobile-more-menu') && !e.target.closest('.sv-bottom-nav-item-more')) {
        setShowMobileMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMobileMoreMenu]);

  // Task conversion listener
  useEffect(() => {
    const handler = (e) => {
      setConvertingMessage(e.detail.message);
      setShowConvertTaskModal(true);
    };
    window.addEventListener('open-task-modal', handler);
    return () => window.removeEventListener('open-task-modal', handler);
  }, []);

  // Background change listener (from Settings)
  useEffect(() => {
    const handler = (e) => setChatBg(e.detail);
    window.addEventListener('chat-bg-changed', handler);
    return () => window.removeEventListener('chat-bg-changed', handler);
  }, []);

  // Fetch media when profile is opened
  useEffect(() => {
    if (showProfile && selectedConversation) {
      const fetchMedia = async () => {
        const typeMap = { media: 'media', files: 'file', links: 'link' };
        const res = await getConversationMedia(selectedConversation._id, typeMap[mediaTab]);
        if (res.success) setConversationMedia(res.data);
      };
      fetchMedia();
    }
  }, [showProfile, selectedConversation, mediaTab, getConversationMedia]);

  /* ─── Derived ─── */

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => {
        const matchesSearch = getConversationName(c).toLowerCase().includes(searchQuery.toLowerCase());
        const isArchived = c.archivedBy?.some(id => id === userId || id._id === userId);
        if (showArchivedOnly) return matchesSearch && isArchived;
        return matchesSearch && !isArchived;
      });
  }, [conversations, searchQuery, getConversationName, showArchivedOnly, userId]);

  const searchedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return [];
    return messages.filter(m => m.content?.toLowerCase().includes(inChatSearchQuery.toLowerCase()));
  }, [messages, inChatSearchQuery]);

  // Global search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearchingGlobal(true);
        const res = await searchMessages(searchQuery);
        if (res.success) setGlobalSearchMessages(res.data);
        setIsSearchingGlobal(false);
      } else {
        setGlobalSearchMessages([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchMessages]);

  const isTyping = selectedConversation && typingUsers[selectedConversation._id];
  const currentBgCls = BG_OPTIONS.find(b => b.id === chatBg)?.cls || "chatbg-default";

  /* ─── Handlers ─── */
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() && !uploadPreview) return;

    const extraData = { isViewOnce };

    if (uploadPreview) {
      const type = uploadPreview.type.startsWith("image/") ? "image"
        : uploadPreview.type.startsWith("video/") ? "video"
          : uploadPreview.type.startsWith("audio/") ? "voice" : "file";
      await sendMediaMessage(uploadPreview.file, type, extraData);
      setUploadPreview(null);
    } else {
      await sendMessage(newMessage, "text", replyToMessage?.id, extraData);

      const keywords = ["congratulations", "congrats", "happy birthday", "wow", "amazing", "bravo"];
      if (keywords.some(k => newMessage.toLowerCase().includes(k))) {
        window.dispatchEvent(new CustomEvent('magic-burst', { detail: { type: 'celebration' } }));
      }
    }
    setNewMessage("");
    setReplyToMessage(null);
    setIsViewOnce(false);
    handleStopTyping();
  };

  const handleSaveDrawing = async (dataURL) => {
    // Convert dataURL to file
    const res = await fetch(dataURL);
    const blob = await res.blob();
    const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
    
    await sendMediaMessage(file, "image", { isDrawing: true });
    setShowDrawingCanvas(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview({ file, preview: ev.target.result, type: file.type, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleNewChat = async (user) => {
    const result = await createNewConversation(user);
    if (result.success) setShowNewChatModal(false);
    return result;
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(p => p + emoji);
    setShowEmojiPicker(false);
  };

  const handleBgChange = (bgId) => {
    setChatBg(bgId);
    localStorage.setItem("samvaad-chatbg", bgId);
    setShowBgPicker(false);
    setShowMoreMenu(false);
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 120);
  };

  const handleCreatePoll = async (pollData) => {
    await sendMessage(pollData.question, "poll", null, {
      pollQuestion: pollData.question, pollOptions: pollData.options, allowMultipleAnswers: pollData.allowMultiple
    });
  };

  const handleScheduleMessage = async (date) => {
    if (!newMessage.trim()) return;
    await sendMessage(newMessage, "text", null, { scheduledAt: date });
    setNewMessage("");
  };

  const handleSendCode = async (codeData) => {
    await sendMessage(codeData.code, "code", null, { codeLanguage: codeData.language });
  };

  const handleTimeCapsule = async (unlockDate, unlockConditions) => {
    if (!newMessage.trim() && !uploadPreview) return;

    const extraData = {
      unlockAt: unlockDate,
      unlockConditions: unlockConditions ? JSON.stringify(unlockConditions) : null
    };

    if (uploadPreview) {
      const type = uploadPreview.type.startsWith("image/") ? "image"
        : uploadPreview.type.startsWith("video/") ? "video"
          : uploadPreview.type.startsWith("audio/") ? "voice" : "file";
      await sendMediaMessage(uploadPreview.file, type, extraData);
      setUploadPreview(null);
    } else {
      await sendMessage(newMessage, "text", null, extraData);
      setNewMessage("");
    }

    // Creative confirmation message
    const creativeMessages = [
      "✨ A digital treasure has been sealed in the sands of time... ⏳",
      "🚀 Mission launched: This message is now traveling to the future! 🌟",
      "💎 A piece of today has been locked away for a special tomorrow... ✨",
      "🔒 Sealed with a spell! This memory will only awaken when the time is right. 🕯️",
      "🌈 Paradox avoided! Your time capsule is safely tucked in the temporal void. 🎁"
    ];
    const randomMsg = creativeMessages[Math.floor(Math.random() * creativeMessages.length)];
    setTimeout(() => {
      sendMessage(randomMsg, "text");
    }, 800);
  };

  const handleConvertTask = async (taskData) => {
    const res = await addTask(taskData);
    if (res.success) {
      setNotification({ content: "Task created successfully!", sender: { name: "System" } });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });

        // Duration in seconds
        const duration = Math.floor(recordingDuration);

        await sendMediaMessage(audioFile, "voice", { duration });

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Notify others via socket
      socketService.emit("user-recording-voice", {
        conversationId: selectedConversation._id,
        userId: userId
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone");
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSend) {
        // Clear chunks if we want to cancel
        audioChunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);

      socketService.emit("user-stopped-recording-voice", {
        conversationId: selectedConversation._id
      });
    }
  };

  const fmtDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    setShowSidebarMenu(false);
    logout();
  };

  /* ─── Message date separators ─── */
  const messagesWithDates = useMemo(() => {
    const result = [];
    let lastDate = null;
    messages.forEach((msg) => {
      const d = fmtDate(msg.timestamp);
      if (d !== lastDate) { result.push({ type: "date", label: d, id: `date-${d}` }); lastDate = d; }
      result.push({ type: "message", ...msg });
    });
    return result;
  }, [messages]);

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <ContactSyncGateway>

      <div className="md:hidden h-full">
        <MobileChatApp
          conversations={filteredConversations}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
          messages={messagesWithDates}
          loading={loading}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSend={handleSend}
          handleInputChange={handleInputChange}
          handleFileSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          recordingDuration={recordingDuration}
          fmtDuration={fmtDuration}
          replyToMessage={replyToMessage}
          setReplyToMessage={setReplyToMessage}
          uploadPreview={uploadPreview}
          setUploadPreview={setUploadPreview}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          handleEmojiSelect={handleEmojiSelect}
          getConversationName={getConversationName}
          getConversationAvatar={getConversationAvatar}
          isUserOnline={isUserOnline}
          getLastSeen={getLastSeen}
          typingUsers={typingUsers}
          userId={userId}
          user={user}
          setActiveCall={setActiveCall}
          addReaction={addReaction}
          setForwardMessageData={setForwardMessageData}
          setShowForwardModal={setShowForwardModal}
          showNewChatModal={showNewChatModal}
          setShowNewChatModal={setShowNewChatModal}
          handleNewChat={handleNewChat}
          token={token}
          logout={logout}
          clearChat={clearChat}
          syncContacts={syncContacts}
          deleteMessage={deleteMessage}
          editMessage={editMessage}
          forwardMessage={forwardMessage}
          statuses={statuses}
          incomingCall={incomingCall}
          activeCall={activeCall}
          fmtLastSeen={fmtLastSeen}
          updateProfile={updateProfile}
          updateSettings={updateSettings}
          uploadAvatar={uploadAvatar}
          updateAppLock={updateAppLock}
        />
      </div>
      <div className={`hidden md:flex h-screen overflow-hidden ${isFocusMode ? 'focus-mode' : ''}`} style={{ background: 'hsl(var(--sv-bg))' }}>
        <VibeBackgrounds />
        <MagicEffectManager />

        {/* ── In-app notification toast ── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              className="sv-toast cursor-pointer"
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24 }}
              onClick={() => {
                const c = conversations.find(c => c._id === notification.conversationId);
                if (c) { setSelectedConversation(c); setMobileShowSidebar(false); }
                setNotification(null);
              }}>
              <Avatar src={notification.sender?.avatar} name={notification.sender?.name} size={9} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'hsl(var(--sv-text))' }}>{notification.sender?.name}</p>
                <p className="text-xs truncate" style={{ color: 'hsl(var(--sv-text-2))' }}>{notification.content}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); setNotification(null); }} className="sv-icon-btn p-1.5 rounded-lg">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Group invite toast ── */}
        <AnimatePresence>
          {groupInvite && (
            <motion.div
              className="sv-toast"
              style={{ top: notification ? '90px' : '16px', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', maxWidth: '360px', padding: '14px 16px' }}
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24 }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                  style={{ background: 'hsl(var(--sv-accent)/0.15)', color: 'hsl(var(--sv-accent))' }}>
                  {groupInvite.groupAvatar
                    ? <img src={groupInvite.groupAvatar} className="w-full h-full object-cover rounded-xl" alt="" />
                    : groupInvite.groupName?.[0]?.toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'hsl(var(--sv-text))' }}>Group Invite</p>
                  <p className="text-xs truncate" style={{ color: 'hsl(var(--sv-text-2))' }}>
                    <span style={{ color: 'hsl(var(--sv-accent))' }}>{groupInvite.invitedBy?.name}</span> invited you to <strong>{groupInvite.groupName}</strong>
                  </p>
                </div>
                <button onClick={() => setGroupInvite(null)} className="sv-icon-btn p-1 rounded-lg flex-shrink-0"><X size={13} /></button>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={async () => { await respondGroupInvite(groupInvite.conversationId, false); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold border"
                  style={{ borderColor: 'hsl(var(--sv-border))', color: 'hsl(var(--sv-text-2))' }}>
                  Decline
                </button>
                <button
                  onClick={async () => {
                    const res = await respondGroupInvite(groupInvite.conversationId, true);
                    if (res?.success && res?.data) {
                      setSelectedConversation(res.data);
                      setMobileShowSidebar(false);
                    }
                  }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'hsl(var(--sv-accent))', color: 'white' }}>
                  Join Group
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile backdrop */}
        {/* <AnimatePresence>
          {mobileShowSidebar && (
            <motion.div
              className="fixed inset-0 bg-black/60 z-[19] md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileShowSidebar(false)}
            />
          )}
        </AnimatePresence> */}

        {/* ── Nav Rail (Slim Sidebar - Desktop Only) ── */}
        <aside className="sv-nav-rail hidden md:flex">
          <div className="flex flex-col items-center gap-4 w-full pt-4">
            {/* Chats */}
            <div className="relative group">
              <button
                onClick={() => { setActiveRailTab("chats"); setShowArchivedOnly(false); }}
                className={`sv-nav-item ${activeRailTab === 'chats' && !showArchivedOnly ? 'active' : ''}`}
                title="Chats"
              >
                <MessageSquare size={22} />
              </button>
              {unreadChatsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#34D399] text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#1a1a1b]">
                  {unreadChatsCount > 9 ? '9+' : unreadChatsCount}
                </span>
              )}
            </div>

            {/* Calls */}
            <div className="relative group">
              <button
                onClick={() => setActiveRailTab("calls")}
                className={`sv-nav-item ${activeRailTab === 'calls' ? 'active' : ''}`}
                title="Calls"
              >
                <PhoneCall size={22} />
              </button>
              {unreadCallsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F87171] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#1a1a1b]">
                  {unreadCallsCount}
                </span>
              )}
            </div>

            {/* Status */}
            <div className="relative group">
              <button
                onClick={() => setActiveRailTab("status")}
                className={`sv-nav-item ${activeRailTab === 'status' ? 'active' : ''}`}
                title="Status"
              >
                <CircleDot size={22} />
              </button>
              {hasNewStatuses && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#34D399] rounded-full border-2 border-[#1a1a1b]" />
              )}
            </div>

            {/* Channels */}
            <button
              onClick={() => setActiveRailTab("channels")}
              className={`sv-nav-item ${activeRailTab === 'channels' ? 'active' : ''}`}
              title="Channels"
            >
              <Megaphone size={22} />
            </button>

            {/* Groups */}
            <button
              onClick={() => setActiveRailTab("groups")}
              className={`sv-nav-item ${activeRailTab === 'groups' ? 'active' : ''}`}
              title="Groups"
            >
              <Users size={22} />
            </button>

            <div className="w-8 h-[1px] bg-white/10 my-2" />

            {/* Archived */}
            <div className="relative group">
              <button
                onClick={() => { setActiveRailTab("chats"); setShowArchivedOnly(true); }}
                className={`sv-nav-item ${showArchivedOnly ? 'active' : ''}`}
                title="Archived"
              >
                <Archive size={22} />
              </button>
              {archivedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#10B981] text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#1a1a1b]">
                  {archivedCount}
                </span>
              )}
            </div>

            {/* AI / Magic */}
            <button
              onClick={() => {
                const currentIndex = vibes.findIndex(v => v.id === activeVibe);
                const nextIndex = (currentIndex + 1) % vibes.length;
                setActiveVibe(vibes[nextIndex].id);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden group mt-2"
              title="Magic Vibes"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00A3FF] via-[#BC00FF] to-[#FF00D6] animate-spin-slow opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-[2px] bg-[#1a1a1b] rounded-full flex items-center justify-center">
                <Sparkles size={18} className="text-white group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </div>

          <div className="mt-auto flex flex-col items-center gap-4 pb-6 w-full">
            {/* Gallery */}
            <button
              onClick={() => setActiveRailTab("gallery")}
              className={`sv-nav-item ${activeRailTab === 'gallery' ? 'active' : ''}`}
              title="Media"
            >
              <ImageIcon size={22} />
            </button>

            <div className="w-8 h-[1px] bg-white/10 my-2" />

            {/* Settings */}
            <button
              onClick={() => setActiveRailTab("settings")}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group ${activeRailTab === 'settings' ? 'bg-sv-accent text-white shadow-lg shadow-sv-accent/20' : 'bg-white/5 hover:bg-white/10'}`}
              title="Settings"
            >
              <Settings size={22} className={activeRailTab === 'settings' ? 'rotate-90' : 'group-hover:rotate-90 transition-transform duration-500'} />
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => setActiveRailTab("profile")}
              className={`w-10 h-10 rounded-full overflow-hidden hover:scale-110 transition-transform ring-2 ${activeRailTab === 'profile' ? 'ring-sv-accent' : 'ring-transparent hover:ring-white/20'}`}
              title="Profile"
            >
              <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} className="w-full h-full object-cover" />
            </button>
          </div>
        </aside>

        {/* ── SidebarPanel (Conversations) ── */}
        <aside
          className={`sv-sidebar-v2 z-30 transition-all duration-300 ease-in-out
          fixed md:relative inset-y-0 left-0 md:left-0 h-full md:h-auto
          w-full md:w-[320px] pb-[72px] md:pb-0
          ${mobileShowSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-6 py-6 flex-shrink-0 md:bg-transparent bg-white">
            <div className="md:hidden">
              <p className="text-sm text-gray-400 font-medium">Hello,</p>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">
                {user?.name?.split(' ')[0] || "Johan"}
              </h2>
            </div>
            <h2 className="hidden md:block text-xl font-black italic tracking-tighter" style={{ color: 'hsl(var(--sv-text))' }}>
              {activeRailTab === 'chats' && showArchivedOnly ? "Archived" : activeRailTab === 'chats' ? "Messages" : activeRailTab.charAt(0).toUpperCase() + activeRailTab.slice(1)}
            </h2>
            <div className="flex items-center gap-2">
              <button className="md:hidden w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-black transition-colors">
                <Search size={20} />
              </button>
              <button className="md:hidden w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-black transition-colors">
                <MoreVertical size={20} />
              </button>
              <div className="hidden md:flex items-center gap-1">
                {activeRailTab === 'chats' && (
                  <button
                    onClick={() => setShowArchivedOnly(p => !p)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showArchivedOnly ? 'bg-sv-accent text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
                    title={showArchivedOnly ? "Show All" : "Show Archived"}
                  >
                    <Archive size={16} />
                  </button>
                )}
                {!['profile', 'settings'].includes(activeRailTab) && (
                  <button
                    id="new-chat-btn-v2"
                    onClick={() => setShowNewChatModal(true)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Category Filters */}
          {/* <div className="md:hidden sv-chat-list-filter bg-white">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`sv-filter-pill ${activeCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div> */}


          {/* Search */}
          {!['profile', 'settings'].includes(activeRailTab) && (
            <div className="px-5 pb-4">
              <div className="relative group">
                <Search
                  size={14}
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-white"
                  style={{ color: 'hsl(var(--sv-text-3))' }}
                />
                <input
                  type="text"
                  placeholder={`Search ${activeRailTab}...`}
                  className="sv-input rounded-2xl pl-10 py-2.5 text-xs bg-white/5 border-transparent focus:bg-white/10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Panelled Content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* SEARCH RESULTS (GLOBAL) */}
            {activeRailTab === 'chats' && searchQuery.trim().length > 2 && (
              <div className="px-4 py-3 overflow-y-auto">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 ml-2">Messages</p>
                {isSearchingGlobal ? (
                  <div className="flex justify-center py-4"><div className="w-4 h-4 border border-t-transparent rounded-full animate-spin" /></div>
                ) : globalSearchMessages.length === 0 ? (
                  <p className="text-[11px] text-white/30 text-center py-2">No messages found</p>
                ) : (
                  globalSearchMessages.map(m => (
                    <div
                      key={m._id}
                      onClick={() => {
                        const conv = conversations.find(c => c._id === (m.conversationId?._id || m.conversationId));
                        if (conv) {
                          setSelectedConversation(conv);
                          setMobileShowSidebar(false);
                          setSearchQuery("");
                        }
                      }}
                      className="p-3 mb-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-sv-accent">{m.sender?.name}</span>
                        <span className="text-[9px] text-white/30">{fmtDate(m.createdAt)}</span>
                      </div>
                      <p className="text-xs truncate text-white/60">{m.content}</p>
                      <p className="text-[9px] text-white/20 mt-1 uppercase font-black">
                        in {m.conversationId?.groupName || 'Private Chat'}
                      </p>
                    </div>
                  ))
                )}
                <div className="h-px bg-white/5 my-4" />
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3 ml-2">Chats</p>
              </div>
            )}

            {activeRailTab === 'status' && (
              <StatusPanel />
            )}

            {activeRailTab === 'profile' && (
              <ProfileSidebarPanel />
            )}

            {activeRailTab === 'settings' && (
              <SettingsSidebarPanel />
            )}

            {activeRailTab === 'calls' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Phone size={32} />
                </div>
                <h3 className="text-sm font-bold">No recent calls</h3>
                <p className="text-[11px]">Calls made from Samvaad will appear here.</p>
              </div>
            )}

            {activeRailTab === 'groups' && (
              <div className="flex-1 overflow-y-auto scrollbar-custom px-2 pb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 mb-4 mt-2">Your Groups</p>
                {conversations.filter(c => c.type === 'group').length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center px-6 py-20">
                    <Users size={48} className="mb-4" />
                    <p className="text-sm">No groups yet.</p>
                    <button onClick={() => setShowNewChatModal(true)} className="mt-4 text-xs text-sv-accent font-bold">Build a community</button>
                  </div>
                ) : (
                  conversations.filter(c => c.type === 'group').map(conv => (
                    <div
                      key={conv._id}
                      onClick={() => { setSelectedConversation(conv); setMobileShowSidebar(false); }}
                      className={`sv-conv-item mb-0.5 relative group ${selectedConversation?._id === conv._id ? "active" : ""}`}
                    >
                      <Avatar src={conv.groupAvatar} name={conv.groupName} size={12} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] text-white truncate">{conv.groupName}</p>
                        <p className="text-[11px] text-white/40 truncate">{conv.participants?.length} members</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CHATS LIST */}
            {activeRailTab === 'chats' && (
              <div className="flex-1 overflow-y-auto scrollbar-custom px-2 pb-4">
                {loading && filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'hsl(var(--sv-accent))' }} />
                    <p className="text-xs" style={{ color: 'hsl(var(--sv-text-3))' }}>Loading chats…</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <MessageSquare size={32} style={{ color: 'hsl(var(--sv-text-3))' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--sv-text-3))' }}>No {(showArchivedOnly || activeRailTab === 'archived') ? 'archived' : ''} conversations</p>
                    <button onClick={() => setShowNewChatModal(true)} className="sv-btn-primary text-xs px-4 py-2">
                      Start a chat
                    </button>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isActive = selectedConversation?._id === conv._id;
                    const convName = getConversationName(conv);
                    const convAvatar = getConversationAvatar(conv);
                    const online = isUserOnline(conv);
                    const unread = conv.unreadCount?.[userId] || 0;
                    const lastMsg = conv.lastMessage;

                    return (
                      <motion.div
                        key={conv._id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setSelectedConversation(conv); setMobileShowSidebar(false); }}
                        className={`sv-conv-item relative group ${isActive ? "active" : ""}`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar src={convAvatar} name={convName} size={14} />
                          {online && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-[15px] truncate text-[#333] md:text-white" style={{ color: window.innerWidth <= 768 ? '#333' : 'hsl(var(--sv-text))' }}>{convName}</span>
                            <span className="sv-conv-time md:text-[10px] md:font-medium">
                              {lastMsg ? fmtTime(lastMsg.createdAt) : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] text-[#888] truncate pr-3 md:text-[12px] md:text-white/40">
                              {lastMsg ? (lastMsg.type === "image" ? "📷 Photo" : lastMsg.type === "file" ? "📎 File" : lastMsg.content) : "No messages yet"}
                            </p>
                            {unread > 0 && (
                              <div className="sv-unread-badge ml-2 shrink-0">
                                {unread > 99 ? "99+" : unread}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(conv._id); }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white"
                            title="Pin"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleArchive(conv._id); }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white"
                            title="Archive"
                          >
                            <Archive size={12} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {/* Mobile Fixed FAB as in purple image */}
            <button
              onClick={() => setShowNewChatModal(true)}
              className="md:hidden fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center bg-[#5a5a9f] text-white shadow-2xl z-40 transition-transform active:scale-95"
            >
              <MessageSquare size={24} />
            </button>
          </div>
        </aside>

        {/* ═══════ MAIN CHAT AREA ═══════ */}
        < main className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300
          ${mobileShowSidebar ? 'hidden md:flex' : 'fixed inset-0 z-50 bg-[hsl(var(--sv-bg))] flex pb-[env(safe-area-inset-bottom,0px)]'}`}
        >
          <CallInterface />

          {
            selectedConversation ? (
              /* Chat column + profile/clipboard panels sit side by side */
              <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── Chat column ── */}
                <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">

                  {/* Chat Header (V2 Premium) */}
                  <header className="sv-chat-header-v2 md:flex hidden">
                    <div className="flex items-center gap-4 w-full">
                      <button className="md:hidden sv-icon-btn w-10 h-10 rounded-xl mr-1" onClick={() => setMobileShowSidebar(true)}>
                        <ChevronLeft size={20} />
                      </button>

                      <button onClick={() => setShowProfile(p => !p)} className="flex items-center gap-3 flex-1 min-w-0 text-left group">
                        <div className="relative flex-shrink-0">
                          <Avatar src={getConversationAvatar(selectedConversation)} name={getConversationName(selectedConversation)} size={12} online={isUserOnline(selectedConversation)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm tracking-tight truncate group-hover:text-sv-accent transition-colors" style={{ color: 'hsl(var(--sv-text))' }}>
                            {getConversationName(selectedConversation)}
                          </p>
                          {isTyping ? (
                            <div className="sv-header-typing-dots">
                              <span className="text-[10px] text-sv-accent font-medium">typing</span>
                              <div className="flex gap-0.5">
                                <span className="sv-typing-dot" style={{ width: 3, height: 3 }} />
                                <span className="sv-typing-dot" style={{ width: 3, height: 3, animationDelay: '0.2s' }} />
                                <span className="sv-typing-dot" style={{ width: 3, height: 3, animationDelay: '0.4s' }} />
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] truncate" style={{ color: 'hsl(var(--sv-text-3))' }}>
                              {isUserOnline(selectedConversation) ? "Online now" : "Last seen recently"}
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <button className="sv-icon-btn w-9 h-9 rounded-xl" onClick={() => setActiveCall({ type: "voice", otherUser: selectedConversation?.participants?.find(p => p._id !== userId) || selectedConversation })}><Phone size={18} /></button>
                        <button className="sv-icon-btn w-9 h-9 rounded-xl" onClick={() => setActiveCall({ type: "video", otherUser: selectedConversation?.participants?.find(p => p._id !== userId) || selectedConversation })}><Video size={18} /></button>
                        <div className="w-[1px] h-6 bg-white/5 mx-1" />
                        <button className="sv-icon-btn w-9 h-9 rounded-xl" onClick={() => setShowInChatSearch(p => !p)}><Search size={18} /></button>
                        <div className="relative" ref={moreMenuRef}>
                          <button className="sv-icon-btn w-9 h-9 rounded-xl" onClick={() => setShowMoreMenu(p => !p)}><MoreVertical size={18} /></button>
                          <AnimatePresence>
                            {showMoreMenu && (
                              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="sv-dropdown right-0 mt-2">
                                <button onClick={() => setShowProfile(true)} className="sv-dropdown-item"><Users size={16} /> View Profile</button>
                                <button onClick={() => setShowBgPicker(true)} className="sv-dropdown-item"><ImageIcon size={16} /> Change Wallpaper</button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={() => setShowClearConfirm(true)} className="sv-dropdown-item danger"><Trash2 size={16} /> Clear Chat</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* Mobile Specific Header matching purple image */}
                  <header className="md:hidden sv-chat-header-dark">
                    <div className="flex items-center gap-4 w-full">
                      <button className="text-white" onClick={() => setMobileShowSidebar(true)}>
                        <ChevronLeft size={24} />
                      </button>
                      <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div className="relative flex-shrink-0">
                          <Avatar src={getConversationAvatar(selectedConversation)} name={getConversationName(selectedConversation)} size={11} />
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#5a5a9f] rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base truncate">{getConversationName(selectedConversation)}</p>
                          <p className="text-[11px] text-white/60">Online</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveCall({ type: "voice", otherUser: selectedConversation?.participants?.find(p => p._id !== userId) || selectedConversation })}
                          className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center text-white"
                        >
                          <Phone size={18} />
                        </button>
                        <button
                          onClick={() => setActiveCall({ type: "video", otherUser: selectedConversation?.participants?.find(p => p._id !== userId) || selectedConversation })}
                          className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center text-white"
                        >
                          <Video size={18} />
                        </button>
                        <button
                          onClick={() => setShowInChatSearch(true)}
                          className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center text-white"
                        >
                          <Search size={18} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowMoreMenu(p => !p)}
                            className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center text-white"
                          >
                            <MoreVertical size={18} />
                          </button>
                          <AnimatePresence>
                            {showMoreMenu && (
                              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="sv-dropdown right-0 mt-2">
                                <button onClick={() => setShowProfile(true)} className="sv-dropdown-item"><Users size={16} /> View Profile</button>
                                <button onClick={() => setShowBgPicker(true)} className="sv-dropdown-item"><ImageIcon size={16} /> Change Wallpaper</button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={() => setShowClearConfirm(true)} className="sv-dropdown-item danger"><Trash2 size={16} /> Clear Chat</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* Search Bar in Chat (Slide down) */}
                  <AnimatePresence>
                    {showInChatSearch && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white/5 border-b border-white/5 px-6 py-3 flex items-center gap-3 overflow-hidden"
                      >
                        <Search size={14} className="text-white/40" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search in conversation..."
                          className="bg-transparent border-none outline-none text-sm flex-1 text-white"
                          value={inChatSearchQuery}
                          onChange={(e) => setInChatSearchQuery(e.target.value)}
                        />
                        {inChatSearchQuery && (
                          <span className="text-[10px] font-bold text-white/40 uppercase">
                            {searchedMessages.length} results
                          </span>
                        )}
                        <button onClick={() => { setShowInChatSearch(false); setInChatSearchQuery(""); }} className="p-1 hover:bg-white/10 rounded-lg">
                          <X size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Messages area (V2 Premium) */}
                  <div
                    ref={messageContainerRef}
                    onScroll={handleScroll}
                    className={`flex-1 overflow-y-auto scrollbar-custom ${currentBgCls} md:bg-transparent sv-chat-body-light`}
                  >
                    <div className="w-full relative min-h-full" style={{ minHeight: canvasMinHeight }}>
                      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 py-4 flex flex-col gap-2 pt-2">
                      {loading ? (
                        <div className="flex items-center justify-center py-20">
                          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'hsl(var(--sv-accent))' }} />
                        </div>
                      ) : (
                        messagesWithDates.map((item) => {
                          if (item.type === "date") return (
                            <div key={item.id} className="flex items-center justify-center my-4">
                              <span className="text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full font-black bg-black/5 text-[#5a5a9f] border border-[#5a5a9f]/10">
                                {item.label}
                              </span>
                            </div>
                          );
                          return (
                            <div key={item.id || item._id} data-msg-id={item.id || item._id}>
                              <MessageItem
                                message={item}
                                isOwn={item.sender === "user" || item.sender?._id === userId}
                                onReply={setReplyToMessage}
                                onReact={addReaction}
                                onForward={(msg) => { setForwardMessageData(msg); setShowForwardModal(true); }}
                                userId={userId}
                              />
                            </div>
                          );
                        })
                      )}
                      <AnimatePresence>
                        {isTyping && <TypingIndicator />}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>

                    <DrawingCanvas 
                      conversationId={selectedConversation?._id}
                      isActive={showDrawingCanvas}
                      onClose={() => setShowDrawingCanvas(false)}
                      user={user}
                      onHeightChange={setCanvasMinHeight}
                    />
                  </div>
                </div>

                  {/* Floating Input Area */}
                  <div className="md:px-6 md:pb-6 md:pt-2 md:bg-gradient-to-t md:from-[hsl(var(--sv-bg))] md:via-[hsl(var(--sv-bg))/0.4] md:to-transparent sticky bottom-0 z-20 sv-input-bar-light">
                    <div className="max-w-3xl mx-auto flex flex-col gap-2">

                      {/* Previews (Reply/Upload) */}
                      <AnimatePresence>
                        {replyToMessage && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                            <Reply size={14} className="text-sv-accent" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-sv-accent uppercase tracking-tighter">Replying to {replyToMessage.name || 'user'}</p>
                              <p className="text-xs truncate opacity-60">{replyToMessage.content}</p>
                            </div>
                            <button onClick={() => setReplyToMessage(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                              <X size={14} />
                            </button>
                          </motion.div>
                        )}
                        {uploadPreview && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                              {uploadPreview.type.startsWith("image/")
                                ? <img src={uploadPreview.preview} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center bg-white/5"><FileIcon size={16} /></div>
                              }
                            </div>
                            <div className="flex-1 truncate">
                              <p className="text-xs font-semibold truncate">{uploadPreview.name}</p>
                              <p className="text-[10px] opacity-50 uppercase font-black">Ready to upload</p>
                            </div>
                            <button onClick={() => setUploadPreview(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                              <X size={14} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* Input Container (V2) */}
                      <div className="sv-input-container-v2 md:shadow-2xl relative md:bg-[hsl(var(--sv-surface-2))] sv-input-inner-light">
                        {/* Emoji Button + Picker */}
                        <div className="relative flex-shrink-0">
                          <button onClick={() => setShowEmojiPicker(p => !p)}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/5 text-gray-400 md:text-white/50 hover:text-sv-accent"
                            style={showEmojiPicker ? { color: 'hsl(var(--sv-accent))' } : {}}>
                            <Smile size={22} />
                          </button>
                        </div>

                        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={handleInputChange}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent border-none outline-none text-[15px] py-3 text-gray-800 md:text-white placeholder:text-gray-400 md:placeholder:text-white/20"
                          />

                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sv-accent">
                              <Plus size={22} />
                            </button>

                            <button 
                              type="button" 
                              onClick={() => setShowDrawingCanvas(!showDrawingCanvas)} 
                              className={`w-10 h-10 flex items-center justify-center transition-colors ${showDrawingCanvas ? 'text-sv-accent bg-sv-accent/10 rounded-full' : 'text-gray-400 hover:text-sv-accent'}`}
                              title="Live Chat Drawing"
                            >
                              <Sparkles size={20} />
                            </button>

                            {isRecording ? (
                              <div className="flex items-center gap-3 pr-2">
                                <span className="text-xs font-bold tabular-nums text-red-500 animate-pulse">{fmtDuration(recordingDuration)}</span>
                                <button type="button" onClick={() => stopRecording(true)} className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                                  <Send size={18} />
                                </button>
                              </div>
                            ) : (newMessage.trim() || uploadPreview) ? (
                              <button
                                type="submit"
                                style={{ background: 'linear-gradient(135deg, hsl(var(--sv-accent)), hsl(var(--sv-accent-2)))' }}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg shadow-sv-accent/40 transition-transform active:scale-95 flex-shrink-0"
                              >
                                <Send size={20} />
                              </button>
                            ) : (
                              <button type="button" onClick={startRecording} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sv-accent">
                                <Mic size={22} />
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>

                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </div>

                {/* ── Profile / Info Sidebar ── */}
                <AnimatePresence>
                  {showProfile && (
                    <>
                      {/* Mobile backdrop */}
                      <motion.div
                        className="fixed inset-0 bg-black/60 z-[48] md:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowProfile(false)}
                      />
                      <motion.aside
                        className="fixed md:relative right-0 top-0 h-full z-[49] border-l overflow-y-auto scrollbar-custom md:flex-shrink-0"
                        style={{
                          width: 'min(85vw, 280px)',
                          background: 'hsl(var(--sv-surface))',
                          borderColor: 'hsl(var(--sv-border) / 0.5)',
                        }}
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'hsl(var(--sv-border) / 0.5)' }}>
                          <span className="font-semibold text-sm" style={{ color: 'hsl(var(--sv-text))' }}>
                            {selectedConversation.type === "group" ? "Group Info" : "Contact Info"}
                          </span>
                          <button onClick={() => setShowProfile(false)} className="sv-icon-btn w-7 h-7 rounded-lg"><X size={14} /></button>
                        </div>
                        <div className="p-5 flex flex-col items-center gap-3 border-b" style={{ borderColor: 'hsl(var(--sv-border) / 0.5)' }}>
                          <Avatar src={getConversationAvatar(selectedConversation)} name={getConversationName(selectedConversation)} size={18} online={isUserOnline(selectedConversation)} />
                          <div className="text-center">
                            <p className="font-semibold" style={{ color: 'hsl(var(--sv-text))' }}>{getConversationName(selectedConversation)}</p>
                            {selectedConversation.type !== "group" && (
                              <p className="text-xs mt-0.5 flex items-center gap-1.5 justify-center" style={{ color: isUserOnline(selectedConversation) ? 'hsl(var(--sv-online))' : 'hsl(var(--sv-text-3))' }}>
                                {isUserOnline(selectedConversation)
                                  ? <><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--sv-online))', flexShrink: 0 }} />Online</>
                                  : fmtLastSeen(getLastSeen(selectedConversation))}
                              </p>
                            )}
                            {selectedConversation.type === "group" && (
                              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--sv-text-3))' }}>
                                {selectedConversation.participants?.length} members
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="p-4 space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--sv-text-3))' }}>Actions</p>
                          <button className="sv-dropdown-item w-full rounded-xl" onClick={() => { setShowBgPicker(true); setShowProfile(false); }}>
                            <ImageIcon size={15} /> Change Background
                          </button>
                          {selectedConversation.type === "group" && (
                            <button className="sv-dropdown-item w-full rounded-xl" onClick={() => { setShowGroupInfoModal(true); setShowProfile(false); }}>
                              <Settings size={15} /> Group Settings
                            </button>
                          )}
                          <button className="sv-dropdown-item w-full rounded-xl" onClick={() => { setShowEphemeralModal(true); setShowProfile(false); }}>
                            <Clock size={15} /> Disappearing Messages
                          </button>
                          <button className="sv-dropdown-item danger w-full rounded-xl" onClick={() => {
                            setShowClearConfirm(true);
                            setShowProfile(false);
                          }}>
                            <Trash2 size={15} /> Clear Chat
                          </button>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                          <div className="px-4 py-2 flex items-center justify-between bg-white/5 border-y" style={{ borderColor: 'hsl(var(--sv-border) / 0.5)' }}>
                            <p className="text-[10px] font-black uppercase tracking-wider text-white/40">Media, Links & Docs</p>
                          </div>
                          <div className="flex border-b" style={{ borderColor: 'hsl(var(--sv-border) / 0.5)' }}>
                            {['media', 'files', 'links'].map(tab => (
                              <button
                                key={tab}
                                onClick={() => setMediaTab(tab)}
                                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-tighter transition-colors border-b-2 ${mediaTab === tab ? 'border-sv-accent text-sv-accent' : 'border-transparent text-white/40 hover:text-white'}`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                          <div className="flex-1 overflow-y-auto p-3 scrollbar-custom">
                            {conversationMedia.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                <ImageIcon size={24} className="mb-2" />
                                <p className="text-[10px] font-bold uppercase">No {mediaTab} yet</p>
                              </div>
                            ) : (
                              <div className={mediaTab === 'media' ? "grid grid-cols-3 gap-1" : "flex flex-col gap-2"}>
                                {conversationMedia.map(m => (
                                  <div key={m._id} className="group relative">
                                    {mediaTab === 'media' ? (
                                      <div
                                        onClick={() => window.open(m.mediaUrl, '_blank')}
                                        className="aspect-square rounded-lg overflow-hidden bg-white/5 cursor-pointer border border-white/5"
                                      >
                                        <img src={m.mediaUrl || m.thumbnail} className="w-full h-full object-cover" alt="" />
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => window.open(m.mediaUrl || m.content, '_blank')}
                                        className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 text-sv-accent">
                                          {mediaTab === 'files' ? <FileIcon size={14} /> : <MessageSquare size={14} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-bold truncate">{m.fileName || m.content}</p>
                                          <p className="text-[9px] opacity-40 uppercase font-black">{new Date(m.createdAt).toLocaleDateString()}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.aside>
                    </>
                  )}
                </AnimatePresence>

              </div>/* end flex-row wrapper */
            ) : (
              /* ── Empty state (V2 Premium) ── */
              <div className={`flex-1 flex flex-col items-center justify-center text-center px-8 ${currentBgCls}`}>
                <AnimatePresence mode="wait">
                  {activeRailTab === 'profile' ? (
                    <motion.div
                      key="profile-empty"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-sv-accent/20 mb-6 shadow-2xl">
                        <img src={user?.avatar || '/default-avatar.png'} alt={user?.name} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-3xl font-black tracking-tighter mb-2 italic">Your Profile</h2>
                      <p className="text-sm text-white/40 max-w-xs">{user?.name} • {user?.bio || "Ready to chat"}</p>
                    </motion.div>
                  ) : activeRailTab === 'settings' ? (
                    <motion.div
                      key="settings-empty"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-24 h-24 rounded-[32px] bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
                        <Settings size={40} className="text-sv-accent animate-spin-slow" />
                      </div>
                      <h2 className="text-3xl font-black tracking-tighter mb-2">Samvaad Settings</h2>
                      <p className="text-sm text-white/40 max-w-xs">Personalize your vibes, privacy, and active sessions.</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default-empty"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-8 relative"
                        style={{ background: 'linear-gradient(135deg, hsl(var(--sv-accent)/0.15), hsl(var(--sv-accent-2)/0.08))', border: '1px solid hsl(var(--sv-accent)/0.15)' }}>
                        <MessageSquare size={40} style={{ color: 'hsl(var(--sv-accent))' }} />
                        <div className="absolute inset-0 rounded-[28px] animate-pulse" style={{ background: 'radial-gradient(circle, hsl(var(--sv-accent)/0.1), transparent 70%)' }} />
                      </motion.div>
                      <h2 className="text-2xl font-black tracking-tight mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Welcome to Samvaad
                      </h2>
                      <p className="text-sm max-w-sm leading-relaxed mb-8 text-white/40">
                        Your conversations are waiting. Select a chat to continue or start a new one.
                      </p>
                      <button id="empty-new-chat-btn" onClick={() => setShowNewChatModal(true)}
                        className="px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl"
                        style={{ background: 'hsl(var(--sv-accent))', color: 'white', boxShadow: '0 8px 32px hsl(var(--sv-accent)/0.3)' }}>
                        <Plus size={16} /> Start a Conversation
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          {/* ── Clipboard Sync panel ── */}
          <AnimatePresence>
            {showClipboard && (
              <>
                {/* Mobile backdrop */}
                <motion.div
                  className="fixed inset-0 bg-black/60 z-[48] md:hidden"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowClipboard(false)}
                />
                <motion.aside
                  className="fixed md:relative right-0 top-0 h-full z-[49] border-l overflow-hidden flex flex-col md:flex-shrink-0"
                  style={{
                    width: 'min(92vw, 300px)',
                    background: 'hsl(var(--sv-surface))',
                    borderColor: 'hsl(var(--sv-border) / 0.5)',
                  }}
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <ClipboardSync onClose={() => setShowClipboard(false)} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>


          {/* ── Mobile Custom Bottom Navigation (as in image) ── */}
          <div className="md:hidden sv-bottom-nav-fixed">
            <div className="sv-bottom-nav-inner shadow-2xl">
              {/* Equal placement by using flex containers for left and right */}
              <div className="flex-1 flex items-center justify-around pr-4">
                {/* Status */}
                <button
                  onClick={() => setActiveRailTab("status")}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeRailTab === 'status' ? 'text-[#4a4ae2]' : 'text-white/40'}`}
                >
                  <CircleDot size={20} />
                  <span className="text-[10px] font-medium">Status</span>
                </button>

                {/* Calls */}
                <button
                  onClick={() => setActiveRailTab("calls")}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeRailTab === 'calls' ? 'text-[#4a4ae2]' : 'text-white/40'}`}
                >
                  <Phone size={20} />
                  <span className="text-[10px] font-medium">Calls</span>
                </button>
              </div>

              {/* Floating Center Button (cutout) */}
              <div className="sv-fab-cutout">
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="sv-fab"
                >
                  <Plus size={32} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 flex items-center justify-around pl-4">
                {/* Chat */}
                <button
                  onClick={() => { setActiveRailTab("chats"); setMobileShowSidebar(true); }}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeRailTab === 'chats' ? 'text-[#4a4ae2]' : 'text-white/40'}`}
                >
                  <MessageSquare size={20} fill={activeRailTab === 'chats' ? "currentColor" : "none"} />
                  <span className="text-[10px] font-medium">Chat</span>
                </button>

                {/* Settings */}
                <button
                  onClick={() => setActiveRailTab("settings")}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeRailTab === 'settings' ? 'text-[#4a4ae2]' : 'text-white/40'}`}
                >
                  <Settings size={20} />
                  <span className="text-[10px] font-medium">Settings</span>
                </button>
              </div>
            </div>
          </div>
        </main >


        {/* ═══ Background Picker Modal ═══ */}
        < AnimatePresence >
          {showBgPicker && (
            <motion.div
              className="fixed inset-0 z-[300] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBgPicker(false)}>
              <motion.div
                className="rounded-2xl p-5 w-full max-w-sm"
                style={{ background: 'hsl(var(--sv-surface-3))', border: '1px solid hsl(var(--sv-border))' }}
                initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: 'hsl(var(--sv-text))' }}>Chat Background</h3>
                  <button onClick={() => setShowBgPicker(false)} className="sv-icon-btn w-8 h-8 rounded-xl"><X size={15} /></button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {BG_OPTIONS.map((bg) => (
                    <button
                      key={bg.id}
                      id={`bg-${bg.id}`}
                      onClick={() => handleBgChange(bg.id)}
                      className={`relative h-16 md:h-20 rounded-xl overflow-hidden transition-all ${bg.cls} ${chatBg === bg.id ? "" : "hover:opacity-90"}`}
                      style={chatBg === bg.id ? { outline: `2px solid hsl(var(--sv-accent))`, outlineOffset: '2px' } : {}}>
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-medium"
                        style={{ color: 'rgba(255,255,255,0.8)' }}>{bg.label}</span>
                      {chatBg === bg.id && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <Check size={18} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence >

        {/* ═══ Modals ═══ */}
        < NewChatModal isOpen={showNewChatModal} onClose={() => setShowNewChatModal(false)} onCreateChat={handleNewChat} token={token} />
        <PollModal isOpen={showPollModal} onClose={() => setShowPollModal(false)} onSubmit={handleCreatePoll} />
        <ScheduleModal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} onSubmit={handleScheduleMessage} />
        <CodeModal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} onSubmit={handleSendCode} />
        <TimeCapsuleModal isOpen={showTimeCapsuleModal} onClose={() => setShowTimeCapsuleModal(false)} onSend={handleTimeCapsule} />
        <ConvertTaskModal
          isOpen={showConvertTaskModal}
          onClose={() => setShowConvertTaskModal(false)}
          message={convertingMessage}
          onSubmit={handleConvertTask}
        />

        <TaskPanel
          isOpen={showTaskPanel}
          onClose={() => setShowTaskPanel(false)}
        />
        {/* Forward Modal */}
        <AnimatePresence>
          {showForwardModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="sv-card w-full max-w-md p-6 overflow-hidden flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Forward Message</h3>
                  <button onClick={() => setShowForwardModal(false)}><X size={20} /></button>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5 mb-2">
                  <p className="text-xs text-white/40 uppercase font-black mb-1">Message Preview</p>
                  <p className="text-sm truncate opacity-80">{forwardMessageData?.content}</p>
                </div>

                <p className="text-xs text-white/40 uppercase font-black">Select Conversations</p>
                <div className="flex-1 overflow-y-auto max-h-[300px] gap-1 flex flex-col scrollbar-custom">
                  {conversations.filter(c => !c.archivedBy?.includes(userId)).map(conv => (
                    <div
                      key={conv._id}
                      onClick={async () => {
                        await forwardMessage(forwardMessageData.id || forwardMessageData._id, [conv._id]);
                        setShowForwardModal(false);
                        setNotification({ content: "Message forwarded!", sender: { name: "System" } });
                        setTimeout(() => setNotification(null), 3000);
                      }}
                      className="p-3 rounded-xl hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                    >
                      <Avatar src={getConversationAvatar(conv)} name={getConversationName(conv)} size={10} />
                      <span className="text-sm font-medium">{getConversationName(conv)}</span>
                      <Send size={14} className="ml-auto text-sv-accent opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <GroupInfoModal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          conversation={selectedConversation}
        />

        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        <EphemeralModal
          isOpen={showEphemeralModal}
          onClose={() => setShowEphemeralModal(false)}
          conversation={selectedConversation}
        />

        {/* ─── Clear Chat Confirmation Modal ─── */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
            >
              <motion.div
                className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: 'hsl(var(--sv-surface))', border: '1px solid hsl(var(--sv-border))' }}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <Trash2 className="text-red-500" size={28} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--sv-text))' }}>Clear Chat?</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--sv-text-2))' }}>
                    This will permanently delete all messages in this conversation for you. This action cannot be undone.
                  </p>
                </div>
                <div className="flex border-t" style={{ borderColor: 'hsl(var(--sv-border) / 0.5)' }}>
                  <button
                    className="flex-1 py-4 text-sm font-semibold transition-colors hover:bg-white/5"
                    style={{ color: 'hsl(var(--sv-text-2))' }}
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-4 text-sm font-bold transition-colors bg-red-500/10 hover:bg-red-500/20"
                    style={{ color: '#ef4444' }}
                    onClick={() => {
                      clearChat(selectedConversation._id);
                      setShowClearConfirm(false);
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div >
    </ContactSyncGateway >
  );
};

export default Chat;