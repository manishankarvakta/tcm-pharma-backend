const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: { 
      type: String, 
      require: true 
    },
    email: { 
      type: String, 
      require: true, 
      unique: true 
    },
    username: { 
      type: String, 
      require: true, 
      unique: true 
    },
    password: { 
      type: String, 
      require: true 
    },
    type: { 
      type: String, 
      require: true 
    },
    privilege: { 
      type: Object 
    },
    address: { 
      type: String 
    },
    phone: { 
      type: String, 
      require: true, 
      unique: true 
    },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    aamarId: { type: String, require: true },
    status: { type: String, enum: ["active", "inactive"] },
  },
  {
    timestamps: true,
  }
);

const User = new mongoose.model("User", userSchema);
module.exports = User;
