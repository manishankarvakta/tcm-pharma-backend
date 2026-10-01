const mongoose = require("mongoose");

const saleSchema = mongoose.Schema(
  {
    invoiceId: { type: String, require: true },
    source: { type: String, enum: ["web", "POS", "app"], require: true },
    note: { type: String },
    // delivery_address: { type: String, require: true },
    //TODO:warehouse
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    products: [
      {
        type: Map,
        of: new mongoose.Schema({
          id: { type: mongoose.Types.ObjectId, require: true, ref: "Products" },
          tp: { type: Number, require: true },
          mrp: { type: Number, require: true },
          priceId: {
            type: mongoose.Types.ObjectId,
            require: true,
            ref: "Price",
          },
          supplier: {
            type: String,
            require: true,
          },
          article_code: { type: String, require: true },
          order: { type: Number, require: true },
          vat: { type: Number, require: true },
          qty: { type: Number, require: true },
          promo_price: { type: String },
          promo_type: { type: Boolean, default: false },
          promo_start: { type: Date },
          aamarId: { type: String },
          warehouse: {
            type: mongoose.Types.ObjectId,
            ref: "Warehouse",
            require: true,
          },
          promo_end: { type: Date },
        }),
      },
    ],
    returnProducts: [
      {
        type: Map,
        of: new mongoose.Schema({
          id: { type: mongoose.Types.ObjectId, require: true, ref: "Products" },
          tp: { type: Number, require: true },
          mrp: { type: Number, require: true },
          aamarId: { type: String },
          warehouse: {
            type: mongoose.Types.ObjectId,
            ref: "Warehouse",
            require: true,
          },
          priceId: {
            type: mongoose.Types.ObjectId,
            require: true,
            ref: "Price",
          },
          supplier: {
            type: String,
            require: true,
          },
          order: { type: Number, require: true },
          vat: { type: Number, require: true },
          qty: { type: Number, require: true },
        }),
      },
    ],
    returnCal: {
      totalItem: { type: Number },
      total: { type: Number },
      vatAmount: { type: Number },
      grossTotal: { type: Number },
      grossTotalRound: { type: Number },
      point: { type: Number },
    },
    returnInvoice: {
      type: mongoose.Types.ObjectId,
      ref: "Sale",
      // sparse: true,
      default: null,
    },
    paidAmount: new mongoose.Schema({
      cash: { type: Number },
      mfs: {
        name: { type: String },
        amount: { type: Number },
      },
      card: {
        name: { type: String },
        amount: { type: Number },
      },
      point: { type: Number },
    }),
    changeAmount: { type: Number, require: true },
    totalReceived: { type: Number, require: true },
    grossTotal: { type: Number, require: true },
    grossTotalRound: { type: Number, require: true },
    totalItem: { type: Number, require: true },
    total: { type: Number, require: true },
    vat: { type: Number, require: true },
    point: {
      old: { type: Number },
      new: { type: Number },
    },
    todayPoint: { type: Number },
    discount: { type: Number, require: true },
    promo_discount: { type: Number },
    due: { type: Boolean },
    billType: { type: String, enum: ["due", "paid"] },
    billerId: { type: mongoose.Types.ObjectId, require: true, ref: "User" },
    delivery: {
      address: {
        holdingNo: { type: String },
        sector: { type: String },
        street: { type: String },
        town: { type: String },
        city: { type: String },
        division: { type: String },
        country: { type: String },
        zipCode: { type: String },
      },
      phone: { type: String },
    },
    delivery_charge: { type: Number },
    group: {
      type: mongoose.Types.ObjectId,
      require: true,
      ref: "Group",
    },
    customerId: {
      type: mongoose.Types.ObjectId,
      require: true,
      ref: "Customer",
    },
    updateUser: { type: mongoose.Types.ObjectId, ref: "User" },
    aamarId: { type: String, require: true },
    status: {
      type: String,
      enum: [
        "order",
        "process",
        "confirm",
        "complete",
        "delete",
        "cancel",
        "deliver",
      ],
    },
  },
  {
    timestamps: true,
  }
);

const Sale = new mongoose.model("Sale", saleSchema);
module.exports = Sale;
