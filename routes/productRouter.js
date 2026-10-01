/**
 * PRODUCTS API
 * 1. get all product "/"
 * 1.1. get product by category
 * 2. get product by id "/:id"
 * 3. get product by article code "/code/:code"
 * 4. get product by ean "/ean/:ean"
 * 5. create one "/"
 * 6. create many "/all"
 * 7. updateOne "/:id"
 * 8. delete one "/:id"
 * Only I know what I have done for this
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const Sale = require("../models/saleModel");
const Inventory = require("../models/inventoryModel");
const { startOfDay, endOfDay } = require("date-fns");
const { createStockLedgerEntry } = require("../utility/stockLedgerHelper");
const path = require("path");
const mongoose = require("mongoose");
const {
  updateSupplierProducts,
} = require("../middlewares/supplierProductRemove");
const Supplier = require("../models/supplierModel");
const Brand = require("../models/brandModel");
const Generic = require("../models/genericModel");
const Damage = require("../models/damageModel");
const Rtv = require("../models/rtvModel");
const Grn = require("../models/grnModel");
const MongoClient = require("mongodb").MongoClient;



// Here I have used this route to set it within the AamarID product.
// router.get(
//   "/updateAamarId",
//   expressAsyncHandler(async (req, res) => {
//     const aamarId = "50599";

//     try {
//       const result = await Product.updateMany({
//         $set: { aamarId: aamarId },
//       });
//       res
//         .status(200)
//         .json({ message: " aamarId updated successfully", result });
//     } catch (error) {
//       // If an error occurs, handle it and send an error response
//       res
//         .status(500)
//         .send({ message: "Error fetching ", error: error.message });
//     }
//   })
// );



// COUNT PRODUCT
router.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    // console.log("Received aamarId:", aamarId);

    try {
      const total = await Product.countDocuments({ aamarId: aamarId });
      res.status(200).json(total);
      // console.log("Total products:", total);
    } catch (error) {
      res.status(500).json({ message: "Error fetching count", error });
    }
  })
);

// PRODUCT LIST
router.get(
  "/productlist/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId || "";

    try {
      // Initialize query
      let query = {
        aamarId,
      };
      const products = await Product.find(query)
        .select({
          name: 1,
          article_code: 1,
          unit: 1,
          generic: 1,
          group: 1,
          mrp: 1,
          tp: 1,
        })
        .populate("group", "name")
        .populate("generic", "name")
        .exec();

      res.status(200).json({ products });
    } catch {
      res.status(500).json("Server side error");
    }
  })
);

router.get(
  "/pledger",
  expressAsyncHandler(async (req, res) => {
    const uri = `mongodb+srv://techsoulincbd:d3VklaC25bQS0tSs@cluster0.zgc27tw.mongodb.net/pharmacyDB?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    getAll().catch(console.error);
    async function getAll() {
      try {
        // Connect to the MongoDB Atlas cluster
        await client.connect();
        // console.log('Connected to MongoDB Atlas');

        // Access the database and collection
        const db = client.db("pharmacyDB");
        const productLedgerCollection = db.collection("productLedger");

        // Query data from customer_sales collection
        const query = {};
        const documents = await productLedgerCollection.find(query).toArray();
        // Print the retrieved documents
        // console.log('Retrieved documents:', documents);
        res.send(documents);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        // Close the connection
        await client.close();
      }
    }
  })
);
// last PRODUCT
router.get(
  "/last",
  expressAsyncHandler(async (req, res) => {
    const total = await Product.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
      { $project: { article_code: 1 } },
    ]);
    res.status(200).json(total);
  })
);
router.get(
  "/export/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const products = await Product.find({ aamarId: aamarId })
      .select({
        _id: 1,
        name: 1,
        article_code: 1,
        // unit: 1,
        group: 1,
        generic: 1,
        brand: 1,
        tp: 1,
        mrp: 1,
        pcsBox: 1,
      })
      .populate("group", { name: 1 })
      .populate("generic", { name: 1 })
      .populate("brand", { name: 1 });

    res.status(200).json(products);
  })
);
// GET PRODUCT DETAILS FOR PURCHASE PRODUCT IMPORT
router.get(
  "/article/:code",
  expressAsyncHandler(async (req, res) => {
    const code = req.params.code;
    const products = await Product.findOne({ article_code: code })
      .select({
        _id: 1,
        name: 1,
        unit: 1,
        article_code: 1,
        generic: 1,
        group: 1,
        brand: 1,
        tp: 1,
        mrp: 1,
      })
      .populate("group", { _id: 1, name: 1 })
      .populate("generic", { _id: 1, name: 1 })
      .populate("brand", { _id: 1, name: 1 })
      .populate("unit", { _id: 1, name: 1 });
    res.send(products);
  })
);
// GET PRODUCT DETAILS FOR PURCHASE PRODUCT IMPORT
router.get(
  "/pro-details/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;

    try {
      const productDetails = await Product.aggregate([
        { $match: { article_code: id } },
        { $limit: 1 }, // Assuming article_code is unique and you want only one product
        {
          $lookup: {
            from: Inventory.collection.name,
            localField: "article_code",
            foreignField: "article_code",
            as: "inventory",
          },
        },
        {
          $addFields: {
            brandObjId: { $convert: { input: "$brand", to: "objectId", onError: null, onNull: null } },
            genericObjId: { $convert: { input: "$generic", to: "objectId", onError: null, onNull: null } },
            groupObjId: { $convert: { input: "$group", to: "objectId", onError: null, onNull: null } }
          }
        },
        {
          $lookup: {
            from: "groups", // Replace with actual name of the group collection
            localField: "groupObjId",
            foreignField: "_id",
            as: "groupDetails",
          },
        },
        {
          $unwind: { path: "$groupDetails", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brandObjId",
            foreignField: "_id",
            as: "brandDetails",
          },
        },
        {
          $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "generics",
            localField: "genericObjId",
            foreignField: "_id",
            as: "genericDetails",
          },
        },
        {
          $unwind: { path: "$genericDetails", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            name: 1,
            article_code: 1,
            tp: 1,
            mrp: 1,
            group: "$groupDetails",
            brand: "$brandDetails",
            generic: "$genericDetails",
            currentStock: { $sum: "$inventory.currentQty" }, // Sum up currentQty from inventory
          },
        },
      ]);

      res.send(productDetails[0] || "Product not found");
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  })
);

//product details
router.get(
  "/details/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "inventories", // Collection name for Inventory
          localField: "article_code",
          foreignField: "article_code", // Assuming inventory has a product_id field
          as: "inventoryDetails",
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "article_code",
          foreignField: "products.article_code",
          as: "supplierDetails",
        },
      },
      {
        $unwind: { path: "$supplierDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          closingStock: { $sum: "$inventoryDetails.currentQty" },
          supplierCompany: "$supplierDetails.name",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          unit: 1,
          article_code: 1,
          photo: 1,
          alert_qty: 1,
          tp: 1,
          mrp: 1,
          profit: 1,
          minQty: 1,
          maxQty: 1,
          size: 1,
          vat: 1,
          pcsBox: 1,
          discount: 1,
          inventory: 1,
          group: 1,
          generic: 1,
          brand: 1,
          closingStock: 1, // Include the calculated closing stock in the output
          supplierDetails: 1,
          supplierCompany: 1,
        },
      },
      {
        $lookup: {
          from: "groups", // Assuming groups is the collection name for group references
          localField: "group",
          foreignField: "_id",
          as: "groupDetails",
        },
      },
      {
        $unwind: {
          path: "$groupDetails",
          preserveNullAndEmptyArrays: true, // To handle cases where there's no matching group
        },
      },
      {
        $addFields: {
          "group._id": "$groupDetails._id",
          "group.name": "$groupDetails.name",
        },
      },
      {
        $project: {
          groupDetails: 0, // Remove the groupDetails array from the final output
        },
      },
    ]);

    res.send(products[0]);
  })
);
//product details
router.get(
  "/details/inventory/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "article_code", // Convert to ObjectId
          foreignField: "article_code",
          as: "inventory",
        },
      },
      {
        $unwind: "$inventory",
      },
    ]);
    res.send(products);
  })
);
router.get(
  "/generic/inventory/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId;
    const products = await Product.aggregate([
      {
        $match: { generic: mongoose.Types.ObjectId(id), aamarId: aamarId },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "article_code", // Convert to ObjectId
          foreignField: "article_code",
          as: "inventory",
        },
      },
      {
        $unwind: "$inventory",
      },
      {
        $lookup: {
          from: "groups",
          localField: "group", // Convert to ObjectId
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $unwind: "$group",
      },
    ]);
    res.send(products);
  })
);

// GET PRODUCT PRICE
router.get(
  "/price/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.find({ _id: id }).select({
      _id: 1,
      priceList: 1,
    });
    res.status(200).json(products[0]);
  })
);

// GET ALL PRODUCTS WITH PAGENATION & SEARCH
router.get(
  "/all/:page/:size/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page) || 0;
    const size = parseInt(req.params.size) || 10;
    const aamarId = req.params.aamarId?.trim(); // Ensure it's trimmed
    const queryString = req.query.q?.trim().toLowerCase();

    // Check if aamarId exists and log it for debugging
    if (!aamarId) {
      return res.status(400).json({ message: "aamarId is required" });
    }

    const skip = size * page;
    let query = { aamarId }; // Initial query object with aamarId
    const aggregatePipeline = [];

    if (queryString) {
      const escapeRegExp = (string) =>
        string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedQueryString = escapeRegExp(queryString);

      // Pre-fetch matching IDs for related collections (brand, generic, supplier)
      const brandMatches = await Brand.find({
        aamarId,
        name: { $regex: new RegExp(escapedQueryString, "i") }
      }).distinct("_id");

      const genericMatches = await Generic.find({
        aamarId,
        name: { $regex: new RegExp(escapedQueryString, "i") }
      }).distinct("_id");

      const supplierMatches = await Supplier.find({
        aamarId,
        $or: [
          { name: { $regex: new RegExp(escapedQueryString, "i") } },
          { company: { $regex: new RegExp(escapedQueryString, "i") } }
        ]
      }).distinct("products.article_code");

      query = {
        aamarId,
        $or: [
          { name: { $regex: new RegExp(escapedQueryString, "i") } },
          { article_code: { $regex: new RegExp(escapedQueryString, "i") } },
          { ean: { $regex: new RegExp(escapedQueryString, "i") } },
          { brand: { $in: brandMatches } },
          { generic: { $in: genericMatches } },
          { article_code: { $in: supplierMatches } }
        ]
      };

      aggregatePipeline.push({ $match: query });

      // Add relevance score calculation based on 11-tier priority ranking
      aggregatePipeline.push({
        $addFields: {
          relevanceScore: {
            $switch: {
              branches: [
                // Priority 1: Exact Product Name Match
                {
                  case: { $eq: [{ $toLower: { $ifNull: ["$name", ""] } }, queryString] },
                  then: 100
                },
                // Priority 2: Product Name Starts With Search Text
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$name", ""] },
                      regex: `^${escapedQueryString}`,
                      options: "i"
                    }
                  },
                  then: 90
                },
                // Priority 3: Product Name Contains Search Text
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$name", ""] },
                      regex: escapedQueryString,
                      options: "i"
                    }
                  },
                  then: 80
                },
                // Priority 4: Exact Article Code Match
                {
                  case: { $eq: [{ $toLower: { $ifNull: ["$article_code", ""] } }, queryString] },
                  then: 70
                },
                // Priority 5: Article Code Starts With Search Text
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$article_code", ""] },
                      regex: `^${escapedQueryString}`,
                      options: "i"
                    }
                  },
                  then: 60
                },
                // Priority 6: Exact Barcode (EAN) Match
                {
                  case: { $eq: [{ $toLower: { $ifNull: ["$ean", ""] } }, queryString] },
                  then: 50
                },
                // Priority 7: Barcode Starts With Search Text
                {
                  case: {
                    $regexMatch: {
                      input: { $ifNull: ["$ean", ""] },
                      regex: `^${escapedQueryString}`,
                      options: "i"
                    }
                  },
                  then: 40
                },
                // Priority 8: Brand Match
                {
                  case: { $in: ["$brand", brandMatches] },
                  then: 30
                },
                // Priority 9: Generic Match
                {
                  case: { $in: ["$generic", genericMatches] },
                  then: 20
                },
                // Priority 10: Supplier Match
                {
                  case: { $in: ["$article_code", supplierMatches] },
                  then: 10
                }
              ],
              default: 1 // Priority 11: Other Partial Matches
            }
          }
        }
      });

      // Sort by relevance score descending, then product name ascending
      aggregatePipeline.push({ $sort: { relevanceScore: -1, name: 1 } });
    } else {
      aggregatePipeline.push({ $match: query });
    }

    // Common lookups and pagination
    aggregatePipeline.push(
      {
        $lookup: {
          from: "inventories",
          let: { articleCode: "$article_code" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$article_code", "$$articleCode"] } },
            },
            { $limit: 1 },
          ],
          as: "inventory",
        },
      },
      { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          genericObjId: { $convert: { input: "$generic", to: "objectId", onError: null, onNull: null } },
          groupObjId: { $convert: { input: "$group", to: "objectId", onError: null, onNull: null } }
        }
      },
      {
        $lookup: {
          from: "generics",
          localField: "genericObjId",
          foreignField: "_id",
          as: "generic",
        },
      },
      { $unwind: { path: "$generic", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "groups",
          localField: "groupObjId",
          foreignField: "_id",
          as: "group",
        },
      },
      { $unwind: { path: "$group", preserveNullAndEmptyArrays: true } },
      { $skip: skip },
      { $limit: size }
    );

    try {
      const product = await Product.aggregate(aggregatePipeline);
      res.status(200).json(product);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  })
);

// router.get(
//   "/all/:page/:size",
//   expressAsyncHandler(async (req, res) => {
//     const page = parseInt(req.params.page);
//     const size = parseInt(req.params.size);
//     const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
//     const currentPage = parseInt(page) + 0;
//     const skip = size * page
//     let query = {};
//     let product = [];
//     // const size = parseInt(req.query.size);
//     console.log("page:", currentPage, "size:", size, "search:", queryString);
//     console.log(typeof queryString);

//     //check if search or the pagenation

//     if (queryString) {
//       console.log("== query");

//       console.log("search:", query);
//       // search check if num or string
//       const isNumber = /^\d/.test(queryString);
//       console.log("isNumber", isNumber);
//       if (!isNumber) {
//         // if text then search name
//         const escapeRegExp = (string) => {
//           return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//         };
//         const escapedQueryString = escapeRegExp(queryString);
//         query = {
//           // name: { $regex: new RegExp(".*" + queryString + ".*?", "i") },
//           // name: { $regex: new RegExp(queryString, "i") },
//           // name: { $regex: new RegExp(`\\b${queryString}\\b`, "i") },
//           // name: { $regex: new RegExp(`.*${queryString}.*`, "i") },
//           name: { $regex: new RegExp(`.*${escapedQueryString}.*`, "i") },
//         };
//         // query = { name:  queryString  };
//       } else {
//         // if number search in ean and article code
//         query = {
//           article_code: {
//             $regex: RegExp("^" + queryString + ".*", "i"),
//           },
//         };
//       }
//       console.log(query);

//       // product = await Product.find(query)
//       //   .select({
//       //     _id: 1,
//       //     name: 1,
//       //     unit: 1,
//       //     article_code: 1,
//       //     photo: 1,
//       //     tp: 1,
//       //     mrp: 1,
//       //     size: 1,
//       //     generic: 1
//       //   })
//       //   .populate("generic", "name")
//       //   .limit(100);
//       product = await Product.aggregate([
//         {
//           $match: query,
//         },
//         {
//           $lookup: {
//             from: "inventories",
//             localField: "article_code", // Convert to ObjectId
//             foreignField: "article_code",
//             as: "inventory",
//           },
//         },
//         {
//           $unwind: "$inventory"
//         },
//         {
//           $lookup: {
//             from: "generics",
//             localField: "generic", // Convert to ObjectId
//             foreignField: "_id",
//             as: "generic",
//           },
//         },
//         {
//           $unwind: "$generic"
//         },
//         {
//           $limit: 100
//         },
//       ])
//       res.status(200).json(product);
//     } else {
//       console.log("no query");

//       // regular pagination
//       query = {};

//       // product = await Product.find(query)
//       //   .select({
//       //     _id: 1,
//       //     name: 1,
//       //     unit: 1,
//       //     article_code: 1,
//       //     photo: 1,
//       //     tp: 1,
//       //     mrp: 1,
//       //     size: 1,
//       //     generic: 1
//       //   })
//       //   .populate("generic", "name")
//       //   .limit(size)
//       //   .skip(size * page);
//       product = await Product.aggregate([

//         {
//           $lookup: {
//             from: "inventories",
//             localField: "article_code", // Convert to ObjectId
//             foreignField: "article_code",
//             as: "inventory",
//           },
//         },
//         {
//           $unwind: "$inventory"
//         },
//         {
//           $lookup: {
//             from: "generics",
//             localField: "generic", // Convert to ObjectId
//             foreignField: "_id",
//             as: "generic",
//           },
//         },
//         {
//           $unwind: "$generic"
//         },
//         {
//           $limit: 100
//         },
//         {
//           $skip: skip
//         }
//       ])
//       console.log("done:", query);
//       console.log("product:", product);
//       res.status(200).json(product);
//     }
//   })
// );
router.get(
  "/allnew/:page/:size",
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
      // console.log("isNumber", isNumber);
      if (!isNumber) {
        // if text then search name
        const escapeRegExp = (string) => {
          return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        };
        const escapedQueryString = escapeRegExp(queryString);
        query = {
          // name: { $regex: new RegExp(".*" + queryString + ".*?", "i") },
          // name: { $regex: new RegExp(queryString, "i") },
          // name: { $regex: new RegExp(`\\b${queryString}\\b`, "i") },
          // name: { $regex: new RegExp(`.*${queryString}.*`, "i") },
          name: { $regex: new RegExp(`.*${escapedQueryString}.*`, "i") },
        };
        // query = { name:  queryString  };
      } else {
        // if number search in ean and article code
        query = {
          article_code: {
            $regex: RegExp("^" + queryString + ".*", "i"),
          },
        };
      }
      // console.log(query);

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          unit: 1,
          article_code: 1,
          photo: 1,
          tp: 1,
          mrp: 1,
          size: 1,
          generic: 1,
        })
        .populate("generic", "name")
        .limit(100);
      res.status(200).json(product);
    } else {
      // console.log("no query");

      // regular pagination
      query = {};

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          unit: 1,
          article_code: 1,
          photo: 1,
          tp: 1,
          mrp: 1,
          size: 1,
          generic: 1,
        })
        .populate("generic", "name")
        .limit(size)
        .skip(size * page);
      res.status(200).json(product);
      // console.log("done:", query);
    }
  })
);

// GET ALL PRODUCTS UPDATED
router.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    try {
      const products = await Product.find({})
        .select({
          name: 1,
          ean: 1,
          article_code: 1,
          tp: 1,
          mrp: 1,
        })
        .populate("priceList");

      res.send(products);
    } catch {
      res.status(500).json("Server side error");
    }
  })
);

// PRODUCTS SRARCH
router.get(
  "/search/inventory/:q",
  expressAsyncHandler(async (req, res) => {
    // let payload = req.query?.q?.trim().toString().toLocaleLowerCase();
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();
    // console.log(payload);

    const isNumber = /^\d/.test(payload);
    let query = {};
    if (!isNumber) {
      query = { name: { $regex: new RegExp("\\b" + payload + ".*?", "i") } };
    } else {
      query = {
        $or: [
          { article_code: { $regex: new RegExp("^" + payload + ".*", "i") } },
        ],
      };
    }

    const search = await Product.find(query)
      // TODO:: UPDATE AGREEGET FOR GET STOCK VALUE
      .select({
        _id: 1,
        name: 1,
        unit: 1,
        vat: 1,
        article_code: 1,
        tp: 1,
        mrp: 1,
        group: 1,
        discount: 1,
        generic: 1,
        brand: 1,
        size: 1,
        pcsBox: 1,
      })
      .populate("unit", "name")
      .populate("group", "name")
      .populate("generic", "name")
      .populate("brand", "name")
      .limit(10);
    if (payload === "") {
      res.send([]);
    } else {
      res.send(search);
    }
  })
);
// PRODUCTS SRARCH
router.get(
  "/search/new/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId || "";
    // let payload = req.query?.q?.trim().toString().toLocaleLowerCase();
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();
    // console.log(payload);
    const isNumber = /^\d/.test(payload);
    let query = { aamarId: aamarId };
    if (!payload || payload === "undefined" || payload === "null" || payload === "all") {
      try {
        const searchResults = await Product.find({ aamarId })
          .select("_id name unit generic vat article_code tp mrp group discount brand size pcsBox")
          .populate("unit", "name")
          .populate("group", "name")
          .populate("generic", "name")
          .populate("brand", "name")
          .limit(10);
        return res.status(200).json(searchResults);
      } catch (error) {
        return res.status(500).json({ message: "Error fetching default products" });
      }
    }

    if (!isNumber) {
      query = {
        aamarId,
        name: { $regex: new RegExp("\\b" + payload + ".*?", "i") },
      };
    } else {
      query = {
        aamarId,
        $or: [
          { article_code: { $regex: new RegExp("^" + payload + ".*", "i") } },
        ],
      };
    }

    const search = await Product.find(query)
      // TODO:: UPDATE AGREEGET FOR GET STOCK VALUE
      .select({
        _id: 1,
        name: 1,
        unit: 1,
        generic: 1,
        vat: 1,
        article_code: 1,
        tp: 1,
        mrp: 1,
        group: 1,
        discount: 1,
        brand: 1,
        size: 1,
        pcsBox: 1,
      })
      .populate("unit", "name")
      .populate("group", "name")
      .populate("generic", "name")
      .populate("brand", "name")
      .limit(10);
    
    res.send(search);
  })
);
router.get(
  "/search/nnew/test/:q",
  expressAsyncHandler(async (req, res) => {
    // let payload = req.query?.q?.trim().toString().toLocaleLowerCase();
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();
    // console.log(payload);

    const isNumber = /^\d/.test(payload);
    let query = {};
    if (!isNumber) {
      query = { name: { $regex: new RegExp("\\b" + payload + ".*?", "i") } };
    } else {
      query = {
        $or: [
          { article_code: { $regex: new RegExp("^" + payload + ".*", "i") } },
        ],
      };
    }

    // const search = await Product.find(query)
    //   // TODO:: UPDATE AGREEGET FOR GET STOCK VALUE
    //   .select({
    //     _id: 1,
    //     name: 1,
    //     unit: 1,
    //     vat: 1,
    //     article_code: 1,
    //     tp: 1,
    //     mrp: 1,
    //     discount: 1,
    //     group: 1,
    //     brand: 1,
    //     size: 1,
    //     pcsBox: 1,
    //   })
    //   .populate("brand", "name")
    //   .populate("unit", "symbol")
    //   .populate("group", "name")
    //   .limit(10);
    // if (payload === "") {
    //   res.send([]);
    // } else {
    //   res.send(search);
    // }

    const search = await Product.aggregate([
      {
        $match: query,
      },
      {
        $project: {
          _id: 1,
          name: 1,
          unit: { $arrayElemAt: ["$unit.symbol", 0] },
          vat: 1,
          article_code: 1,
          tp: 1,
          mrp: 1,
          discount: 1,
          group: 1,
          brand: 1,
          size: 1,
          pcsBox: 1,
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "group",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $addFields: {
          nameLength: { $strLenCP: "$name" },
        },
      },
      {
        $sort: {
          nameLength: 1, // -1 for descending, 1 for ascending
        },
      },
      {
        $limit: 10,
      },
    ]);
    if (payload === "") {
      res.send([]);
    } else {
      res.send(search);
    }
  })
);

router.get(
  "/search/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId || "";
    const payload = req.params?.q?.toString().toLocaleLowerCase();
    // console.log("payload", payload);

    const isNumber = /^\d/.test(payload);

    // Ensure query always includes aamarId
    let query = { aamarId: aamarId };

    if (payload !== "") {
      if (!isNumber) {
        // Add name-based search while preserving aamarId and warehouse conditions
        query.name = { $regex: new RegExp(payload, "i") };
      } else {
        // Add article_code-based search while preserving aamarId and warehouse conditions
        query.$or = [{ article_code: { $regex: new RegExp(payload, "i") } }];
      }
    }

    // console.log("Query", query);

    const search = await Product.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "group",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "article_code",
          foreignField: "article_code",
          as: "inventory",
        },
      },
      {
        $project: {
          name: 1,
          unit: { $arrayElemAt: ["$unit.symbol", 0] },
          vat: 1,
          article_code: 1,
          tp: 1,
          mrp: 1,
          discount: 1,
          group: 1,
          brand: 1,
          size: 1,
          pcsBox: 1,
          inventory: 1,
          stock: {
            $cond: {
              if: { $gt: [{ $size: "$inventory" }, 0] },
              then: { $arrayElemAt: ["$inventory.currentQty", 0] },
              else: 0,
            },
          },
        },
      },
      {
        $addFields: {
          nameLength: { $strLenCP: "$name" },
        },
      },
      {
        $sort: {
          nameLength: 1,
        },
      },
      {
        $limit: 10,
      },
    ]);

    // console.log("Search field", search);

    res.send(payload === "" ? [] : search);
  })
);

router.get(
  "/search/pos/:aamarId/:warehouse/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const payload = req.params?.q?.trim()?.toLowerCase() || "";
    const warehouseId = req.params.warehouse;

    if (!aamarId) {
      return res.status(400).json({ msg: "aamarId is required" });
    }

    try {
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tokens = payload.split(/\s+/).filter((t) => t.length > 0);
      
      if (tokens.length === 0) return res.status(200).json([]);

      // 1. Pre-fetch matching IDs to avoid massive joins
      const searchTerms = [escapeRegExp(payload)];
      if (tokens.length > 1) {
        searchTerms.push(escapeRegExp(tokens[0]));
      }
      const searchRegex = new RegExp(searchTerms.join("|"), "i");

      const brandMatches = await Brand.find({ 
        aamarId, 
        name: searchRegex
      }).distinct("_id");

      const genericMatches = await Generic.find({ 
        aamarId, 
        name: searchRegex
      }).distinct("_id");

      const supplierMatches = await Supplier.find({
        aamarId,
        $or: [
          { name: searchRegex },
          { company: searchRegex }
        ]
      }).distinct("products.article_code");

      const tokenRegexes = tokens.map(t => new RegExp(escapeRegExp(t), "i"));

      // Match condition:
      // Single token: search across name, article_code, ean, brand, generic, supplier
      // Multi-token (e.g. "napa 500"):
      //   1. Products matching ALL tokens across searchable fields, OR
      //   2. Products matching the primary token (tokens[0]) in name or brand (e.g. "napa" products like Napa 100)
      let matchCondition;
      if (tokens.length === 1) {
        matchCondition = {
          aamarId: aamarId,
          $or: [
            { name: { $regex: tokenRegexes[0] } },
            { article_code: { $regex: tokenRegexes[0] } },
            { ean: { $regex: tokenRegexes[0] } },
            { brand: { $in: brandMatches } },
            { generic: { $in: genericMatches } },
            { article_code: { $in: supplierMatches } }
          ],
        };
      } else {
        const allTokensCondition = {
          $and: tokenRegexes.map((regex) => ({
            $or: [
              { name: { $regex: regex } },
              { article_code: { $regex: regex } },
              { ean: { $regex: regex } },
              { brand: { $in: brandMatches } },
              { generic: { $in: genericMatches } },
              { article_code: { $in: supplierMatches } }
            ],
          }))
        };

        const primaryTokenCondition = {
          $or: [
            { name: { $regex: tokenRegexes[0] } },
            { brand: { $in: brandMatches } }
          ]
        };

        matchCondition = {
          aamarId: aamarId,
          $or: [
            allTokensCondition,
            primaryTokenCondition
          ]
        };
      }

      // Relevance score branches:
      let scoreBranches = [];
      if (tokens.length > 1) {
        scoreBranches = [
          // 1. Exact full name match (e.g. name is exactly "napa 500")
          {
            case: { $eq: [{ $toLower: { $ifNull: ["$name", ""] } }, payload] },
            then: 150
          },
          // 2. Product name starts with full search text (e.g. "^napa 500")
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: `^${escapeRegExp(payload)}`,
                options: "i"
              }
            },
            then: 140
          },
          // 3. Product name starts with primary token AND contains ALL other tokens (e.g. "NAPA TAB 500MG", "NAPA RAPID 500MG")
          {
            case: {
              $and: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$name", ""] },
                    regex: `^${escapeRegExp(tokens[0])}`,
                    options: "i"
                  }
                },
                ...tokens.slice(1).map(t => ({
                  $regexMatch: {
                    input: { $ifNull: ["$name", ""] },
                    regex: escapeRegExp(t),
                    options: "i"
                  }
                }))
              ]
            },
            then: 120
          },
          // 4. Product name contains ALL tokens in any position (e.g. contains "napa" and contains "500")
          {
            case: {
              $and: tokens.map(t => ({
                $regexMatch: {
                  input: { $ifNull: ["$name", ""] },
                  regex: escapeRegExp(t),
                  options: "i"
                }
              }))
            },
            then: 100
          },
          // 5. Product name contains the contiguous payload
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: escapeRegExp(payload),
                options: "i"
              }
            },
            then: 90
          },
          // 6. Product name starts with primary token with word boundary (e.g. "^napa\b" like "NAPA TAB 100MG", "NAPA SYRUP 60ML")
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: `^${escapeRegExp(tokens[0])}\\b`,
                options: "i"
              }
            },
            then: 75
          },
          // 7. Product name starts with primary token prefix (e.g. "^napa")
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: `^${escapeRegExp(tokens[0])}`,
                options: "i"
              }
            },
            then: 70
          },
          // 8. Product name contains primary token as whole word
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: `\\b${escapeRegExp(tokens[0])}\\b`,
                options: "i"
              }
            },
            then: 50
          },
          // 9. Product name contains primary token anywhere
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: escapeRegExp(tokens[0]),
                options: "i"
              }
            },
            then: 40
          },
          // 10. Article code or EAN matches payload
          {
            case: {
              $or: [
                { $regexMatch: { input: { $ifNull: ["$article_code", ""] }, regex: `^${escapeRegExp(payload)}`, options: "i" } },
                { $regexMatch: { input: { $ifNull: ["$ean", ""] }, regex: `^${escapeRegExp(payload)}`, options: "i" } }
              ]
            },
            then: 30
          },
          // 11. Brand match
          {
            case: { $in: ["$brand", brandMatches] },
            then: 20
          },
          // 12. Generic match
          {
            case: { $in: ["$generic", genericMatches] },
            then: 15
          },
          // 13. Supplier match
          {
            case: { $in: ["$article_code", supplierMatches] },
            then: 10
          }
        ];
      } else {
        // Single token search (e.g. "napa")
        scoreBranches = [
          // 1. Exact Product Name Match
          {
            case: { $eq: [{ $toLower: { $ifNull: ["$name", ""] } }, payload] },
            then: 150
          },
          // 2. Product Name Starts With Search Text with word boundary (e.g. "^napa\b")
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: `^${escapeRegExp(payload)}\\b`,
                options: "i"
              }
            },
            then: 130
          },
          // 3. Product Name Starts With Search Text prefix (e.g. "^napa")
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: `^${escapeRegExp(payload)}`,
                options: "i"
              }
            },
            then: 110
          },
          // 4. Product Name Contains Search Text as whole word (e.g. "\bnapa\b")
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: `\\b${escapeRegExp(payload)}\\b`,
                options: "i"
              }
            },
            then: 90
          },
          // 5. Product Name Contains Search Text anywhere
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$name", ""] },
                regex: escapeRegExp(payload),
                options: "i"
              }
            },
            then: 70
          },
          // 6. Exact Article Code Match
          {
            case: { $eq: [{ $toLower: { $ifNull: ["$article_code", ""] } }, payload] },
            then: 60
          },
          // 7. Article Code Starts With Search Text
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$article_code", ""] },
                regex: `^${escapeRegExp(payload)}`,
                options: "i"
              }
            },
            then: 50
          },
          // 8. Exact Barcode (EAN) Match
          {
            case: { $eq: [{ $toLower: { $ifNull: ["$ean", ""] } }, payload] },
            then: 45
          },
          // 9. Barcode Starts With Search Text
          {
            case: {
              $regexMatch: {
                input: { $ifNull: ["$ean", ""] },
                regex: `^${escapeRegExp(payload)}`,
                options: "i"
              }
            },
            then: 40
          },
          // 10. Brand Match
          {
            case: { $in: ["$brand", brandMatches] },
            then: 30
          },
          // 11. Generic Match
          {
            case: { $in: ["$generic", genericMatches] },
            then: 20
          },
          // 12. Supplier Match
          {
            case: { $in: ["$article_code", supplierMatches] },
            then: 10
          }
        ];
      }

      const aggregateQuery = [
        // 2. Filter Products by indexed fields and pre-fetched IDs
        {
          $match: matchCondition,
        },
        // 3. Add relevance score calculation based on priority ranking
        {
          $addFields: {
            relevanceScore: {
              $switch: {
                branches: scoreBranches,
                default: 1 // Priority: Other Partial Matches
              }
            }
          }
        },
        // Sort by relevance score descending, then product name ascending
        { $sort: { relevanceScore: -1, name: 1 } },
        // 4. Limit EARLY to 80 for better UI performance
        { $limit: 80 },
        // 4. Lookups only for the filtered results
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brandData",
          },
        },
        {
          $lookup: {
            from: "suppliers",
            let: { articleCode: "$article_code", aId: aamarId },
            pipeline: [
              { $match: { $expr: { $eq: ["$aamarId", "$$aId"] } } },
              { $unwind: "$products" },
              { $match: { $expr: { $eq: ["$products.article_code", "$$articleCode"] } } },
              { $project: { name: 1, company: 1, _id: 0 } }
            ],
            as: "supplierData",
          },
        },
        {
          $lookup: {
            from: "inventories",
            let: { 
              articleCode: "$article_code", 
              aId: aamarId, 
              whId: mongoose.isValidObjectId(warehouseId) ? mongoose.Types.ObjectId(warehouseId) : null 
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$article_code", "$$articleCode"] },
                      { $eq: ["$warehouse", "$$whId"] },
                      { $eq: ["$aamarId", "$$aId"] },
                    ],
                  },
                },
              },
            ],
            as: "inventoryDetails",
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "group",
            foreignField: "_id",
            as: "groupDetails",
          },
        },
        // 5. Final formatting
        {
          $addFields: {
            stock: {
              $ifNull: [
                { $arrayElemAt: ["$inventoryDetails.currentQty", 0] },
                0,
              ],
            },
            supplierObj: { $arrayElemAt: ["$supplierData", 0] }
          },
        },
        {
          $addFields: {
            supplierCompany: {
              $ifNull: ["$supplierObj.company", "$supplierObj.name", "N/A"],
            },
          }
        },
        {
          $project: {
            name: 1,
            article_code: 1,
            ean: 1,
            unit: 1,
            stock: 1,
            tp: 1,
            mrp: 1,
            size: 1,
            supplierCompany: 1,
            group: "$groupDetails",
          },
        },
      ];

      const searchResults = await Product.aggregate(aggregateQuery);
      return res.status(200).json(searchResults);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: "Server Error", error: err.message });
    }
  })
);


router.get(
  "/search/supplier/:aamarId/:q?",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const payload = req.params?.q?.trim()?.toLowerCase() || "";

    if (!aamarId) {
      return res.status(400).json({ msg: "aamarId is required" });
    }

    const isNumber = /^\d/.test(payload);

    const escapeRegExp = (string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedQueryString = escapeRegExp(payload);

    try {
      const query = {
        aamarId: aamarId,
        ...(payload
          ? isNumber
            ? { article_code: { $regex: new RegExp(payload, "i") } }
            : { name: { $regex: new RegExp(`.*${escapedQueryString}.*`, "i") } }
          : {}),
      };

      // const searchResults = await Product.aggregate([{ $match: query }]);
      const searchResults = await Product.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "groups",
            localField: "group",
            foreignField: "_id",
            as: "groupDetails",
          },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "article_code",
            foreignField: "article_code",
            as: "inventoryDetails",
          },
        },
        {
          $unwind: {
            path: "$groupDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            stock: { $sum: "$inventoryDetails.currentQty" },
            groupName: { $ifNull: ["$groupDetails.name", "N/A"] },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            article_code: 1,
            tp: 1,
            mrp: 1,
            priceList: 1,
            unit: 1,
            stock: 1,
            "group.name": "$groupName",
          },
        },
      ]);
      console.log(`searchResults for aamarId: ${aamarId}, query: ${payload}`, searchResults.length);
      return res.status(200).json(searchResults);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: "Server Error", error: err.message });
    }
  })
);

// //pos search query
// router.get(
//   "/search/supplier/:aamarId/:q",
//   expressAsyncHandler(async (req, res) => {
//     const aamarId = req.params.aamarId;
//     const payload = req.params?.q?.trim().toString().toLocaleLowerCase();

//     if (!aamarId) {
//       return res.status(400).json({ msg: "aamarId is required" });
//     }

//     const isNumber = /^\d/.test(payload);

//     const escapeRegExp = (string) => {
//       return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//     };
//     const escapedQueryString = escapeRegExp(payload);

//     const query = {
//       aamarId: aamarId, // Include aamarId in the query
//       ...(isNumber
//         ? { article_code: { $regex: new RegExp(payload, "i") } }
//         : { name: { $regex: new RegExp(`.*${escapedQueryString}.*`, "i") } }),
//     };

//     try {
//       const search = await Product.aggregate([
//         { $match: query },
//         // Rest of your pipeline remains the same...
//       ]);

//       res.send(payload === "" ? [] : search);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ msg: "Server Error", error: err.message });
//     }
//   })
// );

router.get(
  "/search/supplier/new/:q",
  expressAsyncHandler(async (req, res) => {
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();
    const isNumber = /^\d/.test(payload);
    let query = {};

    if (!isNumber) {
      const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };
      const escapedQueryString = escapeRegExp(payload);
      query = {
        name: { $regex: new RegExp(`.*${escapedQueryString}.*`, "i") },
      };
    } else {
      query = {
        article_code: { $regex: new RegExp(payload, "i") },
      };
    }
    // console.log(query)
    const search = await Product.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      {
        $lookup: {
          from: "units",
          localField: "unit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "group",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "article_code",
          foreignField: "article_code",
          as: "inventory",
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "article_code",
          foreignField: "products.article_code",
          as: "supplier",
        },
      },
      {
        $project: {
          unit: { $arrayElemAt: ["$unit.symbol", 0] },
          vat: 1,
          article_code: 1,
          tp: 1,
          mrp: 1,
          discount: 1,
          group: 1,
          brand: 1,
          size: 1,
          pcsBox: 1,
          inventory: 1,
          stock: {
            $cond: {
              if: { $gt: [{ $size: "$inventory" }, 0] },
              then: { $arrayElemAt: ["$inventory.currentQty", 0] },
              else: 0,
            },
          },
          supplier: 1,
        },
      },
      {
        $unwind: {
          path: "$supplier",
          preserveNullAndEmptyArrays: true
        },
      },
      {
        $group: {
          _id: "$supplier._id",
          supplier: { $first: "$supplier" },
          products: { $push: "$$ROOT" },
          count: { $sum: 1 },
        },
      },
      {
        $match: { count: 1 },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              { supplier: "$supplier" },
              { product: { $arrayElemAt: ["$products", 0] } },
            ],
          },
        },
      },
      {
        $addFields: {
          stock: "$product.stock",
          nameLength: { $strLenCP: "$product.name" },
        },
      },
      {
        $sort: {
          nameLength: 1,
        },
      },
      {
        $limit: 10,
      },
    ]);

    if (payload === "") {
      res.send([]);
    } else {
      res.send(search);
    }
  })
);

// GET ONE PRODUCT
router.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.find({ _id: id });
    // .populate("priceList", "mrp")
    res.send(products[0]);
  })
);
router.get(
  "/select/inventory/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const product = await Product.findOne({ _id: id })
      .select({
        _id: 1,
        name: 1,
        unit: 1,
        vat: 1,
        article_code: 1,
        tp: 1,
        mrp: 1,
        discount: 1,
        brand: 1,
        group: 1,
        generic: 1,
        size: 1,
        pcsBox: 1,
      })
      .populate("brand", "name")
      .populate("group", "name")
      .populate("generic", "name");

    // .populate("priceList");
    res.send(product);
  })
);
router.get(
  "/select/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId;

    const query = {
      _id: id,
      aamarId,
    };

    const product = await Product.findOne(query)
      .select({
        _id: 1,
        name: 1,
        unit: 1,
        vat: 1,
        article_code: 1,
        tp: 1,
        generic: 1,
        mrp: 1,
        discount: 1,
        brand: 1,
        size: 1,
        pcsBox: 1,
      })
      .populate("brand", "name") // Corrected placement
      .populate("group", "name")
      .populate("unit", "name")

      .populate("generic", "name");

    res.send(product);
    // console.log("product", product);
  })
);

// GET ONE PRODUCT
// router.get(
//   "/details/:id",
//   expressAsyncHandler(async (req, res) => {
//     const id = req.params.id;
//     const product = await Product.findOne({ _id: id });
//     console.log("product", product)

//     res.send(product);
//   })
// );
// GET ONE PRODUCT
router.get(
  "/details/new/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    let search = [];

    // Find the product by ID
    const product = await Product.findOne({ _id: id });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Supplier Aggregation with aamarId
    const supplierP = await Supplier.aggregate([
      { $unwind: "$products" },
      {
        $match: {
          "products.article_code": product.article_code,
          // aamarId: aamarId,
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.article_code",
          foreignField: "article_code",
          as: "productDetails",
        },
      },
    ]);

    // If supplier details are found
    if (supplierP.length > 0) {
      search = await Supplier.aggregate([
        { $unwind: "$products" },
        {
          $match: {
            "products.article_code": product.article_code,
            // aamarId: aamarId,
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "products.article_code",
            foreignField: "article_code",
            as: "productDetails",
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "productDetails.group",
            foreignField: "_id",
            as: "group",
          },
        },
        {
          $lookup: {
            from: "generics",
            localField: "productDetails.generic",
            foreignField: "_id",
            as: "generic",
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "productDetails.brand",
            foreignField: "_id",
            as: "brand",
          },
        },
        {
          $lookup: {
            from: "units",
            localField: "productDetails.unit",
            foreignField: "_id",
            as: "unit",
          },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "products.article_code",
            foreignField: "article_code",
            as: "inventory",
          },
        },
        {
          $project: {
            _id: "$products.id",
            supplierId: "$_id",
            supplierCode: "$code",
            supplierCompany: "$company",
            supplierName: "$name",
            supplierEmail: "$email",
            supplierPhone: "$phone",
            supplierAddress: "$address",
            productId: "$products.id",
            article_code: "$products.article_code",
            name: "$products.name",
            productDetails: 1,
            group: 1,
            generic: 1,
            brand: 1,
            unit: { $arrayElemAt: ["$unit.symbol", 0] },
            tp: { $arrayElemAt: ["$productDetails.tp", 0] },
            mrp: { $arrayElemAt: ["$productDetails.mrp", 0] },
            priceList: { $arrayElemAt: ["$productDetails.priceList", 0] },
            pcsBox: { $arrayElemAt: ["$productDetails.pcsBox", 0] },
            size: { $arrayElemAt: ["$productDetails.size", 0] },
            stock: {
              $cond: {
                if: { $gt: [{ $size: "$inventory" }, 0] },
                then: { $arrayElemAt: ["$inventory.currentQty", 0] },
                else: 0,
              },
            },
            inventory: 1,
            // aamarId: aamarId, // Include aamarId in the output
          },
        },
      ]);
    } else {
      // Product Aggregation with aamarId
      search = await Product.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brand",
          },
        },
        {
          $lookup: {
            from: "units",
            localField: "unit",
            foreignField: "_id",
            as: "unit",
          },
        },
        {
          $lookup: {
            from: "groups",
            localField: "group",
            foreignField: "_id",
            as: "group",
          },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "article_code",
            foreignField: "article_code",
            as: "inventory",
          },
        },
        {
          $addFields: {
            nameLength: { $strLenCP: "$name" },
          },
        },
        {
          $sort: {
            nameLength: 1, // -1 for descending, 1 for ascending
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            unit: 1,
            vat: 1,
            article_code: 1,
            tp: 1,
            mrp: 1,
            priceList: 1,
            discount: 1,
            group: 1,
            brand: 1,
            size: 1,
            pcsBox: 1,
            inventory: 1,
            stock: {
              $cond: {
                if: { $gt: [{ $size: "$inventory" }, 0] },
                then: { $arrayElemAt: ["$inventory.currentQty", 0] },
                else: 0,
              },
            },
            supplierId: null,
            // aamarId: aamarId, // Include aamarId in the output
          },
        },
        {
          $limit: 10,
        },
      ]);
    }

    // Send the search result as a single object (if found) or null
    res.send(search.length > 0 ? search[0] : null);
  })
);

router.get(
  "/all-details/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(id) } },
      {
        $addFields: {
          groupObjId: { $convert: { input: "$group", to: "objectId", onError: null, onNull: null } },
          genericObjId: { $convert: { input: "$generic", to: "objectId", onError: null, onNull: null } },
          brandObjId: { $convert: { input: "$brand", to: "objectId", onError: null, onNull: null } }
        }
      },
      {
        $lookup: {
          from: "groups",
          localField: "groupObjId",
          foreignField: "_id",
          as: "group",
        },
      },
      { $unwind: { path: "$group", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "generics",
          localField: "genericObjId",
          foreignField: "_id",
          as: "generic",
        },
      },
      { $unwind: { path: "$generic", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "brands",
          localField: "brandObjId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "suppliers",
          localField: "article_code",
          foreignField: "products.article_code",
          as: "supplierDetails",
        },
      },
      {
        $unwind: { path: "$supplierDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          supplierCompany: "$supplierDetails.name",
        },
      },
    ]);
    res.send(products[0]);
  })
);

// GET ONE PRODUCT BY ARTICLE CODE
router.get(
  "/code/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.find({ article_code: id })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        vat: 1,
        unit: 1,
        article_code: 1,
        tp: 1,
      })
      .populate("priceList", { mrp: 1, tp: 1, _id: 0 });
    res.send(products[0]);
  })
);

// * Date wise product ledger
// * Product will be matched with grn, rtv,damage,sale ,adjustment

// router.get(
//   "/ledger/:start/:end",
//   expressAsyncHandler(async (req, res) => {

//     try {
//       const start = req.params.start
//         ? startOfDay(new Date(req.params.start))
//         : startOfDay(new Date.now());
//       const end = req.params.end
//         ? endOfDay(new Date(req.params.end))
//         : endOfDay(new Date.now());

//       console.log("start", start, "end", end)

//       const product = await Product.aggregate([
//         {
//           $lookup:
//           {
//             from: "inventories",
//             localField: "article_code",
//             foreignField: "article_code",
//             as: "products"
//           }
//         },
//         {
//           $unwind: '$products'
//         },

//         {
//           $limit: 10
//         }
//       ])

//       if (product.length > 0) {
//         res.send(product)
//       } else {
//         res.send([])
//       }
//     } catch (err) {
//       console.log("err", err)
//       res.send("err", err)
//     }

//   })
// );

// router.get(
//   "/ledger/:start/:end/:page/:size",
//   expressAsyncHandler(async (req, res) => {
//     try {
//       const start = req.params.start
//         ? startOfDay(new Date(req.params.start))
//         : startOfDay(new Date());
//       const end = req.params.end
//         ? endOfDay(new Date(req.params.end))
//         : endOfDay(new Date());
//       const page = parseInt(req.params.page);
//       const size = parseInt(req.params.size);
//       const currentPage = parseInt(page) + 0;
//       const skip = size * page;

//       const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
//       // console.log("queryString", queryString)

//       let product = [];

//       // console.log("start", start, "end", end)
//       if (queryString) {
//         // console.log("== query");

//         // search check if num or string
//         const isNumber = /^\d/.test(queryString);
//         // console.log("isNumber", isNumber);
//         if (!isNumber) {
//           const escapeRegExp = (string) => {
//             return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//           };
//           const escapedQueryString = escapeRegExp(queryString);
//           query = {
//             name: { $regex: new RegExp(`.*${escapedQueryString}.*`, "i") },
//           };
//         } else {
//           query = {
//             article_code: { $regex: new RegExp(queryString, "i") },
//           };
//         }
//         // console.log(query);

//         product = await Product.aggregate([
//           //!search product by name or article code
//           {
//             $match: query,
//           },
//           //! search product in inventory so that if the product is not present in inventory it will not come
//           {
//             $lookup: {
//               from: "inventories",
//               localField: "article_code",
//               foreignField: "article_code",
//               as: "products",
//             },
//           },
//           {
//             $unwind: "$products",
//           },
//           {
//             //? catch all the product in grn before start date
//             $lookup: {
//               from: "grns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         //ji
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 //? apply filter to get only those grn that has those that product
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 //? if the filtered product is found then bering only those grn
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "grnsPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "grns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   //? fetch those grns that will match between those dates
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         //ji
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   //?filter those grns that has that product
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 //? bring only the filtered grns that matched with product
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "grns",
//             },
//           },
//           {
//             $addFields: {
//               //? sum of grns product qty before start date
//               grnPQty: {
//                 $reduce: {
//                   input: "$grnsPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               //? bring all the tp value in array of grns product tp before start date
//               grnPTPArray: {
//                 $reduce: {
//                   input: "$grnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               //? bring all the mrp value in array of grns product tp before start date
//               grnPMRPArray: {
//                 $reduce: {
//                   input: "$grnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               //? sum of grns product qty between start date and end date
//               grnQty: {
//                 $reduce: {
//                   input: "$grns",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               grnTPArray: {
//                 //? bring all the tp value in array of grns product tp between start date and end date
//                 $reduce: {
//                   input: "$grns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               grnMRPArray: {
//                 //? bring all the mrp value in array of grns product mrp between start date and end date
//                 $reduce: {
//                   input: "$grns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               //?avg of previous grns tp array
//               grnPTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$grnPTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               grnPMRPAvg: {
//                 //?avg of previous grns mrp array
//                 $avg: {
//                   $filter: {
//                     input: "$grnPMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               //?avg of  grns tp array
//               grnTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$grnTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               //?avg of previous grns tp array
//               grnMRPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$grnMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             //?all the grns that has one product
//             $addFields: {
//               grnDetails: {
//                 $map: {
//                   input: "$grns",
//                   as: "grn",
//                   in: {
//                     grnNo: "$$grn.grnNo",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$grn.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$grn.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$grn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$grn.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$grn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$grn.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?grn end
//           //? rtv start
//           {
//             //? catch all the product in rtv before start date
//             $lookup: {
//               from: "rtvs",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   //? apply filter to get only those rtv that has those that product
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   //? if the filtered product is found then bering only those rtv
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "rtvs",
//             },
//           },
//           {
//             $lookup: {
//               from: "rtvs",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   //? fetch those rtv that will match between those dates
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   //?filter those rtv that has that product
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   //? bring only the filtered rtv that matched with product
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "rtvsPrevious",
//             },
//           },

//           {
//             $addFields: {
//               //? sum of rtv product qty before start date
//               rtvPQty: {
//                 $reduce: {
//                   input: "$rtvsPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               //? bring all the tp value in array of rtv product tp before start date
//               rtvPTPArray: {
//                 $reduce: {
//                   input: "$rtvsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               //? bring all the mrp value in array of rtv product tp before start date
//               rtvPMRPArray: {
//                 $reduce: {
//                   input: "$rtvsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               //? sum of rtv product qty between start date and end date
//               rtvQty: {
//                 $reduce: {
//                   input: "$rtvs",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               rtvTPArray: {
//                 //? bring all the tp value in array of rtv product tp between start date and end date
//                 $reduce: {
//                   input: "$rtvs",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               rtvMRPArray: {
//                 //? bring all the mrp value in array of rtv product mrp between start date and end date
//                 $reduce: {
//                   input: "$rtvs",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     rtvPTPAvg: {
//           // // ?avg of previous rtv tp array
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvPTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     rtvPMRPAvg: {
//           // // ?avg of previous rtv mrp array
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvPMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     rtvTPAvg: {
//           // // ?avg of  rtv tp array
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     rtvMRPAvg: {
//           // // ?avg of previous grns mrp array
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },

//           {
//             $addFields: {
//               rtvDetails: {
//                 //?all the rtv that has one product
//                 $map: {
//                   input: "$rtvs",
//                   as: "rtv",
//                   in: {
//                     rtvNo: "$$rtv.rtvNo",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$rtv.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$rtv.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$rtv.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$rtv.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$rtv.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$rtv.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?rtv end
//           //?damage start
//           {
//             $lookup: {
//               //? all the damagers before start date
//               from: "damages",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   //? filter those damages with products before start date
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 //? if products are matched only those damage before start date
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "damagesPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "damages",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "damages",
//             },
//           },

//           {
//             $addFields: {
//               damagePQty: {
//                 $reduce: {
//                   input: "$damagesPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damagePTPArray: {
//                 $reduce: {
//                   input: "$damagesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damagePMRPArray: {
//                 $reduce: {
//                   input: "$damagesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               damageQty: {
//                 $reduce: {
//                   input: "$damages",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damageTPArray: {
//                 $reduce: {
//                   input: "$damages",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damageMRPArray: {
//                 $reduce: {
//                   input: "$damages",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     damagePTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$damagePTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     damagePMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$damagePMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           {
//             $addFields: {
//               damageTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$damageTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               damageMRPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$damageMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               damageDetails: {
//                 $map: {
//                   input: "$damages",
//                   as: "damage",
//                   in: {
//                     damageNo: "$$damage.damageNo",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$damage.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$damage.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$damage.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$damage.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$damage.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$damage.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?damage end
//           //?sale start
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         // $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "salesPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         // $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$returnProducts",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "salesReturnPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$returnProducts",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "salesReturn",
//             },
//           },
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "sales",
//             },
//           },

//           {
//             $addFields: {
//               saleRQty: {
//                 $reduce: {
//                   input: "$salesReturn",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRTPArray: {
//                 $reduce: {
//                   input: "$salesReturn",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRMRPArray: {
//                 $reduce: {
//                   input: "$salesReturn",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               saleRPQty: {
//                 $reduce: {
//                   input: "$salesReturnPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRPTPArray: {
//                 $reduce: {
//                   input: "$salesReturnPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRPMRPArray: {
//                 $reduce: {
//                   input: "$salesReturnPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               salePQty: {
//                 $reduce: {
//                   input: "$salesPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               salePTPArray: {
//                 $reduce: {
//                   input: "$salesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               salePMRPArray: {
//                 $reduce: {
//                   input: "$salesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               saleQty: {
//                 $reduce: {
//                   input: "$sales",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleTPArray: {
//                 $reduce: {
//                   input: "$sales",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleMRPArray: {
//                 $reduce: {
//                   input: "$sales",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     saleRTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     saleRMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     saleRPTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRPTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     saleRPMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRPMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     salePTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$salePTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     salePMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$salePMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     saleTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     saleMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           {
//             $addFields: {
//               saleDetails: {
//                 $map: {
//                   input: "$sales",
//                   as: "sale",
//                   in: {
//                     invoiceId: "$$sale.invoiceId",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$sale.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$sale.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$sale.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$sale.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$sale.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$sale.createdAt",
//                     // discount: "$$sale.discount"
//                   },
//                 },
//               },
//             },
//           },
//           //?sale end
//           //?tpn start
//           {
//             $lookup: {
//               from: "tpns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "tpnsPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "tpns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "tpns",
//             },
//           },

//           {
//             $addFields: {
//               tpnPQty: {
//                 $reduce: {
//                   input: "$tpnsPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnPTPArray: {
//                 $reduce: {
//                   input: "$tpnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnPMRPArray: {
//                 $reduce: {
//                   input: "$tpnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               tpnQty: {
//                 $reduce: {
//                   input: "$tpns",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnTPArray: {
//                 $reduce: {
//                   input: "$tpns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnMRPArray: {
//                 $reduce: {
//                   input: "$tpns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     tpnPTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$tpnTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     tpnPMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$tpnMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           {
//             $addFields: {
//               tpnTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$tpnTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               tpnMRPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$tpnMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               tpnDetails: {
//                 $map: {
//                   input: "$tpns",
//                   as: "tpn",
//                   in: {
//                     invoiceId: "$$tpn.invoiceId",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$tpn.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$tpn.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$tpn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$tpn.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$tpn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$tpn.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?tpn end
//           {
//             $lookup: {
//               from: "generics",
//               localField: "generic", // Convert to ObjectId
//               foreignField: "_id",
//               as: "generic",
//             },
//           },
//           {
//             $unwind: "$generic",
//           },
//           {
//             $lookup: {
//               from: "groups",
//               localField: "group", // Convert to ObjectId
//               foreignField: "_id",
//               as: "group",
//             },
//           },
//           {
//             $unwind: "$group",
//           },
//           {
//             $lookup: {
//               from: "brands",
//               localField: "brand", // Convert to ObjectId
//               foreignField: "_id",
//               as: "brand",
//             },
//           },
//           {
//             $unwind: "$brand",
//           },
//           // {
//           //   $skip: skip
//           // },
//           {
//             $limit: 100,
//           },

//           {
//             $project: {
//               _id: 1,
//               name: 1,
//               article_code: 1,
//               group: 1,
//               generic: 1,
//               brand: 1,
//               unit: 1,
//               tp: 1,
//               mrp: 1,

//               grnPQty: 1,
//               grnPTPAvg: 1,
//               grnPMRPAvg: 1,

//               grnQty: 1,
//               grnTPAvg: 1,
//               grnMRPAvg: 1,
//               grnDetails: 1,

//               rtvQty: 1,
//               rtvTPAvg: 1,
//               rtvMRPAvg: 1,
//               rtvDetails: 1,

//               rtvPQty: 1,
//               // rtvPTPAvg: 1,
//               // rtvPMRPAvg: 1,

//               saleQty: 1,
//               // saleTPAvg: 1,
//               // saleMRPAvg: 1,
//               saleDetails: 1,

//               salePQty: 1,
//               // salePTPAvg: 1,
//               // salePMRPAvg: 1,

//               saleRPQty: 1,
//               // saleRPTPAvg: 1,
//               // saleRPMRPAvg: 1,

//               saleRQty: 1,
//               // saleRTPAvg: 1,
//               // saleRMRPAvg: 1,

//               tpnQty: 1,
//               tpnTPAvg: 1,
//               tpnMRPAvg: 1,
//               tpnDetails: 1,

//               tpnPQty: 1,
//               // tpnPTPAvg: 1,
//               // tpnPMRPAvg: 1,

//               damageQty: 1,
//               damageTPAvg: 1,
//               damageMRPAvg: 1,
//               damageDetails: 1,

//               damagePQty: 1,
//               // damagePTPAvg: 1,
//               // damagePMRPAvg: 1,

//               // ... (repeat for damage, sale, tpn)
//             },
//           },
//         ]);
//       } else {
//         product = await Product.aggregate([
//           {
//             $lookup: {
//               from: "inventories",
//               localField: "article_code",
//               foreignField: "article_code",
//               as: "products",
//             },
//           },
//           {
//             $unwind: "$products",
//           },
//           {
//             $lookup: {
//               from: "grns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         //ji
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "grnsPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "grns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         //ji
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "grns",
//             },
//           },

//           //? grn qty sum
//           //? grn Qty sum
//           //?grn sum
//           {
//             $addFields: {
//               grnPQty: {
//                 $reduce: {
//                   input: "$grnsPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               grnPTPArray: {
//                 $reduce: {
//                   input: "$grnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               grnPMRPArray: {
//                 $reduce: {
//                   input: "$grnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               grnQty: {
//                 $reduce: {
//                   input: "$grns",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               grnTPArray: {
//                 $reduce: {
//                   input: "$grns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               grnMRPArray: {
//                 $reduce: {
//                   input: "$grns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               grnPTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$grnPTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               grnPMRPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$grnPMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               grnTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$grnTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               grnMRPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$grnMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               grnDetails: {
//                 $map: {
//                   input: "$grns",
//                   as: "grn",
//                   in: {
//                     grnNo: "$$grn.grnNo",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$grn.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$grn.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$grn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$grn.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$grn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$grn.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?grn end
//           //? rtv start
//           {
//             $lookup: {
//               from: "rtvs",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "rtvs",
//             },
//           },
//           {
//             $lookup: {
//               from: "rtvs",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "rtvsPrevious",
//             },
//           },

//           {
//             $addFields: {
//               rtvPQty: {
//                 $reduce: {
//                   input: "$rtvsPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               rtvPTPArray: {
//                 $reduce: {
//                   input: "$rtvsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               rtvPMRPArray: {
//                 $reduce: {
//                   input: "$rtvsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               rtvQty: {
//                 $reduce: {
//                   input: "$rtvs",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               rtvTPArray: {
//                 $reduce: {
//                   input: "$rtvs",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               rtvMRPArray: {
//                 $reduce: {
//                   input: "$rtvs",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     rtvPTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvPTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     rtvPMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvPMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     rtvTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     rtvMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$rtvMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },

//           {
//             $addFields: {
//               rtvDetails: {
//                 $map: {
//                   input: "$rtvs",
//                   as: "rtv",
//                   in: {
//                     rtvNo: "$$rtv.rtvNo",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$rtv.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$rtv.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$rtv.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$rtv.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$rtv.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$rtv.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?rtv end
//           //?damage start
//           {
//             $lookup: {
//               from: "damages",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "damagesPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "damages",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "damages",
//             },
//           },

//           {
//             $addFields: {
//               damagePQty: {
//                 $reduce: {
//                   input: "$damagesPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damagePTPArray: {
//                 $reduce: {
//                   input: "$damagesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damagePMRPArray: {
//                 $reduce: {
//                   input: "$damagesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               damageQty: {
//                 $reduce: {
//                   input: "$damages",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damageTPArray: {
//                 $reduce: {
//                   input: "$damages",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               damageMRPArray: {
//                 $reduce: {
//                   input: "$damages",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     damagePTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$damagePTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     damagePMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$damagePMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           {
//             $addFields: {
//               damageTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$damageTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               damageMRPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$damageMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               damageDetails: {
//                 $map: {
//                   input: "$damages",
//                   as: "damage",
//                   in: {
//                     damageNo: "$$damage.damageNo",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$damage.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$damage.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$damage.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$damage.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$damage.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$damage.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?damage end
//           //?sale start
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         // $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "salesPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         // $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$returnProducts",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "salesReturnPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$returnProducts",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "salesReturn",
//             },
//           },
//           {
//             $lookup: {
//               from: "sales",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "sales",
//             },
//           },

//           {
//             $addFields: {
//               saleRQty: {
//                 $reduce: {
//                   input: "$salesReturn",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRTPArray: {
//                 $reduce: {
//                   input: "$salesReturn",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRMRPArray: {
//                 $reduce: {
//                   input: "$salesReturn",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               saleRPQty: {
//                 $reduce: {
//                   input: "$salesReturnPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRPTPArray: {
//                 $reduce: {
//                   input: "$salesReturnPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleRPMRPArray: {
//                 $reduce: {
//                   input: "$salesReturnPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               salePQty: {
//                 $reduce: {
//                   input: "$salesPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               salePTPArray: {
//                 $reduce: {
//                   input: "$salesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               salePMRPArray: {
//                 $reduce: {
//                   input: "$salesPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               saleQty: {
//                 $reduce: {
//                   input: "$sales",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleTPArray: {
//                 $reduce: {
//                   input: "$sales",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               saleMRPArray: {
//                 $reduce: {
//                   input: "$sales",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     saleRTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     saleRMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     saleRPTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRPTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     saleRPMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleRPMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     salePTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$salePTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     salePMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$salePMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           // {
//           //   $addFields: {
//           //     saleTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     saleMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$saleMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           {
//             $addFields: {
//               saleDetails: {
//                 $map: {
//                   input: "$sales",
//                   as: "sale",
//                   in: {
//                     invoiceId: "$$sale.invoiceId",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$sale.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$sale.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$sale.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$sale.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$sale.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$sale.createdAt",
//                     // discount: "$$sale.discount"
//                   },
//                 },
//               },
//             },
//           },
//           //?sale end
//           //?tpn start
//           {
//             $lookup: {
//               from: "tpns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         // {
//                         //   $gte: ["$createdAt", start]
//                         // },
//                         {
//                           $lt: ["$createdAt", start],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "tpnsPrevious",
//             },
//           },
//           {
//             $lookup: {
//               from: "tpns",
//               let: { article_code: "$products.article_code" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         // { $eq: ["$status", "Complete"] },
//                         {
//                           $gte: ["$createdAt", start],
//                         },
//                         {
//                           $lt: ["$createdAt", end],
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 {
//                   $addFields: {
//                     products: {
//                       $filter: {
//                         input: "$products",
//                         as: "product",
//                         cond: {
//                           $eq: ["$$product.article_code", "$$article_code"],
//                         },
//                       },
//                     },
//                   },
//                 },
//                 {
//                   $match: {
//                     products: { $gt: [] },
//                   },
//                 },
//               ],
//               as: "tpns",
//             },
//           },

//           {
//             $addFields: {
//               tpnPQty: {
//                 $reduce: {
//                   input: "$tpnsPrevious",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnPTPArray: {
//                 $reduce: {
//                   input: "$tpnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnPMRPArray: {
//                 $reduce: {
//                   input: "$tpnsPrevious",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               tpnQty: {
//                 $reduce: {
//                   input: "$tpns",
//                   initialValue: 0,
//                   in: {
//                     $sum: [
//                       "$$value",
//                       {
//                         $sum: {
//                           $map: {
//                             input: "$$this.products",
//                             as: "product",
//                             in: { $toInt: "$$product.qty" },
//                           },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnTPArray: {
//                 $reduce: {
//                   input: "$tpns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.tp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//               tpnMRPArray: {
//                 $reduce: {
//                   input: "$tpns",
//                   initialValue: [],
//                   in: {
//                     $concatArrays: [
//                       "$$value",
//                       {
//                         $map: {
//                           input: "$$this.products",
//                           as: "product",
//                           in: { $toDouble: "$$product.mrp" },
//                         },
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },

//           // {
//           //   $addFields: {
//           //     tpnPTPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$tpnTPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //     tpnPMRPAvg: {
//           //       $avg: {
//           //         $filter: {
//           //           input: "$tpnMRPArray",
//           //           as: "value",
//           //           cond: { $ne: ["$$value", null] }
//           //         }
//           //       }
//           //     },
//           //   }

//           // },
//           {
//             $addFields: {
//               tpnTPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$tpnTPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//               tpnMRPAvg: {
//                 $avg: {
//                   $filter: {
//                     input: "$tpnMRPArray",
//                     as: "value",
//                     cond: { $ne: ["$$value", null] },
//                   },
//                 },
//               },
//             },
//           },
//           {
//             $addFields: {
//               tpnDetails: {
//                 $map: {
//                   input: "$tpns",
//                   as: "tpn",
//                   in: {
//                     invoiceId: "$$tpn.invoiceId",
//                     qty: {
//                       $sum: {
//                         $map: {
//                           input: "$$tpn.products",
//                           as: "product",
//                           in: { $toInt: "$$product.qty" },
//                         },
//                       },
//                     },
//                     tp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$tpn.products.tp",
//                           {
//                             $indexOfArray: [
//                               "$$tpn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     mrp: {
//                       $toDouble: {
//                         $arrayElemAt: [
//                           "$$tpn.products.mrp",
//                           {
//                             $indexOfArray: [
//                               "$$tpn.products.article_code",
//                               "$products.article_code",
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                     createdAt: "$$tpn.createdAt",
//                   },
//                 },
//               },
//             },
//           },
//           //?tpn end
//           {
//             $lookup: {
//               from: "generics",
//               localField: "generic", // Convert to ObjectId
//               foreignField: "_id",
//               as: "generic",
//             },
//           },
//           {
//             $unwind: "$generic",
//           },
//           {
//             $lookup: {
//               from: "groups",
//               localField: "group", // Convert to ObjectId
//               foreignField: "_id",
//               as: "group",
//             },
//           },
//           {
//             $unwind: "$group",
//           },
//           {
//             $lookup: {
//               from: "brands",
//               localField: "brand", // Convert to ObjectId
//               foreignField: "_id",
//               as: "brand",
//             },
//           },
//           {
//             $unwind: "$brand",
//           },
//           {
//             $skip: skip,
//           },
//           {
//             $limit: 100,
//           },

//           {
//             $project: {
//               _id: 1,
//               name: 1,
//               article_code: 1,
//               group: 1,
//               generic: 1,
//               brand: 1,
//               unit: 1,
//               tp: 1,
//               mrp: 1,

//               grnPQty: 1,
//               grnPTPAvg: 1,
//               grnPMRPAvg: 1,

//               grnQty: 1,
//               grnTPAvg: 1,
//               grnMRPAvg: 1,
//               grnDetails: 1,

//               rtvQty: 1,
//               rtvTPAvg: 1,
//               rtvMRPAvg: 1,
//               rtvDetails: 1,

//               rtvPQty: 1,
//               // rtvPTPAvg: 1,
//               // rtvPMRPAvg: 1,

//               saleQty: 1,
//               // saleTPAvg: 1,
//               // saleMRPAvg: 1,
//               saleDetails: 1,

//               salePQty: 1,
//               // salePTPAvg: 1,
//               // salePMRPAvg: 1,

//               saleRPQty: 1,
//               // saleRPTPAvg: 1,
//               // saleRPMRPAvg: 1,

//               saleRQty: 1,
//               // saleRTPAvg: 1,
//               // saleRMRPAvg: 1,

//               tpnQty: 1,
//               tpnTPAvg: 1,
//               tpnMRPAvg: 1,
//               tpnDetails: 1,

//               tpnPQty: 1,
//               // tpnPTPAvg: 1,
//               // tpnPMRPAvg: 1,

//               damageQty: 1,
//               damageTPAvg: 1,
//               damageMRPAvg: 1,
//               damageDetails: 1,

//               damagePQty: 1,
//               // damagePTPAvg: 1,
//               // damagePMRPAvg: 1,

//               // ... (repeat for damage, sale, tpn)
//             },
//           },
//         ]);
//       }

//       if (product.length > 0) {
//         res.send(product);
//       } else {
//         res.send([]);
//       }
//     } catch (err) {
//       console.log("err", err);
//       res.status(500).send({ error: "An error occurred" });
//     }
//   })
// );

router.get(
  "/ledger/export/previous/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());
    // console.log("line5559", "start", start, "end", end);
    try {
      const product = await Product.aggregate([
        {
          $lookup: {
            from: "inventories",
            localField: "article_code",
            foreignField: "article_code",
            as: "products",
          },
        },
        {
          $unwind: "$products",
        },
        //?grn
        {
          $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      //ji
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "grnsPrevious",
          },
        },
        {
          $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      //ji
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "grns",
          },
        },

        //? grn qty sum
        //? grn Qty sum
        //?grn sum
        {
          $addFields: {
            grnPQty: {
              $reduce: {
                input: "$grnsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            grnQty: {
              $reduce: {
                input: "$grns",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },

        //?grn end
        //? rtv start
        {
          $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "rtvs",
          },
        },
        {
          $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "rtvsPrevious",
          },
        },

        {
          $addFields: {
            rtvPQty: {
              $reduce: {
                input: "$rtvsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            rtvQty: {
              $reduce: {
                input: "$rtvs",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        //?rtv end
        //?damage start
        {
          $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "damagesPrevious",
          },
        },
        {
          $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "damages",
          },
        },

        {
          $addFields: {
            damagePQty: {
              $reduce: {
                input: "$damagesPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            damageQty: {
              $reduce: {
                input: "$damages",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        //?damage end
        //?sale start
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      // $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesPrevious",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      // $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$returnProducts",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesReturnPrevious",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$returnProducts",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesReturn",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "sales",
          },
        },

        {
          $addFields: {
            saleRQty: {
              $reduce: {
                input: "$salesReturn",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleRPQty: {
              $reduce: {
                input: "$salesReturnPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            salePQty: {
              $reduce: {
                input: "$salesPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleQty: {
              $reduce: {
                input: "$sales",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },

        //?sale end
        //?tpn start
        {
          $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "tpnsPrevious",
          },
        },
        {
          $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "tpns",
          },
        },

        {
          $addFields: {
            tpnPQty: {
              $reduce: {
                input: "$tpnsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            tpnQty: {
              $reduce: {
                input: "$tpns",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },

        //?tpn end
        // {
        //   $lookup: {
        //     from: "generics",
        //     localField: "generic", // Convert to ObjectId
        //     foreignField: "_id",
        //     as: "generic",
        //   },
        // },
        // {
        //   $unwind: "$generic"
        // },
        {
          $lookup: {
            from: "groups",
            localField: "group", // Convert to ObjectId
            foreignField: "_id",
            as: "group",
          },
        },
        {
          $unwind: "$group",
        },
        // {
        //   $lookup: {
        //     from: "brands",
        //     localField: "brand", // Convert to ObjectId
        //     foreignField: "_id",
        //     as: "brand",
        //   },
        // },
        // {
        //   $unwind: "$brand"
        // },
        {
          $project: {
            _id: 0,
            name: 1,
            article_code: 1,
            group: 1,
            // generic: 1,
            // brand: 1,
            // unit: 1,
            tp: 1,
            mrp: 1,

            grnPQty: 1,
            grnQty: 1,
            // grnDetails: 1,

            rtvQty: 1,
            // rtvDetails: 1,
            rtvPQty: 1,

            saleQty: 1,
            // saleDetails: 1,
            salePQty: 1,
            saleRPQty: 1,
            saleRQty: 1,

            tpnQty: 1,
            // tpnDetails: 1,
            tpnPQty: 1,

            damageQty: 1,
            // damageDetails: 1,
            damagePQty: 1,
          },
        },
      ]);

      if (product.length > 0) {
        res.send(product);
      } else {
        res.send([]);
      }
    } catch (err) {
      console.log("err", err);
      res.status(500).send({ error: "An error occurred" });
    }
  })
);

//product Ladger
router.get(
  "/ledger/export/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());
    // console.log("line5559", "start", start, "end", end)
    try {
      const product = await Product.aggregate([
        {
          $lookup: {
            from: "inventories",
            localField: "article_code",
            foreignField: "article_code",
            as: "products",
          },
        },
        {
          $unwind: "$products",
        },
        //?grn
        {
          $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      //ji
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "grnsPrevious",
          },
        },
        {
          $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      //ji
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "grns",
          },
        },

        //? grn qty sum
        //? grn Qty sum
        //?grn sum
        {
          $addFields: {
            grnPQty: {
              $reduce: {
                input: "$grnsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            grnQty: {
              $reduce: {
                input: "$grns",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },

        //?grn end
        //? rtv start
        {
          $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "rtvs",
          },
        },
        {
          $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "rtvsPrevious",
          },
        },

        {
          $addFields: {
            rtvPQty: {
              $reduce: {
                input: "$rtvsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            rtvQty: {
              $reduce: {
                input: "$rtvs",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        //?rtv end
        //?damage start
        {
          $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "damagesPrevious",
          },
        },
        {
          $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "damages",
          },
        },

        {
          $addFields: {
            damagePQty: {
              $reduce: {
                input: "$damagesPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            damageQty: {
              $reduce: {
                input: "$damages",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        //?damage end
        //?sale start
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      // $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesPrevious",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      // $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$returnProducts",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesReturnPrevious",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$returnProducts",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesReturn",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "sales",
          },
        },

        {
          $addFields: {
            saleRQty: {
              $reduce: {
                input: "$salesReturn",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleRPQty: {
              $reduce: {
                input: "$salesReturnPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            salePQty: {
              $reduce: {
                input: "$salesPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleQty: {
              $reduce: {
                input: "$sales",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },

        //?sale end
        //?tpn start
        {
          $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "tpnsPrevious",
          },
        },
        {
          $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "tpns",
          },
        },

        {
          $addFields: {
            tpnPQty: {
              $reduce: {
                input: "$tpnsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            tpnQty: {
              $reduce: {
                input: "$tpns",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },

        //?tpn end
        // {
        //   $lookup: {
        //     from: "generics",
        //     localField: "generic", // Convert to ObjectId
        //     foreignField: "_id",
        //     as: "generic",
        //   },
        // },
        // {
        //   $unwind: "$generic"
        // },
        {
          $lookup: {
            from: "groups",
            localField: "group", // Convert to ObjectId
            foreignField: "_id",
            as: "group",
          },
        },
        {
          $unwind: "$group",
        },
        // {
        //   $lookup: {
        //     from: "brands",
        //     localField: "brand", // Convert to ObjectId
        //     foreignField: "_id",
        //     as: "brand",
        //   },
        // },
        // {
        //   $unwind: "$brand"
        // },
        {
          $project: {
            _id: 0,
            name: 1,
            article_code: 1,
            group: 1,
            // generic: 1,
            // brand: 1,
            // unit: 1,
            tp: 1,
            mrp: 1,

            grnPQty: 1,
            grnQty: 1,
            // grnDetails: 1,

            rtvQty: 1,
            // rtvDetails: 1,
            rtvPQty: 1,

            saleQty: 1,
            // saleDetails: 1,
            salePQty: 1,
            saleRPQty: 1,
            saleRQty: 1,

            tpnQty: 1,
            // tpnDetails: 1,
            tpnPQty: 1,

            damageQty: 1,
            // damageDetails: 1,
            damagePQty: 1,
          },
        },
      ]);
      res.status(200).json(product);
    } catch (err) {
      console.log("err", err);
      res.status(500).send({ message: "An error occurred" });
    }
  })
);

// router.get(
//   "/ledger/:id/:start/:end",
//   expressAsyncHandler(async (req, res) => {
//     const start = req.params.start
//       ? startOfDay(new Date(req.params.start))
//       : startOfDay(new Date());
//     const end = req.params.end
//       ? endOfDay(new Date(req.params.end))
//       : endOfDay(new Date());
//     const id = req.params.id;
//     // console.log("line 7741 ::> ", "start", start, "end", end, "id", id);

//     try {
//       const grn = await Product.aggregate([
//         {
//           $match: { _id: mongoose.Types.ObjectId(id)}, // Match by the given GRN ID
//         },
//         {
//           $unwind: "$products", // Unwind the products array to access individual products
//         },
//         {
//           $lookup: {
//             from: "grns", // Ensure this is the correct collection name
//             let: { productId: "$_id" }, // Passing the product _id from the outer collection
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $and: [
//                       { $ne: ["$status", "Deleted"] }, // Exclude 'Deleted' status
//                       { $in: ["$$productId", "$products.id"] }, // Match product ID with the products array
//                       { $gte: ["$date", start] }, // Date filter: greater than or equal to start date
//                       { $lte: ["$date", end] }, // Date filter: less than or equal to end date
//                     ],
//                   },
//                 },
//               },
//               {
//                 $project: {
//                   grnNo: 1,
//                   "products.qty": 1,
//                   date: 1,
//                 },
//               },
//             ],
//             as: "grnDetails", // The result will be placed in the grnDetails field
//           },
//         },
//         {
//           $match: {
//             "grnDetails": { $ne: [] }, // Only return products where grnDetails is not empty
//           },
//         },

//         // {
//         //   $unwind: "$grnDetails", // Unwind the grnDetails array to access each GRN
//         // },
//         // {
//         //   $match: {
//         //     "grnDetails.status": { $ne: "Deleted" }, // Exclude 'delete' and 'cancel' statuses
//         //     "grnDetails.createdAt": { $gte: start, $lte: end }, // Date range filter (createdAt is used for date filtering)
//         //   },
//         // },
//         // {
//         //   $project: {
//         //     grnNo: "$grnDetails.tpnNo", // Include GRN number
//         //     qty: "$grnDetails.products.qty", // Include quantity of the product in the GRN
//         //     date: "$grnDetails.createdAt", // Include date of the GRN
//         //     warehouseFrom: "$grnDetails.warehouseFrom", // Include warehouse from
//         //     warehouseTo: "$grnDetails.warehouseTo", // Include warehouse to
//         //   },
//         // },
//       ]);

//       console.log("GRN Result: ", grn); // Log the resulting product GRNs

//       if (grn?.length > 0) {
//         res.send(grn); // Send the results if there are matching GRNs
//       } else {
//         res.status(404).send({
//           message: "No GRNs found for this product in the specified date range.",
//         });
//       }
//     } catch (err) {
//       console.log("Error: ", err); // Log any errors
//       res.status(500).send({ error: "An error occurred" });
//     }
//   })
// );

router.get(
  "/ledger/:id/:start/:end",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date());
    const id = req.params.id;
    // console.log("id", id);
    // console.log("line 7741 ::> ", "start", start, "end", end, "id", id);
    try {
      const product = await Product.aggregate([
        {
          $match: { _id: mongoose.Types.ObjectId(id) },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "article_code",
            foreignField: "article_code",
            as: "products",
          },
        },
        {
          $unwind: "$products",
        },
        //?grn
        {
          $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      //ji
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "grnsPrevious",
          },
        },
        {
          $lookup: {
            from: "grns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      //ji
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "grns",
          },
        },

        //? grn qty sum
        //? grn Qty sum
        //?grn sum
        {
          $addFields: {
            grnPQty: {
              $reduce: {
                input: "$grnsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            grnQty: {
              $reduce: {
                input: "$grns",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: {
                            $toInt: {
                              $ifNull: [
                                // Handle null or invalid values
                                { $toDouble: "$$product.qty" }, // Convert to double without trimming
                                0, // Default value if conversion fails
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            grnDetails: {
              $map: {
                input: "$grns",
                as: "grn",
                in: {
                  grnNo: "$$grn.grnNo",
                  qty: {
                    $sum: {
                      $map: {
                        input: "$$grn.products",
                        as: "product",
                        // in: { $toInt: "$$product.qty" }
                        in: {
                          $toInt: {
                            $ifNull: [
                              // Handle null or invalid values
                              { $toDouble: "$$product.qty" }, // Convert to double without trimming
                              0, // Default value if conversion fails
                            ],
                          },
                        },
                      },
                    },
                  },
                  tp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$grn.products.tp",
                        {
                          $indexOfArray: [
                            "$$grn.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  mrp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$grn.products.mrp",
                        {
                          $indexOfArray: [
                            "$$grn.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  createdAt: "$$grn.createdAt",
                },
              },
            },
          },
        },
        //?grn end
        //? rtv start
        {
          $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "rtvs",
          },
        },
        {
          $lookup: {
            from: "rtvs",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "rtvsPrevious",
          },
        },

        {
          $addFields: {
            rtvPQty: {
              $reduce: {
                input: "$rtvsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            rtvQty: {
              $reduce: {
                input: "$rtvs",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            rtvDetails: {
              $map: {
                input: "$rtvs",
                as: "rtv",
                in: {
                  rtvNo: "$$rtv.rtvNo",
                  qty: {
                    $sum: {
                      $map: {
                        input: "$$rtv.products",
                        as: "product",
                        in: { $toInt: "$$product.qty" },
                      },
                    },
                  },
                  tp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$rtv.products.tp",
                        {
                          $indexOfArray: [
                            "$$rtv.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  mrp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$rtv.products.mrp",
                        {
                          $indexOfArray: [
                            "$$rtv.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  createdAt: "$$rtv.createdAt",
                },
              },
            },
          },
        },
        //?rtv end
        //?damage start
        {
          $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "damagesPrevious",
          },
        },
        {
          $lookup: {
            from: "damages",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "damages",
          },
        },

        {
          $addFields: {
            damagePQty: {
              $reduce: {
                input: "$damagesPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            damageQty: {
              $reduce: {
                input: "$damages",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },

        {
          $addFields: {
            damageDetails: {
              $map: {
                input: "$damages",
                as: "damage",
                in: {
                  damageNo: "$$damage.damageNo",
                  qty: {
                    $sum: {
                      $map: {
                        input: "$$damage.products",
                        as: "product",
                        in: { $toInt: "$$product.qty" },
                      },
                    },
                  },
                  tp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$damage.products.tp",
                        {
                          $indexOfArray: [
                            "$$damage.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  mrp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$damage.products.mrp",
                        {
                          $indexOfArray: [
                            "$$damage.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  createdAt: "$$damage.createdAt",
                },
              },
            },
          },
        },
        //?damage end
        //?sale start
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      // $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesPrevious",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      // $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$returnProducts",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesReturnPrevious",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$returnProducts",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "salesReturn",
          },
        },
        {
          $lookup: {
            from: "sales",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "sales",
          },
        },

        {
          $addFields: {
            saleRQty: {
              $reduce: {
                input: "$salesReturn",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleRPQty: {
              $reduce: {
                input: "$salesReturnPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            salePQty: {
              $reduce: {
                input: "$salesPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleQty: {
              $reduce: {
                input: "$sales",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleReturnDetails: {
              $map: {
                input: "$salesReturn",
                as: "sale",
                in: {
                  invoiceId: "$$sale.invoiceId",
                  qty: {
                    $sum: {
                      $map: {
                        input: "$$sale.products",
                        as: "product",
                        in: { $toInt: "$$product.qty" },
                      },
                    },
                  },
                  tp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$sale.products.tp",
                        {
                          $indexOfArray: [
                            "$$sale.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  mrp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$sale.products.mrp",
                        {
                          $indexOfArray: [
                            "$$sale.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  createdAt: "$$sale.createdAt",
                  // discount: "$$sale.discount"
                },
              },
            },
          },
        },
        {
          $addFields: {
            saleDetails: {
              $map: {
                input: "$sales",
                as: "sale",
                in: {
                  invoiceId: "$$sale.invoiceId",
                  qty: {
                    $sum: {
                      $map: {
                        input: "$$sale.products",
                        as: "product",
                        in: { $toInt: "$$product.qty" },
                      },
                    },
                  },
                  tp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$sale.products.tp",
                        {
                          $indexOfArray: [
                            "$$sale.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  mrp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$sale.products.mrp",
                        {
                          $indexOfArray: [
                            "$$sale.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  createdAt: "$$sale.createdAt",
                  // discount: "$$sale.discount"
                },
              },
            },
          },
        },
        //?sale end
        //?tpn start
        {
          $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      // {
                      //   $gte: ["$createdAt", start]
                      // },
                      {
                        $lt: ["$createdAt", start],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "tpnsPrevious",
          },
        },
        {
          $lookup: {
            from: "tpns",
            let: { article_code: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      // { $eq: ["$status", "Complete"] },
                      {
                        $gte: ["$createdAt", start],
                      },
                      {
                        $lt: ["$createdAt", end],
                      },
                    ],
                  },
                },
              },
              {
                $addFields: {
                  products: {
                    $filter: {
                      input: "$products",
                      as: "product",
                      cond: {
                        $eq: ["$$product.article_code", "$$article_code"],
                      },
                    },
                  },
                },
              },
              {
                $match: {
                  products: { $gt: [] },
                },
              },
            ],
            as: "tpns",
          },
        },

        {
          $addFields: {
            tpnPQty: {
              $reduce: {
                input: "$tpnsPrevious",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            tpnQty: {
              $reduce: {
                input: "$tpns",
                initialValue: 0,
                in: {
                  $sum: [
                    "$$value",
                    {
                      $sum: {
                        $map: {
                          input: "$$this.products",
                          as: "product",
                          in: { $toInt: "$$product.qty" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $addFields: {
            tpnDetails: {
              $map: {
                input: "$tpns",
                as: "tpn",
                in: {
                  invoiceId: "$$tpn.tpnNo",
                  qty: {
                    $sum: {
                      $map: {
                        input: "$$tpn.products",
                        as: "product",
                        in: { $toInt: "$$product.qty" },
                      },
                    },
                  },
                  tp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$tpn.products.tp",
                        {
                          $indexOfArray: [
                            "$$tpn.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  mrp: {
                    $toDouble: {
                      $arrayElemAt: [
                        "$$tpn.products.mrp",
                        {
                          $indexOfArray: [
                            "$$tpn.products.article_code",
                            "$products.article_code",
                          ],
                        },
                      ],
                    },
                  },
                  createdAt: "$$tpn.createdAt",
                },
              },
            },
          },
        },
        //?tpn end
        {
          $lookup: {
            from: "generics",
            localField: "generic", // Convert to ObjectId
            foreignField: "_id",
            as: "generic",
          },
        },
        {
          $unwind: "$generic",
        },
        {
          $lookup: {
            from: "groups",
            localField: "group", // Convert to ObjectId
            foreignField: "_id",
            as: "group",
          },
        },
        {
          $unwind: "$group",
        },
        // {
        //   $lookup: {
        //     from: "suppliers",
        //     localField: "supplier", // Convert to ObjectId
        //     foreignField: "_id",
        //     as: "supplier",
        //   },
        // },
        // {
        //   $unwind: "$supplier",
        // },
        {
          $lookup: {
            from: "brands",
            localField: "brand", // Convert to ObjectId
            foreignField: "_id",
            as: "brand",
          },
        },
        {
          $unwind: "$brand",
        },

        {
          $project: {
            _id: 1,
            name: 1,
            supplier: 1,
            article_code: 1,
            group: 1,
            generic: 1,
            brand: 1,
            unit: 1,
            tp: 1,
            mrp: 1,

            grnPQty: 1,
            grnQty: 1,
            grnDetails: 1,

            rtvQty: 1,
            rtvDetails: 1,
            rtvPQty: 1,

            saleQty: 1,
            saleDetails: 1,
            // salesReturn: 1,
            saleReturnDetails: 1,
            salePQty: 1,
            saleRPQty: 1,
            saleRQty: 1,
            supplier: 1,
            tpnQty: 1,
            tpnDetails: 1,
            tpnPQty: 1,

            damageQty: 1,
            damageDetails: 1,
            damagePQty: 1,
          },
        },
      ]);

      if (product.length > 0) {
        res.send(product[0]);
        // console.log("product::>", product[0]);a
      } else {
        res.send({});
      }
    } catch (err) {
      console.log("err", err);
      res.status(500).send({ error: "An error occurred" });
    }
  })
);
// CREATE ONE PRODUCT
router.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    // console.log("Request body:", req.body); // Log to see what is in the body

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "No data received in the request" });
    }

    // Handle Initial Stock with Ledger
    const initialStock = Number(req.body.stock) > 0 ? Number(req.body.stock) : 0;
    if (initialStock > 0) {
      if (!req.body.warehouse) {
        return res
          .status(400)
          .json({ message: "Warehouse is required for products with initial stock." });
      }
      req.body.stock = 0; // Initialize with 0, ledger will handle inventory update
    }

    const newProduct = new Product(req.body);
    // console.log("New product object:", newProduct); // Log the product object

    try {
      const result = await newProduct.save();
      // console.log("Product saved:", result); // Log the saved result
      if (result) {
        if (initialStock > 0) {
          try {
            await createStockLedgerEntry({
              productId: result._id,
              warehouseId: req.body.warehouse || null,
              transactionType: "ADJUSTMENT",
              action: "IN",
              quantity: initialStock,
              referenceType: "Product",
              referenceId: result._id,
              notes: "Initial Stock",
            });
            // Reflect the updated stock in response if needed (though product object might still show 0)
            result.stock = initialStock;
          } catch (ledgerErr) {
            console.error("Stock Ledger Error:", ledgerErr);
          }
        }

        // If supplier is provided, add product to supplier's products array
        if (req.body.supplier) {
          try {
            const Supplier = require("../models/supplierModel");
            const Group = require("../models/groupModel");
            const Generic = require("../models/genericModel");
            const Brand = require("../models/brandModel");

            const supplierId = req.body.supplier;
            const supplierDoc = await Supplier.findOne({
              $or: [
                { _id: supplierId },
                ...(mongoose.isValidObjectId(supplierId)
                  ? [{ _id: mongoose.Types.ObjectId(supplierId) }]
                  : []),
              ],
              aamarId: req.body.aamarId,
            });

            if (supplierDoc) {
              let brandName = req.body.brandName || "";
              if (!brandName && result.brand) {
                const b = await Brand.findById(result.brand);
                if (b) brandName = b.name;
              }

              let genericName = req.body.genericName || "";
              if (!genericName && result.generic) {
                const g = await Generic.findById(result.generic);
                if (g) genericName = g.name;
              }

              let groupName = req.body.groupName || "";
              if (!groupName && result.group) {
                const gr = await Group.findById(result.group);
                if (gr) groupName = gr.name;
              }

              let unitName = "";
              const unitVal = req.body.unit || result.unit;
              if (unitVal) {
                if (mongoose.isValidObjectId(unitVal)) {
                  const Unit = require("../models/unitModel");
                  const u = await Unit.findById(unitVal);
                  if (u) unitName = u.name || u.symbol || "";
                } else {
                  unitName = unitVal.toString();
                }
              }

              const productItem = {
                id: result._id,
                article_code: result.article_code,
                name: result.name,
                brand: brandName,
                generic: genericName,
                group: groupName,
                unit: unitName,
                tp: result.tp ? result.tp.toString() : "0",
                mrp: result.mrp ? result.mrp.toString() : "0",
                qty: "0",
                order: (supplierDoc.products?.length || 0) + 1,
              };

              await Supplier.updateOne(
                { _id: supplierDoc._id },
                { $push: { products: productItem } }
              );
            }
          } catch (suppErr) {
            console.error("Error adding product to supplier:", suppErr);
          }
        }

        res.status(200).json({
          product: result,
          message: "Product created successfully",
        });
      }
    } catch (err) {
      console.error("Error saving product:", err); // Log the error
      res
        .status(500)
        .json({ message: "There was a server-side error", error: err });
    }
  })
);

router.get(
  "/checkAC/:aamarId/:code",
  expressAsyncHandler(async (req, res) => {
    try {
      const { aamarId, code } = req.params;

      // Find the product with the given aamarId and article_code
      const existingProduct = await Product.findOne({ aamarId, article_code: code });

      if (existingProduct) {
        return res.json({ exists: true });
      } else {
        return res.json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking article code:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  })
);


// CREATE ONE PRODUCT Import
router.post(
  "/import",
  expressAsyncHandler(async (req, res) => {
    // console.log("Request body:", req.body); // Log to see what is in the body

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "No data received in the request" });
    }

    const initialStock = Number(req.body.stock) > 0 ? Number(req.body.stock) : 0;
    if (initialStock > 0) {
      if (!req.body.warehouse) {
        return res
          .status(400)
          .json({ message: "Warehouse is required for products with initial stock during import." });
      }
      req.body.stock = 0; // Initialize with 0
    }

    const newProduct = new Product(req.body);

    try {
      const result = await newProduct.save();
      // console.log("Product saved:", result); // Log the saved result
      if (result) {
        if (initialStock > 0) {
          try {
            await createStockLedgerEntry({
              productId: result._id,
              warehouseId: req.body.warehouse || null,
              transactionType: "ADJUSTMENT",
              action: "IN",
              quantity: initialStock,
              referenceType: "Product",
              referenceId: result._id,
              notes: "Initial Stock (Import)",
            });
            result.stock = initialStock;
          } catch (ledgerErr) {
            console.error("Stock Ledger Error (Import):", ledgerErr);
          }
        }
        res.status(200).json({
          // product: result,
          message: "Product created successfully",
          status: "success",
        });
      } else {
        res.status(500).json({
          message: "There was a server-side error",
          error: "Failed to save product",
          status: "faild",
        });
      }
    } catch (err) {
      console.error("Error saving product:", err); // Log the error
      res
        .status(500)
        .json({ message: "There was a server-side error", error: err });
    }
  })
);

// // CREATE ONE PRODUCT Import
// router.post(
//   "/import",
//   expressAsyncHandler(async (req, res) => {
//     // console.log("Request body:", req.body); // Log to see what is in the body

//     if (!req.body || Object.keys(req.body).length === 0) {
//       return res
//         .status(400)
//         .json({ message: "No data received in the request" });
//     }

//     const newProduct = new Product(req.body);
//     // console.log("New product object:", newProduct); // Log the product object

//     try {
//       const result = await newProduct.save();
//       // console.log("Product saved:", result); // Log the saved result
//       if (result) {
//         res.status(200).json({
//           product: result,
//           message: "Product created successfully",
//         });
//       }
//     } catch (err) {
//       console.error("Error saving product:", err); // Log the error
//       res
//         .status(500)
//         .json({ message: "There was a server-side error", error: err });
//     }
//   })
// );

// // CREATE ONE PRODUCT
// router.post(
//   "/",
//   expressAsyncHandler(async (req, res) => {
//     console.log("product", req.body)
//     const newProduct = new Product(req.body.product);
//     await newProduct.save(async (err, product) => {
//       if (err) {
//         res
//           .status(500)
//           .json({ error: err, message: "There was a server side error" });
//       } else {
//         console.log(product)
//         // let inventory = {
//         //   name: product.name,
//         //   article_code: product.article_code,
//         //   warehouse: "645c9297ed6d5d94af257be9",
//         //   currentQty: 0,
//         //   openingQty: 0,
//         //   totalQty: 0,
//         //   soldQty: 0,
//         //   damageQty: 0,
//         //   rtvQty: 0,
//         //   tpnQty: 0,
//         //   status: "active",
//         //   createdAt: new Date(Date.now()),
//         //   updatedAt: new Date(Date.now()),

//         // };
//         // const newInventory = new Inventory(inventory);
//         // const update = await newInventory.save()
//         res.status(200).json({
//           data: product?._id,
//           message: "Product is created Successfully",
//         });
//       }
//     });
//   })
// );

// CREATE MANY PRODUCTS
router.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    // console.log(req.body);
    await Product.deleteMany({});
    await Product.insertMany(req.body, (err) => {
      if (err) {
        res
          .status(500)
          .json({ error: "There was a server side error", err: err });
      } else {
        res.status(200).json({
          message: "Products are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE PRODUCT
router.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;

    try {
      await Product.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          // console.log("update", response);
          res.send(response);
        })
        .catch((err) => {
          // console.log("update", response);
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);
// UPDATE ONE PRODUCT pricelist
router.put(
  "/priceList/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = { priceList: req.body };
    // console.log(id, update);
    try {
      await Product.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          // console.log("update", response);
          res.send(response);
        })
        .catch((err) => {
          // console.log("update", response);
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);
// UPDATE ONE PRODUCT pricelist
router.put(
  "/mrp/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body.editedMrp;
    // console.log("id", id);
    // console.log("req.body", req.body);
    // console.log("update", update);
    try {
      await Product.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          // console.log("update", response);
          res.send(response);
        })
        .catch((err) => {
          // console.log("update", response);
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

// DELETE PRODUCT
router.delete(
  "/:id",
  updateSupplierProducts,
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    // console.log("id", id);
    try {
      await Product.deleteOne({ _id: id })
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

// PRODUCT PHOTO UPLOAD
// Upload Endpoint
router.post(
  "/upload/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;

    // APP ROOT

    // APP ROOT
    // const appRoot = process.env.PWD;
    const appRoot = process.cwd();
    // console.log(appRoot);
    // App Root

    // console.log("env", process.env);
    // console.log("p", PWD)
    // console.log("approot", appRoot);
    if (req.files === null) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const file = req.files.file;
    const name = file.name.split(".");
    const ext = name[1];
    const time = Date.now();
    const fileName = `${id}-${time}.${ext}`;
    // console.log(`../uploads/${fileName}`);

    file.mv(`${appRoot}/uploads/product/${fileName}`, async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      } else {
        await Product.updateOne(
          { _id: id },
          { $set: { photo: `/uploads/product/${fileName}` } }
        )
          .then((response) => {
            // res.send(response);
            res.json({
              fileName: fileName,
              filePath: `/uploads/product/${fileName}`,
            });
          })
          .catch((err) => {
            res.send(err);
          });
      }
    });
  })
);

// GRN Products
router.get(
  "/grnProducts/:start/:end/:aamarId/:warehouse",
  expressAsyncHandler(async (req, res) => {
    try {
      const start = req.params.start
        ? startOfDay(new Date(req.params.start))
        : startOfDay(new Date.now());
      const end = req.params.end
        ? endOfDay(new Date(req.params.end))
        : endOfDay(new Date.now());
      const warehouse = req.params.warehouse || "";
      const aamarId = req.params.aamarId || "";
      // grn Products

      // Initialize query
      let query = {
        createdAt: {
          $gte: start,
          $lte: end,
        },
        status: { $ne: "Canceled" },
        aamarId: aamarId,
      };
      if (warehouse !== "allWh" && warehouse) {
        query.warehouse = mongoose.Types.ObjectId(warehouse);
      }
      const grnProducts = await Grn.aggregate([
        {
          $match: query,
        },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.id",
            article_code: { $first: "$products.article_code" },
            totalQuantity: { $sum: { $toDouble: "$products.qty" } },
            totalMrp: {
              $sum: {
                $multiply: [
                  { $toDouble: "$products.mrp" },
                  { $toDouble: "$products.qty" },
                ],
              },
            },
            totalTP: {
              $sum: {
                $multiply: [
                  { $toDouble: "$products.tp" },
                  { $toDouble: "$products.qty" },
                ],
              },
            },
            name: { $first: "$products.name" },
            mrp: { $avg: { $toDouble: "$products.mrp" } },
            tp: { $avg: { $toDouble: "$products.tp" } },
          },
        },
      ]);
      // console.log("grnProducts:", grnProducts);
      res.status(200).json({ grnProducts });
    } catch (err) {
      console.log(err);
      res.status(500).json({ err: err, message: "Server side error" });
    }
  })
);

// RTV Products
router.get(
  "/rtvProducts/:start/:end/:aamarId/:warehouse",
  expressAsyncHandler(async (req, res) => {
    try {
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
        createdAt: {
          $gte: start,
          $lte: end,
        },
        status: "Complete",
        aamarId: aamarId,
      };
      if (warehouse !== "allWh" && warehouse) {
        query.warehouse = mongoose.Types.ObjectId(warehouse);
      }
      const rtvProducts = await Rtv.aggregate([
        {
          $match: query,
        },
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: "$products.id",
            article_code: { $first: "$products.article_code" },
            totalQuantity: { $sum: { $toDouble: "$products.qty" } },
            totalMrp: {
              $sum: {
                $multiply: [
                  { $toDouble: "$products.mrp" },
                  { $toDouble: "$products.qty" },
                ],
              },
            },
            totalTP: {
              $sum: {
                $multiply: [
                  { $toDouble: "$products.tp" },
                  { $toDouble: "$products.qty" },
                ],
              },
            },
            name: { $first: "$products.name" },
            mrp: { $avg: { $toDouble: "$products.mrp" } },
            tp: { $avg: { $toDouble: "$products.tp" } },
          },
        },
      ]);
      // console.log("rtvProducts:", rtvProducts.length);
      res.status(200).json({ rtvProducts });
    } catch (err) {
      console.log(err);
      res.status(500).json({ err: err, message: "Server side error" });
    }
  })
);

// SALE & Return Products
router.get(
  "/saleProducts/:start/:end/:aamarId/:warehouse",
  expressAsyncHandler(async (req, res) => {
    try {
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
        createdAt: {
          $gte: start,
          $lte: end,
        },
        status: "complete",
        aamarId: aamarId,
      };
      if (warehouse !== "allWh" && warehouse) {
        query.warehouse = mongoose.Types.ObjectId(warehouse);
      }
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
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: "$products.id",
            article_code: { $first: "$products.article_code" },
            totalQuantity: { $sum: { $toDouble: "$products.qty" } },
            totalMrp: {
              $sum: {
                $multiply: [
                  { $toDouble: "$products.mrp" },
                  { $toDouble: "$products.qty" },
                ],
              },
            },
            totalTP: {
              $sum: {
                $multiply: [
                  { $toDouble: "$products.tp" },
                  { $toDouble: "$products.qty" },
                ],
              },
            },
            name: { $first: "$products.name" },
            mrp: { $avg: { $toDouble: "$products.mrp" } },
            tp: { $avg: { $toDouble: "$products.tp" } },
          },
        },
      ]);
      // console.log("saleProducts:", saleProducts.length);
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
            _id: "$returnProducts.id",
            article_code: { $first: "$returnProducts.article_code" },
            totalQuantity: { $sum: { $toDouble: "$returnProducts.qty" } },
            totalMrp: {
              $sum: {
                $multiply: [
                  { $toDouble: "$returnProducts.mrp" },
                  { $toDouble: "$returnProducts.qty" },
                ],
              },
            },
            totalTP: {
              $sum: {
                $multiply: [
                  { $toDouble: "$returnProducts.tp" },
                  { $toDouble: "$returnProducts.qty" },
                ],
              },
            },
            name: { $first: "$returnProducts.name" },
            weightedAvgMrp: {
              $sum: {
                $multiply: [
                  { $toDouble: "$returnProducts.mrp" },
                  { $toDouble: "$returnProducts.qty" },
                ],
              },
            },
            weightedAvgTp: {
              $sum: {
                $multiply: [
                  { $toDouble: "$returnProducts.tp" },
                  { $toDouble: "$returnProducts.qty" },
                ],
              },
            },
          },
        },
        {
          $project: {
            article_code: 1,
            totalQuantity: 1,
            totalMrp: 1,
            totalTP: 1,
            name: 1,
            avgMrp: { $divide: ["$weightedAvgMrp", "$totalQuantity"] },
            avgTp: { $divide: ["$weightedAvgTp", "$totalQuantity"] },
          },
        },
      ]);
      // console.log("salesReturnProducts:", salesReturnProducts.length);
      res
        .status(200)
        .json({ sale: saleProducts, saleReturn: salesReturnProducts });
    } catch (err) {
      console.log(err);
      res.status(500).json({ err: err, message: "Server side error" });
    }
  })
);

// Damage Products
router.get(
  "/damageProducts/:start/:end/:aamarId/:warehouse",
  expressAsyncHandler(async (req, res) => {
    try {
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
        createdAt: {
          $gte: start,
          $lte: end,
        },
        status: "active",
        aamarId: aamarId,
      };
      if (warehouse !== "allWh" && warehouse) {
        query.warehouse = mongoose.Types.ObjectId(warehouse);
      }

      // damage Products
      const damageProducts = await Damage.aggregate([
        {
          $match: query,
        },
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: "$products.id",
            article_code: { $first: "$products.article_code" },
            totalQuantity: { $sum: { $toDouble: "$products.qty" } },
            // totalMrp: {
            //   $sum: {
            //     $multiply: [
            //       {
            //         $ifNull: ["$products.mrp", 0]
            //       },
            //       { $toDouble: "$products.qty" }
            //     ]
            //   }
            // },
            totalTP: {
              $sum: {
                $multiply: [
                  {
                    $ifNull: ["$products.tp", 0],
                  },
                  { $toDouble: "$products.qty" },
                ],
              },
            },
            name: { $first: "$products.name" },
            // mrp: {
            //   $avg: {
            //     $ifNull: ["$products.mrp", 0]
            //   }
            // },
            tp: {
              $avg: {
                $ifNull: ["$products.tp", 0],
              },
            },
          },
        },
      ]);
      // console.log("damageProducts", damageProducts.length);
      res.status(200).json({ damageProducts });
    } catch (err) {
      console.log(err);
      res.status(500).json({ err: err, message: "Server side error" });
    }
  })
);

module.exports = router;
