const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    warehouseId: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: false, // Made optional for now to avoid breaking existing flows if user is missing
    },

    transactionType: {
      type: String,
      enum: ["PURCHASE", "SALE", "PURCHASE_RETURN", "SALES_RETURN", "ADJUSTMENT", "TRANSFER", "DAMAGE"],
      required: true,
    },
    action: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },
    unitCost: { type: Number },

    referenceType: {
      type: String,
      enum: ["PURCHASE", "SALE", "PURCHASE_RETURN", "SALES_RETURN", "ADJUSTMENT", "TRANSFER", "GRN", "Damage", "RTV", "Sale", "TPN"],
    },
    referenceId: { type: mongoose.Types.ObjectId },

    notes: { type: String },
    openingBalance: { type: Number }, // Stock BEFORE transaction
    quantity: { type: Number, required: true }, // always positive
    balanceAfter: { type: Number },

    // Project specific field for tenancy
    aamarId: { type: String, required: true },

    createdBy: { type: String }, // SYSTEM / POS / MANUAL
  },
  {
    timestamps: true,
  },
);

// Indices
stockLedgerSchema.index({ productId: 1 });
stockLedgerSchema.index({ warehouseId: 1 });
stockLedgerSchema.index({ transactionType: 1 });
stockLedgerSchema.index({ referenceType: 1, referenceId: 1 });
stockLedgerSchema.index({ createdAt: 1 });
// Project specific index
stockLedgerSchema.index({ aamarId: 1 });

const StockLedger = new mongoose.model("StockLedger", stockLedgerSchema);
module.exports = StockLedger;
