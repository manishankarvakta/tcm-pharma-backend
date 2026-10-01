const mongoose = require("mongoose");

// const priceTable

const inventorySchema = new mongoose.Schema(
  {
    article_code: { type: String, require: true }, //article_code
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    product: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      // require: true,
    },
    aamarId: { type: String, require: true },

    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    name: { type: String, require: true },
    currentQty: { type: Number, require: true, default: 0 },
    openingQty: { type: Number, require: true, default: 0 },
    totalQty: { type: Number, require: true, default: 0 },
    salesReturnQty: { type: Number, require: true, default: 0 },
    soldQty: { type: Number, require: true, default: 0 },
    damageQty: { type: Number, require: true, default: 0 },
    rtvQty: { type: Number, require: true, default: 0 },

    tpnQty: { type: Number, require: true, default: 0 },
    adjustQty: { type: Number, require: true, default: 0 },
    closingStock: { type: Number, require: true, default: 0 },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

inventorySchema.index({ article_code: 1, warehouse: 1 }, { unique: true }); // phone + aamarId

const Inventory = new mongoose.model("Inventory", inventorySchema);
module.exports = Inventory;
