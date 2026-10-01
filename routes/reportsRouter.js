// Router for mobile application
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const { default: mongoose } = require("mongoose");
const Sale = require("../models/saleModel");
const { startOfDay, endOfDay } = require("date-fns");
// const Product = require("../models/Product");
const Purchase = require("../models/purchaseModel");
const Product = require("../models/productModel");
const Grn = require("../models/grnModel");
const Inventory = require("../models/inventoryModel");
const ObjectId = mongoose.Types.ObjectId;
const reportsRouter = express.Router();

// ---------------------------- 🛒 Sales Reports -----------------------------------

// customer wise sales report - Done
reportsRouter.get(
  "/customerWiseSales/:start/:end/:warehouse/:aamarId/:customerId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());

    const { warehouse, aamarId, customerId } = req.params;

    console.log(
      "Customer wise sales",
      start,
      end,
      warehouse,
      aamarId,
      customerId
    );

    let matchQuery = {
      status: "complete",
      aamarId: aamarId,
      createdAt: { $gte: start, $lte: end },
    };

    if (
      customerId &&
      customerId !== "undefined" &&
      customerId !== "null" &&
      mongoose.isValidObjectId(customerId)
    ) {
      // Support both ObjectId and string formats in case of inconsistent data
      matchQuery.customerId = {
        $in: [new mongoose.Types.ObjectId(customerId), customerId],
      };
    }

    if (warehouse !== "allWh" && warehouse && mongoose.isValidObjectId(warehouse)) {
      matchQuery.warehouse = {
        $in: [new mongoose.Types.ObjectId(warehouse), warehouse],
      };
    }

    console.log("Final matchQuery:", JSON.stringify(matchQuery, null, 2));

    try {
      // For debugging: check if any sales exist at all with basic filters
      const totalCount = await Sale.countDocuments({
        status: "complete",
        aamarId: aamarId,
        createdAt: { $gte: start, $lte: end },
      });
      console.log(`Found ${totalCount} total complete sales in this period for ${aamarId}`);
      const sale = await Sale.aggregate([
        {
          $match: matchQuery,
        },
        // Lookup storeName from the Settings collection
        {
          $lookup: {
            from: "settings", // Assuming `settings` collection contains store settings
            localField: "aamarId",
            foreignField: "aamarId",
            as: "storeInfo",
          },
        },
        // Lookup warehouseName from the Warehouse collection
        {
          $lookup: {
            from: "warehouses", // Assuming `warehouses` collection contains warehouse details
            localField: "warehouse",
            foreignField: "_id",
            as: "warehouseInfo",
          },
        },
        {
          $unwind: { path: "$storeInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $unwind: { path: "$warehouseInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "users", // Assuming `users` collection contains biller data
            localField: "billerId",
            foreignField: "_id",
            as: "billerInfo",
          },
        },
        {
          $lookup: {
            from: "customers", // Integrate customer details
            localField: "customerId",
            foreignField: "_id",
            as: "customerInfo",
          },
        },
        {
          $unwind: { path: "$billerInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 1,
            invoiceNo: "$invoiceId",
            source: 1,
            totalItem: { $ifNull: ["$totalItem", 0] },
            grossTotal: { $ifNull: ["$grossTotal", 0] },
            total: { $ifNull: ["$total", 0] },
            vat: { $ifNull: ["$vat", 0] },
            oldPoint: "$point.old",
            newPoint: "$point.new",
            todayPoint: { $ifNull: ["$todayPoint", 0] },
            promoDiscount: { $ifNull: ["$promo_discount", 0] },
            billerId: { $ifNull: ["$billerInfo.name", "Unknown Biller"] },
            totalReceived: { $ifNull: ["$totalReceived", 0] },
            cash: "$paidAmount.cash",
            cardType: "$paidAmount.card.name",
            cardAmount: "$paidAmount.card.amount",
            mfsType: "$paidAmount.mfs.name",
            mfsAmount: "$paidAmount.mfs.amount",
            changeAmount: { $ifNull: ["$changeAmount", 0] },
            returnInvoice: "$returnInvoice",
            pointUse: "$paidAmount.point",
            totalReturn: "$returnCal.total",
            grossTotalReturn: "$returnCal.grossTotal",
            itemReturn: "$returnCal.totalItem",
            pointReturn: "$returnCal.point",
            customerName: "$customerInfo.name",
            customerPhone: "$customerInfo.phone",
            customerMembership: "$customerInfo.membership",
            customerGroup: "$customerInfo.group",
            customerBatch: "$customerInfo.batch",
            createdAt: {
              $dateToString: {
                format: "%d/%m/%Y",
                date: "$createdAt",
              },
            },
            storeName: "$storeInfo.storeName", // Add storeName from Settings
            warehouseName: "$warehouseInfo.name", // Add warehouseName from Warehouse
          },
        },
      ]);

      console.log("customer wise sale:", sale);

      res.status(200).json(sale);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  })
);

