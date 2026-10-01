const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { createStockLedgerEntry } = require("../utility/stockLedgerHelper");
const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const StockLedger = require("../models/stockLedgerModel");

const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/aamar_dokan_pharma";

async function runTest() {
    try {
        console.log("Connecting to DB...", DB_URL);
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        const testAamarId = "VERIFY-TEST";
        const testWarehouseId = new mongoose.Types.ObjectId();

        // 1. Create a test product
        console.log("Creating test product...");
        const product = await Product.create({
            name: "Verify Inventory Fix Product " + Date.now(),
            article_code: "VERIFY-" + Date.now(),
            stock: 0,
            currentQty: 0,
            tp: "100",
            mrp: "150",
            profit: "50",
            unit: "PCS",
            alert_qty: "5",
            minQty: "1",
            maxQty: "100",
            vat: "0",
            hide_website: false,
            type: "LOCAL",
            status: "active",
            aamarId: testAamarId
        });
        console.log("Created Product ID:", product._id);

        // 2. Add 10 stock via GRN (PURCHASE)
        console.log("Adding 10 stock via PURCHASE...");
        await createStockLedgerEntry({
            productId: product._id,
            warehouseId: testWarehouseId,
            transactionType: "PURCHASE",
            action: "IN",
            quantity: 10,
            referenceType: "GRN",
            referenceId: new mongoose.Types.ObjectId().toString(),
            aamarId: testAamarId
        });

        // 3. Verify Product and Inventory after PURCHASE
        let updatedProduct = await Product.findById(product._id);
        let inventory = await Inventory.findOne({ article_code: product.article_code, warehouse: testWarehouseId });

        console.log("After PURCHASE - Product Stock:", updatedProduct.stock, "currentQty:", updatedProduct.currentQty);
        console.log("After PURCHASE - Inventory currentQty:", inventory?.currentQty, "totalQty:", inventory?.totalQty);

        if (updatedProduct.stock !== 10 || updatedProduct.currentQty !== 10) throw new Error("Product quantity mismatch after PURCHASE");
        if (inventory?.currentQty !== 10 || inventory?.totalQty !== 10) throw new Error("Inventory quantity mismatch after PURCHASE");

        // 4. Make a SALE of 3 items
        console.log("Selling 3 items via SALE...");
        await createStockLedgerEntry({
            productId: product._id,
            warehouseId: testWarehouseId,
            transactionType: "SALE",
            action: "OUT",
            quantity: 3,
            referenceType: "Sale",
            referenceId: new mongoose.Types.ObjectId().toString(),
            aamarId: testAamarId
        });

        // 5. Verify Product and Inventory after SALE
        updatedProduct = await Product.findById(product._id);
        inventory = await Inventory.findOne({ article_code: product.article_code, warehouse: testWarehouseId });

        console.log("After SALE - Product Stock:", updatedProduct.stock, "currentQty:", updatedProduct.currentQty);
        console.log("After SALE - Inventory currentQty:", inventory?.currentQty, "soldQty:", inventory?.soldQty);

        if (updatedProduct.stock !== 7 || updatedProduct.currentQty !== 7) throw new Error("Product quantity mismatch after SALE");
        if (inventory?.currentQty !== 7 || inventory?.soldQty !== 3) throw new Error("Inventory quantity mismatch after SALE");

        console.log("TEST PASSED!");

        // Cleanup
        await Product.deleteOne({ _id: product._id });
        await Inventory.deleteOne({ article_code: product.article_code, aamarId: testAamarId });
        await StockLedger.deleteMany({ productId: product._id });
        console.log("Cleanup done.");

    } catch (err) {
        console.error("TEST FAILED:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
