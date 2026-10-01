const mongoose = require("mongoose");

const genericSchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    code: { type: String, require: true },
    photo: { type: String },
    details: { type: String },
    aamarId: { type: String, require: true },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true,
  }
);

genericSchema.index({ name: 1, aamarId: 1 }, { unique: true }); // phone + aamarId
genericSchema.index({ code: 1, aamarId: 1 }, { unique: true }); // phone + aamarId
const Generic = new mongoose.model("Generic", genericSchema);
module.exports = Generic;
