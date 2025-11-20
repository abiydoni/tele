// API Base URL
const API_BASE = "/api";

// Global state
let currentTab = "tokens";
let editingTokenId = null;
let editingSettingKey = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadTokens();
  loadSettings();
  loadLogs();
});

// Tab Management
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Show selected tab
  document.getElementById(`${tabName}Tab`).classList.add("active");
  event.target.classList.add("active");
  currentTab = tabName;
}

// Stats
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    const stats = await response.json();

    document.getElementById("totalTokens").textContent = stats.total_tokens;
    document.getElementById("activeTokens").textContent = stats.active_tokens;
    document.getElementById("totalLogs").textContent = stats.total_logs;
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Tokens
async function loadTokens() {
  try {
    const response = await fetch(`${API_BASE}/tokens`);
    const tokens = await response.json();

    const tbody = document.getElementById("tokensTableBody");
    if (tokens.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="loading">Tidak ada token</td></tr>';
      return;
    }

    tbody.innerHTML = tokens
      .map(
        (token) => `
            <tr>
                <td>${token.id}</td>
                <td>
                    <a href="/token?id=${
                      token.id
                    }" style="color: #667eea; text-decoration: none; font-weight: 500;">
                        ${token.name}
                    </a>
                </td>
                <td><code>${token.token}</code></td>
                <td>${token.description || "-"}</td>
                <td>
                    <span class="status-badge ${
                      token.is_active ? "status-active" : "status-inactive"
                    }">
                        ${token.is_active ? "Aktif" : "Tidak Aktif"}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editToken(${
                          token.id
                        })">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteToken(${
                          token.id
                        })">Hapus</button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading tokens:", error);
    document.getElementById("tokensTableBody").innerHTML =
      '<tr><td colspan="6" class="loading">Error memuat data</td></tr>';
  }
}

function showTokenModal(tokenId = null) {
  editingTokenId = tokenId;
  const modal = document.getElementById("tokenModal");
  const form = document.getElementById("tokenForm");
  const title = document.getElementById("tokenModalTitle");

  if (tokenId) {
    title.textContent = "Edit Bot Token";
    // Load token data
    fetch(`${API_BASE}/tokens/${tokenId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Gagal memuat data token");
        }
        return res.json();
      })
      .then((token) => {
        if (token && token.id) {
          document.getElementById("tokenId").value = token.id;
          document.getElementById("tokenName").value = token.name || "";
          document.getElementById("tokenValue").value =
            token.full_token || token.token || "";
          document.getElementById("tokenDescription").value =
            token.description || "";
          document.getElementById("tokenIsActive").checked =
            token.is_active === true || token.is_active === 1;
        } else {
          alert("Data token tidak valid");
          closeTokenModal();
        }
      })
      .catch((error) => {
        console.error("Error loading token:", error);
        alert("Error memuat data token: " + error.message);
        closeTokenModal();
      });
  } else {
    title.textContent = "Tambah Bot Token";
    form.reset();
    document.getElementById("tokenId").value = "";
  }

  modal.style.display = "block";
}

function closeTokenModal() {
  document.getElementById("tokenModal").style.display = "none";
  editingTokenId = null;
}

async function saveToken(event) {
  event.preventDefault();

  const formData = {
    name: document.getElementById("tokenName").value,
    token: document.getElementById("tokenValue").value,
    description: document.getElementById("tokenDescription").value,
    is_active: document.getElementById("tokenIsActive").checked,
  };

  const tokenId = document.getElementById("tokenId").value;
  const url = tokenId ? `${API_BASE}/tokens/${tokenId}` : `${API_BASE}/tokens`;
  const method = tokenId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      closeTokenModal();
      loadTokens();
      loadStats();
      alert("Token berhasil disimpan!");
    } else {
      const error = await response.json();
      alert(`Error: ${error.error || "Gagal menyimpan token"}`);
    }
  } catch (error) {
    console.error("Error saving token:", error);
    alert("Error menyimpan token");
  }
}

async function editToken(tokenId) {
  showTokenModal(tokenId);
}

async function deleteToken(tokenId) {
  if (!confirm("Apakah Anda yakin ingin menghapus token ini?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/tokens/${tokenId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      loadTokens();
      loadStats();
      alert("Token berhasil dihapus!");
    } else {
      alert("Error menghapus token");
    }
  } catch (error) {
    console.error("Error deleting token:", error);
    alert("Error menghapus token");
  }
}

