const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const path = require("path");
const fs = require("fs");
const unzipper = require("unzipper");
const { performBackup } = require("../Backup");
const BackupRecord = require("../models/backupRecordModel");
const BackupSettings = require("../models/backupSettingsModel");
const DriveConfig = require("../models/driveConfigModel");
const TelegramConfig = require("../models/telegramConfigModel");

const backupRouter = express.Router();
const BACKUP_DIR = path.join(__dirname, "../backups");
const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Get Settings
backupRouter.get(
  "/settings",
  expressAsyncHandler(async (req, res) => {
    let settings = await BackupSettings.findOne();
    if (!settings) {
      settings = await BackupSettings.create({});
    }
    res.json(settings);
  })
);

// Update Settings
backupRouter.post(
  "/settings",
  expressAsyncHandler(async (req, res) => {
    let settings = await BackupSettings.findOne();
    if (!settings) {
      settings = new BackupSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  })
);

// Get All Backups
backupRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const backups = await BackupRecord.find().sort({ createdAt: -1 });
    res.json(backups);
  })
);

// Create Backup Manually
backupRouter.post(
  "/run",
  expressAsyncHandler(async (req, res) => {
    const { type, syncToDrive } = req.body;
    const settings = await BackupSettings.findOne();
    const shouldSync = syncToDrive !== undefined ? syncToDrive : (settings?.syncToDrive || false);
    const result = await performBackup(type || "Full", shouldSync);
    if (result.success) {
      res.status(200).json({ message: "Backup completed successfully", backup: result.backup });
    } else {
      res.status(500).json({ message: "Backup failed", error: result.error });
    }
  })
);

// Delete Backup
backupRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const backup = await BackupRecord.findById(req.params.id);
    if (backup) {
      const filePath = path.join(BACKUP_DIR, backup.name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await backup.remove();
      res.json({ message: "Backup deleted" });
    } else {
      res.status(404).json({ message: "Backup not found" });
    }
  })
);

// Download Backup
backupRouter.get(
  "/download/:name",
  (req, res) => {
    const filePath = path.join(BACKUP_DIR, req.params.name);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send("File not found");
    }
  }
);

