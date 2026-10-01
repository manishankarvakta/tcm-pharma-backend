const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const Inventory = require("./models/inventoryModel");

async function sanitize() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected successfully.");

    const fieldsToSanitize = [
      "currentQty",
      "openingQty",
      "totalQty",
      "salesReturnQty",
      "soldQty",
      "damageQty",
      "rtvQty",
      "tpnQty",
      "adjustQty",
      "closingStock"
    ];

    for (const field of fieldsToSanitize) {
      console.log(`Sanitizing field: ${field}...`);
      const result = await Inventory.updateMany(
        { [field]: null },
        { $set: { [field]: 0 } }
      );
      console.log(`Updated ${result.modifiedCount} documents for ${field}.`);
    }

    console.log("Sanitization complete.");
    process.exit(0);
  } catch (error) {
    console.error("Sanitization failed:", error);
    process.exit(1);
  }
}

sanitize();
