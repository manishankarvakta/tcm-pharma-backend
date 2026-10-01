const { google } = require("googleapis");
const mongoose = require("mongoose");
const path = require("path");
const cron = require("node-cron");
const fs = require("fs");
const os = require("os");
const archiver = require("archiver");
const { format } = require("date-fns");
const axios = require("axios");

const BackupRecord = require("./models/backupRecordModel");
const BackupSettings = require("./models/backupSettingsModel");
const DriveConfig = require("./models/driveConfigModel");
const TelegramConfig = require("./models/telegramConfigModel");

const BACKUP_DIR = path.join(__dirname, "backups");
const UPLOADS_DIR = path.join(__dirname, "uploads");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const sizeInBytes = stats.size;
  if (sizeInBytes < 1024) return sizeInBytes + ' B';
  else if (sizeInBytes < 1024 * 1024) return (sizeInBytes / 1024).toFixed(2) + ' KB';
  else if (sizeInBytes < 1024 * 1024 * 1024) return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
  else return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * Perform native JS backup of MongoDB collections, files, or both.
 * @param {string} type - "Database", "Files", or "Full"
 * @param {boolean} syncToDrive - Whether to upload to drive
 */
async function performBackup(type = "Full", syncToDrive = false) {
  const currentDateTime = new Date();
  const formattedDate = format(currentDateTime, "yyyyMMdd-HHmmss");
  const backupName = `backup-${formattedDate}`;
  const backupFolderPath = path.join(os.tmpdir(), backupName);
  const archivePath = path.join(BACKUP_DIR, `${backupName}.zip`);

  let driveFileId = null;

  try {
    console.log(`Starting ${type} backup at ${currentDateTime}`);

    // Create temporary folder
    if (!fs.existsSync(backupFolderPath)) {
      fs.mkdirSync(backupFolderPath, { recursive: true });
    }

    if (type === "Database" || type === "Full") {
      const db = mongoose.connection.db;
      const collections = await db.collections();
      
      const dbFolderPath = path.join(backupFolderPath, "database");
      fs.mkdirSync(dbFolderPath, { recursive: true });

      for (let collection of collections) {
        const collectionName = collection.collectionName;
        
        // Skip system collections that require elevated privileges
        if (collectionName.startsWith("system.")) continue;

        const documents = await collection.find({}).toArray();
        const filePath = path.join(dbFolderPath, `${collectionName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
      }
    }

    if (type === "Files" || type === "Full") {
      // Just copy the uploads directory to the temp backup folder
      const filesFolderPath = path.join(backupFolderPath, "files");
      fs.mkdirSync(filesFolderPath, { recursive: true });
      if (fs.existsSync(UPLOADS_DIR)) {
        fs.cpSync(UPLOADS_DIR, filesFolderPath, { recursive: true });
      }
    }

    // Create ZIP archive
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", resolve);
      archive.on("error", reject);

      archive.pipe(output);
      archive.directory(backupFolderPath, false);
      archive.finalize();
    });

    console.log(`Backup archive created: ${archivePath}`);
    const sizeStr = getFileSize(archivePath);

    // Upload to Google Drive if required
    if (syncToDrive) {
      try {
        const activeDriveConfig = await DriveConfig.findOne({ isActive: true });
        if (!activeDriveConfig) {
          throw new Error("No active Google Drive configuration found.");
        }
        const auth = authenticateGoogle(activeDriveConfig.serviceAccountJson);
        driveFileId = await uploadToGoogleDrive(auth, archivePath, `${backupName}.zip`, activeDriveConfig.folderId);
      } catch (e) {
        console.error("Drive sync failed", e);
      }
    }

    // Save metadata to DB
    const backupRecord = new BackupRecord({
      name: `${backupName}.zip`,
      type: type,
      size: sizeStr,
      status: "valid",
      driveFileId: driveFileId
    });
    await backupRecord.save();

    // Notify Telegram
    await sendTelegramNotification(true, formattedDate, driveFileId, type);

    // Cleanup: Remove temporary folder, keep the ZIP
    fs.rmSync(backupFolderPath, { recursive: true, force: true });
    
    // We keep the local ZIP for "Available Backups" UI. 
    // If the user deletes from UI, we delete the zip.
    // In old code, zip was deleted. Now we keep it!

    console.log("Backup process completed successfully ✅");
    return { success: true, backup: backupRecord };
  } catch (error) {
    console.error("Backup process failed ❌", error);
    await sendTelegramNotification(false, formattedDate, null, type, error.message);
    
    if (fs.existsSync(backupFolderPath)) {
       fs.rmSync(backupFolderPath, { recursive: true, force: true });
    }
    
    return { success: false, error: error.message };
  }
}

// AUTH Google
const authenticateGoogle = (credentialsStr) => {
  const credentials = JSON.parse(credentialsStr);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: "https://www.googleapis.com/auth/drive",
  });
  return auth;
};

// UPLOAD to Google Drive
const uploadToGoogleDrive = async (auth, filePath, fileName, folderId) => {
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: "application/zip",
    body: fs.createReadStream(filePath),
  };

  const driveService = google.drive({ version: "v3", auth });

  const response = await driveService.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });

  return response.data.id;
};

// Notify Telegram
const sendTelegramNotification = async (success, date, fileId, type, error = "") => {
  try {
    const telegramConfigs = await TelegramConfig.find({ isActive: true });
    
    if (!telegramConfigs || telegramConfigs.length === 0) {
      console.log("Telegram notification skipped: No active Telegram chatbots configured.");
      return;
    }

    const statusEmoji = success ? "✅" : "❌";
    const message = `
${statusEmoji} **TCM Pharmacy - Backup Status**

**Project**: *TCM-PHARMACY*
**Type**: *${type}*
**Status**: *${success ? "Success" : "Failed"}*
**Date**: *${format(new Date(), "dd/MM/yyyy, h:mm a")}*
${success ? (fileId ? `**Drive File ID**: \`${fileId}\`` : "") : `**Error**: \`${error}\``}
    `;

    // Send notification to all active Telegram bots
    for (const config of telegramConfigs) {
      try {
        await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          chat_id: config.chatId,
          text: message,
          parse_mode: "Markdown",
        });
      } catch (err) {
        console.error(`Failed to send Telegram notification to bot ${config.name}:`, err.message);
      }
    }
    console.log(`Telegram notifications sent to ${telegramConfigs.length} active bots.`);
  } catch (err) {
    console.error("Failed to fetch Telegram configurations:", err.message);
  }
};

// Smart Scheduler reading from DB settings every minute
cron.schedule("* * * * *", async () => {
  try {
    const settings = await BackupSettings.findOne();
    if (!settings || !settings.autoBackup) return;

    const currentDay = new Date().getDay(); // 0-6
    const currentDate = new Date().getDate(); // 1-31
    const currentTime = format(new Date(), "HH:mm");
    
    // Debug log to see it ticking
    console.log(`[Cron] Checking Auto-Backup... Current: ${currentTime} | Target: ${settings.time}`);

    if (currentTime !== settings.time) return; // not the right minute

    if (settings.frequency === "Week" && currentDay !== 0) return; // run on Sunday
    if (settings.frequency === "Month" && currentDate !== 1) return; // run on 1st

    console.log(`[Auto-Backup] Target: ${settings.time} | Triggering now!`);
    await performBackup(settings.backupType, settings.syncToDrive);
  } catch (err) {
    console.error("Cron Error", err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Dhaka"
});

module.exports = { performBackup };