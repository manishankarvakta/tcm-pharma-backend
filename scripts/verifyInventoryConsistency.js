const mongoose = require("mongoose");
const { createStockLedgerEntry } = require("../utility/stockLedgerHelper");
const Inventory = require("../models/inventoryModel");
const Product = require("../models/productModel");
const Warehouse = require("../models/warehouseModel");
require("dotenv").config();

const verifyConsistency = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to DB");

    // 1. Pick a test product and warehouse
    const product = await Product.findOne({ aamarId: "TCM-PHARMA" }); 
    const warehouse = await Warehouse.findOne({ aamarId: "TCM-PHARMA" });

    if (!product || !warehouse) {
      console.error("Test data not found (Product/Warehouse)");
      process.exit(1);
    }

    console.log(`Testing Product: ${product.name} (${product.article_code}) in Warehouse: ${warehouse.name}`);

    // 2. Perform a GRN (Stock IN)
    const testQty = 10;
    console.log(`\n--- Transaction 1: GRN IN ${testQty} ---`);
    const ledger1 = await createStockLedgerEntry({
      productId: product._id,
      warehouseId: warehouse._id,
      transactionType: "PURCHASE",
      action: "IN",
      quantity: testQty,
      referenceType: "GRN",
      referenceId: new mongoose.Types.ObjectId(),
      notes: "Verification Test IN",
      aamarId: product.aamarId,
    });

    const inventory1 = await Inventory.findOne({
      article_code: product.article_code,
      warehouse: warehouse._id,
    });

    console.log(`Ledger Balance: ${ledger1.balanceAfter}`);
    console.log(`Inventory CurrentQty: ${inventory1.currentQty}`);

    if (ledger1.balanceAfter === inventory1.currentQty) {
      console.log("✅ SUCCESS: Inventory currentQty matches Ledger balanceAfter after IN.");
    } else {
      console.error("❌ FAILURE: Mismatch after IN.");
    }

    // 3. Perform a Sale (Stock OUT)
    const saleQty = 3;
    console.log(`\n--- Transaction 2: SALE OUT ${saleQty} ---`);
    const ledger2 = await createStockLedgerEntry({
      productId: product._id,
      warehouseId: warehouse._id,
      transactionType: "SALE",
      action: "OUT",
      quantity: saleQty,
      referenceType: "Sale",
      referenceId: new mongoose.Types.ObjectId(),
      notes: "Verification Test OUT",
      aamarId: product.aamarId,
    });

    const inventory2 = await Inventory.findOne({
      article_code: product.article_code,
      warehouse: warehouse._id,
    });

    console.log(`Ledger Balance: ${ledger2.balanceAfter}`);
    console.log(`Inventory CurrentQty: ${inventory2.currentQty}`);

    if (ledger2.balanceAfter === inventory2.currentQty) {
      console.log("✅ SUCCESS: Inventory currentQty matches Ledger balanceAfter after OUT.");
    } else {
      console.error("❌ FAILURE: Mismatch after OUT.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Verification error:", err);
    process.exit(1);
  }
};

verifyConsistency();
