const mongoose = require("mongoose");

const driveConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    folderId: {
      type: String,
      required: true,
      trim: true,
    },
    serviceAccountJson: {
      type: String, // Stringified JSON
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DriveConfig", driveConfigSchema);
