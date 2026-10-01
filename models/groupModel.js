const mongoose = require("mongoose");

const groupSchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    code: { type: String, require: true },
    symbol: { type: String },
    photo: { type: String },
    details: { type: String },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    aamarId: { type: String, require: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ name: 1, aamarId: 1 }, { unique: true }); // phone + aamarId
groupSchema.index({ code: 1, aamarId: 1 }, { unique: true }); // phone + aamarId

const Group = new mongoose.model("Group", groupSchema);
module.exports = Group;
