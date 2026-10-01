const mongoose = require("mongoose");

const companySchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    type: { type: String }, //business type
    address: { type: String },
    website: { type: String },
    aamarId: { type: String, require: true },

    social: [{ type: String }],
    doc: [{ type: String }],
    phone: { type: Number, require: true },
    email: { type: String, require: true },
    regNo: { type: String },
    userId: { type: mongoose.Types.ObjectId, ref: "User", require: true },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
    },
  },
  {
    timestamps: true,
  }
);

const Company = new mongoose.model("Company", companySchema);
module.exports = Company;
