const mongoose = require("mongoose");

const rtvSchema = mongoose.Schema(
  {
    rtvNo: { type: String, require: true },
    supplier: { type: mongoose.Types.ObjectId, ref: "Supplier", require: true },
    products: [
      {
        type: Map,
        of: new mongoose.Schema({
          code: {
            type: mongoose.Types.ObjectId,
            ref: "Product",
            require: true,
          },
          tp: { type: Number, default: 0, require: true },
          mrp: { type: Number, default: 0, require: true },
          priceId: {
            type: mongoose.Types.ObjectId,
            ref: "Price",
            require: true,
          },
          tax: { type: Number, default: 0, require: true },
          qty: { type: Number, default: 0, require: true },
          unit: { type: mongoose.Types.ObjectId, ref: "Unit", require: true },
          discount: {
            type: Number,
            default: 0,
            require: true,
          },
          order: { type: Number, require: true },
        }),
      },
    ],
    note: { type: String },
    doc: { type: String },
    totalItem: { type: Number, default: 0, require: true },
    total: { type: Number, default: 0, require: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User", require: true },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    aamarId: { type: String, require: true },

    status: {
      type: String,
      enum: ["Partial", "Complete"],
    },
  },
  {
    timestamps: true,
  }
);

const Rtv = new mongoose.model("Rtv", rtvSchema);
module.exports = Rtv;
