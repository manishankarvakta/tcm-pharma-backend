const express = require("express");
const stockLedgerRouter = express.Router();
const expressAsyncHandler = require("express-async-handler");
const StockLedger = require("../models/stockLedgerModel");
const Product = require("../models/productModel");
const Group = require("../models/groupModel");
const { startOfDay, endOfDay } = require("date-fns");
const mongoose = require("mongoose");

// GET Inventory Summary from Stock Ledger
stockLedgerRouter.get(
  "/balance-summary",
  expressAsyncHandler(async (req, res) => {
    const { aamarId, warehouseId, startDate, endDate, q } = req.query;

    const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    let matchQuery = { aamarId };
    if (warehouseId && warehouseId !== "allWh") {
      matchQuery.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    try {
      const data = await StockLedger.aggregate([
        { $match: matchQuery },
        { $match: { createdAt: { $lte: end } } },
        {
          $group: {
            _id: "$productId",
            openingQty: {
              $sum: {
                $cond: [
                  { $lt: ["$createdAt", start] },
                  { $cond: [{ $eq: ["$action", "IN"] }, "$quantity", { $subtract: [0, "$quantity"] }] },
                  0
                ]
              }
            },
            totalQty: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", start] },
                      { $eq: ["$transactionType", "PURCHASE"] }
                    ]
                  },
                  "$quantity",
                  0
                ]
              }
            },
            soldQty: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", start] },
                      { $eq: ["$transactionType", "SALE"] }
                    ]
                  },
                  "$quantity",
                  0
                ]
              }
            },
            salesReturnQty: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", start] },
                      { $eq: ["$transactionType", "SALES_RETURN"] }
                    ]
                  },
                  "$quantity",
                  0
                ]
              }
            },
            rtvQty: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", start] },
                      { $eq: ["$transactionType", "PURCHASE_RETURN"] }
                    ]
                  },
                  "$quantity",
                  0
                ]
              }
            },
            tpnQty: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", start] },
                      { $eq: ["$transactionType", "TRANSFER"] }
                    ]
                  },
                  "$quantity",
                  0
                ]
              }
            },
            damageQty: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$createdAt", start] },
                      { $eq: ["$transactionType", "DAMAGE"] }
                    ]
                  },
                  "$quantity",
                  0
                ]
              }
            },
            currentQty: {
              $sum: {
                $cond: [{ $eq: ["$action", "IN"] }, "$quantity", { $subtract: [0, "$quantity"] }]
              }
            }
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $lookup: {
            from: "groups",
            localField: "productDetails.group",
            foreignField: "_id",
            as: "groupDetails"
          }
        },
        { $unwind: { path: "$groupDetails", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            article_code: "$productDetails.article_code",
            name: "$productDetails.name",
            groupName: "$groupDetails.name",
            tp: "$productDetails.tp",
            openingQty: 1,
            totalQty: 1,
            soldQty: 1,
            salesReturnQty: 1,
            rtvQty: 1,
            tpnQty: 1,
            damageQty: 1,
            currentQty: 1
          }
        },
        {
          $match: {
            $or: [
              { name: { $regex: new RegExp(".*" + (q || "") + ".*?", "i") } },
              { article_code: { $regex: new RegExp(".*" + (q || "") + ".*?", "i") } }
            ]
          }
        }
      ]);

      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error", error: err.message });
    }
  })
);
// get stock summary show in inventory route
stockLedgerRouter.get(
  "/stock-summary",
  expressAsyncHandler(async (req, res) => {
    const { aamarId, warehouseId, startDate, endDate, q } = req.query;

    const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    let matchQuery = { aamarId };

    if (warehouseId && warehouseId !== "allWh") {
      matchQuery.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    const pipeline = [
      {
        $match: {
          ...matchQuery,
          createdAt: { $gte: start, $lte: end },
        },
      },

      { $sort: { createdAt: 1 } },

      {
        $group: {
          _id: "$productId",

          openingQty: { $first: "$openingBalance" },

          // IN
          totalQty: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "PURCHASE"] },
                "$quantity",
                0,
              ],
            },
          },
          salesReturnQty: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "SALES_RETURN"] },
                "$quantity",
                0,
              ],
            },
          },
          adjustQty: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$transactionType", "ADJUSTMENT"] },
                    { $eq: ["$action", "IN"] },
                  ],
                },
                "$quantity",
                0,
              ],
            },
          },

          // OUT
          soldQty: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "SALE"] }, "$quantity", 0],
            },
          },
          rtvQty: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "PURCHASE_RETURN"] },
                "$quantity",
                0,
              ],
            },
          },
          tpnQty: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "TRANSFER"] },
                "$quantity",
                0,
              ],
            },
          },
          damageQty: {
            $sum: {
              $cond: [
                { $eq: ["$transactionType", "DAMAGE"] },
                "$quantity",
                0,
              ],
            },
          },
          otherAdjustQty: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$transactionType", "ADJUSTMENT"] },
                    { $eq: ["$action", "OUT"] },
                  ],
                },
                "$quantity",
                0,
              ],
            },
          },
        },
      },

      // Available Qty
      {
        $addFields: {
          availableQty: {
            $add: [
              "$openingQty",
              "$totalQty",
              "$salesReturnQty",
              "$adjustQty",
            ],
          },
        },
      },

      // Lookup Product
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      // 🔍 Search filter (name / article_code)
      ...(q
        ? [
            {
              $match: {
                $or: [
                  {
                    "product.name": {
                      $regex: q,
                      $options: "i",
                    },
                  },
                  {
                    "product.article_code": {
                      $regex: q,
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),

      // Lookup Group
      {
        $lookup: {
          from: "groups",
          localField: "product.group",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $unwind: {
          path: "$group",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,

          article_code: "$product.article_code",
          name: "$product.name",
          groupName: "$group.name",

          openingQty: 1,
          totalQty: 1,
          salesReturnQty: 1,
          adjustQty: 1,
          availableQty: 1,

          soldQty: 1,
          rtvQty: 1,
          tpnQty: 1,
          damageQty: 1,
          otherAdjustQty: 1,

          tp: { $toDouble: "$product.tp" },
          mrp: { $toDouble: "$product.mrp" },

          currentQty: {
            $subtract: [
              "$availableQty",
              {
                $add: [
                  "$soldQty",
                  "$rtvQty",
                  "$tpnQty",
                  "$damageQty",
                  "$otherAdjustQty",
                ],
              },
            ],
          },
        },
      },

      {
        $addFields: {
          stockValue: { $multiply: ["$currentQty", "$tp"] },
        },
      },
    ];

    const data = await StockLedger.aggregate(pipeline);

    res.json({
      success: true,
      count: data.length,
      data,
    });
  })
);

// GET ALL Stock Ledger with Pagination & Filtering
stockLedgerRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;
    const { startDate, endDate, productId, warehouseId, transactionType, action, aamarId, search } = req.query;

    let query = {};

    if (aamarId) {
      query.aamarId = aamarId;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: startOfDay(new Date(startDate)),
        $lte: endOfDay(new Date(endDate)),
      };
    }

    if (productId) {
      query.productId = mongoose.Types.ObjectId(productId);
    }

    // Search functionality for Product Name or Article Code
    if (search) {
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { article_code: { $regex: search, $options: "i" } }
        ]
      }).select("_id");

      const productIds = products.map(p => p._id);

      // If productId was already set by filter, intersection is needed, but for now we assume search overrides or refines
      if (query.productId) {
        // If specific productId requested AND search requested, valid only if search matches that product
        // This is a bit complex, and typically user uses EITHER search OR specific filter. 
        // But to be safe, we can use $in with the intersection.
        // However, simplify: if search is present, we filter by these IDs.
        // If products found:
        if (productIds.length > 0) {
          query.productId = { $in: productIds };
        } else {
          // Search yielded no results, so query should return nothing
          return res.status(200).json({
            data: [],
            total: 0,
            page,
            size
          });
        }
      } else {
        if (productIds.length > 0) {
          query.productId = { $in: productIds };
        } else {
          return res.status(200).json({
            data: [],
            total: 0,
            page,
            size
          });
        }
      }
    }

    if (warehouseId) {
      query.warehouseId = mongoose.Types.ObjectId(warehouseId);
    }

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (action) {
      query.action = action;
    }

    try {
      const skip = page * size;

      const [data, total] = await Promise.all([
        StockLedger.find(query)
          .populate("productId", "name article_code")
          .populate("warehouseId", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(size),
        StockLedger.countDocuments(query)
      ]);

      res.status(200).json({
        data,
        total,
        page,
        size
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error", error: err.message });
    }
  })
);

module.exports = stockLedgerRouter;
