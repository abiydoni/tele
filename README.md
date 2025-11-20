# Telegram Gateway

Gateway untuk mengirim dan menerima pesan melalui Telegram Bot API dengan Dashboard Web untuk kontrol dan manajemen.

## ✨ Fitur

- ✅ **Dashboard Web** - Kontrol penuh melalui web interface (vanilla JavaScript, tidak perlu build)
- ✅ **Database SQLite** - Simpan token dan settings di database (tidak perlu edit kode)
- ✅ **Multi-Token Support** - Kelola multiple bot tokens
- ✅ **Message Logging** - Log semua pesan masuk dan keluar
- ✅ **Settings Management** - Konfigurasi dinamis tanpa edit kode
- ✅ Menerima dan membalas pesan teks, foto, dokumen
- ✅ Command handlers (/start, /help, /status)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Token

Jalankan script setup untuk menambahkan token ke database:

```bash
npm run setup
```

### 3. Jalankan Dashboard

```bash
npm start
```

Buka browser: **http://localhost:8000**

### 4. Jalankan Gateway

Di terminal baru:

```bash
npm run gateway
```

Gateway akan otomatis menggunakan token aktif dari database dan siap menerima pesan!

## 📁 Struktur Proyek

```
tele/
├── server.js          # Express server untuk dashboard dan API
├── gateway.js         # Telegram bot handler
├── database.js        # SQLite database setup
├── setup.js           # Script setup token awal
├── package.json       # Dependencies
├── public/            # Frontend files (tanpa build)
│   ├── index.html     # Dashboard HTML
│   ├── style.css      # CSS styling
│   └── script.js      # JavaScript (vanilla)
└── telegram_gateway.db # SQLite database (auto-generated)
```

## 🎯 Dashboard Features

### Bot Tokens Management

- Tambah, edit, hapus bot tokens
- Aktifkan/nonaktifkan token
- Multiple tokens support
- Token masking untuk keamanan

### Settings Management

- Tambah, edit, hapus settings
- Settings kustom tanpa edit kode
- Key-value storage

### Message Logs

- Lihat semua pesan masuk dan keluar
- Filter berdasarkan bot token
- Informasi lengkap: waktu, chat ID, username, tipe pesan

### Statistics

- Total tokens
- Active tokens
- Total message logs

## ⚙️ Settings yang Tersedia

Anda dapat menambahkan settings kustom di dashboard:

- `welcome_message` - Pesan welcome custom (gunakan {name} untuk nama user)
- `default_response` - Response default untuk pesan (gunakan {message} dan {chat_id})

## 🔧 API Endpoints

### Bot Tokens

- `GET /api/tokens` - Get all tokens
- `GET /api/tokens/:id` - Get single token
- `POST /api/tokens` - Create new token
- `PUT /api/tokens/:id` - Update token
- `DELETE /api/tokens/:id` - Delete token

### Settings

- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get single setting
- `POST /api/settings` - Create new setting
- `PUT /api/settings/:key` - Update setting
- `DELETE /api/settings/:key` - Delete setting

### Logs & Stats

- `GET /api/logs` - Get message logs
- `GET /api/stats` - Get statistics

## 💻 Teknologi

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript (tanpa framework, tidak perlu build)
- **Database**: SQLite dengan better-sqlite3
- **Telegram**: node-telegram-bot-api
- **Styling**: Pure CSS (modern, responsive)

## 📝 Scripts

- `npm start` - Jalankan dashboard server
- `npm run gateway` - Jalankan Telegram gateway
- `npm run setup` - Setup token awal ke database
- `npm run dev` - Jalankan dashboard dengan auto-reload (nodemon)

## 🔒 Keamanan

- Token ditampilkan dalam bentuk masked di dashboard
- Database SQLite file-based (mudah backup)
- Tidak ada authentication built-in (tambahkan jika diperlukan untuk production)

## 📄 Lisensi

MIT License
