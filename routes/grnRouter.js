/**
 * grns API
 * 1. get all grns
 * 2. get Grn by id
 * 3. get Grn by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const { default: mongoose } = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Grn = require("../models/grnModel"); // Goods Recieve Note
const Product = require("../models/productModel"); // Goods Recieve Note
const Category = require("../models/categoryModel"); // Goods Recieve Note
const checklogin = require("../middlewares/checkLogin");
const { generateGrnId } = require("../middlewares/generateId");
const {
  updatePurchaseStatus,
} = require("../middlewares/updatePurchaseOnGRnDel");
const {
  updateInventoryInOnGRNIn,
  updateInventoryOutOnGRNDel,
} = require("../middlewares/useInventory");
const { startOfDay, endOfDay, format } = require("date-fns");
const { handleNewPrice } = require("../middlewares/handlePrice");
const Purchase = require("../models/purchaseModel");

const grnRouter = express.Router();

// sale Count
grnRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { aamarId } = req.params;

    try {
      // console.log("Received aamarId:", aamarId);

      // Check if aamarId is a valid ObjectId (if necessary)
      const count = await Grn.countDocuments({ aamarId });

      res.status(200).json( count );
    } catch (error) {
      console.error("Error fetching count:", error); // Log the error
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  })
);

// GET ALL grns
grnRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const grns = await Grn.find({})
      .select({
        tpnNo: 1,
        poNo: 1,
        grnNo: 1,
        userId: 1,
        totalItem: 1,
        supplier: 1,
        total: 1,
        status: 1,
        createdAt: 1,
        shipping_cost: 1,
        note: 1,
      })
      .populate("poNo", "poNo")
      .populate("supplier", "company")
      .populate("userId", "name");
    res.send(grns);
    // // res.send('removed');
    // console.log(grns);
  })
);
///// today grn
grnRouter.get(
  "/today-grn",
  expressAsyncHandler(async (req, res) => {
    const today = new Date();
    const end = startOfDay(new Date(today));
    const start = endOfDay(new Date(today));
    try {
      const grn = await Grn.aggregate([
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
      res.send(grn);
      // res.send(Purchases);
    } catch (err) {
      console.log(err);
    }
    // // res.send('removed');
  })
);

//grn by category  between two dates
grnRouter.get(
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
      const grn = await Grn.aggregate([
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
                  { $toDouble: "$mrp" },
                ],
              },
            },
          },
        },
      ]);
      const populateGrn = await Category.populate(grn, {
        path: "_id",
        model: "Category",
      });
      res.send(populateGrn);
    } catch (err) {
      console.log(err);
    }
    // console.log(sales);
    // // res.send('removed');
  })
);
//grn load by two dates
grnRouter.get(
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
    console.log("warehouse id", warehouse);
    let matchQuery = {
      createdAt: { $gte: start, $lte: end },
    };
    if (aamarId) {
      matchQuery.aamarId = aamarId;
    }
    if (warehouse !== "allWh" && warehouse && warehouse !== "undefined" && warehouse !== "null") {
      matchQuery.warehouse = mongoose.Types.ObjectId.isValid(warehouse)
        ? { $in: [new mongoose.Types.ObjectId(warehouse), warehouse] }
        : warehouse;
    }
    console.log("matchquery id", matchQuery);

    // console.log(start, end);
    try {
      const grns = await Grn.aggregate([
        {
          $match: matchQuery,
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
            from: "suppliers", // Replace with your actual suppliers collection name
            let: { supplierId: { $toString: "$supplier" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$_id", "$$supplierId"] },
                      { $eq: [{ $toString: "$_id" }, "$$supplierId"] },
                    ],
                  },
                },
              },
            ],
            as: "supplier",
          },
        },
        {
          $lookup: {
            from: "purchases", // Replace with your actual purchases collection name
            localField: "poNo",
            foreignField: "_id",
            as: "purchaseOrder",
          },
        },

        {
          $lookup: {
            from: "users", // Replace with your actual users collection name
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },

        // {
        //   $unwind: { path: "$purchaseOrder", preserveNullAndEmptyArrays: true },
        // },
        // { $unwind: { path: "$tpn", preserveNullAndEmptyArrays: true } },

        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            grnNo: 1,
            warehouse: "$warehouse.name",
            refNo: {
              $cond: {
                if: { $gt: ["$poNo", null] },
                then: "$purchaseOrder.poNo",
                else: "$tpn.tpnNo",
              },
            },
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            supplier: "$supplier.company",
            user: "$user.name",
            totalItem: 1,
            shipping_cost: 1,
            discount: { $round: ["$discount", 2] },
            total: {
              $round: ["$total", 2],
            },
            grossTotal: {
              $round: [{ $subtract: ["$total", "$discount"] }, 2],
            },
            status: 1,
          },
        },
      ]);
      // console.log(grns);
      // res.send(grns);
      res.status(200).json(grns);
    } catch (err) {
      console.error("Error in /byDate route:", err);
      res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
    // console.log(sales);
    // // res.send('removed');
  })
);

grnRouter.get(
  "/discount/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());

    try {
      const grn = await Grn.aggregate([
        // Match documents where the status is not "Deleted"
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $ne: "Deleted" },
          },
        },
        // Perform a lookup to get the associated supplier and company
        {
          $lookup: {
            from: "suppliers",
            let: { supplierId: { $toString: "$supplier" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ["$_id", "$$supplierId"] },
                      { $eq: [{ $toString: "$_id" }, "$$supplierId"] },
                    ],
                  },
                },
              },
            ],
            as: "supplierInfo",
          },
        },
        {
          $unwind: "$supplierInfo", // Unwind the array created by lookup
        },
        // Project specific fields
        {
          $project: {
            _id: 0,
            date: {
              $dateToString: { format: "%m-%d-%Y", date: "$createdAt" },
            },
            grnNo: 1,
            discount: { $ifNull: ["$discount", 0] },
            shipping_cost: { $ifNull: ["$shipping_cost", 0] },
            net_discount: {
              $subtract: [
                { $toDouble: { $ifNull: ["$discount", 0] } },
                { $toDouble: { $ifNull: ["$shipping_cost", 0] } },
              ],
            },
            supplier: "$supplierInfo.company",
          },
        },
      ]);

      res.status(200).json(grn);
    } catch (error) {
      console.error("Error in /discount route:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  })
);

// grnRouter.get(
//   "/week-grn",
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
//       const grn = await Grn.aggregate([
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
//       res.send(grn);
//       // res.send(Purchases);
//     } catch (err) {
//       console.log(err);
//     }
//     // // res.send('removed');
//   })
// );

grnRouter.get(
  "/week-grn/:warehouse/:aamarId",
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

      // Fetch aggregated GRNs within the date range
      const grnData = await Grn.aggregate([
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

        const grn = grnData.find((s) => s._id === formattedDate || s._id === isoDate);
        label.push(formattedDate);
        value.push(grn ? grn.total : 0);
        result.push({
          date: formattedDate,
          total: grn ? grn.total : 0,
          day: dayName,
        });
        cur.setDate(cur.getDate() + 1);
      }

      res.status(200).send({ result, value, label });
    } catch (err) {
      console.error("Error fetching weekly GRN:", err);
      res.status(500).send({ error: "Failed to fetch weekly GRN" });
    }
  })
);

grnRouter.get(
  "/count",
  expressAsyncHandler(async (req, res) => {
    const total = await Grn.countDocuments({});
    res.status(200).json(total);
  })
);

// GET ONE grns
grnRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const grns = await Grn.find({ _id: id })
      .select({
        tpnNo: 1,
        poNo: 1,
        grnNo: 1,
        userId: 1,
        supplier: 1,
        warehouse: 1,
        products: 1,
        type: 1,
        totalItem: 1,
        total: 1,
        status: 1,
        createdAt: 1,
        shipping_cost: 1,
        note: 1,
        discount: 1,
      })
      .populate("poNo", "poNo")
      // .populate("tpnNo", { tpnNo: 1, warehouseFrom: 1, warehouseTo: 1 })
      .populate({
        path: "tpnNo",
        select: { tpnNo: 1, warehouseFrom: 1, warehouseTo: 1 },
        populate: [
          {
            path: "warehouseFrom",
            model: "Warehouse",
          },
          {
            path: "warehouseTo",
            model: "Warehouse",
          },
        ],
      })
      .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");
    res.send(grns[0]);
    // // res.send('removed');
    // console.log(grns);
  })
);
// GET grns by supplier
// GET grns by supplier
grnRouter.get(
  "/supplier/account/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId;
    const grns = await Grn.find({ supplier: id, aamarId: aamarId })
      .select({
        tpnNo: 1,
        poNo: 1,
        grnNo: 1,
        userId: 1,
        supplier: 1,
        warehouse: 1,
        products: 1,
        type: 1,
        totalItem: 1,
        total: 1,
        status: 1,
        createdAt: 1,
        shipping_cost: 1,
        note: 1,
      })
      .populate("poNo", "poNo")
      .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");
    res.send(grns);
    // // res.send('removed');
    // console.log(grns);
  })
);

// CREATE ONE Grn
grnRouter.post(
  "/",
  checklogin,
  generateGrnId,
  handleNewPrice,
  updateInventoryInOnGRNIn,
  expressAsyncHandler(async (req, res) => {
    // console.log("New:", req.body.products);
    // console.log("New:All", req.body);

    const newGrn = new Grn(req.body);
    console.log(newGrn);
    try {
      const result = await newGrn.save();

      // console.log("result", result);
      // if (result) {
      //   res.status(200).json({
      //     data: result,
      //     message: "Grn is created Successfully",
      //     status: "success",
      //   });
      // }
      if (result) {
        // console.log("result", result, newGrn, req.body);
        
        const promises = [];

        if (result?.poNo) {
          promises.push(
            Purchase.updateOne(
              { _id: result?.poNo },
              { $set: { status: "Received" } }
            )
          );
        }
        
        if (result?.tpnNo) {
          promises.push(
            Tpn.updateOne(
              { _id: result?.tpnNo },
              { $set: { status: "Complete" } }
            )
          );
        }

        await Promise.all(promises);

        res.status(200).json({
          data: result,
          message: "Grn is created Successfully",
          status: "success",
        });
      }
    } catch (err) {
      // console.log("grn DATA", newGrn)
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI grns
grnRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Grn.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "grns are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Grn
grnRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Grn.updateOne({ _id: id }, { $set: update })
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

// GET ALL GRN WITH PAGENATION & SEARCH
grnRouter.get(
  "/:page/:size",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = page + 0;

    let query = {};
    let grn = [];
    // const size = parseInt(req.query.size);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);
    // console.log(typeof queryString);

    //check if search or the pagenation

    if (queryString) {
      // console.log("== query");

      // console.log("search:", query);
      query = { grnNo: { $regex: new RegExp(queryString + ".*?", "i") } };
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
      // console.log(query);

      grn = await Grn.find(query)
        .select({
          poNo: 1,
          grnNo: 1,
          userId: 1,
          supplier: 1,
          warehouse: 1,
          products: 1,
          type: 1,
          totalItem: 1,
          total: 1,
          status: 1,
          createdAt: 1,
          shipping_cost: 1,
          note: 1,
        })
        .populate("poNo", "poNo")
        .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
        .populate("warehouse", "name")
        .populate("userId", "name");
      res.status(200).json(grn);
    } else {
      // console.log("no query");

      // regular pagination
      query = {};

      grn = await Grn.find(query)
        .select({
          poNo: 1,
          grnNo: 1,
          userId: 1,
          supplier: 1,
          warehouse: 1,
          products: 1,
          type: 1,
          totalItem: 1,
          total: 1,
          status: 1,
          createdAt: 1,
          shipping_cost: 1,
          note: 1,
        })
        .populate("poNo", "poNo")
        .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
        .populate("warehouse", "name")
        .populate("userId", "name");
      res.status(200).json(grn);
      // console.log("done:", query);
    }
  })
);

// // DELETE ONE Grn
// DELETE GRN - STATUS CANCELED WITH INVENTORY UPDATE
grnRouter.put(
  "/delete/:id",
  updateInventoryOutOnGRNDel,
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const { poNo } = req.body;
    const update = { status: "Deleted" };

    console.log(req.body);

    try {
      if (poNo) {
        const update = await Purchase.updateOne(
          { poNo: poNo },
          { $set: { status: "Pending" } }
        );
      } else {
        // const update = await Tpn.updateOne(
        //   { _id: mongoose.Types.ObjectId(tpnNo) },
        //   { $set: poUpdate }
        // );
      }
      await Grn.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          res.status(200).json(response);
        })
        .catch((err) => {
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

module.exports = grnRouter;