// Biller Wise Sales - Done
reportsRouter.get(
  "/billerWiseSales/:start/:end/:warehouse/:aamarId/:billerId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());

    const { warehouse, aamarId, billerId } = req.params;

    try {
      const matchConditions = {
        createdAt: { $gte: start, $lte: end },
        aamarId: aamarId,
      };

      if (billerId && billerId !== "undefined" && mongoose.isValidObjectId(billerId)) {
        matchConditions.billerId = new mongoose.Types.ObjectId(billerId);
      }

      if (warehouse !== "allWh" && warehouse && mongoose.isValidObjectId(warehouse)) {
        matchConditions.warehouse = new mongoose.Types.ObjectId(warehouse);
      }

      const result = await Sale.aggregate([
        { $match: matchConditions },

        {
          $lookup: {
            from: "users",
            localField: "billerId",
            foreignField: "_id",
            as: "billerInfo",
          },
        },
        { $unwind: { path: "$billerInfo", preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: "warehouses",
            localField: "warehouse",
            foreignField: "_id",
            as: "warehouseInfo",
          },
        },
        {
          $unwind: { path: "$warehouseInfo", preserveNullAndEmptyArrays: true },
        },

        {
          $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customerInfo",
          },
        },
        {
          $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true },
        },

        {
          $project: {
            invoiceId: 1,
            date: "$createdAt",
            customerName: "$customerInfo.name",
            warehouseName: "$warehouseInfo.name",
            totalItem: 1,
            grossTotal: "$grossTotalRound",
            discount: 1,
            billerName: "$billerInfo.name",
          },
        },

        { $sort: { date: -1 } },
      ]);

      res.status(200).json(result);
    } catch (error) {
      console.error("Biller Wise Sales Error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching biller-wise sales data",
        error: error.message,
      });
    }
  })
);

// ----------------------------👥 Customer Reports ----------------------------
// Customer
reportsRouter.get(
  "/customerLedger/:start/:end/:warehouse/:aamarId/:customerId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());

    const { warehouse, aamarId } = req.params;
  })
);

// ---------------------------- 📦 Product Reports ----------------------------

// Product Wise Purchase - Done

