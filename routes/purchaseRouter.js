/**
 * Purchases API
 * 1. get all Purchases
 * 2. get Purchase by id
 * 3. get Purchase by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Purchase = require("../models/purchaseModel");
const Category = require("../models/categoryModel");
const checklogin = require("../middlewares/checkLogin");
const { generatePoId } = require("../middlewares/generateId");
const { startOfDay, endOfDay, format } = require("date-fns");
const { default: mongoose } = require("mongoose");
const { ObjectId } = require("mongoose").Types;

const purchaseRouter = express.Router();

// purchase Count
purchaseRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { aamarId } = req.params;

    try {
      // console.log("Received aamarId:", aamarId);

      // Check if aamarId is a valid ObjectId (if necessary)
      const count = await Purchase.countDocuments({ aamarId });

      res.status(200).json(count);
    } catch (error) {
      console.error("Error fetching count:", error); // Log the error
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  })
);

// GET ALL Purchases
purchaseRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const purchases = await Purchase.find({})
      .select({
        poNo: 1,
        supplier: 1,
        warehouse: 1,
        type: 1,
        totalItem: 1,
        total: 1,
        status: 1,
        createdAt: 1,
        shipping_cost: 1,
        note: 1,
      })
      .populate("supplier", "name")
      .populate("warehouse", "name")
      .populate("userId", "name");
    //   .exec(callback);
    const sorted = purchases
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.send(sorted);
    // // res.send('removed');
    // console.log(Purchases);
  })
);
// GET active Purchases
purchaseRouter.get(
  "/active/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const warehouse = req.params.warehouse || "";
    let query = {
      status: "Pending",
      aamarId,
    };

    if (warehouse !== "allWh") {
      query.warehouse = mongoose.Types.ObjectId(warehouse);
    }
    console.log("query", query);
    const purchases = await Purchase.find(query)
      .select({
        poNo: 1,
        supplier: 1,
        warehouse: 1,
        type: 1,
        totalItem: 1,
        total: 1,
        status: 1,
        createdAt: 1,
        shipping_cost: 1,
        note: 1,
      })
      .populate("supplier", "name")
      .populate("warehouse", "name")
      .populate("userId", "name");
    //   .exec(callback);
    const sorted = purchases
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.send(sorted);
    // // res.send('removed');
    console.log("sorted", sorted);
  })
);

// purchaseRouter.get(
//   "/supplier/account/:id",
//   expressAsyncHandler(async (req, res) => {
//     const id = req.params.id;
//     try {
//       const Purchases = await Purchase.find({ supplier: id })
//         .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
//         // .populate("warehouse", "name")
//         .populate("userId", "name");

//       // console.log(Purchases);
//       res.send(Purchases);
//     } catch (err) {
//       console.log(err);
//     }
//     // // res.send('removed');
//   })
// );

// GET weekly Purchases
purchaseRouter.get(
  "/week-purchase/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId || "";
    const { startDate, endDate } = req.query;

    try {
      let rangeStart, rangeEnd;
      if (startDate && endDate) {
        rangeStart = startOfDay(new Date(startDate));
        rangeEnd = endOfDay(new Date(endDate));
      } else {
        rangeEnd = endOfDay(new Date());
        rangeStart = startOfDay(new Date(new Date().setDate(new Date().getDate() - 6)));
      }

      const matchConditions = [
        {
          status: "complete",
        },
        { aamarId: aamarId },
        {
          createdAt: {
            $gte: rangeStart,
            $lte: rangeEnd,
          },
        },
        {
          source: "POS",
        },
      ];

      if (warehouse !== "allWh" && warehouse) {
        matchConditions.push({
          warehouse: new mongoose.Types.ObjectId(warehouse),
        });
      }

      // Fetch aggregated purchases within the date range
      const purchasesData = await Purchase.aggregate([
        {
          $match: {
            $and: matchConditions,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            total: { $sum: "$grossTotalRound" },
          },
        },
        {
          $sort: { _id: 1 }, // Sort by date in ascending order
        },
      ]);

      // Generate date range entries with 0 total if missing
      const result = [];
      const label = [];
      const value = [];
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        const formattedDate = format(cur, "yyyy-MM-dd");
        const isoDate = cur.toISOString().split("T")[0];
        const dayName = cur.toLocaleDateString("en-US", { weekday: "short" });

        const purchase = purchasesData.find((s) => s._id === formattedDate || s._id === isoDate);
        label.push(formattedDate);
        value.push(purchase ? purchase.total : 0);
        result.push({
          date: formattedDate,
          total: purchase ? purchase.total : 0,
          day: dayName,
        });
        cur.setDate(cur.getDate() + 1);
      }

      res.status(200).send({ result, value, label });
    } catch (err) {
      console.error("Error fetching weekly purchases:", err);
      res.status(500).send({ error: "Failed to fetch weekly purchases" });
    }
  })
);

// GET weekly Purchases
// purchaseRouter.get(
//   "/week-purchase",
//   expressAsyncHandler(async (req, res) => {
//     const today = new Date();
//     // const startDate = new Date(today.setDate(today.getDate() - 1 - today.getDay()));
//     // const endDate = new Date(today.setDate(today.getDate() - today.getDay()));
//     // const end = startOfDay(new Date(endDate))
//     // const start = endOfDay(new Date(startDate))
//     // console.log(startDate, endDate)

//     const currentDate = new Date();
//     const last7Days = [];

//     for (let i = 0; i <= 10; i++) {
//       let day = new Date(currentDate.getTime());
//       day.setDate(currentDate.getDate() - i);
//       last7Days.push(day);
//     }

//     // console.log(last7Days);
//     const to = endOfDay(currentDate);
//     const end = startOfDay(new Date(last7Days[0]));
//     const start = endOfDay(new Date(last7Days[8]));
//     // console.log("test1", start)
//     // console.log("test2", end)
//     // console.log("test2", to)
//     try {
//       const purchases = await Purchase.aggregate([
//         {
//           $match: {
//             createdAt: {
//               $gte: start,
//               $lt: end,
//             },
//           },
//         },
//         {
//           $group: {
//             _id: {
//               $dateToString: {
//                 format: "%Y-%m-%d",
//                 date: "$createdAt",
//               },
//             },
//             total: {
//               $sum: "$total",
//             },
//           },
//         },
//         {
//           $sort: {
//             _id: 1,
//           },
//         },
//       ]);
//       // console.log(start, end);
//       // console.log(start, end);
//       // let filteredDate = []
//       // const match = purchases.map(purchase => {
//       //   console.log("o", new Date(purchase._id))
//       //   for (let i = 1; i <= 7; i++) {
//       //     console.log("p", new Date(last7Days[i]))
//       //     if (new Date(last7Days[i]) == new Date(purchase._id)) {
//       //       console.log("true")
//       //     } else {
//       //       console.log("false")
//       //     }
//       //   }
//       //   // filteredDate = [...filteredDate, p[0]]
//       // })

//       // console.log(match)
//       res.send(purchases);
//       // res.send(Purchases);
//     } catch (err) {
//       console.log(err);
//     }
//     // // res.send('removed');
//   })
// );

//grn by category  between two dates
purchaseRouter.get(
  "/category/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());

    // console.log(start, end, new Date());

    try {
      const purchase = await Purchase.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lt: end,
            },
          },
        },
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: "$products.id",
            article_code: { $first: "$products.article_code" },
            totalQuantity: { $sum: { $toDouble: "$products.qty" } },
            name: { $first: "$products.name" },
            // mrp: { $last: '$products.mrp' },
            tp: { $last: "$products.tp" },
            priceId: { $first: "$products.priceId" },
          },
        },
        {
          $sort: { totalQuantity: -1 },
        },
        {
          $lookup: {
            from: "products",
            localField: "article_code",
            foreignField: "article_code",
            as: "productId",
          },
        },
        {
          $unwind: "$productId",
        },
        {
          $lookup: {
            from: "categories",
            localField: "productId.category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $group: {
            _id: "$category._id",
            totalQuantity: { $sum: { $toDouble: "$totalQuantity" } },
            totalValue: {
              $sum: {
                $multiply: [
                  { $toDouble: "$totalQuantity" },
                  { $toDouble: "$tp" },
                ],
              },
            },
          },
        },
        {
          $sort: { totalQuantity: -1 },
        },
      ]);
      const populatePurchase = await Category.populate(purchase, {
        path: "_id",
        model: "Category",
      });
      res.send(populatePurchase);
    } catch (err) {
      console.log(err);
    }
    // console.log(sales);
    // // res.send('removed');
  })
);

// GET ONE Purchases
purchaseRouter.get(
  "/supplier/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const Purchases = await Purchase.find({ _id: id })
      .populate({
        path: "supplier",
        select: { company: 1, email: 1, phone: 1, address: 1, products: 1 },
        populate: {
          path: "products.id",
          model: "Product",
          populate: {
            path: "group",
            model: "Group",
          },
        },
      })
      .populate("warehouse", "name")
      .populate("userId", "name");
    // .populate("userId")
    res.send(Purchases[0]);
    // // res.send('removed');
    // console.log(Purchases);
  })
);
// GET ONE Purchases
purchaseRouter.get(
  "/supplier/new/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const Purchase = await Purchase.findOne({ _id: id });
    // .populate({
    //   path: "supplier",
    //   select: { company: 1, email: 1, phone: 1, address: 1, products: 1 },
    //   populate: {
    //     path: "products.id",
    //     model: "Product",
    //   },
    // })
    // .populate("warehouse", "name")
    // .populate("userId", "name");
    // .populate("userId")
    res.send(Purchase);
    // // res.send('removed');
    // console.log(Purchases);
  })
);
// GET ONE Purchases
purchaseRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    if (id !== "") {
      const Purchases = await Purchase.find({ _id: id })
        .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
        .populate("warehouse", "name")
        .populate("userId", "name");
      // .populate("userId")
      res.status(200).json(Purchases[0]);
    } else {
      res.status(200).json([]);
    }
    // // res.send('removed');
    // console.log(Purchases);
  })
);
//purchase load by two dates
purchaseRouter.get(
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

    // Build the match query
    let matchQuery = {
      createdAt: { $gte: start, $lte: end },
    };

    // Add aamarId to match query if provided
    if (aamarId && aamarId !== "all") {
      matchQuery.aamarId = aamarId;
    }

    // Add warehouse to match query if it's not "allWh"
    if (warehouse !== "allWh" && warehouse) {
      matchQuery.warehouse = mongoose.Types.ObjectId(warehouse);
    }

    console.log("matchQuery:", matchQuery);

    try {
      const purchaseOrders = await Purchase.aggregate([
        {
          $match: matchQuery,
        },
        {
          $lookup: {
            from: "warehouses",
            localField: "warehouse",
            foreignField: "_id",
            as: "warehouse",
          },
        },
        {
          $lookup: {
            from: "suppliers",
            localField: "supplier",
            foreignField: "_id",
            as: "supplier",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$warehouse" },
        { $unwind: "$supplier" },
        { $unwind: "$user" },
        {
          $project: {
            poNo: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            warehouse: "$warehouse.name",
            supplier: "$supplier.company",
            user: "$user.name",
            totalItem: 1,
            discount: { $round: ["$discount", 2] },
            total: { $round: ["$total", 2] },
            grossTotal: { $round: [{ $subtract: ["$total", "$discount"] }, 2] },
            status: 1,
          },
        },
      ]);

      res.status(200).json(purchaseOrders);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error fetching purchase orders" });
    }
  })
);

purchaseRouter.get(
  "/grn/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId;

    try {
      // Convert `id` to ObjectId if it's not already
      const purchase = await Purchase.findOne({ _id: id, aamarId })
        .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
        .populate("userId", "name")
        .populate({
          path: "products",
          populate: {
            path: "priceId",
            model: "Price",
          },
        });

      if (!purchase) {
        return res.status(404).send({ message: "Purchase not found" });
      }

      res.status(200).send(purchase);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error fetching purchase" });
    }
  })
);

purchaseRouter.get(
  "/supplier/account/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      const Purchases = await Purchase.find({ supplier: id })
        .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
        // .populate("warehouse", "name")
        .populate("userId", "name");

      // console.log(Purchases);
      res.send(Purchases);
    } catch (err) {
      console.log(err);
    }
    // // res.send('removed');
  })
);

// GET ALL GRN WITH PAGENATION & SEARCH
purchaseRouter.get(
  "/:page/:size",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = page + 0;

    let query = {};
    let purchase = [];
    // const size = parseInt(req.query.size);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);
    console.log(typeof queryString);

    //check if search or the pagenation

    if (queryString) {
      // console.log("== query");

      // console.log("search:", query);
      query = { poNo: { $regex: new RegExp(queryString + ".*?", "i") } };
      // search check if num or string
      // const isNumber = /^\d/.test(queryString);
      // console.log(isNumber);
      // if (!isNumber) {
      //   // if text then search name
      //   // query = { name:  queryString  };
      // } else {
      //   // if number search in ean and article code
      //   query = {
      //     $or: [
      //       { ean: { $regex: RegExp("^" + queryString + ".*", "i") } },
      //       {
      //         article_code: {
      //           $regex: RegExp("^" + queryString + ".*", "i"),
      //         },
      //       },
      //     ],
      //   };
      // }
      console.log(query);

      purchase = await Purchase.find(query)
        .select({
          poNo: 1,
          supplier: 1,
          warehouse: 1,
          type: 1,
          totalItem: 1,
          total: 1,
          status: 1,
          createdAt: 1,
          shipping_cost: 1,
          note: 1,
        })
        .limit(50)
        .populate("supplier", "name")
        .populate("warehouse", "name")
        .populate("userId", "name");
      res.status(200).json(Purchase);
    } else {
      // console.log("no query");

      // regular pagination
      query = {};

      purchase = await Purchase.find(query)
        .select({
          poNo: 1,
          supplier: 1,
          warehouse: 1,
          type: 1,
          totalItem: 1,
          total: 1,
          status: 1,
          createdAt: 1,
          shipping_cost: 1,
          note: 1,
        })
        .limit(size)
        .skip(size * page)
        .populate("supplier", "name")
        .populate("warehouse", "name")
        .populate("userId", "name");
      res.status(200).json(purchase);
      // console.log("done:", query);
    }
  })
);

// Helper to sanitize product units in purchase data
const sanitizeProducts = (products) => {
  if (!Array.isArray(products)) return products;
  return products.map((p) => {
    if (p && Array.isArray(p.unit)) {
      const first = p.unit[0];
      p.unit = first ? (typeof first === "object" ? (first.symbol || first.name || "") : String(first)) : "";
    } else if (p && typeof p.unit === "object" && p.unit !== null) {
      p.unit = p.unit.symbol || p.unit.name || "";
    }
    return p;
  });
};

// CREATE ONE Purchase
purchaseRouter.post(
  "/",
  generatePoId,
  expressAsyncHandler(async (req, res) => {
    console.log(req.body);
    if (req.body && req.body.products) {
      req.body.products = sanitizeProducts(req.body.products);
    }
    const newPurchase = new Purchase(req.body);
    try {
      const result = await newPurchase.save();
      // console.log(result);
      res.status(200).json({
        purchase: result,
        message: "Purchase is created Successfully",
      });
    } catch (err) {
      console.error("Purchase Creation Error:", err);
      res
        .status(500)
        .json({ message: "There was a server side error", error: err.message, details: err });
    }
  })
);

// CREATE MULTI Purchases
purchaseRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    if (Array.isArray(req.body)) {
      req.body = req.body.map((purchase) => {
        if (purchase && purchase.products) {
          purchase.products = sanitizeProducts(purchase.products);
        }
        return purchase;
      });
    }
    await Purchase.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "Purchases are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Purchase
purchaseRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    if (update && update.products) {
      update.products = sanitizeProducts(update.products);
    }
    try {
      await Purchase.updateOne({ _id: id }, { $set: update })
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
// UPDATE ONE Purchase
purchaseRouter.put(
  "/update/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    if (update && update.products) {
      update.products = sanitizeProducts(update.products);
    }
    // console.log(id, update);
    try {
      await Purchase.updateOne({ _id: id }, { $set: update })
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
// UPDATE ONE Purchase Status
purchaseRouter.put(
  "/status/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    // console.log("PO", id, update);
    try {
      await Purchase.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Purchase
purchaseRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Purchase.deleteOne({ _id: id })
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

module.exports = purchaseRouter;
