const mongoose = require("mongoose");

const inventoryCountSchema = mongoose.Schema(
  {
    article_code: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      require: true,
    },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    aamarId: { type: String, require: true },

    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "Supplier",
    },
    qty: { type: Number, require: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

const InventoryCount = new mongoose.model(
  "InventoryCount",
  inventoryCountSchema
);
module.exports = InventoryCount;
