const mongoose = require("mongoose");

const grnProductSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    article_code: { type: String, required: true },
    newPrice: { type: Boolean },
    tp: { type: String, default: "0", required: true },
    mrp: { type: String, default: "0", required: true },
    tax: { type: String, default: "0", required: true },
    qty: { type: String, default: "0", required: true },
    discount: {
      type: String,
      default: "0",
      required: true,
    },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const grnSchema = mongoose.Schema(
  {
    grnNo: { type: String, required: true },
    poNo: { type: mongoose.Types.ObjectId, ref: "Purchase" },
    tpnNo: { type: mongoose.Types.ObjectId, ref: "Tpn" },
    supplier: { type: mongoose.Types.ObjectId, ref: "Supplier" },
    products: [grnProductSchema],
    note: { type: String },
    doc: { type: String },
    totalItem: { type: Number, default: 0, required: true },
    total: { type: Number, default: 0, required: true },
    grossTotal: { type: Number, default: 0, required: true },
    discount: { type: Number, default: 0, required: true },
    tax: { type: Number, default: 0, required: true },
    shipping_cost: { type: Number, default: 0 },
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    aamarId: { type: String, required: true },

    status: {
      type: String,
      enum: ["Partial", "Complete", "Deleted"],
    },
  },
  {
    timestamps: true,
  }
);

const Grn = new mongoose.model("Grn", grnSchema);
module.exports = Grn;
