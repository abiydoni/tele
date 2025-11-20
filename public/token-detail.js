// Get token ID from URL
const urlParams = new URLSearchParams(window.location.search);
const tokenId = urlParams.get("id");

if (!tokenId) {
  alert("Token ID tidak ditemukan!");
  window.location.href = "/";
}

let tokenData = null;
let botInfo = null;

// Load token data
async function loadTokenData() {
  try {
    const response = await fetch(`/api/tokens/${tokenId}`);
    if (!response.ok) {
      throw new Error("Gagal memuat data token");
    }
    tokenData = await response.json();
    document.getElementById("tokenName").textContent = tokenData.name;
    document.getElementById("tokenValue").textContent =
      tokenData.full_token || tokenData.token;

    // Set webhook URL
    const webhookUrl = `${window.location.origin}/api/webhook/${tokenId}`;
    document.getElementById("webhookUrl").textContent = webhookUrl;

    // Set API endpoint
    const apiEndpoint = `${window.location.origin}/api/send/${tokenId}`;
    document.getElementById("apiEndpoint").textContent = apiEndpoint;

    // Set cURL example
    const curlExample = `curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id": "YOUR_CHAT_ID", "message": "Hello World"}'`;
    document.getElementById("curlExample").textContent = curlExample;

    // Load bot info
    loadBotInfo();
    loadChats();
    loadMessageLogs();
  } catch (error) {
    console.error("Error loading token:", error);
    alert("Error memuat data token: " + error.message);
  }
}

// Load bot information
async function loadBotInfo() {
  try {
    const response = await fetch(`/api/tokens/${tokenId}/info`);
    if (!response.ok) {
      throw new Error("Gagal memuat informasi bot");
    }
    botInfo = await response.json();

    const botInfoHtml = `
      <div class="info-row">
        <div class="info-label">Status:</div>
        <div class="info-value">
          <span class="status-indicator ${
            botInfo.is_online ? "status-online" : "status-offline"
          }"></span>
          ${botInfo.is_online ? "Online" : "Offline"}
        </div>
      </div>
      <div class="info-row">
        <div class="info-label">Username:</div>
        <div class="info-value">@${botInfo.username || "-"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Nama:</div>
        <div class="info-value">${botInfo.first_name || "-"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">ID Bot:</div>
        <div class="info-value"><code>${botInfo.id || "-"}</code></div>
      </div>
      <div class="info-row">
        <div class="info-label">Dapat Join Group:</div>
        <div class="info-value">${
          botInfo.can_join_groups ? "Ya" : "Tidak"
        }</div>
      </div>
      <div class="info-row">
        <div class="info-label">Dapat Baca Pesan:</div>
        <div class="info-value">${
          botInfo.can_read_all_group_messages ? "Ya" : "Tidak"
        }</div>
      </div>
    `;

    document.getElementById("botInfo").innerHTML = botInfoHtml;
  } catch (error) {
    console.error("Error loading bot info:", error);
    document.getElementById("botInfo").innerHTML = `
      <div style="color: #dc3545;">Error: ${error.message}</div>
      <p>Pastikan bot sudah dijalankan dengan: <code>npm run gateway</code></p>
    `;
  }
}

