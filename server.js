/**
 * Express server untuk Dashboard dan API
 */
const express = require("express");
const path = require("path");
const cors = require("cors");
const {
  botTokens,
  settings,
  messageLogs,
  chats,
  getStats,
} = require("./database");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes (must be before static files to avoid conflicts)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/token", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "token-detail.html"));
});

// API Routes - Bot Tokens
app.get("/api/tokens", (req, res) => {
  try {
    const tokens = botTokens.getAll();
    // Mask tokens for security
    const maskedTokens = tokens.map((token) => {
      const originalToken = token.token;
      return {
        ...token,
        token:
          originalToken.length > 10
            ? originalToken.substring(0, 10) + "..."
            : originalToken,
        full_token: originalToken, // Include full token for internal use
      };
    });
    res.json(maskedTokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/tokens/:id", (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }
    // Save original token before masking
    const originalToken = token.token;
    res.json({
      ...token,
      token:
        originalToken.length > 10
          ? originalToken.substring(0, 10) + "..."
          : originalToken,
      full_token: originalToken,
    });
  } catch (error) {
    console.error("Error getting token:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tokens", (req, res) => {
  try {
    const { name, token, description, is_active } = req.body;

    if (!name || !token) {
      return res.status(400).json({ error: "Nama dan token wajib diisi" });
    }

    // Check if name exists
    const existing = botTokens.getAll().find((t) => t.name === name);
    if (existing) {
      return res.status(400).json({ error: "Nama token sudah digunakan" });
    }

    const newToken = botTokens.create(name, token, description, is_active);
    res.json(newToken);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/tokens/:id", (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }

    const { name, token: tokenValue, description, is_active } = req.body;
    const updateData = {};

    if (name !== undefined) {
      // Check if new name conflicts
      const existing = botTokens
        .getAll()
        .find((t) => t.name === name && t.id !== tokenId);
      if (existing) {
        return res.status(400).json({ error: "Nama token sudah digunakan" });
      }
      updateData.name = name;
    }
    if (tokenValue !== undefined) updateData.token = tokenValue;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updated = botTokens.update(tokenId, updateData);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/tokens/:id", (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }

    botTokens.delete(tokenId);
    res.json({ message: "Token berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Settings
app.get("/api/settings", (req, res) => {
  try {
    const allSettings = settings.getAll();
    res.json(allSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/settings/:key", (req, res) => {
  try {
    const setting = settings.getByKey(req.params.key);
    if (!setting) {
      return res.status(404).json({ error: "Setting tidak ditemukan" });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", (req, res) => {
  try {
    const { key, value, description } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Key wajib diisi" });
    }

    // Check if key exists
    const existing = settings.getByKey(key);
    if (existing) {
      return res.status(400).json({ error: "Setting key sudah ada" });
    }

    const newSetting = settings.create(key, value, description);
    res.json(newSetting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/settings/:key", (req, res) => {
  try {
    const setting = settings.getByKey(req.params.key);
    if (!setting) {
      return res.status(404).json({ error: "Setting tidak ditemukan" });
    }

    const { value, description } = req.body;
    const updateData = {};

    if (value !== undefined) updateData.value = value;
    if (description !== undefined) updateData.description = description;

    const updated = settings.update(req.params.key, updateData);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/settings/:key", (req, res) => {
  try {
    const setting = settings.getByKey(req.params.key);
    if (!setting) {
      return res.status(404).json({ error: "Setting tidak ditemukan" });
    }

    settings.delete(req.params.key);
    res.json({ message: "Setting berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Message Logs
app.get("/api/logs", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const botTokenId = req.query.bot_token_id
      ? parseInt(req.query.bot_token_id)
      : null;
    const logs = messageLogs.getAll(limit, botTokenId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Message Logs by Token ID
app.get("/api/tokens/:id/logs", (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: "Token ID tidak valid" });
    }

    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }

    const limit = parseInt(req.query.limit) || 100;
    const logs = messageLogs.getAll(limit, tokenId);

    console.log(`Loading logs for token ${tokenId}: ${logs.length} logs found`);

    res.json(logs);
  } catch (error) {
    console.error("Error getting message logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Stats
app.get("/api/stats", (req, res) => {
  try {
    const stats = getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Bot Info
app.get("/api/tokens/:id/info", async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }

    // Try to get bot info from gateway
    const TelegramBot = require("node-telegram-bot-api");
    const bot = new TelegramBot(token.token, { polling: false });

    try {
      const me = await bot.getMe();
      res.json({
        id: me.id,
        username: me.username,
        first_name: me.first_name,
        can_join_groups: me.can_join_groups,
        can_read_all_group_messages: me.can_read_all_group_messages,
        is_online: true,
      });
    } catch (error) {
      res.json({
        is_online: false,
        error: error.message,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Get Chats
app.get("/api/tokens/:id/chats", async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }

    const TelegramBot = require("node-telegram-bot-api");
    const bot = new TelegramBot(token.token, { polling: false });

    // Get all unique chat IDs from message logs (always check logs)
    const logs = messageLogs.getAll(10000, tokenId); // Get more logs
    const chatMap = new Map();

    logs.forEach((log) => {
      if (log.chat_id && !chatMap.has(log.chat_id)) {
        chatMap.set(log.chat_id, {
          chat_id: log.chat_id,
          username: log.username || null,
        });
      }
    });

    // Also get from database
    const dbChats = chats.getAll(tokenId);
    dbChats.forEach((dbChat) => {
      if (!chatMap.has(dbChat.chat_id)) {
        chatMap.set(dbChat.chat_id, {
          chat_id: dbChat.chat_id,
          username: dbChat.username || null,
        });
      }
    });

    // Try to get chat info from Telegram API for all chats
    const chatsWithInfo = [];
    const chatIds = Array.from(chatMap.keys());

    for (const chatId of chatIds) {
      try {
        const chatInfo = await bot.getChat(chatId);

        // Save to database
        chats.createOrUpdate({
          bot_token_id: tokenId,
          chat_id: chatId.toString(),
          title: chatInfo.title || null,
          username: chatInfo.username || null,
          first_name: chatInfo.first_name || null,
          type: chatInfo.type || "private",
          last_message_at: new Date().toISOString(),
        });

        chatsWithInfo.push({
          id: chatId,
          chat_id: chatId.toString(),
          title: chatInfo.title || chatInfo.first_name || "Unknown",
          username: chatInfo.username || null,
          first_name: chatInfo.first_name || null,
          type: chatInfo.type || "private",
        });
      } catch (error) {
        // If can't get from API, try to use stored data
        const storedChat = chats.getByChatId(chatId.toString(), tokenId);
        if (storedChat) {
          chatsWithInfo.push({
            id: chatId,
            chat_id: chatId.toString(),
            title:
              storedChat.title || storedChat.first_name || `Chat ${chatId}`,
            username: storedChat.username || null,
            first_name: storedChat.first_name || null,
            type: storedChat.type || "private",
          });
        } else {
          // If no stored data, create basic entry
          const chatType = chatId.toString().startsWith("-100")
            ? "channel"
            : chatId.toString().startsWith("-")
            ? "group"
            : "private";

          chatsWithInfo.push({
            id: chatId,
            chat_id: chatId.toString(),
            title: `Chat ${chatId}`,
            username: chatMap.get(chatId)?.username || null,
            type: chatType,
          });
        }
      }
    }

    // Sort by last message (most recent first)
    chatsWithInfo.sort((a, b) => {
      const aTime =
        chats.getByChatId(a.chat_id, tokenId)?.last_message_at || "";
      const bTime =
        chats.getByChatId(b.chat_id, tokenId)?.last_message_at || "";
      return bTime.localeCompare(aTime);
    });

    res.json(chatsWithInfo);
  } catch (error) {
    console.error("Error getting chats:", error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Send Test Message
app.post("/api/tokens/:id/send", async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }

    const { chat_id, message } = req.body;
    if (!chat_id || !message) {
      return res.status(400).json({ error: "chat_id dan message wajib diisi" });
    }

    const TelegramBot = require("node-telegram-bot-api");
    const bot = new TelegramBot(token.token, { polling: false });

    try {
      const sentMessage = await bot.sendMessage(chat_id, message);

      // Save chat info
      try {
        const chatInfo = await bot.getChat(chat_id);
        chats.createOrUpdate({
          bot_token_id: tokenId,
          chat_id: chat_id.toString(),
          title: chatInfo.title || null,
          username: chatInfo.username || null,
          first_name: chatInfo.first_name || null,
          type: chatInfo.type || "private",
          last_message_at: new Date().toISOString(),
        });
      } catch (chatError) {
        console.error("Error saving chat info:", chatError);
      }

      // Log the message
      const { messageLogs } = require("./database");
      messageLogs.create({
        bot_token_id: tokenId,
        chat_id: chat_id.toString(),
        message_type: "text",
        message_content: message,
        direction: "outgoing",
      });

      res.json({
        success: true,
        message_id: sentMessage.message_id,
        chat_id: sentMessage.chat.id,
      });
    } catch (error) {
      res.status(400).json({
        error: error.message || "Gagal mengirim pesan",
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes - Refresh/Sync Chats
app.post("/api/tokens/:id/chats/refresh", async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    const token = botTokens.getById(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token tidak ditemukan" });
    }

    const TelegramBot = require("node-telegram-bot-api");
    const bot = new TelegramBot(token.token, { polling: false });

    // Get all unique chat IDs from message logs
    let allChatIds = new Set();

    // Get from message logs
    const logs = messageLogs.getAll(10000, tokenId);
    logs.forEach((log) => {
      if (log.chat_id) {
        allChatIds.add(log.chat_id);
      }
    });

    // Also get from existing chats in database
    const existingChats = chats.getAll(tokenId);
    existingChats.forEach((chat) => {
      if (chat.chat_id) {
        allChatIds.add(chat.chat_id);
      }
    });

    let syncedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Sync all chats
    for (const chatId of allChatIds) {
      try {
        const chatInfo = await bot.getChat(chatId);
        chats.createOrUpdate({
          bot_token_id: tokenId,
          chat_id: chatId.toString(),
          title: chatInfo.title || null,
          username: chatInfo.username || null,
          first_name: chatInfo.first_name || null,
          type: chatInfo.type || "private",
          last_message_at: new Date().toISOString(),
        });
        syncedCount++;
      } catch (error) {
        errorCount++;
        // Only log first few errors to avoid spam
        if (errors.length < 5) {
          errors.push(`Chat ${chatId}: ${error.message}`);
        }
        console.log(`Could not sync chat ${chatId}:`, error.message);
      }
    }

    res.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      total: allChatIds.size,
      error_details: errors,
    });
  } catch (error) {
    console.error("Error refreshing chats:", error);
    res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
});

// Static files (must be after all API routes)
app.use(
  express.static(path.join(__dirname, "public"), {
    // Don't serve index.html for /token route
    index: false,
  })
);

// Error handler middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint tidak ditemukan" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dashboard berjalan di http://localhost:${PORT}`);
  console.log(`📊 Buka browser dan akses dashboard untuk mengelola tokens`);
  console.log(`🔗 Token detail: http://localhost:${PORT}/token?id=1`);
});
