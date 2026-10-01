const mongoose = require("mongoose");

const supplierSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    name: { type: String },
    email: { type: String },
    code: { type: String, require: true },
    company: { type: String },
    aamarId: { type: String, require: true },

    products: [
      {
        type: Map,
        of: new mongoose.Schema({
          id: { type: mongoose.Types.ObjectId, ref: "Product", require: true },
          ean: { type: String, require: true },
          article_code: { type: String, require: true },
          name: { type: String, require: true },
          qty: { type: String, require: true },
          // group: { type: String, require: true },
          brand: { type: String, require: true },
          generic: { type: String, require: true },
          unit: { type: String, require: true },
          order: { type: Number, require: true },
        }),
      },
    ],
    address: { type: String },
    type: { type: String },
    phone: { type: String },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

supplierSchema.index({ code: 1, aamarId: 1 }, { unique: true }); // code + aamarId

const Supplier = new mongoose.model("Supplier", supplierSchema);
module.exports = Supplier;
