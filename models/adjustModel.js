const mongoose = require("mongoose");

const adjustSchema = mongoose.Schema(
  {
    adjustNo: { type: String, require: true },
    products: [
      {
        type: Map,
        of: new mongoose.Schema({
          id: { type: mongoose.Types.ObjectId, ref: "Product" },
          priceId: { type: mongoose.Types.ObjectId, ref: "Price" },
          qty: { type: Number, require: true },
          actualQty: { type: Number },
          currentStock: { type: Number },
          article_code: { type: String, require: true },
          name: { type: String, require: true },
          tp: { type: String, require: true },
          reason: { type: String },
          type: { type: Boolean, require: true, default: true },
        }),
      },
    ],
    //TODO:warehouse
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    note: { type: String },
    total: { type: Number, require: true },
    totalItem: { type: Number, require: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User", require: true },
    print: {
      type: Boolean,
      default: false,
    },
    aamarId: { type: String, require: true },
    status: {
      type: String,
      enum: ["active", "inactive", "Canceled"],
    },
  },
  {
    timestamps: true,
  }
);

const Adjust = new mongoose.model("Adjust", adjustSchema);
module.exports = Adjust;
