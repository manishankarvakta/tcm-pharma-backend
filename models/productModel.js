const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    article_code: {
      type: String,
      require: true,
      unique: true,
      index: true,
      unique: true,
    },
    aamarId: { type: String, require: true },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    generic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Generic",
      default: null,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    currentQty: { type: Number, require: true },
    tp: { type: String, require: true },
    mrp: { type: String, require: true },
    profit: { type: String, require: true },
    details: { type: String },
    unit: { type: String, require: true },

    alert_qty: { type: String, require: true },
    pcsBox: { type: String },
    size: { type: String, require: true },
    // product_type: { type: String, enum: ["mg", "ml"], require: true },
    minQty: { type: String, require: true },
    maxQty: { type: String, require: true },
    vat: { type: String, require: true },
    vat_method: { type: Boolean, require: true, default: false },
    discount: { type: String, require: true },
    discount_type: { type: Boolean, require: true, default: false },
    hide_website: { type: Boolean, require: true },
    photo: { type: String },
    details: { type: String },
    type: { type: String, enum: ["LOCAL", "FOREIGN"], require: true },
    shipping_method: { type: String, enum: ["cod", "free", "uttara"] },
    status: { type: String, enum: ["active", "inactive"] },
    stock: { type: Number, default: 0 }, // DEPRECATED: Use Inventory model for warehouse-wise stock management
    supplier: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ article_code: 1, aamarId: 1 }, { unique: true }); // article_code + aamarId

const Product = new mongoose.model("Product", productSchema);

productSchema.method = {
  findActive: function () {
    return mongoose.model("Product");
  },
};

module.exports = Product;
