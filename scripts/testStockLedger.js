const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { createStockLedgerEntry } = require("../utility/stockLedgerHelper");
const Product = require("../models/productModel");
const StockLedger = require("../models/stockLedgerModel");

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/aamar_dokan_pharma"; 

async function runTest() {
    try {
        console.log("Connecting to DB...", DB_URL);
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        // 1. Create a dummy product
        const product = await Product.create({
            name: "Test Product Ledger " + Date.now(),
            article_code: "TEST-LEDGER-" + Date.now(),
            stock: 0,
            unit: "PCS",
            purchase_price: 100,
            sale_price: 150,
            aamarId: "TEST-STORE",
            status: "active"
        });
        console.log("Created Product:", product._id);

        // 2. Add Stock via Ledger
        console.log("Adding 10 stock...");
        await createStockLedgerEntry({
            productId: product._id,
            transactionType: "ADJUSTMENT",
            action: "IN",
            quantity: 10,
            notes: "Initial Test Stock",
            aamarId: "TEST-STORE"
        });

        // 3. Verify Product Stock
        const updatedProduct = await Product.findById(product._id);
        console.log("Product Stock after IN:", updatedProduct.stock);
        if (updatedProduct.stock !== 10) throw new Error("Stock mismatch after IN. Expected 10, got " + updatedProduct.stock);

        // 4. Remove Stock via Ledger
        console.log("Removing 3 stock...");
        await createStockLedgerEntry({
            productId: product._id,
            transactionType: "SALE",
            action: "OUT",
            quantity: 3,
            notes: "Test Sale",
            aamarId: "TEST-STORE"
        });

        // 5. Verify Product Stock
        const finalProduct = await Product.findById(product._id);
        console.log("Product Stock after OUT:", finalProduct.stock);
        if (finalProduct.stock !== 7) throw new Error("Stock mismatch after OUT. Expected 7, got " + finalProduct.stock);

        // 6. Verify Ledger Entries
        const entries = await StockLedger.find({ productId: product._id }).sort({ createdAt: 1 });
        console.log("Ledger Entries:", entries.length);
        if (entries.length !== 2) throw new Error("Ledger entry count mismatch. Expected 2, got " + entries.length);
        
        console.log("Entry 1 Balance:", entries[0].balanceAfter); // Should be 10
        console.log("Entry 2 Balance:", entries[1].balanceAfter); // Should be 7

        if (entries[0].balanceAfter !== 10) throw new Error("Entry 1 balance mismatch");
        if (entries[1].balanceAfter !== 7) throw new Error("Entry 2 balance mismatch");

        console.log("TEST PASSED!");

        // Cleanup
        await Product.deleteOne({ _id: product._id });
        await StockLedger.deleteMany({ productId: product._id });
        console.log("Cleanup done.");

    } catch (err) {
        console.error("TEST FAILED:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
