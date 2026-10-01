const mongoose = require("mongoose");

const purchaseProductSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    article_code: { type: String, required: true },
    name: { type: String },
    tp: { type: Number, default: 0, required: true },
    mrp: { type: Number, default: 0, required: true },
    tax: { type: Number, default: 0, required: true },
    qty: { type: Number, default: 0, required: true },
    unit: {
      type: String,
      set: (v) => {
        if (v === undefined || v === null) return v;
        if (Array.isArray(v)) {
          if (v.length === 0) return "";
          const first = v[0];
          if (typeof first === "object" && first !== null) {
            return first.symbol || first.name || "";
          }
          return String(first);
        }
        if (typeof v === "object") {
          return v.symbol || v.name || "";
        }
        return String(v);
      },
    },
    discount: {
      type: Number,
      default: 0,
      required: true,
    },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const purchaseSchema = mongoose.Schema(
  {
    poNo: { type: String, required: true },
    supplier: { type: mongoose.Types.ObjectId, ref: "Supplier", required: true },
    products: [purchaseProductSchema],
    type: { type: String },
    note: { type: String },
    doc: { type: String },
    totalItem: { type: Number, default: 0, required: true },
    total: { type: Number, default: 0, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    shipping_cost: { type: Number, default: 0 },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    aamarId: { type: String, required: true },

    status: {
      type: String,
      enum: ["Pending", "Ordered", "Received", "Canceled"],
    },
  },
  {
    timestamps: true,
  }
);

const Purchase = new mongoose.model("Purchase", purchaseSchema);
module.exports = Purchase;
