const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    name: { type: String, require: true },
    code: { type: String, require: true, unique: true },
    mcId: { type: Number, require: true },
    mc: { type: mongoose.Types.ObjectId, ref: "Category" },
    aamarId: { type: String, require: true },

    group: { type: String },
    photo: { type: String },
    description: { type: String },
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

const Category = new mongoose.model("Category", categorySchema);
module.exports = Category;
