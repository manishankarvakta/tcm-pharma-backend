const mongoose = require("mongoose");

const accountHeadSchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    code: { type: String, require: true },
    aamarId: { type: String, require: true },

    maId: { type: mongoose.Types.ObjectId, ref: "AccountHead" },
    photo: { type: String },
    description: { type: String },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

const AccountHead = new mongoose.model("AccountHead", accountHeadSchema);
module.exports = AccountHead;