// Refresh chats from Telegram
async function refreshChats() {
  const refreshBtn = document.getElementById("refreshBtn");
  const originalText = refreshBtn.textContent;
  refreshBtn.disabled = true;
  refreshBtn.textContent = "🔄 Memuat...";

  try {
    const response = await fetch(`/api/tokens/${tokenId}/chats/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    let result;

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      // If not JSON, read as text to see what we got
      const text = await response.text();
      console.error("Non-JSON response:", text.substring(0, 200));
      throw new Error(`Server error (${response.status}): Response bukan JSON`);
    }

    if (!response.ok) {
      throw new Error(result.error || "Gagal refresh chats");
    }

    // Reload chats after refresh
    await loadChats();

    let message = `✅ Refresh selesai!\n\nBerhasil: ${result.synced}\nError: ${result.errors}\nTotal: ${result.total}`;
    if (result.error_details && result.error_details.length > 0) {
      message += `\n\nDetail error:\n${result.error_details
        .slice(0, 3)
        .join("\n")}`;
    }
    alert(message);
  } catch (error) {
    console.error("Error refreshing chats:", error);
    let errorMsg = error.message || "Error tidak diketahui";

    // Provide more helpful error message
    if (errorMsg.includes("JSON") || errorMsg.includes("Unexpected token")) {
      errorMsg =
        "Error: Server mengembalikan response yang tidak valid. Pastikan:\n" +
        "1. Server berjalan dengan baik\n" +
        "2. Token ID valid\n" +
        "3. Cek console server untuk detail error";
    }

    alert("Error refresh chats: " + errorMsg);
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = originalText;
  }
}

// Load connected chats
async function loadChats() {
  try {
    const response = await fetch(`/api/tokens/${tokenId}/chats`);
    if (!response.ok) {
      throw new Error("Gagal memuat daftar chat");
    }
    const chats = await response.json();

    if (chats.length === 0) {
      document.getElementById("groupsList").innerHTML = `
        <div style="padding: 40px; text-align: center; color: #999; grid-column: 1 / -1;">
          <p style="font-size: 1.1em; margin-bottom: 10px;">Belum ada group/chat yang terhubung</p>
          <p style="font-size: 0.9em;">Kirim pesan ke bot untuk menambahkan chat ke daftar</p>
        </div>
      `;
      return;
    }

    const groupsHtml = chats
      .map((chat) => {
        const chatType =
          chat.type === "group"
            ? "group"
            : chat.type === "channel"
            ? "channel"
            : "private";
        const chatTypeLabel =
          chat.type === "group"
            ? "Group"
            : chat.type === "channel"
            ? "Channel"
            : "Private Chat";

        const chatName =
          chat.title || chat.first_name || chat.username || "Unknown";
        const chatId = chat.chat_id || chat.id;

        return `
        <div class="group-item" onclick="selectChat('${chatId}', '${chatName.replace(
          /'/g,
          "\\'"
        )}')">
          <div class="group-name">${chatName}</div>
          <div class="group-id" style="cursor: pointer;" onclick="event.stopPropagation(); copyChatId('${chatId}')" title="Klik untuk copy Chat ID">
            ID: ${chatId} 📋
          </div>
          <div>
            <span class="group-type ${chatType}">${chatTypeLabel}</span>
            ${
              chat.username
                ? `<span style="margin-left: 8px; color: #666; font-size: 0.9em;">@${chat.username}</span>`
                : ""
            }
          </div>
        </div>
      `;
      })
      .join("");

    document.getElementById("groupsList").innerHTML = groupsHtml;
  } catch (error) {
    console.error("Error loading chats:", error);
    document.getElementById("groupsList").innerHTML = `
      <div style="color: #dc3545; grid-column: 1 / -1; padding: 20px; text-align: center;">
        Error: ${error.message}
      </div>
    `;
  }
}

// Select chat for testing
function selectChat(chatId, chatName) {
  document.getElementById("testChatId").value = chatId;
  document.getElementById("testMessage").focus();

  // Show feedback
  const resultDiv = document.getElementById("testResult");
  resultDiv.innerHTML = `
    <div style="color: #28a745; padding: 10px; background: #d4edda; border-radius: 6px;">
      ✓ Chat ID <code>${chatId}</code> (${chatName}) telah dipilih
    </div>
  `;
  setTimeout(() => {
    resultDiv.innerHTML = "";
  }, 3000);
}

// Send test message
async function sendTestMessage() {
  const chatIdInput = document.getElementById("testChatId").value.trim();
  const message = document.getElementById("testMessage").value.trim();

  if (!chatIdInput || !message) {
    alert("Chat ID dan pesan harus diisi!");
    return;
  }

  // Validate chat ID format
  let chatId = chatIdInput;

  // Remove any non-numeric characters except minus sign
  chatId = chatId.replace(/[^\d-]/g, "");

  // Check if it's a valid number
  if (!chatId || (chatId !== "-" && isNaN(parseInt(chatId)))) {
    document.getElementById("testResult").innerHTML = `
      <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 6px;">
        ❌ Chat ID tidak valid!<br>
        <small>Chat ID harus berupa angka (contoh: 123456789 untuk personal, -1001234567890 untuk group)</small>
      </div>
    `;
    return;
  }

  // Convert to number (keep as string for very large numbers)
  chatId = chatId.includes("-") ? chatId : parseInt(chatId).toString();

  const resultDiv = document.getElementById("testResult");
  resultDiv.innerHTML = '<div style="color: #666;">Mengirim pesan...</div>';

  try {
    const response = await fetch(`/api/tokens/${tokenId}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        message: message,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      resultDiv.innerHTML = `
        <div style="color: #28a745; padding: 10px; background: #d4edda; border-radius: 6px;">
          ✅ Pesan berhasil dikirim!
          <div style="margin-top: 5px; font-size: 0.9em;">
            Message ID: ${result.message_id}<br>
            Chat ID: ${result.chat_id}
          </div>
        </div>
      `;
    } else {
      let errorMsg = result.error || "Gagal mengirim pesan";

      // Provide helpful error messages
      if (errorMsg.includes("chat not found") || errorMsg.includes("chat_id")) {
        errorMsg =
          "Chat tidak ditemukan. Pastikan:\n" +
          "1. Bot sudah ditambahkan ke group/channel\n" +
          "2. Chat ID benar (bukan nomor telepon)\n" +
          "3. Untuk personal chat, user sudah mengirim /start ke bot";
      }

      resultDiv.innerHTML = `
        <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 6px;">
          ❌ Error: ${errorMsg}
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 6px;">
        ❌ Error: ${error.message}
      </div>
    `;
  }
}

