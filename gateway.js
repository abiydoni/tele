/**
 * Telegram Gateway - Handler untuk bot Telegram
 */
const TelegramBot = require("node-telegram-bot-api");
const { botTokens, settings, messageLogs, chats } = require("./database");

let bot = null;
let currentBotToken = null;

// Helper function to save chat info
async function saveChatInfo(msg) {
  try {
    const chat = msg.chat;
    chats.createOrUpdate({
      bot_token_id: currentBotToken,
      chat_id: chat.id.toString(),
      title: chat.title || null,
      username: chat.username || null,
      first_name: chat.first_name || null,
      type: chat.type || "private",
      last_message_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving chat info:", error);
  }
}

// Initialize bot
function initBot(token, botTokenId) {
  if (bot) {
    bot.stopPolling();
  }

  bot = new TelegramBot(token, { polling: true });
  currentBotToken = botTokenId;

  console.log(`✅ Bot initialized dengan token ID: ${botTokenId}`);

  // Setup handlers
  setupHandlers();

  return bot;
}

// Setup message handlers
function setupHandlers() {
  // Command: /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    // Get welcome message from settings
    const welcomeSetting = settings.getByKey("welcome_message");
    let welcomeMessage =
      welcomeSetting?.value ||
      `Halo ${user.first_name}! 👋\n\n` +
        `Selamat datang di Telegram Gateway!\n` +
        `Saya siap membantu Anda mengirim dan menerima pesan.\n\n` +
        `Gunakan /help untuk melihat daftar command yang tersedia.`;

    welcomeMessage = welcomeMessage.replace(/{name}/g, user.first_name);

    await bot.sendMessage(chatId, welcomeMessage);

    // Save chat info
    await saveChatInfo(msg);

    // Log message
    messageLogs.create({
      bot_token_id: currentBotToken,
      chat_id: chatId.toString(),
      user_id: user.id.toString(),
      username: user.username,
      message_type: "command",
      message_content: "/start",
      direction: "incoming",
    });

    console.log(`User ${user.id} (${user.username}) memulai bot`);
  });

  // Command: /help
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    const helpText =
      `📋 Daftar Command:\n\n` +
      `/start - Memulai bot\n` +
      `/help - Menampilkan bantuan ini\n` +
      `/status - Cek status gateway\n\n` +
      `💬 Fitur:\n` +
      `- Kirim pesan teks, saya akan membalas\n` +
      `- Kirim foto, saya akan memprosesnya\n` +
      `- Kirim dokumen, saya akan memprosesnya`;

    await bot.sendMessage(chatId, helpText);

    // Save chat info
    await saveChatInfo(msg);

    messageLogs.create({
      bot_token_id: currentBotToken,
      chat_id: chatId.toString(),
      user_id: user.id.toString(),
      username: user.username,
      message_type: "command",
      message_content: "/help",
      direction: "incoming",
    });
  });

  // Command: /status
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;

    const statusMessage =
      `✅ Gateway Status: Aktif\n` +
      `🤖 Bot sedang berjalan dengan baik\n` +
      `📡 Siap menerima dan mengirim pesan`;

    await bot.sendMessage(chatId, statusMessage);

    // Save chat info
    await saveChatInfo(msg);

    messageLogs.create({
      bot_token_id: currentBotToken,
      chat_id: chatId.toString(),
      user_id: user.id.toString(),
      username: user.username,
      message_type: "command",
      message_content: "/status",
      direction: "incoming",
    });
  });

  // Handle text messages
  bot.on("message", async (msg) => {
    // Skip commands (already handled)
    if (msg.text && msg.text.startsWith("/")) {
      return;
    }

    const chatId = msg.chat.id;
    const user = msg.from;

    // Save chat info
    await saveChatInfo(msg);

    // Handle text
    if (msg.text) {
      const messageText = msg.text;

      console.log(
        `Pesan diterima dari ${user.id} (${user.username}): ${messageText}`
      );

      // Log incoming message
      messageLogs.create({
        bot_token_id: currentBotToken,
        chat_id: chatId.toString(),
        user_id: user.id.toString(),
        username: user.username,
        message_type: "text",
        message_content: messageText,
        direction: "incoming",
      });

      // Get response from settings
      const responseSetting = settings.getByKey("default_response");
      let response =
        responseSetting?.value ||
        `✅ Pesan diterima!\n\nAnda mengirim: ${messageText}\n\nChat ID: ${chatId}`;

      response = response
        .replace(/{message}/g, messageText)
        .replace(/{chat_id}/g, chatId.toString());

      await bot.sendMessage(chatId, response);

      // Log outgoing message
      messageLogs.create({
        bot_token_id: currentBotToken,
        chat_id: chatId.toString(),
        user_id: user.id.toString(),
        username: user.username,
        message_type: "text",
        message_content: response,
        direction: "outgoing",
      });
    }

    // Handle photo
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution

      console.log(`Foto diterima dari ${user.id} (${user.username})`);

      messageLogs.create({
        bot_token_id: currentBotToken,
        chat_id: chatId.toString(),
        user_id: user.id.toString(),
        username: user.username,
        message_type: "photo",
        message_content: `Photo: ${photo.file_id}`,
        direction: "incoming",
      });

      const response =
        `📷 Foto diterima!\n` +
        `File ID: ${photo.file_id}\n` +
        `Ukuran: ${photo.width}x${photo.height}`;

      await bot.sendMessage(chatId, response);

      messageLogs.create({
        bot_token_id: currentBotToken,
        chat_id: chatId.toString(),
        user_id: user.id.toString(),
        username: user.username,
        message_type: "text",
        message_content: response,
        direction: "outgoing",
      });
    }

    // Handle document
    if (msg.document) {
      const doc = msg.document;

      console.log(
        `Dokumen diterima dari ${user.id} (${user.username}): ${doc.file_name}`
      );

      messageLogs.create({
        bot_token_id: currentBotToken,
        chat_id: chatId.toString(),
        user_id: user.id.toString(),
        username: user.username,
        message_type: "document",
        message_content: `Document: ${doc.file_name}`,
        direction: "incoming",
      });

      const response =
        `📄 Dokumen diterima!\n` +
        `Nama file: ${doc.file_name}\n` +
        `Tipe: ${doc.mime_type}\n` +
        `Ukuran: ${doc.file_size} bytes`;

      await bot.sendMessage(chatId, response);

      messageLogs.create({
        bot_token_id: currentBotToken,
        chat_id: chatId.toString(),
        user_id: user.id.toString(),
        username: user.username,
        message_type: "text",
        message_content: response,
        direction: "outgoing",
      });
    }
  });

  // Error handler
  bot.on("polling_error", (error) => {
    console.error("Polling error:", error);
  });
}

// Start gateway
function startGateway() {
  const activeTokens = botTokens.getActive();

  if (activeTokens.length === 0) {
    console.error("❌ Tidak ada bot token aktif di database!");
    console.log(
      "💡 Silakan tambahkan token melalui dashboard di http://localhost:8000"
    );
    process.exit(1);
  }

  // Use first active token
  const token = activeTokens[0];
  console.log(`🚀 Menggunakan token: ${token.name} (ID: ${token.id})`);

  initBot(token.token, token.id);
}

// Export functions
module.exports = {
  initBot,
  startGateway,
  sendMessage: async (chatId, text) => {
    if (!bot) {
      throw new Error("Bot belum diinisialisasi");
    }
    try {
      await bot.sendMessage(chatId, text);

      messageLogs.create({
        bot_token_id: currentBotToken,
        chat_id: chatId.toString(),
        message_type: "text",
        message_content: text,
        direction: "outgoing",
      });

      return true;
    } catch (error) {
      console.error(`Error mengirim pesan ke chat ${chatId}:`, error);
      return false;
    }
  },
};

// Run if called directly
if (require.main === module) {
  startGateway();
}
