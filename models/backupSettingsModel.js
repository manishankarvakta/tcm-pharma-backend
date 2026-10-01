const mongoose = require("mongoose");

const backupSettingsSchema = new mongoose.Schema(
  {
    autoBackup: { type: Boolean, default: false },
    frequency: { type: String, enum: ["Day", "Week", "Month"], default: "Day" },
    time: { type: String, default: "02:00" }, // 24-hour format HH:mm
    backupType: { type: String, enum: ["Database", "Files", "Full"], default: "Full" },
    syncToDrive: { type: Boolean, default: false },
    driveConnected: { type: Boolean, default: false },
    driveEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BackupSettings", backupSettingsSchema);