reportsRouter.get(
  "/productWisePurchase/:start/:end/:warehouse/:aamarId/:productId",
  expressAsyncHandler(async (req, res) => {
    try {
      const start = req.params.start
        ? startOfDay(new Date(req.params.start))
        : startOfDay(new Date());
      const end = req.params.end
        ? endOfDay(new Date(req.params.end))
        : endOfDay(new Date());

      const { warehouse, aamarId, productId } = req.params;

      // console.log(
      //   "productWisePurchase",
      //   start,
      //   end,
      //   warehouse,
      //   aamarId,
      //   productId
      // );

      const matchQuery = {
        $and: [
          { aamarId },
          {
            createdAt: {
              $gte: start,
              $lte: end,
            },
          },
          { "products.id": productId },
        ],
      };

      if (warehouse !== "allWh" && warehouse && mongoose.isValidObjectId(warehouse)) {
        matchQuery.$and.push({
          warehouse: new mongoose.Types.ObjectId(warehouse),
        });
      }

      const report = await Grn.aggregate([
        { $match: matchQuery },
        {
          $unwind: { path: "$products", preserveNullAndEmptyArrays: false },
        },
        {
          $lookup: {
            from: "suppliers",
            localField: "supplier",
            foreignField: "_id",
            as: "supplierInfo",
          },
        },
        {
          $unwind: { path: "$supplierInfo", preserveNullAndEmptyArrays: false },
        },

        {
          $lookup: {
            from: "purchases",
            localField: "poNo",
            foreignField: "_id",
            as: "poInfo",
          },
        },
        {
          $unwind: {
            path: "$poInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "tpns",
            localField: "tpnNo",
            foreignField: "_id",
            as: "tpnInfo",
          },
        },
        {
          $unwind: {
            path: "$tpnInfo",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "warehouses",
            localField: "warehouse",
            foreignField: "_id",
            as: "warehouseInfo",
          },
        },
        {
          $unwind: {
            path: "$warehouseInfo",
            preserveNullAndEmptyArrays: false,
          },
        },

        {
          $project: {
            grnNo: 1,
            poNo: "$poInfo.poNo",
            tpnNo: { $ifNull: ["$tpnInfo.tpnNo", "-"] },
            date: "$createdAt",
            supplierName: "$supplierInfo.name",
            productId: "$products.id",
            productName: "$products.name",
            warehouse: "$warehouseInfo.name",
            article_code: "$products.article_code",
            tp: { $toDouble: { $ifNull: ["$products.tp", 0] } },
            qty: { $toDouble: { $ifNull: ["$products.qty", 0] } },
            amount: {
              $multiply: [
                { $toDouble: { $ifNull: ["$products.qty", 0] } },
                { $toDouble: { $ifNull: ["$products.tp", 0] } },
              ],
            },
          },
        },
        {
          $sort: { date: -1 }, // recent first
        },
      ]);

      res.json(report);
    } catch (err) {
      console.error("Product-wise GRN fetch error:", err);
      res.status(500).json({
        message: "Something went wrong",
        error: err.message || err,
      });
    }
  })
);

// Product Wise Sales - Done

reportsRouter.get(
  "/productWiseSales/:start/:end/:warehouse/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const { start, end, warehouse, aamarId, q } = req.params;

    const startDate = start
      ? startOfDay(new Date(start))
      : startOfDay(new Date());
    const endDate = end ? endOfDay(new Date(end)) : endOfDay(new Date());

    if (!q || q.trim() === "") {
      return res.status(200).json([]); // If query is empty, return empty array
    }

    const isNumber = /^\d/.test(q); // If query starts with number, search article_code or ean
    const escapeRegExp = (string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedQuery = escapeRegExp(q);

    const matchStage = {
      aamarId,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (warehouse !== "allWh") {
      matchStage.warehouse = ObjectId(warehouse);
    }

    const sales = await Sale.aggregate([
      { $match: matchStage },

      { $unwind: "$products" },

      {
        $match: isNumber
          ? {
              $or: [
                {
                  "products.article_code": {
                    $regex: new RegExp(escapedQuery, "i"),
                  },
                },
              ],
            }
          : {
              "products.name": { $regex: new RegExp(escapedQuery, "i") },
            },
      },

      {
        $lookup: {
          from: "warehouses",
          localField: "warehouse",
          foreignField: "_id",
          as: "warehouseDetails",
        },
      },
      {
        $unwind: {
          path: "$warehouseDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          invoiceId: "$invoiceId",
          date: "$createdAt",
          warehouse: "$warehouseDetails.name",
          productName: "$products.name",
          articleCode: "$products.article_code",
          eanCode: "$products.ean",
          quantitySold: "$products.qty",
          tp: "$products.tp",
          mrp: "$products.mrp",
          totalSalesAmount: {
            $multiply: [
              { $toDouble: "$products.qty" },
              { $toDouble: "$products.mrp" },
            ],
          },
          profit: {
            $subtract: [
              { $toDouble: "$products.mrp" },
              { $toDouble: "$products.tp" },
            ],
          },
          returnQuantity: {
            $size: { $ifNull: ["$returnProducts", []] },
          },
          paymentMethod: { $ifNull: ["$paidAmount.method", "Unknown"] },
        },
      },
    ]);

    return res.status(200).json(sales);
  })
);

