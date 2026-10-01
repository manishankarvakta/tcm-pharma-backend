const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Inventory = require("../models/inventoryModel");

const DB_URL = process.env.DB_URL;

async function migrate() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        const numericFields = [
            "currentQty",
            "openingQty",
            "totalQty",
            "salesReturnQty",
            "soldQty",
            "damageQty",
            "rtvQty",
            "tpnQty"
        ];

        for (const field of numericFields) {
            console.log(`Fixing null values for field: ${field}`);
            const result = await Inventory.updateMany(
                { [field]: null },
                { $set: { [field]: 0 } }
            );
            console.log(`Updated ${result.modifiedCount} records for ${field}`);
        }

        console.log("Migration completed successfully!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
