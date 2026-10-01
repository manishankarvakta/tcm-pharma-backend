const mongoose = require("mongoose");

const warehouseSchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    code: { type: String, require: true, unique: true },
    address: { type: String, require: true },
    company: { type: String },
    type: { type: String, enum: ["Outlet", "Warehouse"] },
    aamarId: { type: String, require: true },
    phone: { type: String },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

const Warehouse = new mongoose.model("Warehouse", warehouseSchema);
module.exports = Warehouse;
