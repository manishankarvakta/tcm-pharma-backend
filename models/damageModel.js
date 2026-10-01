const mongoose = require("mongoose");

const damageSchema = mongoose.Schema(
  {
    damageNo: { type: String, require: true },
    products: [
      {
        type: Map,
        of: new mongoose.Schema({
          qty: { type: Number, require: true },
          article_code: { type: String, require: true },
          id: { type: mongoose.Types.ObjectId, ref: "Product", require: true },
          name: { type: String, require: true },
          tp: { type: String, require: true },
          mrp: { type: String, require: true },
          reason: { type: String },
        }),
      },
    ],
    note: { type: String },
    total: { type: Number, require: true },
    totalItem: { type: Number, require: true },
    userId: { type: mongoose.Types.ObjectId, ref: "User", require: true },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    aamarId: { type: String, require: true },

    status: {
      type: String,
      enum: ["active", "inactive"],
    },
  },
  {
    timestamps: true,
  }
);

const Damage = new mongoose.model("Damage", damageSchema);
module.exports = Damage;