// Upload Backup
backupRouter.post(
  "/upload",
  expressAsyncHandler(async (req, res) => {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const file = req.files.file;
    if (!file.name.endsWith('.zip')) {
      return res.status(400).json({ message: "Only ZIP files are allowed" });
    }

    const backupName = file.name;
    const filePath = path.join(BACKUP_DIR, backupName);
    
    await file.mv(filePath);

    // simple metadata creation
    const stats = fs.statSync(filePath);
    const sizeInBytes = stats.size;
    let sizeStr = sizeInBytes + ' B';
    if (sizeInBytes >= 1024 * 1024 * 1024) sizeStr = (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    else if (sizeInBytes >= 1024 * 1024) sizeStr = (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
    else if (sizeInBytes >= 1024) sizeStr = (sizeInBytes / 1024).toFixed(2) + ' KB';

    let detectedType = "Full";
    if (backupName.toLowerCase().includes("database")) detectedType = "Database";
    if (backupName.toLowerCase().includes("files")) detectedType = "Files";

    const backupRecord = new BackupRecord({
      name: backupName,
      type: detectedType,
      size: sizeStr,
      status: "valid"
    });
    await backupRecord.save();

    res.json({ message: "File uploaded successfully", backup: backupRecord });
  })
);

// Restore Backup
backupRouter.post(
  "/restore/:id",
  expressAsyncHandler(async (req, res) => {
    const backup = await BackupRecord.findById(req.params.id);
    if (!backup) return res.status(404).json({ message: "Backup not found" });

    const archivePath = path.join(BACKUP_DIR, backup.name);
    if (!fs.existsSync(archivePath)) return res.status(404).json({ message: "Backup file missing" });

    const extractDir = path.join(BACKUP_DIR, "temp_restore");
    if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir);

    try {
      await fs.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .promise();
        
      const mongoose = require("mongoose");
      const db = mongoose.connection.db;

      // if Full or Database, restore DB
      const dbPath = path.join(extractDir, "database");
      if (fs.existsSync(dbPath)) {
        const collections = fs.readdirSync(dbPath);
        for (let file of collections) {
          if (file.endsWith(".json")) {
            const colName = file.replace(".json", "");
            const { ObjectId } = require("mongodb");
            const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
            
            const data = JSON.parse(fs.readFileSync(path.join(dbPath, file), "utf-8"), (key, value) => {
              if (typeof value === "string") {
                if (isoDateRegex.test(value)) {
                  return new Date(value);
                }
                if (key === "_id" && value.length === 24 && /^[0-9a-fA-F]{24}$/.test(value)) {
                  return new ObjectId(value);
                }
              }
              return value;
            });
            
            // clear collection
            try { await db.collection(colName).deleteMany({}); } catch(e){}
            // insert data
            if (data.length > 0) {
              await db.collection(colName).insertMany(data);
            }
          }
        }
      }

      // if Full or Files, restore files
      const filesPath = path.join(extractDir, "files");
      if (fs.existsSync(filesPath)) {
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
        fs.cpSync(filesPath, UPLOADS_DIR, { recursive: true });
      }

      fs.rmSync(extractDir, { recursive: true, force: true });
      res.json({ message: "Restore completed successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Restore failed", error: e.message });
    }
  })
);

// --- Drive Config Routes ---
backupRouter.get(
  "/drive-configs",
  expressAsyncHandler(async (req, res) => {
    const configs = await DriveConfig.find().sort({ createdAt: -1 });
    res.json(configs);
  })
);

backupRouter.post(
  "/drive-configs",
  expressAsyncHandler(async (req, res) => {
    const count = await DriveConfig.countDocuments();
    const newConfig = new DriveConfig({
      ...req.body,
      isActive: count === 0 ? true : false,
    });
    await newConfig.save();
    res.json(newConfig);
  })
);

backupRouter.put(
  "/drive-configs/:id",
  expressAsyncHandler(async (req, res) => {
    const config = await DriveConfig.findById(req.params.id);
    if (config) {
      if (req.body.isActive) {
        await DriveConfig.updateMany({}, { isActive: false });
      }
      Object.assign(config, req.body);
      await config.save();
      res.json(config);
    } else {
      res.status(404).json({ message: "Drive config not found" });
    }
  })
);

backupRouter.delete(
  "/drive-configs/:id",
  expressAsyncHandler(async (req, res) => {
    const config = await DriveConfig.findById(req.params.id);
    if (config) {
      await config.remove();
      if (config.isActive) {
        const nextConfig = await DriveConfig.findOne();
        if (nextConfig) {
          nextConfig.isActive = true;
          await nextConfig.save();
        }
      }
      res.json({ message: "Drive config deleted" });
    } else {
      res.status(404).json({ message: "Drive config not found" });
    }
  })
);

// --- Telegram Config Routes ---
backupRouter.get(
  "/telegram-configs",
  expressAsyncHandler(async (req, res) => {
    const configs = await TelegramConfig.find().sort({ createdAt: -1 });
    res.json(configs);
  })
);

backupRouter.post(
  "/telegram-configs",
  expressAsyncHandler(async (req, res) => {
    const newConfig = new TelegramConfig({
      ...req.body,
    });
    await newConfig.save();
    res.json(newConfig);
  })
);

backupRouter.put(
  "/telegram-configs/:id",
  expressAsyncHandler(async (req, res) => {
    const config = await TelegramConfig.findById(req.params.id);
    if (config) {
      Object.assign(config, req.body);
      await config.save();
      res.json(config);
    } else {
      res.status(404).json({ message: "Telegram config not found" });
    }
  })
);

backupRouter.delete(
  "/telegram-configs/:id",
  expressAsyncHandler(async (req, res) => {
    const config = await TelegramConfig.findById(req.params.id);
    if (config) {
      await config.remove();
      res.json({ message: "Telegram config deleted" });
    } else {
      res.status(404).json({ message: "Telegram config not found" });
    }
  })
);

module.exports = backupRouter;
