/**
 * Suppliers API
 * 1. get all Suppliers
 * 2. get Supplier by id
 * 3. get Supplier by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Supplier = require("../models/supplierModel");
const ProductTable = require("../models/productModel");
const checklogin = require("../middlewares/checkLogin");
const Product = require("../models/productModel");
const mongoose = require("mongoose");

const supplierRouter = express.Router();

// COUNT PRODUCT
supplierRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const total = await Supplier.countDocuments({ aamarId });
    res.status(200).json(total);
  })
);

//  GET supplier BY TYPE and select
supplierRouter.get("/list/:aamarId", async (req, res) => {
  try {
    const { aamarId } = req.params;
    const suppliers = await Supplier.find({ aamarId });
    if (!suppliers.length) {
      return res.status(200).json([]);
    }
    res.status(200).json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// CREATE ONE PRODUCT Import
supplierRouter.post(
  "/import",
  expressAsyncHandler(async (req, res) => {
    // console.log("Request body:", req.body); // Log to see what is in the body

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "No data received in the request" });
    }

    const newSupplier = new Supplier(req.body);

    try {
      const result = await newSupplier.save();
      if (result) {
        res.status(200).json({
          // Supplier: result,
          message: "Supplier created successfully",
          status: "success",
        });
      } else {
        res.status(500).json({
          message: "There was a server-side error",
          error: err,
          status: "failed",
        });
      }
    } catch (err) {
      console.error("Error saving Supplier:", err); // Log the error
      res
        .status(500)
        .json({ message: "There was a server-side error", error: err });
    }
  })
);

// uniq code check
supplierRouter.get(
  "/unique/:code/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { code, aamarId } = req.params;

    try {
      // Check if the specific code exists in the database
      const supplier = await Supplier.findOne({ code: code, aamarId });

      if (supplier) {
        // Code exists
        return res.status(200).json({ exists: true });
      } else {
        // Code does not exist
        return res.status(200).json({ exists: false });
      }
    } catch (error) {
      console.error("Error fetching from database:", error);
      return res.status(500).send("Server error");
    }
  })
);
// GET ALL suppliers
supplierRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const suppliers = await Supplier.find({
      status: "active",
    })
      .select({
        name: 1,
        email: 1,
        code: 1,
        company: 1,
        phone: 1,
        products: 1,
      })
      .populate({
        path: "products.id",
        model: "Product",
      });
    // .exec();
    // .populate("Product.id");
    // .populate("Products.id", { name: 1, article_code: 1, priceList: 1 });
    res.send(suppliers);
    // // res.send('removed');
    // console.log(suppliers);
  })
);

supplierRouter.get(
  "/export/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const suppliers = await Supplier.find({
      status: "active",
      aamarId: aamarId,
    }).select({
      _id: 1,
      name: 1,
      code: 1,
      company: 1,
      phone: 1,
    });
    res.send(suppliers);
    // console.log(suppliers);
  })
);

// GET Count suppliers
// supplierRouter.get(
//   "/count",
//   expressAsyncHandler(async (req, res) => {
//     const total = await Supplier.countDocuments({});
//     // console.log("id");
//     res.status(200).json(total);
//   })
// );
supplierRouter.get(
  "/search/po/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();

    if (!aamarId) {
      return res.status(400).json({ msg: "aamarId is required" });
    }

    // Define the query based on whether the search is a number or text
    let query = { aamarId };

    const isNumber = /^\d/.test(payload);
    if (!isNumber) {
      query = { ...query, company: { $regex: new RegExp(payload, "i") } };
    } else {
      query = { ...query, code: { $regex: new RegExp(payload, "i") } };
    }

    try {
      const search = await Supplier.aggregate([
        {
          $match: query,
        },
        {
          $project: {
            _id: 1,
            company: 1,
            code: 1,
            name: 1,
            address: 1,
            type: 1,
            phone: 1,
            email: 1,
            status: 1,
          },
        },
        {
          $limit: 10,
        },
      ]);

      if (payload === "") {
        const suppliers = await Supplier.find({ aamarId }).limit(10);
        res.status(200).json(suppliers);
      } else {
        res.status(200).json(search);
      }
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ msg: "Error occurred while searching", error: err.message });
    }
  })
);

supplierRouter.get(
  "/search/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();

    // Ensure aamarId is provided and valid
    if (!aamarId) {
      return res.status(400).json({ msg: "aamarId is required" });
    }

    // Check if payload is a number or string
    const isNumber = /^\d/.test(payload);

    // Construct the query object
    let query = { aamarId };
    if (!isNumber) {
      query = { ...query, company: { $regex: new RegExp(payload, "i") } };
    } else {
      query = { ...query, code: { $regex: new RegExp(payload, "i") } };
    }

    try {
      // Perform the search
      const search = await Supplier.aggregate([
        {
          $match: query,
        },
        {
          $project: {
            _id: 1,
            company: 1,
            code: 1,
            name: 1,
            address: 1,
            type: 1,
            phone: 1,
            products: 1,
            email: 1,
            status: 1,
          },
        },
        {
          $limit: 10,
        },
      ]);

      if (payload === "") {
        // Handle the case where the payload is empty (all suppliers for the aamarId)
        const supplier = await Supplier.find({ aamarId }).limit(10);
        return res.status(200).json(supplier);
      } else {
        return res.status(200).json(search);
      }
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ msg: "Error occurred while searching", error: err.message });
    }
  })
);

// GET ONE SUPPLIER FOR UPDATE
supplierRouter.get(
  "/grn/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      let suppliers = await Supplier.find({
        _id: id,
        status: "active",
      }).select({
        name: 1,
        email: 1,
        code: 1,
        company: 1,
        phone: 1,
        products: 1,
      });
      // .populate("products")
      // .populate({
      //   path: "products.id",
      //   model: "Product",
      //   populate: {
      //     path: "priceList",
      //     model: "Price",
      //   },
      // });
      const products = suppliers[0].products;
      // console.log("products", products)
      let p_article = [];
      products.map((pro) => {
        p_article = [...p_article, pro.get("article_code")];
      });
      // console.log("p_article", p_article)
      const findProducts = await Product.find({
        article_code: p_article,
      }).select({
        article_code: 1,
      });
      // console.log("final", findProducts.length)
      let finalProduct = [];
      findProducts.map((pro) => {
        const pp = products.filter(
          (p) => p.get("article_code") === pro.article_code
        );
        finalProduct = [...finalProduct, pp[0]];
      });
      // console.log("b", products)
      // console.log("a", finalProduct)

      // console.log("suppliers", suppliers[0]);
      const newSupplier = {
        ...suppliers[0].toObject(),
        products: finalProduct,
      };
      // console.log("newProduct", newSupplier);
      const populatedSupplier = await Supplier.populate(newSupplier, {
        path: "products.id",
        model: "Product",
        populate: {
          path: "group",
          model: "Group",
        },
      });
      // console.log("populatedS", populatedSupplier)
      // const n = populatedSupplier.find({ article_code: "6017023" })
      res.send(populatedSupplier);
      // console.log("removed");
    } catch (err) {
      res.send(err);
    }
  })
);
// GET ONE SUPPLIER FOR UPDATE
supplierRouter.get(
  "/po/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId;
    try {
      const supplier = await Supplier.aggregate([
        {
          $match: {
            $or: [
              { _id: id },
              ...(mongoose.isValidObjectId(id)
                ? [{ _id: mongoose.Types.ObjectId(id) }]
                : []),
            ],
            aamarId: aamarId,
          },
        },
        // {
        //   $lookup: {
        //     from: "products",
        //     let: { productIds: { $map: { input: "$products", as: "product", in: { $toObjectId: "$$product.id" } } } },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: { $in: ["$_id", "$$productIds"] }
        //         }
        //       },
        //       {
        //         $lookup: {
        //           from: "groups",
        //           localField: "group",
        //           foreignField: "_id",
        //           as: "groupDetails"
        //         }
        //       },
        //       {
        //         $project: {
        //           name: 1,
        //           article_code: 1,
        //           tp: 1,
        //           mrp: 1,
        //           group: {
        //             $cond: [
        //               { $gt: [{ $size: "$groupDetails" }, 0] },
        //               { $arrayElemAt: ["$groupDetails", 0] },
        //               null
        //             ]
        //           },
        //           _id: 1
        //         }
        //       },
        //       {
        //         $project: {
        //           name: 1,
        //           article_code: 1,
        //           tp: 1,
        //           mrp: 1,
        //           group: {
        //             _id: 1,
        //             name: 1,
        //             code: 1
        //           },
        //           _id: 0,
        //           id: "$_id"
        //         }
        //       }
        //     ],
        //     as: "productDetails",
        //   },
        // },
        // {
        //   $addFields: {
        //     products: {
        //       $map: {
        //         input: "$products",
        //         as: "product",
        //         in: {
        //           $mergeObjects: [
        //             "$$product",
        //             {
        //               group: {
        //                 $arrayElemAt: [
        //                   "$productDetails.group",
        //                   {
        //                     $indexOfArray: [
        //                       { $map: { input: "$productDetails", as: "pd", in: { $toObjectId: "$$pd._id" } } },
        //                       { $toObjectId: "$$product.id" }
        //                     ]
        //                   }
        //                 ]
        //               }
        //             },
        //             // {
        //             //   inventory: {
        //             //     $arrayElemAt: [
        //             //       "$inventory",
        //             //       {
        //             //         $indexOfArray: [
        //             //           { $map: { input: "$inventory", as: "inv", in: "$$inv.article_code" } },
        //             //           "$$product.article_code"
        //             //         ]
        //             //       }
        //             //     ]
        //             //   }
        //             // }
        //           ]
        //         }
        //       }
        //     }
        //   }
        // },
        // {
        //   $project: {
        //     products: 0,
        //   }
        // }
      ]);

      res.send(supplier[0]);
    } catch (err) {
      res.send(err);
    }
  })
);

// GET SUPPLIER DETAILS BY ID AFTER SELECTING - PO | GRN

supplierRouter.get(
  "/details/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId;
    const { warehouse } = req.query; // Optional warehouseId for filtering

    console.log("aamarId and id", aamarId, id, "warehouse:", warehouse);

    try {
      const pipeline = [
        {
          $match: {
            $or: [
              { _id: id },
              ...(mongoose.isValidObjectId(id) ? [{ _id: mongoose.Types.ObjectId(id) }] : [])
            ],
            aamarId: aamarId,
          },
        },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products", // Replace with the correct collection name
            localField: "products.article_code",
            foreignField: "article_code",
            as: "productDetails",
          },
        },
        {
          $unwind: {
            path: "$productDetails",
            preserveNullAndEmptyArrays: true,
          },
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
          $unwind: {
            path: "$groupDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "inventories",
            let: { articleCodeAddress: "$products.article_code" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$article_code", "$$articleCodeAddress"] },
                      warehouse && warehouse !== "allWh"
                        ? { $eq: ["$warehouse", mongoose.Types.ObjectId(warehouse)] }
                        : {},
                    ].filter((cond) => Object.keys(cond).length > 0),
                  },
                },
              },
            ],
            as: "inventoryDetails",
          },
        },
        {
          $addFields: {
            "products.stock": {
              $ifNull: [{ $sum: "$inventoryDetails.currentQty" }, 0],
            },
          },
        },
        // Filter out products that don't belong to the selected warehouse if warehouse is provided
        ...(warehouse && warehouse !== "allWh"
          ? [
            {
              $match: {
                inventoryDetails: { $exists: true, $not: { $size: 0 } },
              },
            },
          ]
          : []),
        {
          $lookup: {
            from: "brands",
            localField: "productDetails.brand",
            foreignField: "_id",
            as: "brandDetails",
          },
        },
        {
          $unwind: {
            path: "$brandDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "generics",
            localField: "productDetails.generic",
            foreignField: "_id",
            as: "genericDetails",
          },
        },
        {
          $unwind: {
            path: "$genericDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            address: { $first: "$address" },
            code: { $first: "$code" },
            company: { $first: "$company" },
            companyLayer: { $first: "$companyLayer" },
            createdAt: { $first: "$createdAt" },
            email: { $first: "$email" },
            name: { $first: "$name" },
            phone: { $first: "$phone" },
            productDetails: {
              $push: {
                id: "$productDetails._id",
                article_code: "$productDetails.article_code",
                name: "$productDetails.name",
                mrp: "$productDetails.mrp",
                tp: "$productDetails.tp",
                group: "$groupDetails.name",
                generic: "$genericDetails.name",
                brand: "$brandDetails.name",
                unit: "$productDetails.unit",
                stock: { $ifNull: ["$inventoryDetails.currentQty", 0] },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            address: 1,
            code: 1,
            company: 1,
            companyLayer: 1,
            createdAt: 1,
            email: 1,
            name: 1,
            phone: 1,
            productDetails: 1,
          },
        },
      ];

      const supplierData = await Supplier.aggregate(pipeline);
      res.status(200).json(supplierData[0]);
    } catch (err) {
      console.error("Error:", err);
      res.status(500).json({ message: "Error fetching supplier details" });
    }
  })
);

// SUPPLIER LEDGER | BIOGRAPHY
supplierRouter.get(
  "/ledger/:id",
  expressAsyncHandler(async (req, res) => {
    try {
      const id = req.params.id;

      // console.log("id", id);

      const supplier = await Supplier.aggregate([
        {
          $match: {
            $or: [
              { _id: id },
              ...(mongoose.isValidObjectId(id) ? [{ _id: mongoose.Types.ObjectId(id) }] : [])
            ],
          },
        },
        {
          $lookup: {
            from: "accounts",
            localField: "_id",
            foreignField: "supplier",
            as: "accounts",
          },
        },
        {
          $lookup: {
            from: "grns",
            localField: "_id",
            foreignField: "supplier",
            as: "grns",
          },
        },
        {
          $lookup: {
            from: "rtvs",
            localField: "_id",
            foreignField: "supplier",
            as: "rtvs",
          },
        },
        {
          $project: {
            _id: 1,
            code: 1,
            company: 1,
            name: 1,
            phone: 1,
            email: 1,
            records: {
              $concatArrays: [
                {
                  $map: {
                    input: "$accounts",
                    as: "account",
                    in: {
                      _id: "$$account._id",
                      type: "Accounts",
                      doc_id: "$$account.acId",
                      amount: "$$account.amount",
                      status: "$$account.status",
                      createdAt: "$$account.createdAt",
                    },
                  },
                },
                {
                  $map: {
                    input: "$grns",
                    as: "grn",
                    in: {
                      _id: "$$grn._id",
                      type: "GRN",
                      doc_id: "$$grn.grnNo",
                      amount: "$$grn.total",
                      status: "$$grn.status",
                      createdAt: "$$grn.createdAt",
                    },
                  },
                },
                {
                  $map: {
                    input: "$rtvs",
                    as: "rtv",
                    in: {
                      _id: "$$rtv._id",
                      type: "RTV",
                      doc_id: "$$rtv.rtvNo",
                      amount: "$$rtv.total",
                      status: "$$rtv.status",
                      createdAt: "$$rtv.createdAt",
                      balance: "",
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $unwind: "$records",
        },
        {
          $sort: { "records.createdAt": -1 },
        },
        {
          $group: {
            _id: "$_id",
            company: { $first: "$company" },
            name: { $first: "$name" },
            code: { $first: "$code" },
            phone: { $first: "$phone" },
            email: { $first: "$email" },
            records: { $push: "$records" },
          },
        },
      ]);
      // console.log(supplier[0]);
      res.status(200).json(supplier[0]);
    } catch (err) {
      console.log(err);

      res.status(500).json({ message: "Error in fetching supplier" });
    }
  })
);

// GET SUPPLIER BY ID WITH PRODUCTS
supplierRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      // Step 1: Fetch supplier base data using findById or findOne (supports String and ObjectId)
      const supplierDoc =
        (await Supplier.findById(id).lean()) ||
        (await Supplier.findOne({ _id: id }).lean());

      if (!supplierDoc) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Step 2: Extract article_codes from the products Map array
      const products = supplierDoc.products || [];
      const articleCodes = products
        .map((p) => {
          if (p && typeof p === "object") {
            return p.article_code;
          }
          return null;
        })
        .filter(Boolean);

      // Step 3: Fetch product details with populated brand/generic/group and inventory stock
      let productDetails = [];
      if (articleCodes.length > 0) {
        const warehouse = req.query.warehouse || "";
        productDetails = await Product.aggregate([
          { $match: { article_code: { $in: articleCodes } } },
          {
            $addFields: {
              brandObjId: { $convert: { input: "$brand", to: "objectId", onError: null, onNull: null } },
              genericObjId: { $convert: { input: "$generic", to: "objectId", onError: null, onNull: null } },
              groupObjId: { $convert: { input: "$group", to: "objectId", onError: null, onNull: null } }
            }
          },
          {
            $lookup: {
              from: "groups",
              localField: "groupObjId",
              foreignField: "_id",
              as: "groupDetails",
            },
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
            $lookup: {
              from: "generics",
              localField: "genericObjId",
              foreignField: "_id",
              as: "genericDetails",
            },
          },
          {
            $lookup: {
              from: "inventories",
              let: { articleCode: "$article_code" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$article_code", "$$articleCode"] },
                        { $eq: ["$aamarId", supplierDoc.aamarId] },
                        { $eq: ["$status", "active"] },
                        warehouse && warehouse !== "allWh"
                          ? {
                              $eq: [
                                "$warehouse",
                                mongoose.Types.ObjectId.isValid(warehouse)
                                  ? new mongoose.Types.ObjectId(warehouse)
                                  : warehouse,
                              ],
                            }
                          : {},
                      ].filter((cond) => Object.keys(cond).length > 0),
                    },
                  },
                },
              ],
              as: "inventoryDetails",
            },
          },
          {
            $addFields: {
              stockQty: { $ifNull: [{ $sum: "$inventoryDetails.currentQty" }, 0] },
            },
          },
          {
            $project: {
              name: 1,
              article_code: 1,
              tp: 1,
              mrp: 1,
              unit: 1,
              brand: { $arrayElemAt: ["$brandDetails", 0] },
              generic: { $arrayElemAt: ["$genericDetails", 0] },
              group: { $arrayElemAt: ["$groupDetails", 0] },
              stock: {
                currentQty: "$stockQty",
              },
              id: "$_id",
              _id: 0,
            },
          },
          {
            $project: {
              name: 1,
              article_code: 1,
              tp: 1,
              mrp: 1,
              unit: 1,
              stock: 1,
              id: 1,
              "brand._id": 1,
              "brand.name": 1,
              "brand.code": 1,
              "generic._id": 1,
              "generic.name": 1,
              "generic.code": 1,
              "group._id": 1,
              "group.name": 1,
              "group.code": 1,
            },
          },
        ]);
      }

      // Step 4: Return supplier with all fields + productDetails
      const result = {
        _id: supplierDoc._id,
        name: supplierDoc.name,
        company: supplierDoc.company,
        email: supplierDoc.email,
        phone: supplierDoc.phone,
        code: supplierDoc.code,
        address: supplierDoc.address,
        status: supplierDoc.status,
        type: supplierDoc.type,
        aamarId: supplierDoc.aamarId,
        createdAt: supplierDoc.createdAt,
        updatedAt: supplierDoc.updatedAt,
        productDetails: productDetails.length > 0 ? productDetails : products,
      };

      res.send(result);
    } catch (err) {
      console.error("Error fetching supplier by ID:", err);
      res.status(500).json({ message: "Error fetching supplier", error: err.message });
    }
  })
);

// supplierRouter.get(
//   "/:id",
//   expressAsyncHandler(async (req, res) => {
//     const id = req.params.id;

//     try {
//       const supplier = await Supplier.aggregate([
//         { $match: { _id: mongoose.Types.ObjectId(id) } },
//         // {
//         //   $lookup: {
//         //     from: "products",
//         //     localField: "products",
//         //     foreignField: "_id",
//         //     as: "productDetails",
//         //   },
//         // },
//         // { $unwind: "$productDetails" },
//         // {
//         //   $lookup: {
//         //     from: "groups",
//         //     localField: "productDetails.group",
//         //     foreignField: "_id",
//         //     as: "productDetails.groupDetails",
//         //   },
//         // },
//         // {
//         //   $group: {
//         //     _id: "$_id",
//         //     root: { $first: "$$ROOT" },
//         //     productDetails: { $push: "$productDetails" },
//         //   },
//         // },
//         // {
//         //   $replaceRoot: {
//         //     newRoot: {
//         //       $mergeObjects: ["$root", "$$ROOT"],
//         //     },
//         //   },
//         // },
//         // {
//         //   $project: { root: 0 },
//         // },
//       ]);
//       console.log(supplier[0]);
//       res.send(supplier[0] || "Supplier not found");
//     } catch (err) {
//       res.status(500).send({ message: err.message });
//     }
//   })
// );

// GET ONE SUPPLIER FOR UPDATE
supplierRouter.get(
  "/pk/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      let suppliers = await Supplier.find({
        _id: id,
        status: "active",
      }).select({
        name: 1,
        email: 1,
        code: 1,
        company: 1,
        phone: 1,
        products: 1,
      });
      // .populate("products")
      // .populate({
      //   path: "products.id",
      //   model: "Product",
      //   populate: {
      //     path: "priceList",
      //     model: "Price",
      //   },
      // });
      const products = suppliers[0].products;
      // console.log("products", products)
      let p_article = [];
      products.map((pro) => {
        p_article = [...p_article, pro.get("article_code")];
      });
      // console.log("p_article", p_article)
      const findProducts = await Product.find({
        article_code: p_article,
      }).select({
        article_code: 1,
      });
      // console.log("final", findProducts.length)
      let finalProduct = [];
      findProducts.map((pro) => {
        const pp = products.filter(
          (p) => p.get("article_code") === pro.article_code
        );
        finalProduct = [...finalProduct, pp[0]];
      });
      // console.log("b", products)
      // console.log("a", finalProduct)

      // console.log("suppliers", suppliers[0]);
      const newSupplier = {
        ...suppliers[0].toObject(),
        products: finalProduct,
      };
      // console.log("newProduct", newSupplier)
      const populatedSupplier = await Supplier.populate(newSupplier, {
        path: "products.id",
        model: "Product",
        populate: {
          path: "priceList",
          model: "Price",
        },
      });
      // console.log("populatedS", populatedSupplier)

      res.send(populatedSupplier);
      // console.log("removed");
    } catch (err) {
      res.send(err);
    }
  })
);
// GET ONE SUPPLIER FOR UPDATE
supplierRouter.get(
  "/testnew/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      const suppliers = await Supplier.find({
        _id: id,
        status: "active",
      })
        .select({
          name: 1,
          email: 1,
          code: 1,
          company: 1,
          phone: 1,
          products: 1,
        })
        .populate("products")
        .populate({
          path: "products.id",
          model: "Product",
          populate: {
            path: "priceList",
            model: "Price",
          },
        });

      res.send(suppliers[0]);
      // console.log("removed");
      // console.log(suppliers);
    } catch (err) {
      res.send(err);
    }
  })
);

// GET ONE SUPPLIER BY ID
supplierRouter.get(
  "/update/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      const suppliers = await Supplier.find({
        _id: id,
        status: "active",
      }).select({
        name: 1,
        email: 1,
        code: 1,
        company: 1,
        phone: 1,
        products: 1,
      });

      res.send(suppliers[0]);
      // console.log("removed");
      // console.log(suppliers);
    } catch (err) {
      res.send(err);
    }
  })
);

// GET suppliers by Product article_code
supplierRouter.get(
  "/product/:code",
  expressAsyncHandler(async (req, res) => {
    const code = req.params.code;
    const suppliers = await Supplier.find({
      // _id: id,
      status: "active",
    });
    // console.log(code);
    // }).populate("Product.id", "name", "ean", "article_code", "unit");
    res.send(suppliers);
    // // res.send('removed');
    // console.log(suppliers.name);
  })
);

// CREATE ONE Supplier
supplierRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newSupplier = new Supplier(req.body);
    // console.log("newSupplier", newSupplier);
    try {
      await newSupplier.save();
      res.status(200).json({
        message: "Supplier is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI suppliers
supplierRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Supplier.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "suppliers are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Supplier
supplierRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id || "";

    try {
      const response = await Supplier.updateOne(
        { _id: id },
        { $set: req.body }
      );

      res.send(response);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Internal Server Error", error });
    }
  })
);

// DELETE ONE Supplier
supplierRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Supplier.deleteOne({ _id: id })
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
supplierRouter.get(
  "/:page/:size/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const aamarId = req.params.aamarId;
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = page + 0;

    let query = { aamarId };
    let suppliers = [];
    // const size = parseInt(req.query.size);
    // console.log("page:1", page, "size:1", size, "search:1", queryString);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);
    // console.log(typeof queryString);

    //check if search or the pagenation

    if (queryString) {
      // console.log("== query");

      // console.log("search:", query);
      // query = { grnNo: { $regex: new RegExp(queryString + ".*?", "i") } };
      // search check if num or string
      const isNumber = /^\d/.test(queryString);
      // console.log(isNumber);
      if (!isNumber) {
        // if text then search name
        // query = { name:  queryString  };
        query = { company: { $regex: new RegExp(queryString + ".*?", "i") } };
      } else {
        // if number search in ean and article code
        query = {
          $or: [
            {
              code: {
                $regex: RegExp("^" + queryString + ".*", "i"),
              },
            },
            {
              phone: {
                $regex: RegExp("^" + queryString + ".*", "i"),
              },
            },
          ],
        };
      }
      // console.log(query);

      suppliers = await Supplier.find(query)
        .select({
          name: 1,
          email: 1,
          code: 1,
          company: 1,
          phone: 1,
        })
        .limit(100);
      // .populate("userId", "name")
      // .populate("poNo", "poNo")
      // // .populate("supplier", { company: 1, email: 1, phone: 1, address: 1 })
      // .populate("warehouse", "name");
      res.status(200).json(suppliers);
    } else {
      // console.log("no query");

      // regular pagination

      suppliers = await Supplier.find(query)
        .select({
          name: 1,
          email: 1,
          code: 1,
          company: 1,
          phone: 1,
        })
        .limit(size)
        .skip(size * page);
      // .populate("warehouse", "name");
      res.status(200).json(suppliers);
      // console.log("done:", query);
    }
  })
);

module.exports = supplierRouter;
