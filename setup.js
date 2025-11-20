/**
 * Script setup untuk menambahkan token awal ke database
 */
const { botTokens } = require("./database");

// Token yang diberikan
const TOKEN = "8582107388:AAETHSv5-ITgAYg8DxZKZnJnLnHIG2aB_y0";

function setupToken() {
  console.log("🔧 Setting up initial token...");

  // Check if token already exists
  const existing = botTokens.getAll().find((t) => t.name === "Default Bot");

  if (existing) {
    console.log("📝 Token sudah ada, mengupdate...");
    botTokens.update(existing.id, {
      token: TOKEN,
      is_active: true,
    });
    console.log("✅ Token berhasil diupdate!");
  } else {
    console.log("➕ Membuat token baru...");
    botTokens.create("Default Bot", TOKEN, "Bot token default", true);
    console.log("✅ Token berhasil ditambahkan!");
  }

  console.log("\n🎉 Setup selesai!");
  console.log("\n📋 Langkah selanjutnya:");
  console.log("   1. Jalankan dashboard: npm start");
  console.log("   2. Jalankan gateway: npm run gateway");
  console.log("   3. Buka http://localhost:8000 untuk mengelola via dashboard");
}

setupToken();
