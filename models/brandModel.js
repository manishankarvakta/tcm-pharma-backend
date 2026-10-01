const mongoose = require("mongoose");

const brandSchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    code: { type: String, require: true },
    photo: { type: String },
    aamarId: { type: String, require: true },

    details: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true,
  }
);
brandSchema.index({ name: 1, aamarId: 1 }, { unique: true }); // phone + aamarId
brandSchema.index({ code: 1, aamarId: 1 }, { unique: true }); // phone + aamarId
const Brand = new mongoose.model("Brand", brandSchema);
module.exports = Brand;
