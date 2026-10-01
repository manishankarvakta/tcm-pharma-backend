/**
 * inventories API
 * 1. get all inventories
 * 2. get Inventory by id
 * 3. get Inventory by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Inventory = require("../models/inventoryModel");
const checklogin = require("../middlewares/checkLogin");
const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");
const StockTimeSeries = require("../models/stockTimeSeriesModel");
const {
  startOfDay,
  endOfDay,
  addDays,
  parse,
  parseISO,
  format,
} = require("date-fns");
const Grn = require("../models/grnModel");
const Rtv = require("../models/rtvModel");
const Sale = require("../models/saleModel");
const Damage = require("../models/damageModel");
const Product = require("../models/productModel");

const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const inventoryRouter = express.Router();

// INVENTORY INIT
inventoryRouter.get(
  "/init",
  expressAsyncHandler(async (req, res) => {
    console.log("init");
    try {
      const products = await Product.find({}); // Changed variable name to plural "products"
      console.log("init", products.length);

      let inventoryData = [];
      products.forEach((product) => {
        // Changed map to forEach
        const inventory = {
          name: product.name, // Removed duplicate 'name' field
          article_code: product.article_code,
          warehouse: "645c9297ed6d5d94af257be9",
          currentQty: 0,
          openingQty: 0,
          totalQty: 0, //This will work as GRN
          soldQty: 0,
          salesReturnQty: 0,
          damageQty: 0,
          rtvQty: 0,
          tpnQty: 0,
          status: "active",
          createdAt: new Date(), // Use current date directly
          updatedAt: new Date(), // Use current date directly
        };
        inventoryData.push(inventory); // Simplified array push
      });
      // await Inventory.deleteMany({});

      // const inventories = await Inventory.insertMany(inventoryData);
      res.send(inventoryData);
    } catch (err) {
      console.error(err); // Changed console(err) to console.error(err)
      res.status(500).send({ message: "Internal Server Error" }); // Added error response
    }
  })
);

// GET ALL inventories
inventoryRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const inventories = await Inventory.find({ status: "active" });
    res.send(inventories);
    // console.log(inventories);
    // console.log(inventories);
  })
);
// count
inventoryRouter.get(
  "/count",
  expressAsyncHandler(async (req, res) => {
    const total = await Inventory.countDocuments({});
    res.status(200).json(total);
  })
);
// GET ALL inventories for export
inventoryRouter.get(
  "/export",
  expressAsyncHandler(async (req, res) => {
    console.log("Export");
    const inventories = await Inventory.aggregate([
      {
        $match: {
          status: "active",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "article_code",
          foreignField: "article_code",
          pipeline: [
            {
              $project: {
                // name: 1,
                profit: 1,
                mrp: 1, // Include MRP
                tp: 1, // Include TP (Trade Price)
                // unit: 1    // Include Unit
              },
            },
          ],
          as: "product",
        },
      },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouse",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, location: 1 } }],
          as: "warehouse",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          article_code: 1,
          warehouse: { $arrayElemAt: ["$warehouse.name", 0] },
          currentQty: 1,
          // openingQty: 1,
          // totalQty: 1,
          soldQty: 1,
          // damageQty: 1,
          // rtvQty: 1,
          // tpnQty: 1,
          product: {
            mrp: 1,
            tp: 1,
          },
        },
      },
    ]);

    console.log(inventories?.length);
    res.send(inventories);
  })
);

// // GET ALL inventories for export
// inventoryRouter.get(
//   "/export",
//   expressAsyncHandler(async (req, res) => {
//     console.log("Export");
//     const inventories = await Inventory.aggregate([
//       {
//         $match: {
//           status: "active",
//         },
//       },
//       {
//         $lookup: {
//           from: "products",
//           localField: "article_code",
//           foreignField: "article_code",
//           as: "product",
//         },
//       },
//       {
//         $lookup: {
//           from: "warehouses",
//           localField: "warehouse", // Replace "warehouseId" with the actual field name that holds the warehouse reference in the "inventories" collection
//           foreignField: "_id", // Replace "_id" with the actual field name that holds the reference to the warehouse in the "warehouses" collection
//           as: "warehouse",
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           name: 1,
//           article_code: 1,
//           warehouse: { $arrayElemAt: ["$warehouse.name", 0] }, // Assuming "name" is the field you want to populate in the "warehouse" field
//           currentQty: 1,
//           openingQty: 1,
//           totalQty: 1,
//           soldQty: 1,
//           damageQty: 1,
//           rtvQty: 1,
//           tpnQty: 1,
//           product: 1,
//         },
//       },
//     ]);

//     console.log(inventories?.length);
//     res.send(inventories);
//   })
// );

// Adjust Inventory

inventoryRouter.put(
  "/adjust",
  // adjustInventoryOnSale,
  expressAsyncHandler(async (req, res) => {
    // console.log("update", req.body.update);
    // const total = await Inventory.countDocuments({});
    res.status(200).json("success");
  })
);
// COUNT Inventory
// inventoryRouter.get(
//   "/count",
//   expressAsyncHandler(async (req, res) => {
//     const total = await Inventory.countDocuments({});
//     res.status(200).json(tostal);
//   })
// );

// GET ALL INVENTORY WITH PAGENATION & SEARCH
inventoryRouter.get(
  "/all/:page/:size",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = parseInt(page) + 0;

    let query = {};
    let product = [];
    // const size = parseInt(req.query.size);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);
    // console.log(typeof queryString);

    //check if search or the pagenation

    if (queryString) {
      // console.log("== query");

      // console.log("search:", query);
      // search check if num or string
      const isNumber = /^\d/.test(queryString);
      // console.log(isNumber);
      if (!isNumber) {
        // if text then search name
        query = {
          name: { $regex: new RegExp(".*" + queryString + ".*?", "i") },
        };
        // query = { name:  queryString  };
      } else {
        // console.log("num");
        // if number search in ean and article code
        query = {
          article_code: {
            $regex: RegExp(queryString + ".*", "i"),
          },
        };
      }

      product = await Inventory.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products", // The name of the Product collection in MongoDB
            localField: "article_code", // The field from the Inventory collection
            foreignField: "article_code", // The field from the Product collection
            as: "productDetails", // The name of the new array field to add to the input documents
          },
        },
        {
          $unwind: "$productDetails", // Deconstructs the productDetails array field
        },
        {
          $lookup: {
            from: "groups", // Assuming 'groups' is the name of the collection where group details are stored
            localField: "productDetails.group", // Field in Product that references the Group
            foreignField: "_id", // Field in Group
            as: "groupDetails",
          },
        },
        {
          $unwind: "$groupDetails", // Deconstructs the groupDetails array field
        },
        {
          $project: {
            // Specify the fields you want to include in the final output
            article_code: 1,
            name: 1,
            groupName: "$groupDetails.name", // Assuming 'name' is the field in Group that stores the group name
            tp: "$productDetails.tp", // Assuming 'name' is the field in Group that stores the group name
            currentQty: 1,
            totalQty: 1,
            openingQty: 1,
            soldQty: 1,
            salesReturnQty: 1,
            damageQty: 1,
            rtvQty: 1,
            tpnQty: 1,
          },
        },
        {
          $limit: 100,
        },
      ]);

      // console.log("res", product);
      res.status(200).json(product);
    } else {
      console.log("size", size, "currentPage", currentPage);

      product = await Inventory.aggregate([
        {
          $lookup: {
            from: "products", // The name of the Product collection in MongoDB
            localField: "article_code", // The field from the Inventory collection
            foreignField: "article_code", // The field from the Product collection
            as: "productDetails", // The name of the new array field to add to the input documents
          },
        },
        {
          $unwind: "$productDetails", // Deconstructs the productDetails array field
        },
        {
          $lookup: {
            from: "groups", // Assuming 'groups' is the name of the collection where group details are stored
            localField: "productDetails.group", // Field in Product that references the Group
            foreignField: "_id", // Field in Group
            as: "groupDetails",
          },
        },
        {
          $unwind: "$groupDetails", // Deconstructs the groupDetails array field
        },
        {
          $project: {
            // Specify the fields you want to include in the final output
            article_code: 1,
            name: 1,
            groupName: "$groupDetails.name", // Assuming 'name' is the field in Group that stores the group name
            tp: "$productDetails.tp", // Assuming 'name' is the field in Group that stores the group name
            currentQty: 1,
            currentQty: 1,
            openingQty: 1,
            totalQty: 1,
            soldQty: 1,
            salesReturnQty: 1,
            damageQty: 1,
            rtvQty: 1,
            tpnQty: 1,
          },
        },
        {
          $skip: size * currentPage,
        },
        {
          $limit: size,
        },
      ]);

      res.status(200).json(product);
    }
  })
);

inventoryRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    // console.log("id", id);

    const inventories = await Inventory.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          status: "active",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "article_code",
          foreignField: "article_code",
          as: "product",
        },
      },

      {
        $project: {
          _id: 1,
          name: 1,
          article_code: 1,
          warehouse: 1,
          currentQty: 1,
          openingQty: 1,
          totalQty: 1,
          soldQty: 1,
          damageQty: 1,
          rtvQty: 1,
          tpnQty: 1,
          product: 1,
        },
      },
    ]).exec();

    res.send(inventories[0]);
  })
);

// GET ONE inventories
inventoryRouter.get(
  "/new/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    // console.log("id", id);
    const inventories = await Inventory.findOne({
      _id: id,
      status: "active",
    }).select({
      _id: 1,
      name: 1,
      article_code: 1,
      warehouse: 1,
      currentQty: 1,
      openingQty: 1,
      totalQty: 1,
      soldQty: 1,
      damageQty: 1,
      rtvQty: 1,
      tpnQty: 1,
    });

    res.send(inventories);
  })
);
// GET ONE BY Article Code
inventoryRouter.get(
  "/article_code/:article_code",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.article_code;
    try {
      const inventory = await Inventory.findOne({
        article_code: id,
        status: "active",
      });
      res.status(200).json(inventory);
    } catch (err) {
      res.status(500).json(err);
    }
    // res.send(id);
    // console.log(id);
  })
);

// inventoryRouter.get(
//   "/snapshot",
//   expressAsyncHandler(async (req, res) => {
//     // console.log("snap");
//     try {
//       // Read data from secondary nodes with a preferred read preference
//       const snapshotData = await Inventory.find()
//         .readPreference("secondaryPreferred")
//         .toArray();

//       // console.log("snapshotData", snapshotData);
//       res.send(snapshotData);
//     } catch (error) {
//       console.error("Error:", error);
//       res.status(500).send("Internal Server Error");
//     }
//   })
// );
// inventoryRouter.get(
//   "/snapshot/ss",
//   expressAsyncHandler(async (req, res) => {
//     try {
//       const dbUrl = `mongodb+srv://test:QFNOIr4QbpGGpA4D@cluster0.1hsyopn.mongodb.net/pharmacyDb?retryWrites=true&w=majority`;
//       const client = new MongoClient(dbUrl, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//       });
//       const session = client.startSession();
//       session.startTransaction();
//       // Read data from secondary nodes with a preferred read preference
//       const snapshotData = await Inventory.find()
//         .readPreference("secondaryPreferred")
//         .toArray();

//       await session.commitTransaction();

//       // console.log("snapshotData", snapshotData);
//       res.send(snapshotData);
//     } catch (error) {
//       console.error("Error:", error);
//       await session.abortTransaction();
//       res.status(500).send("Internal Server Error");
//     } finally {
//       session.endSession();
//     }
//   })
// );

// CREATE ONE Inventory
inventoryRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    // console.log("hi", req.body);
    const newInventory = new Inventory(req.body);
    // console.log("newInventory", newInventory);
    try {
      await newInventory.save();
      res.status(200).json({
        data: newInventory,
        status: true,
        message: "Inventory is created Successfully",
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "There was a server side error",
        error: err,
      });
    }
  })
);
// // CREATE ONE Inventory
// inventoryRouter.post(
//   "/price",
//   expressAsyncHandler(async (req, res) => {
//     const article_code = req.body.article_code;

//     console.log(req.body);

//     try {
//       // GET INVENTORY BY ARTICLE CODE
//       const selectedInventory = await Inventory.find({
//         article_code: article_code,
//         status: "active",
//       });

//       res.status(200).json(selectedInventory);
//     } catch (err) {
//       res.status(500).json({ err });
//     }
//   })
// );

// CREATE MULTI inventories
inventoryRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Inventory.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "inventories are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Inventory
inventoryRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    // console.log("in id", id);
    // console.log("in up", update);
    try {
      await Inventory.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          // console.log("inventory updating")
          // console.log("inventory updating", response);
          res.send(response);
        })
        .catch((err) => {
          // console.log("inventory not updating", err);
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

// DELETE ONE Inventory
inventoryRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Inventory.deleteOne({ _id: id })
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
// GET ALL INVENTORY WITH PAGENATION & SEARCH
inventoryRouter.get(
  "/all/ttt/:page/:size",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = parseInt(page) + 0;

    let query = {};
    let product = [];
    // const size = parseInt(req.query.size);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);
    // console.log(typeof queryString);

    //check if search or the pagenation

    if (queryString) {
      // console.log("== query");

      // console.log("search:", query);
      // search check if num or string
      const isNumber = /^\d/.test(queryString);
      // console.log(isNumber);
      if (!isNumber) {
        // if text then search name
        query = {
          name: { $regex: new RegExp(".*" + queryString + ".*?", "i") },
        };
        // query = { name:  queryString  };
      } else {
        query = {
          article_code: {
            $regex: RegExp(queryString + ".*", "i"),
          },
        };
      }
      // console.log("qry", query);

      product = await Inventory.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products", // The name of the price collection
            localField: "article_code",
            foreignField: "article_code",
            as: "products",
          },
        },
        {
          $limit: 100,
        },
        {
          $unwind: "$products",
        },
        {
          $lookup: {
            from: "prices", // The name of the price collection
            localField: "products._id",
            foreignField: "article_code",
            as: "prices",
          },
        },
        {
          $unwind: "$prices",
        },
        {
          $sort: { "prices.updatedAt": -1 },
        },
        {
          $sort: { article_code: 1 },
        },
        {
          $group: {
            _id: "$_id", // Unique identifier field
            name: { $first: "$name" },
            article_code: { $first: "$article_code" },
            warehouse: { $first: "$warehouse" },
            openingQty: { $first: "$openingQty" },
            currentQty: { $first: "$currentQty" },
            totalQty: { $first: "$totalQty" },
            soldQty: { $first: "$soldQty" },
            damageQty: { $first: "$damageQty" },
            rtvQty: { $first: "$rtvQty" },
            tpnQty: { $first: "$tpnQty" },
            priceTable: { $first: "$priceTable" },
            status: { $first: "$status" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            __v: { $first: "$__v" },
            products: { $first: "$products" },
            prices: { $first: "$prices" },
          },
        },
      ]);
      // console.log("res", product);
      res.status(200).json(product);
    } else {
      product = await Inventory.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "products", // The name of the price collection
            localField: "article_code",
            foreignField: "article_code",
            as: "products",
          },
        },
        {
          $skip: size * page,
        },
        {
          $limit: size,
        },
        {
          $unwind: "$products",
        },
        {
          $lookup: {
            from: "prices", // The name of the price collection
            localField: "products._id",
            foreignField: "article_code",
            as: "prices",
          },
        },
        {
          $unwind: "$prices",
        },
        {
          $sort: { "prices.updatedAt": -1 },
        },
        {
          $sort: { article_code: 1 },
        },
        {
          $group: {
            _id: "$_id", // Unique identifier field
            name: { $first: "$name" },
            article_code: { $first: "$article_code" },
            warehouse: { $first: "$warehouse" },
            openingQty: { $first: "$openingQty" },
            currentQty: { $first: "$currentQty" },
            totalQty: { $first: "$totalQty" },
            soldQty: { $first: "$soldQty" },
            damageQty: { $first: "$damageQty" },
            rtvQty: { $first: "$rtvQty" },
            tpnQty: { $first: "$tpnQty" },
            priceTable: { $first: "$priceTable" },
            status: { $first: "$status" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            __v: { $first: "$__v" },
            products: { $first: "$products" },
            prices: { $first: "$prices" },
          },
        },
      ]);

      // .populate("priceList");
      // console.log("res", product);

      // console.log("done:", query);
      res.status(200).json(product);
    }
  })
);
// DELETE ALL
// inventoryRouter.get(
//   "/delete-all",
//   expressAsyncHandler(async (req, res) => {
//     try {
//       await Inventory.remove((response) => {
//         res.send(response);
//       }).catch((err) => {
//         res.send(err);
//       });
//     } catch (error) {
//       console.error(error);
//     }
//   })
// );

// rangeData Insert into TimeSeries

//RANGE DATA
inventoryRouter.get(
  "/rangeData/:start/:end",
  expressAsyncHandler(async (req, res) => {
    // Specify the start and end dates for the time range
    const startParam = req.params.start;
    const endParam = req.params.end;

    // Parse the start and end dates as ISO strings
    const startDate = new Date(startParam).toISOString();
    const endDate = new Date(endParam).toISOString();

    console.log(`
    #####   ###  ##    ####   #### ##    ####     ##     ####       ####   ### ##   ### ###  
      ##     ##  ##     ##    # ## ##     ##       ##     ##         ##    ##  ##    ##  ##  
      ##     # ## #     ##      ##        ##     ## ##    ##         ##       ##     ##      
      ##     ## ##      ##      ##        ##     ##  ##   ##         ##      ##      ## ##   
      ##     ##  ##     ##      ##        ##     ## ###   ##         ##     ##       ##      
      ##     ##  ##     ##      ##        ##     ##  ##   ##  ##     ##    ##  ##    ##  ##  
     ####   ###  ##    ####    ####      ####   ###  ##  ### ###    ####   # ####   ### ###  
                                                                                             
     ####   ###  ##  ### ###  ### ###  ###  ##  #### ##   ## ##   ### ##   ##  ##   
      ##      ## ##   ##  ##   ##  ##    ## ##  # ## ##  ##   ##   ##  ##  ##  ##   
      ##     # ## #   ##  ##   ##       # ## #    ##     ##   ##   ##  ##  ##  ##   
      ##     ## ##    ##  ##   ## ##    ## ##     ##     ##   ##   ## ##    ## ##   
      ##     ##  ##   ### ##   ##       ##  ##    ##     ##   ##   ## ##     ##     
      ##     ##  ##    ###     ##  ##   ##  ##    ##     ##   ##   ##  ##    ##     
     ####   ###  ##     ##    ### ###  ###  ##   ####     ## ##   #### ##    ##     
   `);

    console.log("date's", startDate, endDate);

    // Define a function to format a date as "MM-dd-yyyy"
    function formatDate(date) {
      return format(date, "MM-dd-yyyy");
    }

    // Parse the ISO dates for looping
    const startDateLoop = parseISO(startDate);
    const endDateLoop = parseISO(endDate);

    // Loop through the dates and create an array of formatted dates
    let dateRange = [];
    let currentDate = startDateLoop;

    let napa = [];

    // TODO::DATA FUNCTION
    const getByDate = async (date, tomorrow, products) => {
      const start = startOfDay(new Date(date));
      const end = endOfDay(new Date(date));
      try {
        // grn Products
        const grnProducts = await Grn.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: { $ne: "Deleted" },
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("grnProducts:", grnProducts.length);

        // Rtv Products
        const rtvProducts = await Rtv.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "Complete",
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("rtvProducts:", rtvProducts.length);
        // Sale Products
        const saleProducts = await Sale.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "complete",
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("saleProducts:", saleProducts.length);
        // salesReturn Products
        const salesReturnProducts = await Sale.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "complete",
            },
          },
          { $unwind: "$returnProducts" },
          {
            $group: {
              _id: "$returnProducts.article_code",
              qty: { $sum: { $toDecimal: "$returnProducts.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("salesReturnProducts:", salesReturnProducts.length);
        // damage Products
        const damageProducts = await Damage.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "active",
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("damageProducts", damageProducts.length);

        console.log("Total Products:", products.length);

        // Previous Day Stock
        // TODO:: GET Previous Date
        console.log(start, end);

        // StockTimeSeries Get Previous Date Stock
        const openingStockProducts = await StockTimeSeries.aggregate([
          {
            $match: {
              date: {
                $gte: start,
                $lte: end,
              },
            },
          },
        ]);

        console.log("openingStockProducts", openingStockProducts.length);

        // INIT Product Movement
        let productsMovement = [];
        let i = 0;

        // Loop Products
        products.forEach(async (product) => {
          const grnMatched = grnProducts.find(
            (grn) => grn.article_code === product.article_code
          );
          const rtvMatched = rtvProducts.find(
            (rtv) => rtv.article_code === product.article_code
          );
          const saleMatched = saleProducts.find(
            (sale) => sale.article_code === product.article_code
          );
          const salesReturnMatched = salesReturnProducts.find(
            (salesReturn) => salesReturn.article_code === product.article_code
          );
          const damageMatched = damageProducts.find(
            (damage) => damage.article_code === product.article_code
          );
          // const adjustMatched = adjustProducts.find(
          //   (adjust) => adjust.article_code === product.article_code
          // );
          const openingStockMatched = openingStockProducts.find(
            (stock) => stock.article_code === product.article_code
          );

          // let adjustQty = 0;
          // let otherAdjustQty = 0;
          // if (adjustMatched) {
          //   adjustQty =
          //     adjustMatched?.type === true ? adjustMatched?.totalQuantity : 0;
          //   otherAdjustQty =
          //     adjustMatched?.type === false ? adjustMatched?.totalQuantity : 0;
          // }

          const newProduct = {
            article_code: product.article_code,
            openingStock:
              (openingStockMatched
                ? parseFloat(openingStockMatched.openingStock)
                : 0) +
              // parseFloat(adjustQty) +
              (grnMatched ? parseFloat(grnMatched.qty) : 0) +
              (salesReturnMatched ? parseFloat(salesReturnMatched.qty) : 0) -
              ((rtvMatched ? parseFloat(rtvMatched.qty) : 0) +
                (saleMatched ? parseFloat(saleMatched.qty) : 0) +
                // parseFloat(otherAdjustQty) +
                (damageMatched ? parseFloat(damageMatched.qty) : 0)),
            date: tomorrow,
          };

          // if (product.article_code === "103119651000601") {
          //   console.log("napa", newProduct);
          //   napa = [
          //     ...napa,
          //     {
          //       date: formatDate(start),
          //       article_code: product.article_code,
          //       name: product.name,
          //       openingStock: openingStockMatched
          //         ? parseFloat(openingStockMatched.openingStock)
          //         : 0,
          //       grn: grnMatched ? parseFloat(grnMatched.qty) : 0,
          //       salesReturn: salesReturnMatched
          //         ? parseFloat(salesReturnMatched.qty)
          //         : 0,
          //       sale: saleMatched ? parseFloat(saleMatched.qty) : 0,
          //       rtv: rtvMatched ? parseFloat(rtvMatched.qty) : 0,
          //       damage: damageMatched ? parseFloat(damageMatched.qty) : 0,
          //       closingStock:
          //         (openingStockMatched
          //           ? parseFloat(openingStockMatched.openingStock)
          //           : 0) +
          //         // parseFloat(adjustQty) +
          //         (grnMatched ? parseFloat(grnMatched.qty) : 0) +
          //         (salesReturnMatched
          //           ? parseFloat(salesReturnMatched.qty)
          //           : 0) -
          //         ((rtvMatched ? parseFloat(rtvMatched.qty) : 0) +
          //           (saleMatched ? parseFloat(saleMatched.qty) : 0) +
          //           // parseFloat(otherAdjustQty) +
          //           (damageMatched ? parseFloat(damageMatched.qty) : 0)),
          //     },
          //   ];
          // }

          //SKIP O OpeningStock
          if (parseFloat(newProduct.openingStock) === 0) {
            i++;
            // console.log(newProduct.article_code, "=>", newProduct.openingStock);
          }
          // console.log(i);

          if (parseFloat(newProduct.openingStock) !== 0) {
            // console.log(
            //   newProduct.article_code,
            //   tomorrow,
            //   "=>",
            //   newProduct.openingStock
            // );
            productsMovement = [...productsMovement, newProduct];
          }
        });
        console.log(
          "productsMovement",
          formatDate(tomorrow),
          productsMovement?.length,
          i
        );

        return productsMovement;
      } catch (error) {
        console.log(error);
      }
    };

    let stockData = [];

    console.log("GET PRODUCTS DATA");
    const products = await Product.find({}).select({
      article_code: 1,
      // name: 1,
    });
    // TODO::LOOP Data
    if (products.length > 0) {
      while (currentDate <= endDateLoop) {
        let tomorrow = addDays(currentDate, 1);
        // console.log();
        dateRange = [...dateRange, formatDate(currentDate)];

        console.log("Products:", products.length);
        const data = await getByDate(currentDate, tomorrow, products);
        //   TODO:: Entry to DB
        const storeStock = await StockTimeSeries.insertMany(data);
        // console.log("data", data);

        // console.log("Movement:", formatDate(tomorrow), storeStock.);
        // console.log("Done:", formatDate(currentDate), formatDate(tomorrow), data);
        console.log(
          "######################### /n",
          formatDate(currentDate),
          " /n #########################"
        );

        stockData = [...stockData, { Date: currentDate, Qty: data }];
        // console.log(currentDate, storeStock.length);
        currentDate = addDays(currentDate, 1);
      }
    }

    // console.log("napa", napa);
    // csvWriter
    //   .writeRecords(napa) // Returns a promise
    //   .then(() => {
    //     console.log("CSV file was written successfully");
    //   })
    //   .catch((err) => {
    //     console.error("Error writing CSV file", err);
    //   });
    // console.log(dateRange);
    // res.status(200).json({ dateRange });
    res.status(200).json({ startDate, endDate, dateRange, napa });
  })
);

// stockByDate
inventoryRouter.get(
  "/stockByDate/:start",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.start
      ? endOfDay(new Date(req.params.start))
      : endOfDay(new Date());

    // console.log(new Date().getTimezone());
    console.log(start, end);

    const stockData = await StockTimeSeries.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lte: end,
          },
        },
      },
    ]);

    console.log("stockData", stockData.length);
    res.status(200).json({ stockData });
  })
);

// stockValueByDate
inventoryRouter.get(
  "/stockValueByDate/:start",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.start
      ? endOfDay(new Date(req.params.start))
      : endOfDay(new Date.now());

    console.log(start, end);

    const stockData = await StockTimeSeries.aggregate([
      {
        $match: {
          date: {
            $gte: start,
            $lte: end,
          },
        },
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
        $project: {
          article_code: 1,
          name: "$productDetails.name",
          tp: "$productDetails.tp", // Convert tp to a decimal
          mrp: "$productDetails.mrp",
          stock: "$openingStock", // Convert openingStock to an integer
          // value: {
          //   $multiply: [
          //     { $toDecimal: "$productDetails.tp" }, // Convert tp to a decimal before multiplying
          //     { $toDecimal: "$openingStock" }, // Convert openingStock to an integer before multiplying
          //   ],
          // },
        },
      },
    ]);

    console.log("stockData", stockData.length);
    res.status(200).json({ stockData });
  })
);

//RANGE DATA
inventoryRouter.get(
  "/productStockData/:article_code/:start/:end",
  expressAsyncHandler(async (req, res) => {
    // Specify the start and end dates for the time range
    const startParam = req.params.start;
    const endParam = req.params.end;
    const article_code = req.params.article_code;

    // Parse the start and end dates as ISO strings
    const startDate = new Date(startParam).toISOString();
    const endDate = new Date(endParam).toISOString();

    console.log("date's", startDate, endDate);

    // Define a function to format a date as "MM-dd-yyyy"
    function formatDate(date) {
      return format(date, "MM-dd-yyyy");
    }

    // Parse the ISO dates for looping
    const startDateLoop = parseISO(startDate);
    const endDateLoop = parseISO(endDate);

    // Loop through the dates and create an array of formatted dates
    let dateRange = [];
    let currentDate = startDateLoop;

    let productData = [];

    // TODO::DATA FUNCTION
    const getByDate = async (date, tomorrow, products) => {
      const start = startOfDay(new Date(date));
      const end = endOfDay(new Date(date));
      try {
        // grn Products
        const grnProducts = await Grn.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: { $ne: "Deleted" },
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("grnProducts:", grnProducts.length);

        // Rtv Products
        const rtvProducts = await Rtv.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "Complete",
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("rtvProducts:", rtvProducts.length);
        // Sale Products
        const saleProducts = await Sale.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "complete",
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("saleProducts:", saleProducts.length);
        // salesReturn Products
        const salesReturnProducts = await Sale.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "complete",
            },
          },
          { $unwind: "$returnProducts" },
          {
            $group: {
              _id: "$returnProducts.article_code",
              qty: { $sum: { $toDecimal: "$returnProducts.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("salesReturnProducts:", salesReturnProducts.length);
        // damage Products
        const damageProducts = await Damage.aggregate([
          {
            $match: {
              createdAt: {
                $gte: start,
                $lte: end,
              },
              status: "active",
            },
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.article_code",
              qty: { $sum: { $toDecimal: "$products.qty" } },
            },
          },
          {
            $project: {
              _id: 0,
              article_code: "$_id",
              qty: 1,
            },
          },
        ]);
        console.log("damageProducts", damageProducts.length);

        console.log("Total Products:", products.length);

        // Previous Day Stock
        // TODO:: GET Previous Date
        console.log(start, end);

        // StockTimeSeries Get Previous Date Stock
        const openingStockProducts = await StockTimeSeries.aggregate([
          {
            $match: {
              date: {
                $gte: start,
                $lte: end,
              },
            },
          },
        ]);

        console.log("openingStockProducts", openingStockProducts.length);

        // INIT Product Movement
        let productsMovement = [];
        let i = 0;

        // Loop Products
        products.forEach(async (product) => {
          if (product.article_code === article_code) {
            const grnMatched = grnProducts.find(
              (grn) => grn.article_code === product.article_code
            );
            const rtvMatched = rtvProducts.find(
              (rtv) => rtv.article_code === product.article_code
            );
            const saleMatched = saleProducts.find(
              (sale) => sale.article_code === product.article_code
            );
            const salesReturnMatched = salesReturnProducts.find(
              (salesReturn) => salesReturn.article_code === product.article_code
            );
            const damageMatched = damageProducts.find(
              (damage) => damage.article_code === product.article_code
            );
            // const adjustMatched = adjustProducts.find(
            //   (adjust) => adjust.article_code === product.article_code
            // );
            const openingStockMatched = openingStockProducts.find(
              (stock) => stock.article_code === product.article_code
            );

            // console.log("productData", productData);
            productData = [
              ...productData,
              {
                date: formatDate(start),
                article_code: product.article_code,
                name: product.name,
                openingStock: openingStockMatched
                  ? parseFloat(openingStockMatched.openingStock)
                  : 0,
                grn: grnMatched ? parseFloat(grnMatched.qty) : 0,
                salesReturn: salesReturnMatched
                  ? parseFloat(salesReturnMatched.qty)
                  : 0,
                sale: saleMatched ? parseFloat(saleMatched.qty) : 0,
                rtv: rtvMatched ? parseFloat(rtvMatched.qty) : 0,
                damage: damageMatched ? parseFloat(damageMatched.qty) : 0,
                closingStock:
                  (openingStockMatched
                    ? parseFloat(openingStockMatched.openingStock)
                    : 0) +
                  // parseFloat(adjustQty) +
                  (grnMatched ? parseFloat(grnMatched.qty) : 0) +
                  (salesReturnMatched
                    ? parseFloat(salesReturnMatched.qty)
                    : 0) -
                  ((rtvMatched ? parseFloat(rtvMatched.qty) : 0) +
                    (saleMatched ? parseFloat(saleMatched.qty) : 0) +
                    // parseFloat(otherAdjustQty) +
                    (damageMatched ? parseFloat(damageMatched.qty) : 0)),
              },
            ];
          }
        });

        return productsMovement;
      } catch (error) {
        console.log(error);
      }
    };

    let stockData = [];

    const products = await Product.find({}).select({
      article_code: 1,
      name: 1,
    });
    // TODO::LOOP Data
    if (products.length > 0) {
      while (currentDate <= endDateLoop) {
        let tomorrow = addDays(currentDate, 1);
        // console.log();
        dateRange = [...dateRange, formatDate(currentDate)];

        console.log("Products:", products.length);
        const data = await getByDate(currentDate, tomorrow, products);

        console.log(
          "######################### /n",
          formatDate(currentDate),
          " /n #########################"
        );

        stockData = [...stockData, { Date: currentDate, Qty: data }];
        // console.log(currentDate, storeStock.length);
        currentDate = addDays(currentDate, 1);
      }
    }

    const csvWriter = createCsvWriter({
      path: `${article_code}.csv`, // Output file path
      header: [
        { id: "date", title: "Date" },
        { id: "article_code", title: "Code" },
        { id: "name", title: "Name" },
        { id: "openingStock", title: "openingStock" },
        { id: "grn", title: "GRN" },
        { id: "salesReturn", title: "salesReturn" },
        { id: "sale", title: "sale" },
        { id: "rtv", title: "rtv" },
        { id: "damage", title: "damage" },
        { id: "closingStock", title: "closingStock" },
      ],
    });

    console.log("productData", productData.length);
    csvWriter
      .writeRecords(productData) // Returns a promise
      .then(() => {
        console.log("CSV file was written successfully");
      })
      .catch((err) => {
        console.error("Error writing CSV file", err);
      });
    console.log(dateRange);
    // res.status(200).json({ dateRange });
    res.status(200).json({ startDate, endDate, dateRange, productData });
  })
);

module.exports = inventoryRouter;
