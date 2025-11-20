/**
 * Database setup menggunakan file JSON (tidak perlu native build)
 */
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "telegram_gateway.json");

// Load database from file
function loadDB() {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading database:", error);
      return getDefaultDB();
    }
  }
  return getDefaultDB();
}

// Save database to file
function saveDB(data) {
  try {
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Write to temporary file first, then rename (atomic operation)
    const tempPath = dbPath + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error("Error saving database:", error);
    throw error;
  }
}

// Get default database structure
function getDefaultDB() {
  return {
    bot_tokens: [],
    settings: [],
    message_logs: [],
    chats: [], // Store chat information
  };
}

// Initialize database
let db = loadDB();

function initDatabase() {
  // Ensure chats array exists (for migration)
  if (!db.chats) {
    db.chats = [];
    saveDB(db);
  }

  if (!fs.existsSync(dbPath)) {
    saveDB(db);
    console.log("✅ Database initialized successfully!");
  } else {
    console.log("✅ Database loaded successfully!");
  }
}

// Reload database from file
function reloadDB() {
  db = loadDB();
}

// Bot Tokens methods
const botTokens = {
  getAll: () => {
    reloadDB();
    return db.bot_tokens.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  getById: (id) => {
    reloadDB();
    return db.bot_tokens.find((t) => t.id === id);
  },

  getActive: () => {
    reloadDB();
    return db.bot_tokens.filter((t) => t.is_active);
  },

  create: (name, token, description = null, isActive = true) => {
    reloadDB();
    const newId =
      db.bot_tokens.length > 0
        ? Math.max(...db.bot_tokens.map((t) => t.id)) + 1
        : 1;
    const newToken = {
      id: newId,
      name,
      token,
      description,
      is_active: isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.bot_tokens.push(newToken);
    saveDB(db);
    return newToken;
  },

  update: (id, data) => {
    reloadDB();
    const token = db.bot_tokens.find((t) => t.id === id);
    if (!token) return null;

    if (data.name !== undefined) token.name = data.name;
    if (data.token !== undefined) token.token = data.token;
    if (data.description !== undefined) token.description = data.description;
    if (data.is_active !== undefined) token.is_active = data.is_active;
    token.updated_at = new Date().toISOString();

    saveDB(db);
    return token;
  },

  delete: (id) => {
    reloadDB();
    const index = db.bot_tokens.findIndex((t) => t.id === id);
    if (index !== -1) {
      db.bot_tokens.splice(index, 1);
      saveDB(db);
      return true;
    }
    return false;
  },
};

// Settings methods
const settings = {
  getAll: () => {
    reloadDB();
    return db.settings.sort((a, b) => a.key.localeCompare(b.key));
  },

  getByKey: (key) => {
    reloadDB();
    return db.settings.find((s) => s.key === key);
  },

  create: (key, value, description = null) => {
    reloadDB();
    const newSetting = {
      id: db.settings.length + 1,
      key,
      value,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.settings.push(newSetting);
    saveDB(db);
    return newSetting;
  },

  update: (key, data) => {
    reloadDB();
    const setting = db.settings.find((s) => s.key === key);
    if (!setting) return null;

    if (data.value !== undefined) setting.value = data.value;
    if (data.description !== undefined) setting.description = data.description;
    setting.updated_at = new Date().toISOString();

    saveDB(db);
    return setting;
  },

  delete: (key) => {
    reloadDB();
    const index = db.settings.findIndex((s) => s.key === key);
    if (index !== -1) {
      db.settings.splice(index, 1);
      saveDB(db);
      return true;
    }
    return false;
  },
};

// Message Logs methods
const messageLogs = {
  getAll: (limit = 100, botTokenId = null) => {
    reloadDB();
    let logs = db.message_logs || [];
    if (botTokenId !== null && botTokenId !== undefined) {
      // Convert both to number for comparison
      const tokenIdNum =
        typeof botTokenId === "string" ? parseInt(botTokenId) : botTokenId;
      logs = logs.filter((l) => {
        const logTokenId =
          typeof l.bot_token_id === "string"
            ? parseInt(l.bot_token_id)
            : l.bot_token_id;
        return logTokenId === tokenIdNum;
      });
    }
    return logs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },

  create: (data) => {
    reloadDB();
    const newId =
      db.message_logs.length > 0
        ? Math.max(...db.message_logs.map((l) => l.id)) + 1
        : 1;
    const newLog = {
      id: newId,
      bot_token_id: data.bot_token_id || null,
      chat_id: data.chat_id,
      user_id: data.user_id || null,
      username: data.username || null,
      message_type: data.message_type,
      message_content: data.message_content || null,
      direction: data.direction,
      created_at: new Date().toISOString(),
    };
    db.message_logs.push(newLog);
    saveDB(db);
    return newId;
  },

  getStats: () => {
    reloadDB();
    return {
      total_logs: db.message_logs.length,
    };
  },
};

// Chats methods
const chats = {
  getAll: (botTokenId = null) => {
    reloadDB();
    let allChats = db.chats || [];
    if (botTokenId !== null && botTokenId !== undefined) {
      // Convert both to number for comparison
      const tokenIdNum =
        typeof botTokenId === "string" ? parseInt(botTokenId) : botTokenId;
      allChats = allChats.filter((c) => {
        const chatTokenId =
          typeof c.bot_token_id === "string"
            ? parseInt(c.bot_token_id)
            : c.bot_token_id;
        return chatTokenId === tokenIdNum;
      });
    }
    return allChats;
  },

  getByChatId: (chatId, botTokenId = null) => {
    reloadDB();
    let allChats = db.chats || [];
    if (botTokenId !== null && botTokenId !== undefined) {
      // Convert both to number for comparison
      const tokenIdNum =
        typeof botTokenId === "string" ? parseInt(botTokenId) : botTokenId;
      allChats = allChats.filter((c) => {
        const chatTokenId =
          typeof c.bot_token_id === "string"
            ? parseInt(c.bot_token_id)
            : c.bot_token_id;
        return chatTokenId === tokenIdNum;
      });
    }
    return allChats.find((c) => c.chat_id === chatId.toString());
  },

  createOrUpdate: (data) => {
    reloadDB();
    if (!db.chats) {
      db.chats = [];
    }

    // Convert both to string/number for comparison
    const chatIdStr = data.chat_id.toString();
    const tokenIdNum =
      typeof data.bot_token_id === "string"
        ? parseInt(data.bot_token_id)
        : data.bot_token_id;

    const existing = db.chats.find((c) => {
      const cChatId = c.chat_id ? c.chat_id.toString() : "";
      const cTokenId =
        typeof c.bot_token_id === "string"
          ? parseInt(c.bot_token_id)
          : c.bot_token_id;
      return cChatId === chatIdStr && cTokenId === tokenIdNum;
    });

    if (existing) {
      // Update existing
      if (data.title !== undefined) existing.title = data.title;
      if (data.username !== undefined) existing.username = data.username;
      if (data.first_name !== undefined) existing.first_name = data.first_name;
      if (data.type !== undefined) existing.type = data.type;
      if (data.last_message_at !== undefined)
        existing.last_message_at = data.last_message_at;
      existing.updated_at = new Date().toISOString();
    } else {
      // Create new
      const newChat = {
        id:
          db.chats.length > 0 ? Math.max(...db.chats.map((c) => c.id)) + 1 : 1,
        bot_token_id: data.bot_token_id,
        chat_id: data.chat_id.toString(),
        title: data.title || null,
        username: data.username || null,
        first_name: data.first_name || null,
        type: data.type || "private",
        last_message_at: data.last_message_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.chats.push(newChat);
    }

    saveDB(db);
    return existing || db.chats[db.chats.length - 1];
  },
};

// Stats
function getStats() {
  reloadDB();
  return {
    total_tokens: db.bot_tokens.length,
    active_tokens: db.bot_tokens.filter((t) => t.is_active).length,
    total_settings: db.settings.length,
    total_logs: db.message_logs.length,
  };
}

// Initialize on require
initDatabase();

module.exports = {
  db,
  botTokens,
  settings,
  messageLogs,
  chats,
  getStats,
};
