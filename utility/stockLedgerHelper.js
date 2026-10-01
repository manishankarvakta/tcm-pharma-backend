const StockLedger = require("../models/stockLedgerModel");
const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const mongoose = require("mongoose");

/**
 * Creates a stock ledger entry and updates the product's stock.
 *
 * @param {Object} params
 * @param {string} params.productId - The ID of the product.
 * @param {string} params.warehouseId - The ID of the warehouse.
 * @param {string} params.transactionType - Enum: 'PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALES_RETURN', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE'.
 * @param {string} params.action - Enum: 'IN', 'OUT'.
 * @param {number} params.quantity - The quantity of the transaction (must be positive).
 * @param {string} params.referenceType - e.g., 'Sale', 'GRN'.
 * @param {string} params.referenceId - The ID of the reference document.
 * @param {string} [params.notes] - Optional notes.
 * @param {number} [params.unitCost] - Optional unit cost.
 * @param {string} [params.aamarId] - Optional aamarId (will fetch from product if missing).
 * @param {string} [params.userId] - Optional userId.
 * @param {Object} [params.session] - Mongoose session for transactions.
 */
const createStockLedgerEntry = async ({
  productId,
  warehouseId,
  transactionType,
  action,
  quantity,
  referenceType,
  referenceId,
  notes,
  unitCost,
  aamarId,
  userId,
  session,
}) => {
  try {
    const product = await Product.findById(productId).session(session);

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Fallback for aamarId if not provided
    const validAamarId = aamarId || product.aamarId;
    if (!validAamarId) {
      console.warn(`StockLedger Warning: aamarId missing for product ${productId}. Entry might fail validation if schema requires it.`);
    }

    // Find or Initialize Inventory Record for the specific warehouse to get openingBalance
    const inventoryQuery = {
      article_code: product.article_code,
      warehouse: warehouseId,
      aamarId: validAamarId,
    };

    let inventory = await Inventory.findOne(inventoryQuery).session(session);

    // If inventory record found, use its currentQty as opening balance, else 0
    const openingBalance = inventory ? (inventory.currentQty || 0) : 0;
    let balanceAfter = openingBalance;
    const qty = Math.abs(Number(quantity));

    if (action === "IN") {
      balanceAfter += qty;
    } else if (action === "OUT") {
      balanceAfter -= qty;
    }

    // Prepare Inventory Update - The ledger's balanceAfter IS the closing quantity
    const closingQuantity = balanceAfter; 

    const inventoryUpdate = {
      $set: {
        name: product.name,
        product: product._id,
        currentQty: closingQuantity,  // Live stock balance synced from ledger
        closingStock: closingQuantity, // Closing stock synced from ledger
        status: "active",
      },
    };

    // Update specific transaction counters in Inventory model
    const getSafeValue = (field) => (inventory && inventory[field] !== null && inventory[field] !== undefined) ? inventory[field] : 0;

    if (transactionType === "PURCHASE" && action === "IN") {
      inventoryUpdate.$set.totalQty = getSafeValue("totalQty") + qty;
    } else if (transactionType === "ADJUSTMENT") {
      inventoryUpdate.$set.adjustQty = getSafeValue("adjustQty") + (action === "IN" ? qty : -qty);
    } else if (transactionType === "SALE" && action === "OUT") {
      inventoryUpdate.$set.soldQty = getSafeValue("soldQty") + qty;
    } else if (transactionType === "SALE" && action === "IN") {
      inventoryUpdate.$set.soldQty = getSafeValue("soldQty") - qty;
    } else if (transactionType === "SALES_RETURN" && action === "IN") {
      inventoryUpdate.$set.salesReturnQty = getSafeValue("salesReturnQty") + qty;
    } else if (transactionType === "SALES_RETURN" && action === "OUT") {
      inventoryUpdate.$set.salesReturnQty = getSafeValue("salesReturnQty") - qty;
    } else if (transactionType === "PURCHASE_RETURN" && action === "OUT") {
      inventoryUpdate.$set.rtvQty = getSafeValue("rtvQty") + qty;
    } else if (transactionType === "PURCHASE_RETURN" && action === "IN") {
      inventoryUpdate.$set.rtvQty = getSafeValue("rtvQty") - qty;
    } else if (transactionType === "DAMAGE" && action === "OUT") {
      inventoryUpdate.$set.damageQty = getSafeValue("damageQty") + qty;
    } else if (transactionType === "DAMAGE" && action === "IN") {
      inventoryUpdate.$set.damageQty = getSafeValue("damageQty") - qty;
    } else if (transactionType === "TRANSFER") {
      inventoryUpdate.$set.tpnQty = getSafeValue("tpnQty") + qty;
    }

    // Update or Create Inventory Record using the calculated Closing Quantity
    await Inventory.findOneAndUpdate(inventoryQuery, inventoryUpdate, {
      upsert: true,
      new: true,
      session,
    });

    // Create Ledger Entry with the same Closing Quantity
    const ledgerEntry = new StockLedger({
      productId,
      warehouseId,
      transactionType,
      action,
      quantity: qty,
      openingBalance, 
      balanceAfter: closingQuantity, 
      referenceType,
      referenceId,
      notes,
      unitCost: unitCost || product.tp || 0,
      aamarId: validAamarId,
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      createdBy: "SYSTEM",
    });

    await ledgerEntry.save({ session });

    return ledgerEntry;
  } catch (error) {
    console.error("Error creating stock ledger entry:", error);
    // We strictly throw here so the caller knows the transaction failed
    throw error;
  }
};

module.exports = {
  createStockLedgerEntry,
};