// Product Wise Stock

// Non-Moving Product Report

// Out of Stock Products

reportsRouter.get(
  "/outOfStockProduct/:start/:end/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { warehouse, aamarId, start, end } = req.params;

    const startDate = start
      ? startOfDay(new Date(start))
      : startOfDay(new Date());
    const endDate = end ? endOfDay(new Date(end)) : endOfDay(new Date());

    // Build inventory match filter
    const inventoryMatch = {
      aamarId,
      createdAt: { $gte: startDate, $lte: endDate },
      currentQty: { $lte: 0 }, // out of stock or less
    };

    if (warehouse !== "allWh") {
      inventoryMatch.warehouse = ObjectId(warehouse);
    }

    const outOfStockProducts = await Product.aggregate([
      {
        $lookup: {
          from: "inventories",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$product", "$$productId"] },
                ...inventoryMatch,
              },
            },
          ],
          as: "inventoryInfo",
        },
      },

      // Sum currentQty across filtered inventory entries (out of stock entries only)
      {
        $addFields: {
          totalCurrentQty: { $sum: "$inventoryInfo.currentQty" },
        },
      },

      // Filter products where totalCurrentQty <= 0 (meaning out of stock in filtered inventory)
      {
        $match: {
          totalCurrentQty: { $lte: 0 },
        },
      },

      // Lookup brand info
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandInfo",
        },
      },
      { $unwind: { path: "$brandInfo", preserveNullAndEmptyArrays: true } },

      // Lookup category info
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },

      // Final projection
      {
        $project: {
          productName: "$name",
          articleCode: "$article_code",
          brand: "$brandInfo.name",
          category: "$categoryInfo.name",
          unit: 1,
          tp: 1,
          mrp: 1,
          closingStock: "$totalCurrentQty",
        },
      },
    ]);
    res.json(outOfStockProducts);
  })
);

// ---------------------------- 🏷️ Group / Generic / Brand Reports ----------------------------

// Product Group Wise Sales

// Generic Wise Product Report

// Generic Wise Sales Report

// Brand Wise Product

// Brand Wise Sales Report

//  ---------------------------- 🛍️ Purchase Reports ----------------------------
// Date Wise Purchase Report

// Supplier-wise Purchase Report

// Product-wise Purchase Report

// User-wise Purchase Report

//  ----------------------------📥 GRN (Goods Received Note) Reports ----------------------------
// GRN Wise Purchase Summary

// GRN Item Details

// GRN and PO Matching Report

//  ---------------------------- 🔄 RTV (Return to Vendor) Reports ----------------------------
// RTV Summary by Date

// RTV Product Details

// RTV by Supplier Report

// ---------------------------- 🔁 TPN (Transfer Posting Note) Reports ----------------------------
// TPN Summary by Date

// TPN Between Warehouses

// TPN Product-wise Movement

// ---------------------------- 🚚 Supplier Reports ----------------------------
// Supplier Ledger

// Supplier Payment History

// Outstanding Payables

// Supplier Wise Product Supply History

// ---------------------------- 🧮 Inventory Reports ----------------------------
// Current Stock Report

// Product-wise Stock Report

// Stock Valuation Report

// Inventory Aging Report

// ---------------------------- 📦 Stock Movement Reports ----------------------------
// Stock Movement Report (Product-wise)

// Warehouse Transfer History

// Inventory Adjustment History

//  ---------------------------- ❌ Damage Reports ----------------------------
// Damaged Product Summary

// Damage Reason Report

