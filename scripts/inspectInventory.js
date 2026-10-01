const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Inventory = require("../models/inventoryModel");

const DB_URL = process.env.DB_URL;

async function inspect() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        const query = {
            article_code: '5865428545087',
            warehouse: new mongoose.Types.ObjectId('69d6a2ec8fd87910b6dad7f4'),
            aamarId: 'TCM-PHARMA'
        };

        const doc = await Inventory.findOne(query).lean();
        if (doc) {
            console.log("Found Inventory Record:");
            for (const [key, value] of Object.entries(doc)) {
                console.log(`${key}: ${JSON.stringify(value)} (${typeof value})`);
            }
        } else {
            console.log("No inventory record found for query:", JSON.stringify(query));
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

inspect();
