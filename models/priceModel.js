const mongoose = require("mongoose");

const priceSchema = mongoose.Schema(
  {
    article_code: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      require: true,
    },
    supplier: { type: mongoose.Types.ObjectId, ref: "Supplier", require: true },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    aamarId: { type: String, require: true },

    inventoryId: { type: mongoose.Types.ObjectId, ref: "Price", require: true },
    tp: { type: Number, require: true },
    mrp: { type: Number, require: true },
    order: { type: String },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

const Price = new mongoose.model("Price", priceSchema);
module.exports = Price;
