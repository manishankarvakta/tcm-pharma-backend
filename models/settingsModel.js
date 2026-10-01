const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    aamarId: { type: String, required: true },

    //TODO:: package ID ::>
    pId: { type: String },

    storeName: { type: String },
    businessType: { type: String },
    licenseNumber: { type: String },
    currency: { type: String },
    lang: { type: String },
    storePhoto: { type: String },
    posScreen: { type: String, default: "pos" },
    email: { type: String },
    phone: { type: String },
    address: {
      street: { type: String }, // Street Address
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      post: { type: String },
      country: { type: String }
    },
    websiteUrl: { type: String },
    defaultSupplier: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "Supplier" },
    defaultCustomer: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "Customer" },
    binNumber: { type: String },
    vatPercentage: { type: Number, default: 0 },
    royaltyAmount: { type: Number, default: 0 },
    royaltyPoint: { type: Number, default: 1 },
    enableTaxExemptions: { type: Boolean, default: false },
    // TODO::IsEnableApi
    isEnableApi: { type: Boolean, default: false },
    invoiceIdPrefix: { type: String, default: "AID" },
    defaultInvoiceSize: {
      type: String,
      enum: ["88", "85"], // Added 88 and 85 as valid values
      default: "88" // Default remains "Thermal"
    },
    paymentMethods: [
      {
        type: Map,
        of: new mongoose.Schema({
          id: { type: String }, // Payment method ID
          order: { type: String }, // Payment method ID
          name: { type: String }, // Display name
          type: { type: String } // Type of method (e.g., Card, Mobile Wallet)
        })
      }
    ],
    status: { type: String, enum: ["active", "inactive"], default: "active" },

    updateUser: { type: mongoose.Types.ObjectId, ref: "User" }
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

settingsSchema.index({ email: 1, aamarId: 1 }, { unique: true }); // email + aamarId
settingsSchema.index({ phone: 1, aamarId: 1 }, { unique: true }); // phone + aamarId

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
