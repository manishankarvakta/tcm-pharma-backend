const mongoose = require("mongoose");

const accountSchema = mongoose.Schema(
  {
    acId: { type: String, require: true },
    supplier: { type: mongoose.Types.ObjectId, ref: "Supplier" },
    aamarId: { type: String, require: true },

    paidAmount: new mongoose.Schema({
      cash: {
        phone: { type: String },
        // amount: { type: Number },
      },
      mfs: {
        type: { type: String },
        phone: { type: String },
        // amount: { type: Number },
      },
      card: {
        type: { type: String },
        cardNo: { type: String },
        // amount: { type: Number },
      },
      cheque: {
        bank: { type: String },
        chequeNo: { type: String },
        // amount: { type: Number },
      },
    }),
    paidTo: { type: String },
    name: { type: String },
    photo: { type: String },
    accountHead: { type: mongoose.Types.ObjectId, ref: "AccountHead" },
    user: { type: mongoose.Types.ObjectId, ref: "User" },
    date: { type: String },
    toDate: { type: String },
    fromDate: { type: String },
    amount: { type: String },
    due: { type: String },
    type: { type: String, enum: ["Debit", "Credit"] },
    paymentType: { type: String, enum: ["Advance", "Payment"] },
    paymentMethodType: {
      type: String,
      enum: ["Cash", "Card", "Cheque", "MFS"],
    },
    grnId: { type: mongoose.Types.ObjectId, ref: "Grn" },
    poId: { type: mongoose.Types.ObjectId, ref: "Purchase" },
    note: { type: String },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

const Account = new mongoose.model("Account", accountSchema);
module.exports = Account;