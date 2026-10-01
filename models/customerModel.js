const mongoose = require("mongoose");

const customerSchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    email: { type: String },
    username: { type: String },
    password: { type: String },
    membership: { type: String },
    aamarId: { type: String, require: true },
    dob: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    address: [
      {
        type: Map,
        of: new mongoose.Schema({
          id: { type: String },
          type: {
            type: String,
            enum: ["Home", "Work", "Other"],
            default: "Home",
          },
          holdingNo: { type: String },
          sector: { type: String },
          street: { type: String },
          town: { type: String },
          city: { type: String },
          division: { type: String },
          country: { type: String },
          zipCode: { type: String },
        }),
      },
    ],
    // address: { type: String },
    type: {
      type: String,
      enum: ["regular", "premium", "vip"],
      default: "regular",
    },
    point: { type: Number, default: 0 },
    phone: { type: String, require: true},
    photo: { type: String },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ phone: 1, aamarId: 1 }, { unique: true }); // phone + aamarId
customerSchema.index({ email: 1, aamarId: 1 }, { unique: true }); // email + aamarId

const Customer = new mongoose.model("Customer", customerSchema);
module.exports = Customer;
