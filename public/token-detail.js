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
      <div style="color: #dc3545; padding: 15px; background: #f8d7da; border-radius: 6px; margin-bottom: 10px;">
        <strong>⚠️ Bot Offline</strong><br>
        <small>Error: ${error.message}</small>
      </div>
      <div style="padding: 15px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
        <strong>💡 Cara menjalankan Gateway Bot:</strong>
        <ol style="margin: 10px 0; padding-left: 25px; line-height: 1.8;">
          <li>Buka terminal baru</li>
          <li>Jalankan: <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px;">npm run gateway</code></li>
          <li>Pastikan token bot aktif di dashboard</li>
          <li>Refresh halaman ini setelah gateway berjalan</li>
        </ol>
      </div>
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
    console.log(`[Frontend] Loading chats for token ID: ${tokenId}`);
    const response = await fetch(`/api/tokens/${tokenId}/chats`);
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || "Gagal memuat daftar chat");
    }
    const chats = await response.json();
    console.log(`[Frontend] Received ${chats.length} chats:`, chats);

    if (chats.length === 0) {
      document.getElementById("groupsList").innerHTML = `
        <div style="padding: 40px; text-align: center; color: #666; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
          <div style="font-size: 3em; margin-bottom: 15px;">💬</div>
          <p style="font-size: 1.2em; margin-bottom: 15px; font-weight: 600; color: #333;">Belum ada group/chat yang terhubung</p>
          <div style="text-align: left; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 1em; margin-bottom: 15px; color: #333;"><strong>📋 Langkah-langkah untuk menampilkan chat:</strong></p>
            <ol style="text-align: left; padding-left: 25px; line-height: 1.8;">
              <li style="margin-bottom: 10px;">
                <strong>Pastikan Gateway Bot berjalan:</strong><br>
                <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 5px;">npm run gateway</code>
                <br><small style="color: #666;">Jalankan di terminal terpisah</small>
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Untuk Personal Chat:</strong><br>
                Buka Telegram, cari bot Anda, lalu kirim pesan <code>/start</code> ke bot
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Untuk Group:</strong><br>
                Tambahkan bot ke group, lalu kirim pesan apapun di group tersebut
              </li>
              <li style="margin-bottom: 10px;">
                <strong>Untuk Channel:</strong><br>
                Tambahkan bot sebagai admin di channel, lalu kirim pesan di channel
              </li>
              <li>
                <strong>Refresh daftar:</strong><br>
                Klik tombol <strong>"🔄 Refresh"</strong> di atas setelah mengirim pesan
              </li>
            </ol>
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <strong>💡 Tips:</strong> Setelah mengirim pesan ke bot, chat akan otomatis muncul di daftar ini dan di Message Logs.
            </div>
          </div>
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

    document.getElementById(
      "groupsList"
    ).innerHTML = `<div class="groups-list">${groupsHtml}</div>`;
  } catch (error) {
    console.error("Error loading chats:", error);
    document.getElementById("groupsList").innerHTML = `
      <div style="color: #dc3545; padding: 20px; text-align: center;">
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
    alert("Chat ID/Username dan pesan harus diisi!");
    return;
  }

  // Validate chat ID format
  let chatId = chatIdInput.trim();

  // Check if it's a username (starts with @)
  const isUsername = chatId.startsWith("@");

  // If not username, validate as numeric chat ID
  if (!isUsername) {
    // Check if it looks like a phone number
    const phonePattern = /^(\+62|62|0)[0-9]{9,12}$/;
    const cleanPhone = chatId.replace(/[^\d+]/g, "");
    if (phonePattern.test(cleanPhone)) {
      document.getElementById("testResult").innerHTML = `
        <div style="color: #dc3545; padding: 15px; background: #f8d7da; border-radius: 6px;">
          ❌ <strong>Nomor HP tidak bisa digunakan sebagai Chat ID!</strong><br><br>
          <strong>Chat ID adalah ID numerik unik dari Telegram, bukan nomor telepon.</strong><br><br>
          <strong>Cara mendapatkan Chat ID:</strong><br>
          1. <strong>Personal Chat:</strong> Kirim pesan /start ke bot, lalu cek di Message Logs di atas<br>
          2. <strong>Group/Channel:</strong> Chat ID akan muncul setelah bot ditambahkan ke group<br>
          3. Klik group di daftar chat di atas untuk melihat Chat ID-nya<br>
          4. Atau gunakan username channel/group (format: @username)
        </div>
      `;
      return;
    }

    // Remove any non-numeric characters except minus sign
    chatId = chatId.replace(/[^\d-]/g, "");

    // Check if it's a valid number
    if (!chatId || (chatId !== "-" && isNaN(parseInt(chatId)))) {
      document.getElementById("testResult").innerHTML = `
        <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 6px;">
          ❌ Chat ID tidak valid!<br>
          <small>Chat ID harus berupa angka (contoh: 123456789 untuk personal, -1001234567890 untuk group) atau username (contoh: @channelname)</small>
        </div>
      `;
      return;
    }

    // Convert to number (keep as string for very large numbers)
    chatId = chatId.includes("-") ? chatId : parseInt(chatId).toString();
  }

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
      if (errorMsg.includes("Nomor HP tidak bisa digunakan")) {
        // Already handled above
      } else if (
        errorMsg.includes("chat not found") ||
        errorMsg.includes("chat_id") ||
        errorMsg.includes("Chat not found")
      ) {
        errorMsg =
          "Chat tidak ditemukan. Pastikan:\n" +
          "1. Bot sudah ditambahkan ke group/channel (jika group/channel)\n" +
          "2. Chat ID benar (bukan nomor telepon)\n" +
          "3. Untuk personal chat, user sudah mengirim /start ke bot\n" +
          "4. Jika menggunakan username, pastikan format benar (@username)";
      } else if (errorMsg.includes("bot was blocked")) {
        errorMsg =
          "Bot diblokir oleh user. User harus membuka blokir bot terlebih dahulu.";
      } else if (errorMsg.includes("not enough rights")) {
        errorMsg =
          "Bot tidak memiliki izin yang cukup. Pastikan bot adalah admin di group/channel.";
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
        <div style="padding: 40px; text-align: center; color: #666; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
          <div style="font-size: 3em; margin-bottom: 15px;">📝</div>
          <p style="font-size: 1.2em; margin-bottom: 15px; font-weight: 600; color: #333;">Belum ada message logs</p>
          <div style="text-align: left; max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 1em; margin-bottom: 15px; color: #333;"><strong>Untuk melihat logs:</strong></p>
            <ul style="text-align: left; padding-left: 25px; line-height: 1.8;">
              <li style="margin-bottom: 10px;">
                Pastikan Gateway Bot berjalan: <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px;">npm run gateway</code>
              </li>
              <li style="margin-bottom: 10px;">
                Kirim pesan ke bot (personal chat, group, atau channel)
              </li>
              <li>
                Log akan otomatis muncul di sini setelah ada aktivitas
              </li>
            </ul>
            <div style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 4px; font-size: 0.9em;">
              <strong>💡 Info:</strong> Setiap pesan yang masuk atau keluar akan tercatat di sini, termasuk Chat ID-nya.
            </div>
          </div>
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
