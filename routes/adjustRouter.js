/**
 * adjusts API
 * 1. get all adjusts
 * 2. get adjust by id
 * 3. get adjust by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Adjust = require("../models/adjustModel");
const checklogin = require("../middlewares/checkLogin");
const { generateAdjustId } = require("../middlewares/generateId");
const { startOfDay, endOfDay } = require("date-fns");
const {
  updateInventoryInOnAdjustIn,
  updateInventoryOutOnAdjustOut
} = require("../middlewares/useInventory");
const { createStockLedgerEntry } = require("../utility/stockLedgerHelper");
const { default: mongoose } = require("mongoose");

const adjustRouter = express.Router();
const ObjectId = mongoose.Types.ObjectId;

// adjustRouter.get(
//   "/updatewarehouse",
//   expressAsyncHandler(async (req, res) => {
//     const warehouse = "62b5b575b4facb87eef3b47c";

//     try {
//       const result = await Adjust.updateMany({
//         $set: { warehouse: ObjectId(warehouse) },
//       });
//       res
//         .status(200)
//         .json({ message: "Adjust Warehouse updated successfully", result });
//     } catch (error) {
//       // If an error occurs, handle it and send an error response
//       res
//         .status(500)
//         .send({ message: "Error fetching Adjust", error: error.message });
//     }
//   })
// );
// GET ALL adjusts
adjustRouter.get(
  "/",
  // updateInventoryInOnAdjustIn,
  expressAsyncHandler(async (req, res) => {
    // console.log(req.body.adjustNo)
    const adjusts = await Adjust.find({})
      .select({
        _id: 1,
        product: 1,
        //TODO:warehouse
        warehouse: 1,
        reason: 1,
        userId: 1,
        qty: 1,
        adjustNo: 1,
        createdAt: 1,
        note: 1,
        total: 1,
        totalItem: 1
      })
      .populate("products", "name")
      .populate("warehouse", "name")
      .populate("userId", "name");

    res.send(adjusts);
    // // res.send('removed');
    // console.log(adjusts);
  })
);

///// today grn
adjustRouter.get(
  "/today-adjust",
  expressAsyncHandler(async (req, res) => {
    const today = new Date();
    const end = startOfDay(new Date(today));
    const start = endOfDay(new Date(today));
    try {
      const adjusts = await Adjust.aggregate([
        {
          $match: {
            createdAt: {
              $gte: end,
              $lt: start
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            total: {
              $sum: "$total"
            }
          }
        },
        {
          $sort: {
            _id: 1
          }
        }
      ]);
      res.send(adjusts);
      // res.send(Purchases);
    } catch (err) {
      console.log(err);
    }
    // // res.send('removed');
  })
);

// GET ALL adjusts
adjustRouter.get(
  "/export",
  expressAsyncHandler(async (req, res) => {
    const adjusts = await Adjust.find({})
      .populate("products", { name: 1, article_code: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");

    res.send(adjusts);
    // // res.send('removed');
    // console.log(adjusts);
  })
);
//grn load by two dates
adjustRouter.get(
  "/byDate/:start/:end/:aamarId/:warehouse",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());

    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId || "";

    // Initialize query
    let query = {
      createdAt: { $gte: start, $lte: end },
      aamarId: aamarId
    };

    if (warehouse !== "allWh" && warehouse) {
      query.warehouse = ObjectId(warehouse);
    }

    console.log("query", query);
    try {
      const adjusts = await Adjust.find(query)
        .select({
          _id: 1,
          product: 1,
          warehouse: 1,
          reason: 1,
          userId: 1,
          qty: 1,
          adjustNo: 1,
          createdAt: 1,
          note: 1,
          total: 1,
          totalItem: 1,
          status: 1
        })
        .populate("products", "name")
        .populate("warehouse", "name")
        .populate("userId", "name");
      res.send(adjusts);
    } catch (err) {
      console.log(err);
    }
    // console.log(sales);
    // // res.send('removed');
  })
);
// GET ONE adjusts
adjustRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const adjusts = await Adjust.findOne({ _id: id })
      .select({
        _id: 1,
        product: 1,
        warehouse: 1,
        reason: 1,
        userId: 1,
        qty: 1,
        adjustNo: 1,
        createdAt: 1,
        note: 1,
        total: 1,
        print: 1,
        totalItem: 1
      })
      .populate("products", "name")
      .populate("products", "article_code")
      .populate("products", "priceList")
      // .populate("products", "status")
      .populate("products", { name: 1, article_code: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");
    res.send(adjusts);
    // // res.send('removed');
    // console.log(adjusts);
  })
);

// POST route to create a new adjust
adjustRouter.post(
  "/",
  generateAdjustId,
  expressAsyncHandler(async (req, res) => {
    try {
      const { products, warehouse, aamarId, userId } = req.body;

      // Validation
      if (!products || (Array.isArray(products) && products.length === 0)) {
        return res.status(400).json({ message: "Cannot create adjustment without products." });
      }

      const Product = require("../models/productModel");
      const Inventory = require("../models/inventoryModel");

      // 1. Process each product and calculate adjustment delta against current stock
      const productList = Array.isArray(products) ? products : Object.values(products);
      const processedProducts = [];
      const stockActions = [];

      for (const product of productList) {
        // Resolve product data if it's a Map entry or object
        const prodData = product instanceof Map ? Object.fromEntries(product) : (product.toObject ? product.toObject() : product);
        
        // Use robust ID resolution (handling Map, Model, populated object or plain JSON)
        let productId = (prodData.id && prodData.id._id) ? prodData.id._id : (prodData.id || prodData._id || prodData.productId);
        
        let productDoc = null;
        if (productId) {
          productDoc = await Product.findById(productId);
        }
        if (!productDoc && prodData.article_code) {
          productDoc = await Product.findOne({ article_code: prodData.article_code });
        }
        if (productDoc) {
          productId = productDoc._id;
        }

        if (!productId || !productDoc) {
          console.warn("Skipping product adjustment due to missing ID:", prodData.name || prodData.article_code);
          continue;
        }

        const targetWarehouse = (prodData.warehouse && prodData.warehouse._id) ? prodData.warehouse._id : (prodData.warehouse || warehouse);
        const articleCode = prodData.article_code || productDoc?.article_code;
        const validAamarId = aamarId || prodData.aamarId || productDoc?.aamarId;

        // Fetch current inventory for this product and warehouse
        const inventoryQuery = {
          article_code: articleCode,
          warehouse: targetWarehouse,
          aamarId: validAamarId,
        };

        const currentInv = await Inventory.findOne(inventoryQuery);
        const currentStock = currentInv ? (currentInv.currentQty || 0) : 0;

        // User enters adjustment quantity and type (IN or OUT)
        const adjustQuantity = Math.abs(Number(prodData.qty)) || 0;
        const isTypeIn = prodData.type !== false;
        const action = isTypeIn ? "IN" : "OUT";
        const finalStock = isTypeIn
          ? currentStock + adjustQuantity
          : currentStock - adjustQuantity;

        processedProducts.push({
          ...prodData,
          id: productId,
          warehouse: targetWarehouse,
          currentStock: currentStock,
          actualQty: finalStock,
          qty: adjustQuantity, // Store adjustment quantity
          type: isTypeIn,
        });

        stockActions.push({
          productId,
          targetWarehouse,
          action,
          adjustQuantity,
          validAamarId,
          reason: prodData.reason || req.body.reason || "Inventory Adjustment",
        });
      }

      // 2. Save the Adjustment record
      const newAdjust = new Adjust({
        ...req.body,
        products: processedProducts,
      });
      const savedAdjust = await newAdjust.save();

      // 3. Process Stock Ledger Entries
      for (const item of stockActions) {
        if (item.adjustQuantity > 0) {
          await createStockLedgerEntry({
            productId: item.productId,
            warehouseId: item.targetWarehouse,
            transactionType: "ADJUSTMENT",
            action: item.action,
            quantity: item.adjustQuantity,
            referenceType: "ADJUSTMENT",
            referenceId: savedAdjust._id,
            notes: item.reason,
            aamarId: item.validAamarId,
            userId: userId,
          });
        }
      }

      res.status(200).json({
        message: "Adjustment created successfully with Ledger integration",
        adjust: savedAdjust,
      });
    } catch (err) {
      console.error("Adjustment Failed:", err);
      res.status(500).json({
        message: "Failed to create adjustment",
        error: err.message,
      });
    }
  }),
);

// CREATE MULTI adjusts
adjustRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Adjust.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "adjusts are created Successfully"
        });
      }
    });
  })
);

// UPDATE ONE adjust
adjustRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Adjust.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          res.send(response);
        })
        .catch((err) => {
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

// DELETE BY UPDATE STATUS CANCELED
adjustRouter.put(
  "/delete/:id",
  expressAsyncHandler(async (req, res) => {
    try {
      const id = req.params.id;

      // 1. Fetch adjustment data
      const adjustData = await Adjust.findOne({ _id: id });
      if (!adjustData) {
        return res.status(404).json({ message: "Adjustment not found." });
      }
      if (adjustData.status === "Canceled") {
        return res.status(400).json({ message: "Adjustment is already canceled." });
      }

      // 2. Reverse inventory logic
      const products = adjustData.products;
      const productList = Array.isArray(products) ? products : Object.values(products);

      for (const product of productList) {
        // Resolve product data if it's a Map entry or object
        const prodData = product instanceof Map ? Object.fromEntries(product) : (product.toObject ? product.toObject() : product);
        
        let productId = (prodData.id && prodData.id._id) ? prodData.id._id : (prodData.id || prodData._id || prodData.productId);
        const Product = require("../models/productModel");

        let productDoc = null;
        if (productId) {
          productDoc = await Product.findById(productId);
        }
        if (!productDoc && prodData.article_code) {
          productDoc = await Product.findOne({ article_code: prodData.article_code });
        }
        if (productDoc) {
          productId = productDoc._id;
        }

        // ORIGINAL: type: true means add (IN), false means subtract (OUT)
        // REVERSAL: type: true means subtract (OUT), false means add (IN)
        const action = prodData.type === false ? "IN" : "OUT";

        if (!productId || !productDoc) {
          console.warn("Skipping product reversal due to missing product:", prodData.name || prodData.article_code);
          continue;
        }

        await createStockLedgerEntry({
          productId,
          warehouseId: prodData.warehouse || adjustData.warehouse,
          transactionType: "ADJUSTMENT",
          action: action,
          quantity: Number(prodData.qty),
          referenceType: "ADJUSTMENT",
          referenceId: id,
          notes: `Reversal: ${prodData.reason || adjustData.reason || "Inventory Adjustment"}`,
          aamarId: adjustData.aamarId,
          userId: req.user?._id || adjustData.userId,
        });
      }

      // 3. Update status to Canceled
      await Adjust.updateOne({ _id: id }, { $set: { status: "Canceled" } });

      res.status(200).json({ message: "Adjustment canceled and inventory reversed successfully." });
    } catch (err) {
      console.error("Cancel Adjustment Failed:", err);
      res.status(500).json({
        message: "Failed to cancel adjustment",
        error: err.message,
      });
    }
  }),
);

// DELETE ONE adjust
adjustRouter.delete(
  "/:id",
  updateInventoryOutOnAdjustOut,
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Adjust.deleteOne({ _id: id })
        .then((response) => {
          res.send(response);
        })
        .catch((err) => {
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

module.exports = adjustRouter;
