const mongoose = require("mongoose");
const { createStockLedgerEntry } = require("../utility/stockLedgerHelper");
const Damage = require("../models/damageModel");
const Grn = require("../models/grnModel");
const Tpn = require("../models/tpnModel");
const Rtv = require("../models/rtvModel");
const Sale = require("../models/saleModel");
const Product = require("../models/productModel");
const Adjust = require("../models/adjustModel");
const Inventory = require("../models/inventoryModel");

// StockLedger model is used inside the helper, so we might not need it here directly unless for specific queries,
// but keeping it if needed for future extensions or specific logic not covered by helper.
const StockLedger = require("../models/stockLedgerModel");

const getProductId = async (p) => {
  if (p._id && mongoose.isValidObjectId(p._id)) return p._id;
  if (p.id && mongoose.isValidObjectId(p.id)) return p.id;
  if (p.productId && mongoose.isValidObjectId(p.productId)) return p.productId;
  if (p.product && mongoose.isValidObjectId(p.product)) return p.product;
  if (p.article_code) {
    const prod = await Product.findOne({ article_code: p.article_code });
    if (prod) return prod._id;
  }
  return null;
};

// Generate Damage In -> inventory Out
const updateInventoryOutOnDamageIn = async (req, res, next) => {
  const products = req.body.products;
  try {
    if (!req.body._id) {
      req.body._id = new mongoose.Types.ObjectId();
    }
    if (products?.length > 0) {
      const productList = Array.isArray(products) ? products : Object.values(products);
      await Promise.all(
        productList.map(async (product) => {
          const prodData = product instanceof Map ? Object.fromEntries(product) : (product.toObject ? product.toObject() : product);
          const productId = await getProductId(prodData);
          const targetWarehouse = (prodData.warehouse && prodData.warehouse._id)
            ? prodData.warehouse._id
            : (prodData.warehouse || req.body.warehouse);
          const validAamarId = req.body.aamarId || req.user?.aamarId || prodData.aamarId;
          const validUserId = req.body.userId || req.user?._id;

          if (productId && targetWarehouse) {
            await createStockLedgerEntry({
              productId,
              warehouseId: targetWarehouse,
              transactionType: "DAMAGE",
              action: "OUT",
              quantity: Number(prodData.qty),
              referenceType: "Damage",
              referenceId: req.body._id,
              notes: prodData.reason || req.body.note || "Damage Entry",
              aamarId: validAamarId,
              userId: validUserId,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error("Error in updateInventoryOutOnDamageIn:", err);
  } finally {
    next();
  }
};

// Generate Damage out -> inventory in (Delete Damage)
const updateInventoryInOnDamageOut = async (req, res, next) => {
  const id = req.params.id;
  try {
    const damageData = await Damage.findOne({ _id: id });
    if (!damageData) return next();

    const products = damageData?.products;
    const productList = Array.isArray(products) ? products : Object.values(products || {});

    if (productList?.length > 0) {
      await Promise.all(
        productList.map(async (product) => {
          const prodData = product instanceof Map ? Object.fromEntries(product) : (product.toObject ? product.toObject() : product);
          const productId = await getProductId(prodData);
          const targetWarehouse = (prodData.warehouse && prodData.warehouse._id)
            ? prodData.warehouse._id
            : (prodData.warehouse || damageData.warehouse);
          const validAamarId = damageData.aamarId || req.user?.aamarId;
          const validUserId = req.user?._id || damageData.userId;

          if (productId && targetWarehouse) {
            await createStockLedgerEntry({
              productId,
              warehouseId: targetWarehouse,
              transactionType: "DAMAGE",
              action: "IN",
              quantity: Number(prodData.qty),
              referenceType: "Damage",
              referenceId: id,
              notes: "Damage Deletion",
              aamarId: validAamarId,
              userId: validUserId,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error("Error in updateInventoryInOnDamageOut:", err);
  } finally {
    next();
  }
};

// Generate Rtv In -> inventory Out
const updateInventoryOutOnRTVIn = async (req, res, next) => {
  const products = req.body.products;
  try {
    if (!req.body._id) {
      req.body._id = new mongoose.Types.ObjectId();
    }
    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "PURCHASE_RETURN",
              action: "OUT",
              quantity: Number(product.qty),
              referenceType: "RTV",
              referenceId: req.body._id,
              notes: "Return to Vendor",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate Rtv out -> inventory in (Delete RTV)
const updateInventoryINOnRTVOut = async (req, res, next) => {
  const id = req.params.id;
  try {
    const rtvData = await Rtv.findOne({ _id: id });
    const products = rtvData?.products?.map((map) => Object.fromEntries(map));

    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "PURCHASE_RETURN",
              action: "IN",
              quantity: Number(product.qty),
              referenceType: "RTV",
              referenceId: id,
              notes: "RTV Deletion",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate Sale in -> inventory Out
const updateInventoryOutOnSaleIn = async (req, res, next) => {
  try {
    const products = req.body.products;
    const returnProducts = req.body.returnProducts;
    if (!req.body._id) {
      req.body._id = new mongoose.Types.ObjectId();
    }
    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "SALE",
              action: "OUT",
              quantity: Number(product.qty),
              referenceType: "Sale",
              referenceId: req.body._id,
              notes: "Sale Entry",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
    if (returnProducts?.length > 0) {
      await Promise.all(
        returnProducts.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "SALES_RETURN",
              action: "IN",
              quantity: Number(product.qty),
              referenceType: "Sale",
              referenceId: req.body._id,
              notes: "Sales Return within Sale",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate Sale Del -> inventory in
const updateInventoryInOnSaleDel = async (req, res, next) => {
  try {
    const id = req.params.id;
    const saleData = await Sale.findOne({ _id: id });
    const products = saleData?.products?.map((map) => Object.fromEntries(map));
    const returnProducts = saleData?.returnProducts?.map((map) =>
      Object.fromEntries(map),
    );

    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "SALE",
              action: "IN",
              quantity: Number(product.qty),
              referenceType: "Sale",
              referenceId: id,
              notes: "Sale Deletion",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
    if (returnProducts?.length > 0) {
      await Promise.all(
        returnProducts.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "SALES_RETURN",
              action: "OUT",
              quantity: Number(product.qty),
              referenceType: "Sale",
              referenceId: id,
              notes: "Sales Return Deletion",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate grn in -> inventory in
const updateInventoryInOnGRNIn = async (req, res, next) => {
  const products = req.body.products;
  try {
    if (!req.body._id) {
      req.body._id = new mongoose.Types.ObjectId();
    }
    if (products?.length > 0) {
      console.log(`Processing GRN inventory update for ${products.length} products. GRN ID: ${req.body._id}`);
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            console.log(`Updating stock for product ID: ${productId}, qty: ${product.qty}`);
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "PURCHASE",
              action: "IN",
              quantity: Number(product.qty),
              referenceType: "GRN",
              referenceId: req.body._id,
              notes: "GRN Entry",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            }).then(() => {
              console.log(`Successfully updated stock for product: ${productId}`);
            }).catch((err) => {
              console.error(
                `Failed to create ledger for product ${productId} in GRN ${req.body._id}:`,
                err,
              );
            });
          } else {
            console.error("Could not resolve product ID for product article_code:", product.article_code);
          }
        }),
      );
    } else {
      console.warn("No products found in GRN request body for inventory update.");
    }
  } catch (err) {
    console.error("Error in updateInventoryInOnGRNIn:", err);
    console.error("Failed Product Data:", products);
  } finally {
    next();
  }
};

// Generate grn del -> inventory Out
const updateInventoryOutOnGRNDel = async (req, res, next) => {
  const id = req.params.id;
  try {
    const grnData = await Grn.findOne({ _id: id });
    const products = grnData?.products;

    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          let prodObj = product;
          if (typeof product.toObject === "function")
            prodObj = product.toObject();
          else if (product instanceof Map)
            prodObj = Object.fromEntries(product);

          const article_code =
            prodObj.article_code || product.get?.("article_code");
          const qty = prodObj.qty || product.get?.("qty");
          // FIX: Use dynamic warehouse or fallback safely, hardcoded ID was risky
          const warehouse = prodObj.warehouse || "645c9297ed6d5d94af257be9";

          let pId = prodObj.id || prodObj._id || prodObj.productId;
          if (!pId) {
            const prod = await Product.findOne({ article_code });
            if (prod) pId = prod._id;
          }

          if (pId) {
            await createStockLedgerEntry({
              productId: pId,
              warehouseId: warehouse,
              transactionType: "PURCHASE",
              action: "OUT",
              quantity: Number(qty),
              referenceType: "GRN",
              referenceId: id,
              notes: "GRN Deletion",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate tpn in -> inventory Out
const updateInventoryOutOnTPNIn = async (req, res, next) => {
  const products = req.body.products;
  try {
    if (!req.body._id) {
      req.body._id = new mongoose.Types.ObjectId();
    }
    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "TRANSFER",
              action: "OUT",
              quantity: Number(product.qty),
              referenceType: "TPN",
              referenceId: req.body._id,
              notes: "TPN Entry (Out)",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate tpn del -> inventory in
const updateInventoryInOnTpnDel = async (req, res, next) => {
  const id = req.params.id;
  try {
    const tpnData = await Tpn.findOne({ _id: id });
    const products = tpnData?.products?.map((map) => Object.fromEntries(map));

    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse,
              transactionType: "TRANSFER",
              action: "IN",
              quantity: Number(product.qty),
              referenceType: "TPN",
              referenceId: id,
              notes: "TPN Deletion (Reverse Out)",
              aamarId: req.user?.aamarId,
              userId: req.user?._id,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate Adjust In -> inventory action based on type
const updateInventoryInOnAdjustIn = async (req, res, next) => {
  const products = req.body.products;
  try {
    if (!req.body._id) {
      req.body._id = new mongoose.Types.ObjectId();
    }
    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            // type: true means add (IN), false means subtract (OUT)
            const action = product.type === false ? "OUT" : "IN";
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse || req.body.warehouse,
              transactionType: "ADJUSTMENT",
              action: action,
              quantity: Number(product.qty),
              referenceType: "Adjust",
              referenceId: req.body._id,
              notes: "Inventory Adjustment",
              aamarId: req.user?.aamarId || req.body.aamarId,
              userId: req.user?._id || req.body.userId,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};

// Generate Adjust out -> reverse inventory action
const updateInventoryOutOnAdjustOut = async (req, res, next) => {
  const id = req.params.id;
  try {
    const adjustData = await Adjust.findOne({ _id: id });
    const products = adjustData?.products?.map((map) =>
      Object.fromEntries(map),
    );

    if (products?.length > 0) {
      await Promise.all(
        products.map(async (product) => {
          const productId = await getProductId(product);
          if (productId) {
            // Reverse the original action
            // If it was IN (true), now OUT. If it was OUT (false), now IN.
            const action = product.type === false ? "IN" : "OUT";
            await createStockLedgerEntry({
              productId,
              warehouseId: product.warehouse || adjustData.warehouse,
              transactionType: "ADJUSTMENT",
              action: action,
              quantity: Number(product.qty),
              referenceType: "Adjust",
              referenceId: id,
              notes: "Adjustment Reversal (Deletion)",
              aamarId: req.user?.aamarId || adjustData.aamarId,
              userId: req.user?._id || adjustData.userId,
            });
          }
        }),
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    next();
  }
};


module.exports = {
  updateInventoryOutOnDamageIn,
  updateInventoryInOnDamageOut,
  updateInventoryOutOnRTVIn,
  updateInventoryINOnRTVOut,
  updateInventoryOutOnSaleIn,
  updateInventoryInOnSaleDel,
  updateInventoryInOnGRNIn,
  updateInventoryOutOnGRNDel,
  updateInventoryOutOnTPNIn,
  updateInventoryInOnTpnDel,
  updateInventoryInOnAdjustIn,
  updateInventoryOutOnAdjustOut,
};

