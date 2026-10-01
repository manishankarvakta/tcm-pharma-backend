const mongoose = require("mongoose");

const telegramConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    botToken: {
      type: String,
      required: true,
      trim: true,
    },
    chatId: {
      type: String,
      required: true,
      trim: true,
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

module.exports = mongoose.model("TelegramConfig", telegramConfigSchema);
