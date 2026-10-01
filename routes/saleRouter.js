/**
 * sales API
 * 1. get all sales
 * 2. get Sale by id
 * 3. get Sale by type
 * 3.1 get Sale by email
 * 3.2 get Sale by phone
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Sale = require("../models/saleModel");
const User = require("../models/userModel");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
const Supplier = require("../models/supplierModel");
const Category = require("../models/categoryModel");
const checklogin = require("../middlewares/checkLogin");
const { generatePosId } = require("../middlewares/generateId");
const { startOfDay, endOfDay, format } = require("date-fns");
// const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const {
  updateInventoryInOnSaleDel,
  updateInventoryOutOnSaleIn,
} = require("../middlewares/useInventory");
const { default: mongoose } = require("mongoose");

const saleRouter = express.Router();

// sale Count
saleRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { aamarId } = req.params;

    try {
      // console.log("Received aamarId:", aamarId);

      // Check if aamarId is a valid ObjectId (if necessary)
      const count = await Sale.countDocuments({ aamarId });

      res.status(200).json(count);
    } catch (error) {
      console.error("Error fetching count:", error); // Log the error
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  })
);

// GET ALL sales
saleRouter.get(
  "/all/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const sales = await Sale.find({
      status: "complete",
      aamarId: aamarId,
    })
      .select({
        invoiceId: 1,
        totalItem: 1,
        grossTotalRound: 1,
        total: 1,
        status: 1,
        billerId: 1,
        createdAt: 1,
        changeAmount: 1,
      })
      .populate("billerId", "name");
    res.send(sales);
    // // res.send('removed');
  })
);
// GET ALL sales
saleRouter.get(
  "/lastsale",
  expressAsyncHandler(async (req, res) => {
    const { aamarId, warehouse } = req.query;
    let match = { status: "complete" };
    if (aamarId) match.aamarId = aamarId;
    if (warehouse && warehouse !== "allWh") {
      try {
        match.warehouse = new ObjectId(warehouse);
      } catch (e) {
        match.warehouse = warehouse;
      }
    }
    let sales = await Sale.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
    ]);
    if (!sales || sales.length === 0) {
      sales = await Sale.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
      ]);
    }
    res.send(sales);
  })
);
// today point
saleRouter.get(
  "/todayPoint",
  expressAsyncHandler(async (req, res) => {
    // res.send("hi");
    const today = new Date();
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    // console.log(start, end)
    // console.log(today)
    try {
      const sales = await Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lt: end,
            },
          },
        },
        // { $match: { "point.new": { $lt: "point.old" } } },
        // { $group: { _id: null, total: { $sum: "$point.new" } } }
      ]);
      const filtered = sales.filter(
        (sale) => sale?.point?.old > sale?.point?.new
      );
      // console.log(filtered);
      let todayPoint = 0;
      filtered.map((sale) => {
        todayPoint =
          todayPoint +
          (Number(sale.point.old) -
            Number(sale.point.new) +
            Number(sale.todayPoint));
      });
      // console.log(todayPoint);
      res.send({ spentPoint: todayPoint });
    } catch (err) {
      console.log(err);
    }
  })
);
// weekly SALE Count
// saleRouter.get(
//   "/week-sale/:warehouse/:aamarId",
//   expressAsyncHandler(async (req, res) => {
//     const today = new Date();
//     // const date = today.getDate() - 1
//     // const newd = new Date(today.setDate(date))
//     // const date2 = today.getDate() - 7
//     // const newd2 = new Date(today.setDate(date2))
//     // console.log("d", date)
//     // console.log("e", newd)
//     // console.log("f", date2)
//     // console.log("g", newd2)

//     // const end1 = startOfDay(new Date(newd))
//     // const start1 = endOfDay(new Date(newd2))
//     // console.log("h", end1)
//     // console.log("i", start1)

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
//     // console.log("test1", start);
//     // console.log("test2", end);
//     // console.log("test2", to);
//     // console.log(startDate, endDate)
//     const warehouse = req.params.warehouse || "";
//     const aamarId = req.params.aamarId || "";

//     console.log("Warehouse ID:", warehouse);

//     let matchQuery = {
//       createdAt: { $gte: start, $lte: end },
//       status: "complete",
//       aamarId: aamarId,
//       source: "POS",
//     };

//     if (warehouse !== "allWh" && warehouse) {
//       matchQuery.warehouse = mongoose.Types.ObjectId(warehouse);
//     }

//     console.log("Match Query:", matchQuery);
//     try {
//       const sales = await Sale.aggregate([
//         { $match: matchQuery },
//         {
//           $lookup: {
//             from: "warehouses", // Replace with your actual warehouses collection name
//             localField: "warehouse",
//             foreignField: "_id",
//             as: "warehouse",
//           },
//         },
//         { $unwind: "$warehouse" },
//         {
//           $group: {
//             _id: {
//               $dateToString: {
//                 format: "%Y-%m-%d",
//                 date: "$createdAt",
//               },
//             },
//             grossTotalRound: {
//               $sum: "$grossTotalRound",
//             },
//             total: {
//               $sum: "$total",
//             },
//             vat: {
//               $sum: "$vat",
//             },
//           },
//         },
//         {
//           $sort: {
//             _id: 1,
//           },
//         },
//       ]);
//       // console.log(sales);
//       res.send(sales);
//     } catch (err) {
//       console.log(err);
//     }
//   })
// );

saleRouter.get(
  "/week-sale/:warehouse/:aamarId",
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

      // Query sales data from database
      const salesData = await Sale.aggregate([
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

        const sale = salesData.find((s) => s._id === formattedDate || s._id === isoDate);
        label.push(formattedDate);
        value.push(sale ? sale.total : 0);
        result.push({
          date: formattedDate,
          total: sale ? sale.total : 0,
          day: dayName,
        });
        cur.setDate(cur.getDate() + 1);
      }

      res.status(200).send({ result, value, label });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error fetching sales data" });
    }
  })
);

// weekly SALE Count
// saleRouter.get(
//   "/testing",
//   expressAsyncHandler(async (req, res) => {
//     // const today = new Date();
//     const currentDate = new Date();
//     console.log(currentDate)
//     const last7Days = [];

//     for (let i = 0; i <= 10; i++) {
//       let day = new Date(currentDate.getTime());
//       day.setDate(currentDate.getDate() - i);
//       last7Days.push(day);
//     }

//     console.log(last7Days);
//     const to = endOfDay(currentDate)
//     // const end = startOfDay(new Date(last7Days[0]))
//     // const start = endOfDay(new Date(last7Days[8]))
//     // console.log("test1", start)
//     // console.log("test2", end)
//     // console.log("test2", to)
//     const start = startOfDay(last7Days[1]);
//     const end = endOfDay(last7Days[1]);
//     console.log("testing", start, end)
//     try {
//       const sales = await Sale.aggregate([
//         {
//           $match: {
//             createdAt: {
//               $gte: start,
//               $lt: end
//             }
//           }
//         },
//         {
//           $group: {
//             _id: {
//               $dateToString: {
//                 format: "%Y-%m-%d",
//                 date: "$createdAt"
//               }
//             },
//             grossTotalRound: {
//               $sum: "$grossTotalRound"
//             },
//             total: {
//               $sum: "$total"
//             },
//             vat: {
//               $sum: "$vat"
//             },
//           }
//         },
//         {
//           $sort: {
//             "_id": 1
//           }
//         }
//       ]);
//       console.log(sales);
//       res.send(sales);
//     } catch (err) {
//       console.log(err);
//     }
//   })
// );
saleRouter.get(
  "/testingi",
  expressAsyncHandler(async (req, res) => {
    // const today = new Date();
    const currentDate = new Date();
    // console.log(currentDate);
    const last7Days = [];

    for (let i = 0; i <= 10; i++) {
      let day = new Date(currentDate.getTime());
      day.setDate(currentDate.getDate() - i);
      last7Days.push(day);
    }

    // console.log(last7Days);
    // const to = endOfDay(currentDate);
    // const end = startOfDay(new Date(last7Days[0]))
    // const start = endOfDay(new Date(last7Days[8]))
    // console.log("test1", start)
    // console.log("test2", end)
    // console.log("test2", to)
    const start = startOfDay(last7Days[2]);
    const end = endOfDay(last7Days[2]);
    // console.log("testing", start, end);
    try {
      const sales = await Sale.aggregate([
        {
          $match: {
            $and: [
              {
                status: "complete",
              },
              {
                createdAt: {
                  $gt: start,
                  $lt: end,
                },
              },
              {
                source: "POS",
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            grossTotalRound: { $sum: "$grossTotalRound" },
            total: { $sum: "$total" },
            vat: { $sum: "$vat" },
          },
        },
      ]);
      // console.log(sales);
      res.send(sales);
    } catch (err) {
      console.log(err);
    }
  })
);

// GET ALL sales
saleRouter.get(
  "/aftersale/:start/:end/:supplier",
  expressAsyncHandler(async (req, res) => {
    const supplier = req.params.supplier;
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    // console.log(start, end, new Date());
    const product = await Sale.aggregate([
      {
        $match: {
          status: "complete",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: "$products.id",
          article_code: { $first: "$products.article_code" },
          totalQuantity: { $sum: "$products.qty" },
          name: { $first: "$products.name" },
          mrp: { $last: "$products.mrp" },
          tp: { $last: "$products.tp" },
          priceId: { $first: "$products.priceId" },
          supplier: { $first: "$products.supplier" },
        },
      },
      {
        $match: {
          supplier: supplier,
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
    ]);
    let totalTP = 0;
    let totalMRP = 0;
    let totalItemOty = 0;
    product?.length > 0 &&
      product?.map((item) => {
        totalItemOty = totalItemOty + item.totalQuantity;
        totalTP =
          parseFloat(totalTP) +
          parseFloat(parseFloat(item.totalQuantity) * parseFloat(item.tp));
        totalMRP =
          parseFloat(totalMRP) +
          parseFloat(parseFloat(item.totalQuantity) * parseFloat(item.mrp));
      });
    res.send({
      product: product,
      totalTP: totalTP,
      totalMRP: totalMRP,
      totalItemOty: totalItemOty,
    });
    // console.log(sales);
    // // res.send('removed');
  })
);

//grn by category  between two dates
saleRouter.get(
  "/testingnew/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());

    // console.log(start, end, new Date());

    try {
      const sale = await Sale.aggregate([
        {
          $match: {
            $and: [
              {
                status: "complete",
              },
              {
                createdAt: {
                  $gt: start,
                  $lt: end,
                },
              },
              {
                source: "POS",
              },
            ],
          },
        },
        {
          $unwind: "$paidAmount",
        },
        {
          $group: {
            _id: "$paidAmount.id",
            cash: { $sum: "$paidAmount.cash" },
            // totalQuantity: { $sum: { $toDouble: '$products.qty' } },
            mfs: { $sum: "$paidAmount.mfs.amount" },
            card: { $sum: "$paidAmount.card.amount" },
            point: { $sum: "$paidAmount.point" },
            // priceId: { $first: '$products.priceId' }
          },
        },
        // {
        //   $sort: { totalQuantity: -1 }
        // },
        // {
        //   $lookup:
        //   {
        //     from: "products",
        //     localField: "article_code",
        //     foreignField: "article_code",
        //     as: "productId"
        //   }
        // },
        // {
        //   $unwind: '$productId'
        // },
        // {
        //   $lookup: {
        //     from: 'categories',
        //     localField: 'productId.master_category',
        //     foreignField: '_id',
        //     as: 'category'
        //   }
        // },
        // {
        //   $unwind: '$category'
        // },
        // {
        //   $group: {
        //     _id: '$category._id',
        //     totalQuantity: { $sum: { $toDouble: '$totalQuantity' } },
        //     totalValue: { $sum: { $multiply: [{ $toDouble: '$totalQuantity' }, { $toDouble: '$mrp' }] } }
        //   }
        // },
        // {
        //   $sort: { totalQuantity: -1 }
        // },
      ]);

      res.send(sale);
    } catch (err) {
      console.log(err);
    }
    // console.log(sales);
    // // res.send('removed');
  })
);
//grn by category  between two dates
saleRouter.get(
  "/category/:start/:end/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    const aamarId = req.params.aamarId;
    // console.log(start, end, newf Date());

    try {
      const sale = await Sale.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lt: end,
            },
            aamarId: aamarId,
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
            mrp: { $last: "$products.mrp" },
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
            as: "productDetails",
          },
        },
        {
          $unwind: "$productDetails",
        },
        {
          $lookup: {
            from: "groups",
            localField: "productDetails.group",
            foreignField: "_id",
            as: "groupDetails",
          },
        },
        {
          $unwind: "$groupDetails",
        },
        {
          $group: {
            _id: "$groupDetails._id",
            code: { $first: "$groupDetails.code" },
            name: { $first: "$groupDetails.name" },
            totalQuantity: { $sum: { $toDouble: "$totalQuantity" } },
            totalValue: {
              $sum: {
                $multiply: [
                  { $toDouble: "$totalQuantity" },
                  { $toDouble: "$mrp" },
                ],
              },
            },
          },
        },
        {
          $sort: { totalQuantity: -1 },
        },
      ]);
      // const populateSale = await Category.populate(sale, {
      //   path: "_id",
      //   model: "Category",
      // });
      console.log("sale", sale);
      res.send(sale);
    } catch (err) {
      console.log(err);
    }
    // console.log(sales);
    // // res.send('removed');
  })
);

// GET ALL sales by Supplier
saleRouter.get(
  "/bySupplier/:start/:end/:aamarId/:supplierId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    const supplierId = req.params.supplierId || "noSupplier";
    const aamarId = req.params.aamarId;
    console.log(supplierId, aamarId, start, end);
    // console.log(start, end);

    const products = await Sale.aggregate([
      {
        $match: {
          status: "complete",
          aamarId: aamarId,
          createdAt: { $gte: start, $lte: end },
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
          mrp: { $last: "$products.mrp" },
          tp: { $last: "$products.tp" },
          // supplier: { $first: "$products.supplier" },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
    ]);

    console.log("products", products);

    // let pProduct_supplier = [];

    // TODO:: GET SUPPLIER PRODUCTS LIST
    const supplierProducts = await Supplier.findOne({
      _id: ObjectId(supplierId),
    });

    const sProduct = supplierProducts.products || [];

    console.log("supplierProducts", sProduct);
    const matchedProducts = products.filter((item) =>
      sProduct.some(
        (product) => product.get("article_code") === item.article_code
      )
    );

    console.log("supplierProducts", matchedProducts);
    res.status(200).json(matchedProducts);
  })
);
// GET ALL sales by category (Group)
saleRouter.get(
  "/byCategory/:start/:end/:warehouse/:aamarId/:catID",
  expressAsyncHandler(async (req, res) => {
    try {
      const start = req.params.start
        ? startOfDay(new Date(req.params.start))
        : startOfDay(new Date());
      const end = req.params.end
        ? endOfDay(new Date(req.params.end))
        : endOfDay(new Date());

      const warehouse = req.params.warehouse || "";
      const aamarId = req.params.aamarId || "";
      // console.log("warehouse id", warehouse);
      const catId = req.params.catID;

      // Base match condition
      const matchQuery = {
        status: "complete",
        aamarId: aamarId,
        createdAt: { $gte: start, $lte: end },
      };
      if (warehouse !== "allWh") {
        matchQuery.warehouse = mongoose.Types.ObjectId(warehouse);
      }
      // console.log("matchquery", matchQuery);

      console.log(catId);

      const product = await Sale.aggregate([
        {
          $match: matchQuery, // Apply the base match and category-specific filtering
        },
        {
          $unwind: "$products", // Unwind the products array to process each product individually
        },
        {
          $match:
            catId === "All"
              ? {}
              : {
                "products.groupId": catId,
              },
        },
        {
          $addFields: {
            total: {
              $multiply: [
                { $toDouble: "$products.mrp" }, // Convert mrp to double
                { $toDouble: "$products.qty" }, // Convert totalQuantity to double
              ],
            },
          },
        },
        {
          $group: {
            _id: "$products.id",
            article_code: { $first: "$products.article_code" },
            group: { $first: "$products.group" },
            totalQuantity: { $sum: "$products.qty" },
            name: { $first: "$products.name" },
            mrp: { $last: "$products.mrp" },
            tp: { $last: "$products.tp" },
            priceId: { $first: "$products.priceId" },
            total: { $sum: "$total" },
          },
        },
      ]);

      console.log("product", product);

      res.send(product);
    } catch (error) {
      console.error("Error fetching sales by category:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  })
);

// GET ALL sales
saleRouter.get(
  "/aftersale/:start/:end/:supplier",
  expressAsyncHandler(async (req, res) => {
    const supplier = req.params.supplier;
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    // console.log(start, end, new Date());
    const product = await Sale.aggregate([
      {
        $match: {
          status: "complete",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: "$products.id",
          article_code: { $first: "$products.article_code" },
          totalQuantity: { $sum: "$products.qty" },
          name: { $first: "$products.name" },
          mrp: { $last: "$products.mrp" },
          tp: { $last: "$products.tp" },
          priceId: { $first: "$products.priceId" },
          supplier: { $first: "$products.supplier" },
        },
      },
      {
        $match: {
          supplier: supplier,
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
    ]);
    let totalTP = 0;
    let totalMRP = 0;
    let totalItemOty = 0;
    product?.length > 0 &&
      product?.map((item) => {
        totalItemOty = totalItemOty + item.totalQuantity;
        totalTP =
          parseFloat(totalTP) +
          parseFloat(parseFloat(item.totalQuantity) * parseFloat(item.tp));
        totalMRP =
          parseFloat(totalMRP) +
          parseFloat(parseFloat(item.totalQuantity) * parseFloat(item.mrp));
      });
    res.send({
      product: product,
      totalTP: totalTP,
      totalMRP: totalMRP,
      totalItemOty: totalItemOty,
    });
    // console.log(sales);
    // // res.send('removed');
  })
);

//popular products
saleRouter.get(
  "/popular-product/:start/:end/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    const aamarId = req.params.aamarId;
    try {
      const product = await Sale.aggregate([
        {
          $match: {
            status: "complete",
            createdAt: { $gte: start, $lte: end },
            aamarId: aamarId,
          },
        },
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: "$products.id",
            article_code: { $first: "$products.article_code" },
            totalSoldQuantity: { $sum: "$products.qty" },
            name: { $first: "$products.name" },
            mrp: { $last: "$products.mrp" },
            tp: { $last: "$products.tp" },
          },
        },
        {
          $sort: { totalSoldQuantity: -1 },
        },
      ]);

      res.send(product);
    } catch (err) {
      console.log(err);
    }
  })
);

// GET ALL sales
saleRouter.get(
  "/byDateInvoice/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const q = req.query.q;
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());

    try {
      const sales = await Sale.aggregate([
        {
          $match: {
            $and: [
              { status: "complete" },
              { createdAt: { $gt: start, $lt: end } },
              {
                $or: [{ invoiceId: { $regex: q, $options: "i" } }],
              },
            ],
          },
        },
        {
          $project: {
            invoiceId: 1,
            totalItem: 1,
            grossTotalRound: 1,
            total: 1,
            status: 1,
            billerId: 1,
            totalReceived: 1,
            createdAt: 1,
            changeAmount: 1,
            customerId: 1,
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "billerId",
            foreignField: "_id",
            as: "biller",
          },
        },
        {
          $project: {
            invoiceId: 1,
            totalItem: 1,
            grossTotalRound: 1,
            total: 1,
            status: 1,
            billerId: 1,
            totalReceived: 1,
            createdAt: 1,
            changeAmount: 1,
            customerId: 1,
            // customer: { $arrayElemAt: ["$customer", 0] },
            // biller: { $arrayElemAt: ["$biller", 0] },
            "biller.name": 1,
            "customer.phone": 1,
            "customer.name": 1,
          },
        },
      ]);
      // console.log(sales);
      res.send(sales);
    } catch (err) {
      console.log(err);
    }
  })
);

saleRouter.get(
  "/byDate/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());

    try {
      const pipeline = [
        {
          $match: {
            status: "complete",
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: "users", // Replace with the actual collection name for billers
            localField: "billerId",
            foreignField: "_id",
            as: "billerDetails",
          },
        },
        {
          $lookup: {
            from: "customers", // Replace with the actual collection name for customers
            localField: "customerId",
            foreignField: "_id",
            as: "customerDetails",
          },
        },
        {
          $project: {
            invoiceId: 1,
            totalItem: 1,
            grossTotalRound: 1,
            discount: 1, // Assuming 'discount' field exists in your Sale model
            netSale: { $subtract: ["$grossTotalRound", "$discount"] },
            total: 1,
            status: 1,
            biller: { $arrayElemAt: ["$billerDetails.name", 0] },
            totalReceived: 1,
            date: { $dateToString: { format: "%m-%d-%Y", date: "$createdAt" } },
            changeAmount: 1,
            customer: { $arrayElemAt: ["$customerDetails.phone", 0] },
          },
        },
      ];

      const sales = await Sale.aggregate(pipeline);
      res.status(200).json(sales);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: err.message });
    }
  })
);

// // GET export sales
// saleRouter.get(
//   "/export/:start/:end",
//   expressAsyncHandler(async (req, res) => {
//     const start = req.params.start
//       ? startOfDay(new Date(req.params.start))
//       : startOfDay(new Date.now());
//     const end = req.params.end
//       ? endOfDay(new Date(req.params.end))
//       : endOfDay(new Date.now());
//     // console.log(start, end, new Date());
//     const sales = await Sale.find({
//       status: "complete",
//       createdAt: { $gte: start, $lte: end },
//     })
//       .select({
//         invoiceId: 1,
//         totalItem: 1,
//         grossTotalRound: 1,
//         total: 1,
//         vat: 1,
//         status: 1,
//         paidAmount: 1,
//         billerId: 1,
//         totalReceived: 1,
//         createdAt: 1,
//         changeAmount: 1,
//         customerId: 1,
//         tp: 1,
//         discount: 1
//       })
//       .populate("billerId", "name")
//       .populate("customerId", "phone");
//     res.send(sales);
//     // console.log(sales);
//     // // res.send('removed');
//   })
// );

saleRouter.get(
  "/export/:start/:end/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    const warehouse = req.params.warehouse;
    const aamarId = req.params.aamarId || "";
    try {
      const baseMatchCondition = {
        status: "complete",
        aamarId: aamarId,
        createdAt: { $gte: start, $lte: end },
      };

      // Add warehouse filter only if it's provided and not equal to "allWh"
      if (warehouse !== "allWh") {
        baseMatchCondition.warehouse = ObjectId(warehouse);
      }
      console.log(warehouse);
      const sales = await Sale.aggregate([
        {
          $match: baseMatchCondition,
        },
        {
          $lookup: {
            from: "warehouses", // Replace with your actual warehouses collection name
            localField: "warehouse",
            foreignField: "_id",
            as: "warehouse",
          },
        },
        {
          $lookup: {
            from: "users", // Replace with your actual users collection
            localField: "billerId",
            foreignField: "_id",
            as: "biller",
          },
        },
        {
          $lookup: {
            from: "customers", // Replace with your actual customers collection
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: { path: "$biller", preserveNullAndEmptyArrays: true } },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            tpTotal: {
              $sum: {
                $map: {
                  input: "$products",
                  as: "product",
                  in: {
                    $multiply: [
                      {
                        $convert: {
                          input: "$$product.tp",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                      {
                        $convert: {
                          input: "$$product.qty",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                    ],
                  },
                },
              },
            },
            mrpTotal: {
              $sum: {
                $map: {
                  input: "$products",
                  as: "product",
                  in: {
                    $multiply: [
                      {
                        $convert: {
                          input: "$$product.mrp",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                      {
                        $convert: {
                          input: "$$product.qty",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                    ],
                  },
                },
              },
            },
            returnTpTotal: {
              $sum: {
                $map: {
                  input: "$returnProducts",
                  as: "returnProduct",
                  in: {
                    $multiply: [
                      {
                        $convert: {
                          input: "$$returnProduct.tp",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                      {
                        $convert: {
                          input: "$$returnProduct.qty",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                    ],
                  },
                },
              },
            },
            returnMrpTotal: {
              $sum: {
                $map: {
                  input: "$returnProducts",
                  as: "returnProduct",
                  in: {
                    $multiply: [
                      {
                        $convert: {
                          input: "$$returnProduct.mrp",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                      {
                        $convert: {
                          input: "$$returnProduct.qty",
                          to: "double",
                          onError: 0,
                          onNull: 0,
                        },
                      },
                    ],
                  },
                },
              },
            },
            earningDiscount: {
              $cond: {
                if: { $gt: [{ $size: "$returnProducts" }, 0] }, // Check if returnProducts exist
                then: {
                  $reduce: {
                    input: "$returnProducts",
                    initialValue: 0,
                    in: {
                      $add: [
                        "$$value",
                        {
                          $multiply: [
                            {
                              $divide: [{ $toDouble: "$$this.discount" }, 100],
                            }, // Convert discount percentage to decimal
                            {
                              $multiply: [
                                { $toDouble: "$$this.mrp" },
                                { $toDouble: "$$this.qty" },
                              ],
                            }, // Calculate discount amount per product
                          ],
                        },
                      ],
                    },
                  },
                },
                else: 0, // If returnProducts does not exist, set earningDiscount to 0
              },
            },
          },
        },
        {
          $project: {
            invoiceId: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            customer: {
              $ifNull: ["$customer.name", "Walkaway Customer"], // Default to "Walkaway Customer" if customer.name is null
            },
            biller: "$biller.name",
            warehouse: "$warehouse.name",
            totalItem: 1,
            returnItem: { $round: ["$returnCal.totalItem", 2] },
            mrpTotal: { $round: ["$mrpTotal", 2] },

            returnMrp: { $round: ["$returnMrpTotal", 2] },
            earningDiscount: { $round: ["$earningDiscount", 2] },
            returnTotal: { $subtract: ["$returnMrpTotal", "$earningDiscount"] },

            grossSale: {
              $round: [
                {
                  $subtract: [
                    {
                      $add: [{ $toDouble: "$mrpTotal" }, { $toDouble: "$vat" }],
                    },
                    { $subtract: ["$returnMrpTotal", "$earningDiscount"] },
                  ],
                },
                2,
              ],
            },
            discount: 1,
            netSale: {
              $round: [
                {
                  $subtract: [
                    {
                      $add: [{ $toDouble: "$mrpTotal" }, { $toDouble: "$vat" }],
                    },
                    {
                      $add: [
                        { $subtract: ["$returnMrpTotal", "$earningDiscount"] },
                        { $toDouble: "$discount" },
                      ],
                    },
                  ],
                },
                2,
              ],
            },
            netSaleRound: {
              $round: [
                {
                  $subtract: [
                    {
                      $add: [{ $toDouble: "$mrpTotal" }, { $toDouble: "$vat" }],
                    },
                    {
                      $add: [
                        { $subtract: ["$returnMrpTotal", "$earningDiscount"] },
                        { $toDouble: "$discount" },
                      ],
                    },
                  ],
                },
                0,
              ],
            },

            totalReceived: {
              $round: [
                {
                  $sum: [
                    { $toDouble: "$paidAmount.card.amount" },
                    { $toDouble: "$paidAmount.mfs.amount" },
                    { $toDouble: "$paidAmount.cash" },
                  ],
                },
                2,
              ],
            },
            totalReceivable: {
              $round: [
                {
                  $subtract: [
                    { $toDouble: "$mrpTotal" },
                    {
                      $add: [
                        { $toDouble: "$discount" },
                        { $toDouble: "$paidAmount.point" },
                        { $subtract: ["$returnMrpTotal", "$earningDiscount"] },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
            changeAmount: 1,
            vat: 1,
            tpTotal: { $round: ["$tpTotal", 2] },
            returnTp: { $round: ["$returnTpTotal", 2] },
            card: "$paidAmount.card.amount",
            cash: "$paidAmount.cash",
            mfs: "$paidAmount.mfs.amount",
            pointUsed: "$paidAmount.point",
            status: 1,
          },
        },
      ]);

      res.status(200).json(sales);
      console.log("sales", sales);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      res
        .status(500)
        .send({ error: "An error occurred while fetching sales data." });
    }
  })
);

// dashboard Sale View latest 5 sales

saleRouter.get(
  "/dashboardSaleView/:start/:end/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    const warehouse = req.params.warehouse;
    const aamarId = req.params.aamarId || "";

    try {
      const matchCondition = {
        aamarId,
        createdAt: { $gte: start, $lte: end },
      };

      if (warehouse !== "allWh") {
        matchCondition.warehouse = new ObjectId(warehouse);
      }

      const latestSales = await Sale.aggregate([
        { $match: matchCondition },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        // Lookup for customer
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

        // Lookup for biller (user)
        {
          $lookup: {
            from: "users", // Replace with your actual users collection
            localField: "billerId",
            foreignField: "_id",
            as: "biller",
          },
        },
        { $unwind: { path: "$biller", preserveNullAndEmptyArrays: true } },

        // Lookup for warehouse
        {
          $lookup: {
            from: "warehouses",
            localField: "warehouse",
            foreignField: "_id",
            as: "warehouseData",
          },
        },
        { $unwind: { path: "$warehouseData", preserveNullAndEmptyArrays: true } },

        // Calculate total paid
        {
          $addFields: {
            paidTotal: {
              $sum: [
                { $toDouble: "$paidAmount.cash" },
                { $toDouble: "$paidAmount.card.amount" },
                { $toDouble: "$paidAmount.mfs.amount" },
              ],
            },
          },
        },

        // Final projection
        {
          $project: {
            invoiceId: 1,
            date: {
              $dateToString: {
                format: "%Y-%m-%d %H:%M:%S",
                date: "$createdAt",
                timezone: "Asia/Dhaka", // adjust if needed
              },
            },
            customer: { $ifNull: ["$customer.name", "Walkaway Customer"] },
            totalItem: 1,
            grossTotal: 1,
            paidTotal: 1,
            changeAmount: 1,
            status: 1,
            biller: "$biller.name",
            warehouse: "$warehouseData.name",
          },
        },
      ]);

      res.status(200).json(latestSales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching latest sales.",
      });
    }
  })
);


// GET export sales
saleRouter.get(
  "/exportDel/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    // console.log(start, end, new Date());
    const sales = await Sale.find({
      status: "delete",
      createdAt: { $gte: start, $lte: end },
    })
      .select({
        invoiceId: 1,
        totalItem: 1,
        grossTotalRound: 1,
        total: 1,
        vat: 1,
        status: 1,
        paidAmount: 1,
        billerId: 1,
        totalReceived: 1,
        createdAt: 1,
        changeAmount: 1,
        customerId: 1,
        updatedAt: 1,
        updateUser: 1,
        tp: 1,
      })
      .populate("billerId", "name")
      .populate("updateUser", "name")
      .populate("customerId", "phone");
    // console.log(sales);
    res.send(sales);
    // // res.send('removed');
  })
);

// articleSales

// saleRouter.get(
//   "/exportArticale/:start/:end",
//   expressAsyncHandler(async (req, res) => {
//     const q = req.query.q;
//     const start = req.params.start
//       ? startOfDay(new Date(req.params.start))
//       : startOfDay(new Date.now());
//     const end = req.params.end
//       ? endOfDay(new Date(req.params.end))
//       : endOfDay(new Date.now());
//     console.log('q', q)
//     try {
//       const sales = await Sale.aggregate([
//         {
//           $match: {
//             $and: [
//               {
//                 status: "complete",
//               },
//               {
//                 createdAt: {
//                   $gt: start,
//                   $lt: end,
//                 },
//               },
//             ],
//           },
//         },
//         {
//           $project: {
//             "invoiceId": 1,
//             "products.article_code": 1,
//             "products.priceId": 1,
//             "products.name": 1,
//             "products.tp": 1,
//             "products.mrp": 1,
//             "products.qty": 1,
//             "products.vat": 1,
//             "createdAt": 1,
//             "returnProducts.article_code": 1,
//             "returnProducts.priceId": 1,
//             "returnProducts.name": 1,
//             "returnProducts.tp": 1,
//             "returnProducts.mrp": 1,
//             "returnProducts.qty": 1,
//             "returnProducts.vat": 1,
//             "returnInvoice": 1
//           },
//         },
//       ]);
//       console.log(sales);
//       res.send(sales);
//     } catch (err) {
//       console.log(err);
//     }
//   })
// );

saleRouter.get(
  "/exportArticale/:start/:end/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const q = req.query.q || ""; // Default to empty string if q is not provided
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());
    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId;

    try {
      // Primary match query for conditions excluding $or
      let primaryMatchQuery = {
        status: "complete",
        aamarId: aamarId,
        createdAt: { $gte: start, $lte: end },
      };

      // Add warehouse condition only if warehouse is not "allWh" and is valid
      if (warehouse && warehouse !== "allWh") {
        primaryMatchQuery.warehouse = mongoose.Types.ObjectId(warehouse);
      }
      console.log(
        "Primary Match Query:",
        JSON.stringify(primaryMatchQuery, null, 2)
      );

      const sales = await Sale.aggregate([
        {
          $match: primaryMatchQuery, // Match the primary conditions
        },
        {
          $match: {
            $or: [
              { "products.name": { $regex: q, $options: "i" } },
              { "returnProducts.name": { $regex: q, $options: "i" } },
              { "products.article_code": { $regex: q, $options: "i" } },
              { "returnProducts.article_code": { $regex: q, $options: "i" } },
            ],
          },
        },
        {
          $lookup: {
            from: "users", // ensure this is the correct collection name
            localField: "billerId", // the field from the input documents
            foreignField: "_id", // the field from the documents of the "users" collection
            as: "biller", // the name of the new array field added to the input documents
          },
        },
        { $unwind: "$biller" }, // deconstructs the "biller" array field

        {
          $lookup: {
            from: "customers", // ensure this is the correct collection name
            localField: "customerId", // the field from the input documents
            foreignField: "_id", // the field from the documents of the "customers" collection
            as: "customer", // the name of the new array field added to the input documents
          },
        },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            invoiceId: 1,
            "products.article_code": 1,
            "products.name": 1,
            "products.tp": 1,
            "products.mrp": 1,
            "products.qty": 1,
            "products.vat": 1,
            createdAt: 1,
            "returnProducts.article_code": 1,
            "returnProducts.name": 1,
            "returnProducts.tp": 1,
            "returnProducts.mrp": 1,
            "returnProducts.qty": 1,
            "returnProducts.vat": 1,
            billerId: "$biller.name",
            customerId: "$customer.phone",
            returnInvoice: 1,
            discount: 1,
          },
        },
      ]);

      res.send(sales);
    } catch (err) {
      console.error("Error in aggregation pipeline:", err);
      res
        .status(500)
        .send({ message: "An error occurred while processing the request." });
    }
  })
);

// TODAYS SALE Total
// saleRouter.get(
//   "/total/:start/:end",
//   //
//   expressAsyncHandler(async (req, res) => {
//     const start = req.params.start
//       ? startOfDay(new Date(req.params.start))
//       : startOfDay(new Date.now());
//     const end = req.params.end
//       ? endOfDay(new Date(req.params.end))
//       : endOfDay(new Date.now());
//     console.log("date", start, end);
//     // const day = parseInt(1);
//     try {
//       const sales = await Sale.aggregate([
//         {
//           $match: {
//             $and: [
//               {
//                 status: "complete",
//               },
//               {
//                 createdAt: {
//                   $gt: start,
//                   $lt: end,
//                 },
//               },
//             ],
//           },
//         },
//         {
//           $group: {
//             _id: null,
//             grossTotalRound: { $sum: "$grossTotalRound" },
//             total: { $sum: "$total" },
//             vat: { $sum: "$vat" },
//           },
//         },
//       ]);
//       res.send(sales);
//     } catch (err) {
//       console.log(err);
//     }
//   })
// );

saleRouter.get(
  "/total/:start/:end/:warehouse/:aamarId",
  //
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());

    // Check if warehouse is provided
    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId || "";

    try {
      // #Data Match Stage

      let matchCondition = {
        status: "complete",
        aamarId: aamarId,
        createdAt: {
          $gte: start,
          $lte: end,
        },
      };

      // Add warehouse filter only if it's provided and not equal to "allWh"
      if (warehouse !== "allWh" && warehouse) {
        matchCondition.warehouse = ObjectId(warehouse);
      }

      // console.log("warehouse MatchDATA::>", warehouse, matchCondition);

      const duePayment = await Sale.aggregate([
        {
          $match: matchCondition,
        },
        {
          $group: {
            _id: null,
            dueAmount: { $sum: { $toDouble: "$dueAmount" } },
          },
        },
      ]);

      // console.log("duePayment:", duePayment[0].dueAmount);

      const dueAmount = duePayment[0]?.dueAmount || 0;

      const sales = await Sale.aggregate([
        // #Data Match Stage
        {
          $match: matchCondition,
        },

        // GRNERATE NEW DATA
        {
          $addFields: {
            netSale: {
              $cond: {
                if: { $gt: [{ $size: "$products" }, 0] },
                then: {
                  $sum: {
                    $map: {
                      input: "$products",
                      as: "product",
                      in: {
                        $multiply: [
                          {
                            $subtract: [
                              { $toDouble: "$$product.mrp" },
                              { $toDouble: "$$product.promo.promo_price" },
                            ],
                          },
                          { $toDouble: "$$product.qty" },
                        ],
                      },
                    },
                  },
                },
                else: 0,
              },
            },
            tpTotal: {
              $cond: {
                if: { $gt: [{ $size: "$products" }, 0] },
                then: {
                  $sum: {
                    $map: {
                      input: "$products",
                      as: "product",
                      in: {
                        $multiply: [
                          { $toDouble: "$$product.tp" },
                          { $toDouble: "$$product.qty" },
                        ],
                      },
                    },
                  },
                },
                else: 0,
              },
            },
            returnTp: {
              $cond: {
                if: { $gt: [{ $size: "$returnProducts" }, 0] },
                then: {
                  $sum: {
                    $map: {
                      input: "$returnProducts",
                      as: "product",
                      in: {
                        $multiply: [
                          { $toDouble: "$$product.tp" },
                          { $toDouble: "$$product.qty" },
                        ],
                      },
                    },
                  },
                },
                else: 0,
              },
            },
            grossSale: {
              $subtract: [
                {
                  $add: [{ $toDouble: "$total" }, { $toDouble: "$vat" }],
                }, // Total sales including VAT
                {
                  $add: [
                    { $toDouble: "$discount" },
                    { $toDouble: "$promo_discount" },
                    { $toDouble: "$returnCal.total" },
                  ],
                }, // Deducting discounts, promo_discount, and returns
              ],
            },
            roundedGrossTotal: {
              $round: [
                {
                  $subtract: [
                    {
                      $add: [{ $toDouble: "$total" }, { $toDouble: "$vat" }],
                    }, // Total sales including VAT
                    {
                      $add: [
                        { $toDouble: "$discount" },
                        { $toDouble: "$promo_discount" },
                        { $toDouble: "$returnCal.total" },
                      ],
                    }, // Deducting discounts, promo_discount, and returns
                  ],
                },
                0,
              ],
            },
            upay: {
              $cond: [
                { $eq: ["$paidAmount.mfs.name", "Upay"] },
                "$paidAmount.mfs.amount",
                0, // Set default value to 0 if bkash is not found
              ],
            },
            rocket: {
              $cond: [
                { $eq: ["$paidAmount.mfs.name", "Rocket"] },
                "$paidAmount.mfs.amount",
                0, // Set default value to 0 if bkash is not found
              ],
            },
            bkash: {
              $cond: [
                { $eq: ["$paidAmount.mfs.name", "bkash"] },
                "$paidAmount.mfs.amount",
                0, // Set default value to 0 if bkash is not found
              ],
            },
            nagad: {
              $cond: [
                { $eq: ["$paidAmount.mfs.name", "Nagad"] },
                "$paidAmount.mfs.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            MTB: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "MTB"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            DBBL: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "DBBL"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            CITY: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "CITY"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            EBL: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "EBL"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            AMEX: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "AMEX"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            BRAC: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "BRAC"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            visa: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "visa"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
            masterCard: {
              $cond: [
                { $eq: ["$paidAmount.card.name", "masterCard"] },
                "$paidAmount.card.amount",
                0, // Set default value to 0 if Nagad is not found
              ],
            },
          },
        },
        {
          $project: {
            // invoiceId: 1,
            totalItem: 1,
            mrpTotal: { $round: ["$total", 2] },
            netSale: {
              $subtract: [
                { $toDouble: "$netSale" },
                {
                  $add: [
                    { $toDouble: "$returnCal.total" },
                    { $toDouble: "$discount" },
                  ],
                },
              ],
            },
            returnInvoiceCount: {
              $cond: [
                {
                  $or: [
                    { $gt: ["$returnCal.totalItem", 0] },
                    { $ne: ["$returnCal.total", 0] },
                    {
                      $gt: [
                        { $size: { $ifNull: ["$returnProducts", []] } },
                        0,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
            returnItemTotal: "$returnCal.totalItem",
            returnTotal: "$returnCal.total",
            discount: "$discount",
            promo_discount: "$promo_discount",
            point: "$paidAmount.point",
            grossSale: 1,
            tpTotal: 1,
            returnTp: 1,
            vat: 1,
            cash: "$paidAmount.cash",
            upay: 1,
            rocket: 1,
            bkash: 1,
            nagad: 1,
            visa: 1,
            masterCard: 1,
            MTB: 1,
            CITY: 1,
            AMEX: 1,
            DBBL: 1,
            EBL: 1,
            BRAC: 1,
            roundedGrossTotal: 1,
            cogs: {
              $round: [{ $subtract: ["$tpTotal", "$returnTp"] }, 2],
            },
            lossProfit: {
              $round: [
                {
                  $subtract: [
                    {
                      $subtract: ["$roundedGrossTotal", "$returnCal.total"],
                    },
                    {
                      $subtract: ["$tpTotal", "$returnTp"],
                    },
                  ],
                },
                2, // Rounding to 2 decimal places
              ],
            },
            roundUpAmount: {
              $subtract: [
                { $toDouble: "$roundedGrossTotal" },
                { $toDouble: "$grossSale" },
              ],
            },
            // todaysPoint: 1,
            totalReceived: {
              $subtract: [
                { $toDouble: "$totalReceived" },
                { $toDouble: "$paidAmount.point" },
              ],
            },
            changeAmount: 1,
            totalReceivable: {
              $subtract: [
                { $toDouble: "$roundedGrossTotal" },
                { $toDouble: "$paidAmount.point" },
              ],
            },
          },
        },
        // Group stage to perform calculations across all documents
        {
          $group: {
            _id: null,
            totalItem: { $sum: "$totalItem" },
            mrpTotal: { $sum: "$mrpTotal" },
            netSale: { $sum: "$netSale" },
            returnInvoiceCount: { $sum: "$returnInvoiceCount" },
            returnItemTotal: { $sum: "$returnItemTotal" },
            returnTotal: { $sum: "$returnTotal" },
            discount: { $sum: "$discount" },
            promo_discount: { $sum: "$promo_discount" },
            point: { $sum: "$point" },
            grossSale: { $sum: "$grossSale" },
            tpTotal: { $sum: "$tpTotal" },
            returnTp: { $sum: "$returnTp" },
            vat: { $sum: "$vat" },
            cash: { $sum: "$cash" },
            upay: { $sum: "$upay" },
            rocket: { $sum: "$rocket" },
            bkash: { $sum: "$bkash" },
            nagad: { $sum: "$nagad" },
            MTB: { $sum: "$MTB" },
            CITY: { $sum: "$CITY" },
            AMEX: { $sum: "$AMEX" },
            DBBL: { $sum: "$DBBL" },
            EBL: { $sum: "$EBL" },
            BRAC: { $sum: "$BRAC" },
            roundedGrossTotal: { $sum: "$roundedGrossTotal" },
            cogs: { $sum: "$cogs" },
            lossProfit: { $sum: "$lossProfit" },
            totalReceived: { $sum: "$totalReceived" },
            changeAmount: { $sum: "$changeAmount" },
            totalReceivable: { $sum: "$totalReceivable" },
            cogs: { $sum: "$cogs" },
            lossProfit: { $sum: "$lossProfit" },
            footfall: { $sum: 1 },
            roundUpAmount: { $sum: "$roundUpAmount" },
          },
        },
      ]);

      if (sales.length > 0) {
        sales[0].dueAmount = dueAmount;
        res.status(200).json(sales[0]);
      } else {
        res
          .status(200)
          .json({ dueAmount: dueAmount, message: "No sales data found." });
      }
    } catch (err) {
      console.log(err);
    }
  })
);

// profit / loss calculation dashboard
saleRouter.get(
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



// // TODAYS SALE Count
// saleRouter.get(
//   "/week-sale",
//   //
//   expressAsyncHandler(async (req, res) => {
//     const today = new Date();
//     const startDate = new Date(today.setDate(today.getDate() - today.getDay()));
//     const endDate = new Date(today.setDate(today.getDate() + 6 - today.getDay()));
//     console.log(startDate, endDate)
//     try {
//       const sales = await Sale.aggregate([
//         {
//           $match: {
//             date: {
//               $gte: startDate,
//               $lt: endDate
//             }
//           }
//         },
//         {
//           $group: {
//             _id: {
//               $dateToString: {
//                 format: "%Y-%m-%d",
//                 date: "$date"
//               }
//             },
//             totalDailySales: {
//               $sum: "$grossTotal"
//             }
//           }
//         },
//         {
//           $group: {
//             _id: {
//               $dayOfWeek: "$_id"
//             },
//             date: {
//               $first: "$_id"
//             },
//             totalWeeklySales: {
//               $sum: "$totalDailySales"
//             }
//           }
//         },
//         {
//           $project: {
//             _id: 0,
//             date: 1,
//             totalWeeklySales: 1
//           }
//         },
//         {
//           $sort: {
//             "_id": 1
//           }
//         }
//       ]);
//       console.log(sales);
//       res.send(sales);
//     } catch (err) {
//       console.log(err);
//     }
//   })
// );
// TODAYS SALE Count
saleRouter.get(
  "/footfall/:start/:end/:aamarId",
  //
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    const aamarId = req.params.aamarId;
    // console.log(start, end, new Date());
    const day = parseInt(1);
    try {
      const sales = await Sale.aggregate([
        {
          $match: {
            $and: [
              {
                status: "complete",
              },
              {
                createdAt: {
                  $gt: start,
                  $lt: end,
                },
              },
              { aamarId: aamarId },
            ],
          },
        },
        {
          $count: "footfall",
        },
      ]);
      res.send(sales);
    } catch (err) {
      console.log(err);
    }
  })
);

// saleRouter.get(
//   "/export/:start/:end/",
//   expressAsyncHandler(async (req, res) => {
//     const start = req.params.start
//       ? startOfDay(new Date(req.params.start))
//       : startOfDay(new Date.now());
//     const end = req.query.end
//       ? endOfDay(new Date(req.params.end))
//       : endOfDay(new Date.now());

//     const biller = req.query.billerId;
//     console.log(biller);
// const sales = await Sale.find({
//   status: "complete",
//   createdAt: { $gte: start, $lte: end },
// })
//   .select({
//     invoiceId: 1,
//     totalItem: 1,
//     grossTotalRound: 1,
//     total: 1,
//     billerId: 1,
//     totalReceived: 1,
//     createdAt: 1,
//     changeAmount: 1,
//     customerId: 1,
//   })
//   .populate("billerId", "name")
//   .populate("customerId", "phone");
//     res.send("sales");
//     // console.log(sales);
//     // // res.send('removed');
//   })
// );

// GET ONE sales
saleRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    let sales = [];
    if (id === "lastsale" || id === "last") {
      sales = await Sale.find({ status: "complete" })
        .sort({ createdAt: -1 })
        .limit(1)
        .populate("billerId", "name")
        .populate("customerId", { phone: 1, name: 1, point: 1, address: 1 })
        .populate("returnInvoice", "invoiceId");
      if (!sales || sales.length === 0) {
        sales = await Sale.find({})
          .sort({ createdAt: -1 })
          .limit(1)
          .populate("billerId", "name")
          .populate("customerId", { phone: 1, name: 1, point: 1, address: 1 })
          .populate("returnInvoice", "invoiceId");
      }
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      sales = await Sale.find({ _id: id, status: "complete" })
        .populate("billerId", "name")
        .populate("customerId", { phone: 1, name: 1, point: 1, address: 1 })
        .populate("returnInvoice", "invoiceId");
      if (!sales || sales.length === 0) {
        sales = await Sale.find({ _id: id })
          .populate("billerId", "name")
          .populate("customerId", { phone: 1, name: 1, point: 1, address: 1 })
          .populate("returnInvoice", "invoiceId");
      }
    } else {
      sales = await Sale.find({ invoiceId: id })
        .populate("billerId", "name")
        .populate("customerId", { phone: 1, name: 1, point: 1, address: 1 })
        .populate("returnInvoice", "invoiceId");
    }
    res.send(sales[0]);
  })
);

// GET ONE sales
saleRouter.get(
  "/invoice/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const sales = await Sale.findOne({ invoiceId: id, status: "complete" })
      .populate("billerId", "name")
      .populate("customerId", { phone: 1, name: 1, point: 1, address: 1 });
    // console.log(sales);
    res.send(sales);
    // // res.send('removed');
  })
);

// CREATE ONE SALE --
saleRouter.post(
  "/",
  generatePosId,
  updateInventoryOutOnSaleIn,
  expressAsyncHandler(async (req, res) => {
    try {
      let newSale = new Sale(req.body);
      let sale = await newSale.save(); // ✅ Await without callback

      res.status(200).json({
        message: "Sale is created successfully",
        data: sale,
        status: 200,
      });
    } catch (err) {
      res.status(500).json({
        message: "There was a server-side error",
        error: err.message || err,
      });
    }
  })
);

// CREATE ONE SALE
saleRouter.post(
  "/ecom",
  generatePosId,
  // updateInventoryOutOnSaleIn,
  expressAsyncHandler(async (req, res) => {
    // console.log("body", req.body);
    let newSale = new Sale(req.body);
    // console.log("newSale", newSale);
    try {
      await newSale.save((err, sale) => {
        if (err) {
          // console.log("err:", res, err);
          res
            .status(500)
            .json({ message: "There was a server side error", error: err });
        } else {
          // console.log(sale);
          res.status(200).json({
            message: "Sale is created Successfully",
            data: sale,
            status: 200,
          });
        }
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI sales
saleRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Sale.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "sales are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Sale
saleRouter.put(
  "/:id",
  updateInventoryInOnSaleDel,
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Sale.updateOne({ _id: id }, { $set: update })
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
// Temporary del ONE Sale
saleRouter.put(
  "deletetemp/:id",
  // updateInventoryInOnSaleDel,
  expressAsyncHandler(async (req, res) => {
    const id = req.params._id;
    const update = req.body;
    try {
      await Sale.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Sale
saleRouter.delete(
  "/:id",
  updateInventoryInOnSaleDel,
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    // try {
    //   await Sale.deleteOne({ _id: id })
    //     .then((response) => {
    //       res.send(response);
    //     })
    //     .catch((err) => {
    //       res.send(err);
    //     });
    // } catch (error) {
    //   console.error(error);
    // }
  })
);
// SALES AGGREGATION
saleRouter.get(
  "/todaySale",
  expressAsyncHandler(async (req, res) => {
    const sale = await Sale.aggregate([
      {
        $match: {
          createdAt: {
            $gte: ISODate("2013-01-01T00:00:00.0Z"),
            $lt: ISODate("2013-02-01T00:00:00.0Z"),
          },
        },
      },
      // { $group: { _id: null, count: { $count: "$_id" } } },
    ]);

    // console.log(sale);
  })
);

module.exports = saleRouter;
