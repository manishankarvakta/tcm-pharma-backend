const mongoose = require("mongoose");

const backupRecordSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["Database", "Files", "Full"], required: true },
    size: { type: String, required: true },
    status: { type: String, enum: ["valid", "invalid", "failed"], default: "valid" },
    driveFileId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BackupRecord", backupRecordSchema);
