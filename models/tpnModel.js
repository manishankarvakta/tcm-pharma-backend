const mongoose = require("mongoose");

const tpnSchema = mongoose.Schema(
  {
    tpnNo: { type: String, require: true },
    aamarId: { type: String, require: true },
    warehouseTo: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    warehouseFrom: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
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
          tax: { type: Number, default: 0, require: true },
          qty: { type: Number, default: 0, require: true },
          unit: { type: mongoose.Types.ObjectId, ref: "Unit", require: true },
          // discount: {
          //   type: Number,
          //   default: 0,
          //   require: true,
          // },
          order: { type: Number, require: true },
        }),
      },
    ],
    type: { type: String },
    note: { type: String },
    doc: { type: String },
    totalItem: { type: Number, default: 0, require: true },
    total: { type: Number, default: 0, require: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User", require: true },
    status: {
      type: String,
      enum: ["Pending", "Partial", "Complete"],
    },
    shipping_cost: { type: Number, default: 0, require: true },
  },
  {
    timestamps: true,
  }
);

const Tpn = new mongoose.model("Tpn", tpnSchema);
module.exports = Tpn;
