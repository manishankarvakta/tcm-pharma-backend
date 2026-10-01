/**
 * damages API
 * 1. get all damages
 * 2. get Damage by id
 * 3. get Damage by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const { default: mongoose } = require("mongoose");
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Damage = require("../models/damageModel");
const checklogin = require("../middlewares/checkLogin");
const { generateDamageId } = require("../middlewares/generateId");
const {
  updateInventoryOutOnDamageIn,
  updateInventoryInOnDamageOut,
} = require("../middlewares/useInventory");
const Product = require("../models/productModel");
const { createStockLedgerEntry } = require("../utility/stockLedgerHelper");
const { startOfDay, endOfDay } = require("date-fns");

const damageRouter = express.Router();

// GET Count rtv
damageRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { aamarId } = req.params;

    try {
      const count = await Damage.countDocuments({ aamarId });

      res.status(200).json(count);
    } catch (error) {
      console.error("Error fetching count:", error);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  })
);

// GET ALL damages
damageRouter.get(
  "/",
  // updateInventoryOutOnDamageIn,
  expressAsyncHandler(async (req, res) => {
    // console.log(req.body.damageNo)
    const damages = await Damage.find({})
      .select({
        _id: 1,
        product: 1,
        warehouse: 1,
        reason: 1,
        userId: 1,
        qty: 1,
        damageNo: 1,
        createdAt: 1,
        note: 1,
        total: 1,
        totalItem: 1,
      })
      .populate("products", "name")
      .populate("warehouse", "name")
      .populate("userId", "name");

    res.send(damages);
    // // res.send('removed');
    // console.log(damages);
  })
);

///// today grn
damageRouter.get(
  "/today-damage",
  expressAsyncHandler(async (req, res) => {
    const today = new Date();
    const end = startOfDay(new Date(today));
    const start = endOfDay(new Date(today));
    try {
      const damage = await Damage.aggregate([
        {
          $match: {
            createdAt: {
              $gte: end,
              $lt: start,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            total: {
              $sum: "$total",
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);
      res.send(damage);
      // res.send(Purchases);
    } catch (err) {
      console.log(err);
    }
    // // res.send('removed');
  })
);

// GET ALL damages
damageRouter.get(
  "/export/:start/:end/:warehouse",
  expressAsyncHandler(async (req, res) => {
    const { startDate, endDate, warehouse } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (warehouse && warehouse !== "allWh") {
      query.warehouse = warehouse;
    }

    const damages = await Damage.find(query)
      .populate("products", { name: 1, article_code: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");

    res.send(damages);
  })
);

damageRouter.get(
  "/byDate/:start/:end/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());
    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId || "";

    const query = {
      createdAt: { $gte: start, $lte: end },
    };
    if (aamarId && aamarId !== "all") {
      query.aamarId = aamarId;
    }
    if (warehouse !== "allWh" && warehouse && warehouse !== "undefined" && warehouse !== "null") {
      query.warehouse = mongoose.Types.ObjectId.isValid(warehouse)
        ? { $in: [new mongoose.Types.ObjectId(warehouse), warehouse] }
        : warehouse;
    }
    // console.log("query id", query);

    try {
      const damages = await Damage.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "warehouses", // Replace with your actual warehouses collection name
            let: { whId: { $toString: "$warehouse" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$_id", "$$whId"] },
                      { $eq: [{ $toString: "$_id" }, "$$whId"] },
                    ],
                  },
                },
              },
            ],
            as: "warehouse",
          },
        },

        {
          $lookup: {
            from: "users", // Replace with your actual users collection name
            let: { uId: { $toString: "$userId" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$_id", "$$uId"] },
                      { $eq: [{ $toString: "$_id" }, "$$uId"] },
                    ],
                  },
                },
              },
            ],
            as: "user",
          },
        },
        { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            product: 1,
            products: 1,
            note: 1,
            warehouse: { $ifNull: ["$warehouse.name", "No Warehouse"] },
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            reason: 1,
            user: { $ifNull: ["$user.name", "No User"] },
            qty: 1,
            damageNo: 1,
            createdAt: 1,
            total: 1,
            totalItem: 1,
          },
        },
      ]);

      res.send(damages);
    } catch (err) {
      console.error("Error fetching damages by date:", err);
      res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    // console.log(sales);
    // // res.send('removed');
  })
);
// GET ONE damages
damageRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const damages = await Damage.find({ _id: id })
      .select({
        _id: 1,
        product: 1,
        warehouse: 1,
        reason: 1,
        userId: 1,
        qty: 1,
        damageNo: 1,
        createdAt: 1,
        note: 1,
        total: 1,
        totalItem: 1,
      })
      .populate("products", "name")
      .populate("products", "article_code")
      .populate("products", "priceList")
      .populate("products", { name: 1, article_code: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");
    res.send(damages[0]);
    // // res.send('removed');
    // console.log(damages);
  })
);

// CREATE ONE Damage
damageRouter.post(
  "/",
  generateDamageId,
  expressAsyncHandler(async (req, res) => {
    try {
      const { products, warehouse, aamarId, userId } = req.body;

      if (!products || (Array.isArray(products) && products.length === 0)) {
        return res.status(400).json({ message: "Cannot create damage without products." });
      }

      const productList = Array.isArray(products) ? products : Object.values(products);
      const processedProducts = [];
      const stockActions = [];

      for (const product of productList) {
        const prodData = product instanceof Map ? Object.fromEntries(product) : (product.toObject ? product.toObject() : product);
        
        let productId = (prodData.id && prodData.id._id) ? prodData.id._id : (prodData.id || prodData._id || prodData.productId);
        let productDoc = null;
        if (productId && mongoose.isValidObjectId(productId)) {
          productDoc = await Product.findById(productId);
        }
        if (!productDoc && prodData.article_code) {
          productDoc = await Product.findOne({ article_code: prodData.article_code });
        }
        if (productDoc) {
          productId = productDoc._id;
        }

        if (!productId || !productDoc) {
          console.warn("Skipping damage product due to missing ID:", prodData.name || prodData.article_code);
          continue;
        }

        const targetWarehouse = (prodData.warehouse && prodData.warehouse._id)
          ? prodData.warehouse._id
          : (prodData.warehouse || warehouse);

        const damageQty = Number(prodData.qty) || 0;
        if (damageQty <= 0) {
          continue;
        }

        const validAamarId = aamarId || prodData.aamarId || productDoc?.aamarId;
        const validUserId = userId || req.user?._id;

        processedProducts.push({
          ...prodData,
          id: productId,
          warehouse: targetWarehouse,
          qty: damageQty,
          article_code: prodData.article_code || productDoc?.article_code,
          name: prodData.name || productDoc?.name,
          tp: prodData.tp || productDoc?.tp || 0,
          mrp: prodData.mrp || productDoc?.mrp || 0,
          reason: prodData.reason || req.body.note || "",
        });

        stockActions.push({
          productId,
          targetWarehouse,
          damageQty,
          validAamarId,
          validUserId,
          reason: prodData.reason || req.body.note || "Damage Entry",
        });
      }

      if (processedProducts.length === 0) {
        return res.status(400).json({ message: "No valid products found for damage." });
      }

      const newDamage = new Damage({
        ...req.body,
        products: processedProducts,
      });

      const savedDamage = await newDamage.save();

      // Process Stock Ledger Entries: DAMAGE OUT
      for (const item of stockActions) {
        await createStockLedgerEntry({
          productId: item.productId,
          warehouseId: item.targetWarehouse,
          transactionType: "DAMAGE",
          action: "OUT",
          quantity: item.damageQty,
          referenceType: "Damage",
          referenceId: savedDamage._id,
          notes: item.reason,
          aamarId: item.validAamarId,
          userId: item.validUserId,
        });
      }

      res.status(200).json({
        message: "Damage is created Successfully",
        data: savedDamage,
      });
    } catch (err) {
      console.error("Damage creation failed:", err);
      res.status(500).json({
        message: "There was a server side error",
        error: err.message,
      });
    }
  })
);

// CREATE MULTI damages
damageRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Damage.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "damages are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Damage
damageRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Damage.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Damage
damageRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      const damageData = await Damage.findOne({ _id: id });
      if (!damageData) {
        return res.status(404).json({ message: "Damage record not found" });
      }

      const products = damageData?.products;
      const productList = Array.isArray(products) ? products : Object.values(products || {});

      for (const product of productList) {
        const prodData = product instanceof Map ? Object.fromEntries(product) : (product.toObject ? product.toObject() : product);
        let productId = (prodData.id && prodData.id._id) ? prodData.id._id : (prodData.id || prodData._id || prodData.productId);
        let productDoc = null;
        if (productId && mongoose.isValidObjectId(productId)) {
          productDoc = await Product.findById(productId);
        }
        if (!productDoc && prodData.article_code) {
          productDoc = await Product.findOne({ article_code: prodData.article_code });
        }
        if (productDoc) {
          productId = productDoc._id;
        }

        const targetWarehouse = (prodData.warehouse && prodData.warehouse._id)
          ? prodData.warehouse._id
          : (prodData.warehouse || damageData.warehouse);

        const damageQty = Number(prodData.qty) || 0;

        if (productId && targetWarehouse && damageQty > 0) {
          await createStockLedgerEntry({
            productId,
            warehouseId: targetWarehouse,
            transactionType: "DAMAGE",
            action: "IN",
            quantity: damageQty,
            referenceType: "Damage",
            referenceId: id,
            notes: "Damage Deletion Reversal",
            aamarId: damageData.aamarId,
            userId: req.user?._id || damageData.userId,
          });
        }
      }

      await Damage.deleteOne({ _id: id });
      res.status(200).json({ message: "Damage deleted and inventory reversed successfully." });
    } catch (error) {
      console.error("Delete Damage error:", error);
      res.status(500).json({ message: "Error deleting damage", error: error.message });
    }
  })
);

module.exports = damageRouter;