// User Wise Damage Entry Report
reportsRouter.get(
  "/supplierWiseSales/:start/:end/:warehouse/:aamarId/:supplierId",
  expressAsyncHandler(async (req, res) => {
    const { start, end, warehouse, aamarId, supplierId } = req.params;

    const startDate = start
      ? startOfDay(new Date(start))
      : startOfDay(new Date());
    const endDate = end ? endOfDay(new Date(end)) : endOfDay(new Date());

    const matchStage = {
      aamarId,
      status: "complete",
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (
      warehouse !== "allWh" &&
      warehouse &&
      mongoose.isValidObjectId(warehouse)
    ) {
      matchStage.warehouse = new mongoose.Types.ObjectId(warehouse);
    }

    try {
      const sales = await Sale.aggregate([
        { $match: matchStage },
        { $unwind: "$products" },
        {
          $match: {
            "products.supplier": supplierId,
          },
        },
        {
          $lookup: {
            from: "warehouses",
            localField: "warehouse",
            foreignField: "_id",
            as: "warehouseInfo",
          },
        },
        {
          $unwind: { path: "$warehouseInfo", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            invoiceId: 1,
            date: "$createdAt",
            productName: "$products.name",
            articleCode: "$products.article_code",
            qty: { $toDouble: "$products.qty" },
            tp: { $toDouble: "$products.tp" },
            mrp: { $toDouble: "$products.mrp" },
            warehouseName: "$warehouseInfo.name",
            amount: {
              $multiply: [
                { $toDouble: "$products.qty" },
                { $toDouble: "$products.mrp" },
              ],
            },
            profit: {
              $multiply: [
                { $toDouble: "$products.qty" },
                {
                  $subtract: [
                    { $toDouble: "$products.mrp" },
                    { $toDouble: "$products.tp" },
                  ],
                },
              ],
            },
          },
        },
        { $sort: { date: -1 } },
      ]);

      res.status(200).json(sales);
    } catch (error) {
      console.error("Supplier Wise Sales Error:", error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  })
);

// Loss & Profit Report
// Loss & Profit Report (with return adjustment & detailed per product)
reportsRouter.get(
  "/lossProfit/:start/:end/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    try {
      const start = req.params.start
        ? startOfDay(new Date(req.params.start))
        : startOfDay(new Date());

      const end = req.params.end
        ? endOfDay(new Date(req.params.end))
        : endOfDay(new Date());

      const { warehouse, aamarId } = req.params;

      const commonMatch = {
        aamarId,
        createdAt: { $gte: start, $lte: end },
      };

      if (warehouse !== "allWh") {
        commonMatch.warehouse =ObjectId(warehouse);
      }

      // Step 1: Sales Data
      const sales = await Sale.aggregate([
        { $match: { ...commonMatch, returnInvoice: null } },
        { $unwind: "$products" },
        {
          $project: {
            invoiceId: 1,
            createdAt: 1,
            productId: "$products.id",
            productName: "$products.name",
            tp: { $toDouble: "$products.tp" },
            mrp: { $toDouble: "$products.mrp" },
            qty: { $toDouble: "$products.qty" },
            supplier: "$products.supplier",
          }
        },
        {
          $addFields: {
            totalSellAmount: { $multiply: ["$mrp", "$qty"] },
            totalCost: { $multiply: ["$tp", "$qty"] },
            profit: { $multiply: ["$qty", { $subtract: ["$mrp", "$tp"] }] }
          }
        }
      ]);

      // Step 2: Returns Data
      const returns = await Sale.aggregate([
        { $match: { ...commonMatch, returnInvoice: { $ne: null } } },
        { $unwind: "$returnProducts" },
        {
          $project: {
            productId: "$returnProducts.id",
            productName: "$returnProducts.name",
            tp: { $toDouble: "$returnProducts.tp" },
            mrp: { $toDouble: "$returnProducts.mrp" },
            qty: { $toDouble: "$returnProducts.qty" },
            supplier: "$returnProducts.supplier",
          }
        },
        {
          $addFields: {
            totalSellAmount: { $multiply: ["$mrp", "$qty"] },
            totalCost: { $multiply: ["$tp", "$qty"] },
            profit: { $multiply: ["$qty", { $subtract: ["$mrp", "$tp"] }] }
          }
        }
      ]);

      // Step 3: Adjust returns
      const adjustedSales = sales.map((sale) => {
        const returned = returns.find(
          (r) =>
            r.productId === sale.productId &&
            r.tp === sale.tp &&
            r.mrp === sale.mrp
        );

        const returnQty = returned?.qty || 0;
        const returnSell = returned?.totalSellAmount || 0;
        const returnCost = returned?.totalCost || 0;
        const returnProfit = returned?.profit || 0;

        const netQty = sale.qty - returnQty;
        const netSell = sale.totalSellAmount - returnSell;
        const netCost = sale.totalCost - returnCost;
        const netProfit = sale.profit - returnProfit;

        const profitPercent =
          netSell === 0 ? 0 : parseFloat(((netProfit / netSell) * 100).toFixed(2));

        return {
          _id: 0,
          invoiceId: sale.invoiceId,
          createdAt: sale.createdAt,
          productId: sale.productId,
          productName: sale.productName,
          tp: sale.tp,
          mrp: sale.mrp,
          qty: netQty,
          totalSellAmount: netSell,
          totalCost: netCost,
          profit: netProfit,
          profitPercent,
          supplier: sale.supplier
        };
      });

      // Remove negative/zero qty rows if needed:
      const filtered = adjustedSales.filter((item) => item.qty > 0);

      res.json(filtered);
    } catch (err) {
      console.error("Loss & Profit Report Error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  })
);



reportsRouter.get(
  "/lossProfitTotal/:start/:end/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    try {
      const start = req.params.start
        ? startOfDay(new Date(req.params.start))
        : startOfDay(new Date());

      const end = req.params.end
        ? endOfDay(new Date(req.params.end))
        : endOfDay(new Date());

      const { warehouse, aamarId } = req.params;

      const commonMatch = {
        aamarId,
        createdAt: { $gte: start, $lte: end },
      };

      if (warehouse !== "allWh") {
        commonMatch.warehouse = ObjectId(warehouse);
      }

      // --- SALES ---
      const sales = await Sale.aggregate([
        { $match: { ...commonMatch, returnInvoice: null } },
        { $unwind: "$products" },
        {
          $project: {
            tp: { $toDouble: "$products.tp" },
            mrp: { $toDouble: "$products.mrp" },
            qty: { $toDouble: "$products.qty" },
          },
        },
        {
          $addFields: {
            totalSellAmount: { $multiply: ["$mrp", "$qty"] },
            totalCost: { $multiply: ["$tp", "$qty"] },
            profit: { $multiply: ["$qty", { $subtract: ["$mrp", "$tp"] }] },
          },
        },
      ]);

      // --- RETURNS ---
      const returns = await Sale.aggregate([
        { $match: { ...commonMatch, returnInvoice: { $ne: null } } },
        { $unwind: "$returnProducts" },
        {
          $project: {
            tp: { $toDouble: "$returnProducts.tp" },
            mrp: { $toDouble: "$returnProducts.mrp" },
            qty: { $toDouble: "$returnProducts.qty" },
          },
        },
        {
          $addFields: {
            totalSellAmount: { $multiply: ["$mrp", "$qty"] },
            totalCost: { $multiply: ["$tp", "$qty"] },
            profit: { $multiply: ["$qty", { $subtract: ["$mrp", "$tp"] }] },
          },
        },
      ]);

      // --- TOTAL CALCULATION ---
      const totals = {
        totalSaleTP: 0,
        totalSaleMRP: 0,
        totalProfit: 0,
      };

      for (const item of sales) {
        totals.totalSaleTP += item.totalCost;
        totals.totalSaleMRP += item.totalSellAmount;
        totals.totalProfit += item.profit;
      }

      for (const item of returns) {
        totals.totalSaleTP -= item.totalCost;
        totals.totalSaleMRP -= item.totalSellAmount;
        totals.totalProfit -= item.profit;
      }

      // Round off
      totals.totalSaleTP = parseFloat(totals.totalSaleTP.toFixed(2));
      totals.totalSaleMRP = parseFloat(totals.totalSaleMRP.toFixed(2));
      totals.totalProfit = parseFloat(totals.totalProfit.toFixed(2));

      // --- RETURN ONLY TOTALS ---
      res.json(totals);
    } catch (err) {
      console.error("Loss & Profit Report Error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  })
);








module.exports = reportsRouter;