// Settings
async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE}/settings`);
    const settings = await response.json();

    const tbody = document.getElementById("settingsTableBody");
    if (settings.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="loading">Tidak ada setting</td></tr>';
      return;
    }

    tbody.innerHTML = settings
      .map(
        (setting) => `
            <tr>
                <td><code>${setting.key}</code></td>
                <td>${setting.value || "-"}</td>
                <td>${setting.description || "-"}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editSetting('${
                          setting.key
                        }')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSetting('${
                          setting.key
                        }')">Hapus</button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading settings:", error);
    document.getElementById("settingsTableBody").innerHTML =
      '<tr><td colspan="4" class="loading">Error memuat data</td></tr>';
  }
}

function showSettingModal(settingKey = null) {
  editingSettingKey = settingKey;
  const modal = document.getElementById("settingModal");
  const form = document.getElementById("settingForm");
  const title = document.getElementById("settingModalTitle");

  if (settingKey) {
    title.textContent = "Edit Setting";
    // Load setting data
    fetch(`${API_BASE}/settings/${settingKey}`)
      .then((res) => res.json())
      .then((setting) => {
        document.getElementById("settingKey").value = setting.key;
        document.getElementById("settingKeyInput").value = setting.key;
        document.getElementById("settingKeyInput").disabled = true;
        document.getElementById("settingValue").value = setting.value || "";
        document.getElementById("settingDescription").value =
          setting.description || "";
      });
  } else {
    title.textContent = "Tambah Setting";
    form.reset();
    document.getElementById("settingKey").value = "";
    document.getElementById("settingKeyInput").disabled = false;
  }

  modal.style.display = "block";
}

function closeSettingModal() {
  document.getElementById("settingModal").style.display = "none";
  editingSettingKey = null;
}

async function saveSetting(event) {
  event.preventDefault();

  const key = document.getElementById("settingKeyInput").value;
  const formData = {
    value: document.getElementById("settingValue").value,
    description: document.getElementById("settingDescription").value,
  };

  const existingKey = document.getElementById("settingKey").value;
  const url = existingKey
    ? `${API_BASE}/settings/${existingKey}`
    : `${API_BASE}/settings`;
  const method = existingKey ? "PUT" : "POST";

  if (!existingKey) {
    formData.key = key;
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      closeSettingModal();
      loadSettings();
      alert("Setting berhasil disimpan!");
    } else {
      const error = await response.json();
      alert(`Error: ${error.error || "Gagal menyimpan setting"}`);
    }
  } catch (error) {
    console.error("Error saving setting:", error);
    alert("Error menyimpan setting");
  }
}

async function editSetting(settingKey) {
  showSettingModal(settingKey);
}

async function deleteSetting(settingKey) {
  if (!confirm("Apakah Anda yakin ingin menghapus setting ini?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/settings/${settingKey}`, {
      method: "DELETE",
    });

    if (response.ok) {
      loadSettings();
      alert("Setting berhasil dihapus!");
    } else {
      alert("Error menghapus setting");
    }
  } catch (error) {
    console.error("Error deleting setting:", error);
    alert("Error menghapus setting");
  }
}

// Logs
async function loadLogs() {
  try {
    const response = await fetch(`${API_BASE}/logs?limit=100`);
    const logs = await response.json();

    const tbody = document.getElementById("logsTableBody");
    if (logs.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="loading">Tidak ada log</td></tr>';
      return;
    }

    tbody.innerHTML = logs
      .map((log) => {
        const date = new Date(log.created_at);
        return `
                <tr>
                    <td>${date.toLocaleString("id-ID")}</td>
                    <td><code>${log.chat_id}</code></td>
                    <td>${log.username || "-"}</td>
                    <td>${log.message_type}</td>
                    <td>${
                      log.message_content
                        ? log.message_content.substring(0, 50) +
                          (log.message_content.length > 50 ? "..." : "")
                        : "-"
                    }</td>
                    <td>
                        <span class="direction-badge ${
                          log.direction === "incoming"
                            ? "direction-incoming"
                            : "direction-outgoing"
                        }">
                            ${log.direction === "incoming" ? "Masuk" : "Keluar"}
                        </span>
                    </td>
                </tr>
            `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading logs:", error);
    document.getElementById("logsTableBody").innerHTML =
      '<tr><td colspan="6" class="loading">Error memuat data</td></tr>';
  }
}

// Close modal when clicking outside
window.onclick = function (event) {
  const tokenModal = document.getElementById("tokenModal");
  const settingModal = document.getElementById("settingModal");
  if (event.target === tokenModal) {
    closeTokenModal();
  }
  if (event.target === settingModal) {
    closeSettingModal();
  }
};
