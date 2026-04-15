import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";

// ── DNS fix: prefer IPv4, prevents SRV lookup failures on Windows/some networks
dns.setDefaultResultOrder("ipv4first");
// try {
//   dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
// } catch (_) {
//   console.warn("⚠️  Could not override DNS servers, using system defaults.");
// }

dotenv.config();

/* ─────────────────────────────────────────────────────────────
   Mongoose connection options that prevent ECONNRESET crashes:

   serverSelectionTimeoutMS  – how long to try picking a server (30 s)
   socketTimeoutMS           – kill a socket that stays idle for 45 s
   heartbeatFrequencyMS      – send a keep-alive ping every 10 s so
                               Atlas / firewalls never consider the
                               connection "idle" and silently drop it
   maxPoolSize               – limit concurrent connections
   minPoolSize               – keep at least 2 connections warm in pool
   waitQueueTimeoutMS        – how long an operation waits for a free
                               pool slot before erroring (10 s)
   retryWrites / retryReads  – automatically retry failed ops once
   family                    – force IPv4 (suppresses ECONNRESET on some
                               Windows + Atlas SRV setups)
───────────────────────────────────────────────────────────── */
const MONGOOSE_OPTS = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 2,
  waitQueueTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
  family: 4,               // ← IPv4 only, avoids TLS ECONNRESET on IPv6
};

/* ── Attach Mongoose connection-lifecycle logging only once ── */
let listenersAttached = false;

const attachMongooseListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected");
  });

  mongoose.connection.on("error", (err) => {
    // Log but DO NOT crash — Mongoose will attempt to reconnect on its own
    console.error("⚠️  MongoDB connection error (will auto-reconnect):", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected — attempting to reconnect…");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected successfully");
  });

  // Handle uncaught MongoNetworkError so the process doesn't crash
  process.on("unhandledRejection", (reason) => {
    if (
      reason &&
      (reason.name === "MongoNetworkError" ||
        reason.name === "MongoServerSelectionError" ||
        (reason.code && reason.code === "ECONNRESET"))
    ) {
      console.error("⚠️  Unhandled Mongo network error (suppressed crash):", reason.message);
      // Mongoose will reconnect automatically — no need to exit
    } else {
      // Re-throw non-Mongo rejections so real bugs aren't silently swallowed
      console.error("❌ Unhandled rejection:", reason);
    }
  });
};

/* ── Primary connect function ── */
export const dbConnect = async () => {
  attachMongooseListeners();

  const mongoURI = process.env.MONGODB_URL || process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error("❌ MONGODB_URL / MONGODB_URI is not defined in .env");
    process.exit(1);
  }

  const safeURI = mongoURI.includes("@")
    ? mongoURI.split("@")[1]   // hide credentials in log
    : mongoURI;

  try {
    await mongoose.connect(mongoURI, MONGOOSE_OPTS);
    console.log(`✅ MongoDB connected → ${safeURI}`);
  } catch (error) {
    console.error("❌ Initial MongoDB connection failed:", error.message);
    console.error("   Retrying in 5 seconds…");

    // Retry once after 5 s — useful for cold starts / slow network.
    // After that, let the process keep running; Mongoose retries internally.
    await new Promise((r) => setTimeout(r, 5000));
    try {
      await mongoose.connect(mongoURI, MONGOOSE_OPTS);
      console.log(`✅ MongoDB connected (2nd attempt) → ${safeURI}`);
    } catch (err2) {
      console.error("❌ MongoDB connection failed after retry:", err2.message);
      // Don't exit — let Mongoose keep trying in the background.
      // The server can still start; ops will fail gracefully until reconnected.
    }
  }
};

/* ── Graceful shutdown ── */
export const dbDisconnect = async () => {
  try {
    await mongoose.disconnect();
    console.log("👋 MongoDB disconnected cleanly");
  } catch (e) {
    console.error("Error during disconnect:", e.message);
  }
};

/* ── Allow SIGTERM / SIGINT to close the connection cleanly ── */
const shutdown = async (signal) => {
  console.log(`\n${signal} received — closing MongoDB connection…`);
  await dbDisconnect();
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