// Copy token
function copyToken() {
  const token = tokenData.full_token || tokenData.token;
  navigator.clipboard.writeText(token).then(() => {
    alert("Token berhasil disalin!");
  });
}

// Copy chat ID
function copyChatId(chatId) {
  navigator.clipboard.writeText(chatId).then(() => {
    const resultDiv = document.getElementById("testResult");
    resultDiv.innerHTML = `
      <div style="color: #28a745; padding: 10px; background: #d4edda; border-radius: 6px;">
        ✓ Chat ID <code>${chatId}</code> berhasil disalin!
      </div>
    `;
    setTimeout(() => {
      resultDiv.innerHTML = "";
    }, 2000);
  });
}

// Load message logs
async function loadMessageLogs() {
  const refreshBtn = document.getElementById("refreshLogsBtn");
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "🔄 Memuat...";
  }

  try {
    const response = await fetch(`/api/tokens/${tokenId}/logs?limit=100`);

    // Check content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response:", text.substring(0, 200));
      throw new Error(`Server error (${response.status}): Response bukan JSON`);
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Gagal memuat message logs");
    }

    const logs = await response.json();

    const logsList = document.getElementById("messageLogsList");

    if (logs.length === 0) {
      logsList.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #999;">
          <p style="font-size: 1.1em; margin-bottom: 10px;">Belum ada message logs</p>
          <p style="font-size: 0.9em;">Log akan muncul setelah ada pesan masuk atau keluar</p>
        </div>
      `;
      return;
    }

    const logsHtml = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8f9fa; position: sticky; top: 0;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Waktu</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Chat ID</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Username</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Tipe</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Pesan</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Arah</th>
          </tr>
        </thead>
        <tbody>
          ${logs
            .map((log) => {
              const date = new Date(log.created_at);
              const messagePreview =
                log.message_content && log.message_content.length > 50
                  ? log.message_content.substring(0, 50) + "..."
                  : log.message_content || "-";
              const directionClass =
                log.direction === "incoming"
                  ? "direction-incoming"
                  : "direction-outgoing";
              const directionLabel =
                log.direction === "incoming" ? "Masuk" : "Keluar";

              return `
            <tr style="border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px; font-size: 0.9em;">${date.toLocaleString(
                "id-ID"
              )}</td>
              <td style="padding: 10px;"><code>${log.chat_id}</code></td>
              <td style="padding: 10px;">${log.username || "-"}</td>
              <td style="padding: 10px;">${log.message_type}</td>
              <td style="padding: 10px; max-width: 300px; word-break: break-word;">${messagePreview}</td>
              <td style="padding: 10px;">
                <span class="direction-badge ${directionClass}">${directionLabel}</span>
              </td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    logsList.innerHTML = logsHtml;
  } catch (error) {
    console.error("Error loading message logs:", error);
    const logsList = document.getElementById("messageLogsList");
    if (logsList) {
      logsList.innerHTML = `
        <div style="color: #dc3545; padding: 20px; text-align: center;">
          <strong>Error memuat message logs</strong><br>
          <small>${error.message}</small><br>
          <small style="margin-top: 10px; display: block;">Cek console untuk detail error</small>
        </div>
      `;
    }
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "🔄 Refresh";
    }
  }
}

// Initialize
loadTokenData();
