require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const BackupSettings = require("./models/backupSettingsModel");
const DriveConfig = require("./models/driveConfigModel");
const TelegramConfig = require("./models/telegramConfigModel");

// Hardcoded values from the legacy system
const TELEGRAM_BOT_TOKEN = "7754866323:AAF6kHkEKyNM65Ps3hVBZ9_dHjynunURKjw";
const TELEGRAM_CHAT_ID = "877939799";
const GOOGLE_DRIVE_FOLDER_ID = "1o8JuFbTlQFdIM9VYWHarR67s_GECtrQb";

async function seed() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to Database...");

    // 1. Seed Telegram Configuration into TelegramConfig
    const telegramCount = await TelegramConfig.countDocuments();
    if (telegramCount === 0) {
      const telegramConfig = new TelegramConfig({
        name: "Legacy Primary Bot",
        botToken: TELEGRAM_BOT_TOKEN,
        chatId: TELEGRAM_CHAT_ID,
        isActive: true,
      });
      await telegramConfig.save();
      console.log("✅ Telegram configuration seeded into TelegramConfig.");
    } else {
      console.log("ℹ️ Telegram configurations already exist. Skipping Telegram seed.");
    }

    // 2. Seed Google Drive Configuration into DriveConfig
    const driveKeyFile = path.join(__dirname, "utility", "google-service-account.json");
    let serviceAccountJson = "";
    
    if (fs.existsSync(driveKeyFile)) {
      serviceAccountJson = fs.readFileSync(driveKeyFile, "utf-8");
    } else {
      console.log("⚠️ google-service-account.json not found, using an empty template.");
      serviceAccountJson = '{"type": "service_account"}';
    }

    const configCount = await DriveConfig.countDocuments();
    if (configCount === 0) {
      const driveConfig = new DriveConfig({
        name: "Default Google Drive",
        folderId: GOOGLE_DRIVE_FOLDER_ID,
        serviceAccountJson: serviceAccountJson,
        isActive: true,
      });
      await driveConfig.save();
      console.log("✅ Default Google Drive configuration seeded.");
    } else {
      console.log("ℹ️ Google Drive configurations already exist. Skipping Drive seed.");
    }

    console.log("🎉 Seed process completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seed();
