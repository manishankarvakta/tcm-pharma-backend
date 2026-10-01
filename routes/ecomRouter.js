const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Sale = require("../models/saleModel");
const Product = require("../models/productModel");
const Customer = require("../models/customerModel");
const Category = require("../models/categoryModel");
const bcrypt = require("bcrypt");
const checklogin = require("../middlewares/checkLogin");
const { generateEcomId } = require("../middlewares/generateId");
const { startOfDay, endOfDay } = require("date-fns");
const ecomRouter = express.Router();

/*==========================
* PRODUCT
===========================*/

// GET FEATURED PRODUCTS
//get all the offer type products
ecomRouter.get(
  "/product/offer",
  expressAsyncHandler(async (req, res) => {
    const products = await Product.find({ product_type: "offer" })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        unit: 1,
        article_code: 1,
        priceList: 1,
        category: 1,
        promo_price: 1,
        promo_start: 1,
        promo_end: 1,
        promo_type: 1,
        featured: 1,
        photo: 1,
        product_type: 1,
      })
      .populate("category", "name")
      .populate("priceList");
    // console.log("products", products)
    const fProducts = products.filter((p) => p.priceList.length > 0);
    // console.log("fProducts", fProducts)

    if (fProducts) {
      res.status(200).json(fProducts);
    }
  })
);
//get all the combo type products
ecomRouter.get(
  "/product/combo",
  expressAsyncHandler(async (req, res) => {
    const products = await Product.find({ product_type: "combo" })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        unit: 1,
        article_code: 1,
        priceList: 1,
        category: 1,
        promo_price: 1,
        promo_start: 1,
        promo_end: 1,
        promo_type: 1,
        featured: 1,
        photo: 1,
        product_type: 1,
      })
      .populate("category", "name")
      .populate("priceList");
    // console.log("products", products)
    const fProducts = products.filter((p) => p.priceList.length > 0);
    // console.log("fProducts", fProducts)

    if (fProducts) {
      res.status(200).json(fProducts);
    }
  })
);

//get all the products between promo date
ecomRouter.get(
  "/product/promo-products",
  expressAsyncHandler(async (req, res) => {
    const today = new Date();
    try {
      const product = await Product.aggregate([
        {
          $match: {
            promo_price: { $ne: null },
            promo_start: { $lte: today },
            promo_end: { $gte: today },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            article_code: 1,
            promo_price: 1,
            promo_type: 1,
            promo_start: 1,
            promo_end: 1,
            photo: 1,
            priceList: 1,
          },
        },
      ]);
      const populatedProducts = await Product.populate(product, {
        path: "priceList",
      });
      // console.log(populatedProducts);
      const fProducts = populatedProducts.filter((p) => p.priceList.length > 0);
      // console.log(fProducts);
      // .populate("priceList");
      res.send(fProducts);
    } catch (err) {
      console.log(err);
    }
  })
);

//get all the best selling products
ecomRouter.get(
  "/product/best-seller",
  expressAsyncHandler(async (req, res) => {
    try {
      const product = await Sale.aggregate([
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
          },
        },
        {
          $sort: { totalQuantity: -1 },
        },
        {
          $limit: 20,
        },
      ]);
      let pProduct_AC = [];
      product.map((pro) => {
        pProduct_AC = [...pProduct_AC, pro.article_code];
      });
      // console.log("pProduct", pProduct_AC);

      const productDetails = await Product.find({
        article_code: pProduct_AC,
      }).populate("priceList");
      // console.log("pProduct new", productDetails);
      const fProducts = productDetails.filter((p) => p.priceList.length > 0);
      // .populate("priceList");
      res.send({ product: product, productDetails: fProducts });
    } catch (err) {
      console.log(err);
    }
  })
);

// GET PRODUCT BY CATEGORY
ecomRouter.get(
  "/featured",
  expressAsyncHandler(async (req, res) => {
    const product = await Product.find({ featured: true })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        unit: 1,
        article_code: 1,
        priceList: 1,
        category: 1,
        promo_price: 1,
        promo_start: 1,
        promo_end: 1,
        promo_type: 1,
        featured: 1,
        photo: 1,
      })
      .limit(20)
      .populate("category", "name")
      .populate("priceList");
    if (product) {
      const fProducts = product.filter((p) => p.priceList.length > 0);
      // console.log(fProducts);
      res.status(200).json(fProducts);
    }
  })
);

// GET PRODUCT BY CATEGORY
ecomRouter.get(
  "/product/category/:id/:page/:size",
  expressAsyncHandler(async (req, res) => {
    const category = req.params.id;
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
          category: category,
          name: { $regex: new RegExp(".*" + queryString + ".*?", "i") },
        };
        // query = { name:  queryString  };
      } else {
        // if number search in ean and article code
        query = {
          $or: [
            {
              category: category,
              ean: { $regex: RegExp("^" + queryString + ".*", "i") },
            },
            {
              category: category,
              article_code: {
                $regex: RegExp("^" + queryString + ".*", "i"),
              },
            },
          ],
        };
      }
      console.log(query);

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          ean: 1,
          unit: 1,
          article_code: 1,
          priceList: 1,
          category: 1,
          promo_price: 1,
          promo_start: 1,
          promo_end: 1,
          promo_type: 1,
        })
        .limit(100)
        .populate("category", "name")
        .populate("priceList");

      const fProducts = product.filter((p) => p.priceList.length > 0);
      res.status(200).json(fProducts);
    } else {
      console.log("no query");

      // regular pagination
      query = { category: category };

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          ean: 1,
          unit: 1,
          article_code: 1,
          priceList: 1,
          category: 1,
          promo_price: 1,
          promo_start: 1,
          promo_end: 1,
          promo_type: 1,
        })
        .limit(size)
        .skip(size * page)
        .populate("category", "name")
        .populate("priceList");

      const fProducts = product.filter((p) => p.priceList.length > 0);
      res.status(200).json(fProducts);
      // console.log("done:", query);
    }
  })
);
// ecomRouter.get(
//     "/product/category/:id",
//     expressAsyncHandler(async (req, res) => {
//         const category = req.params.id;
//         const products = await Product.find({ category: category })
//             .select({
//                 _id: 1,
//                 name: 1,
//                 ean: 1,
//                 unit: 1,
//                 vat: 1,
//                 article_code: 1,
//                 priceList: 1,
//                 promo_price: 1,
//                 promo_start: 1,
//                 promo_end: 1,
//                 promo_type: 1
//             })
//             .populate("priceList", "mrp");
//         // .limit(5);
//         // Select fields
//         // console.log(products);
//         // console.log(category);
//         res.send(products);
//     })
// );

// GET PRODUCTS BY SIZE AND PAGE
ecomRouter.get(
  "/product/search",
  expressAsyncHandler(async (req, res) => {
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();

    let query = {};
    let product = [];
    // const size = parseInt(req.query.size);
    // console.log("queryString", queryString);
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
        // if number search in ean and article code
        query = {
          $or: [
            { ean: { $regex: RegExp("^" + queryString + ".*", "i") } },
            {
              article_code: {
                $regex: RegExp("^" + queryString + ".*", "i"),
              },
            },
          ],
        };
      }
      // console.log(query);

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          ean: 1,
          unit: 1,
          article_code: 1,
          priceList: 1,
          category: 1,
          promo_price: 1,
          promo_start: 1,
          promo_end: 1,
          promo_type: 1,
        })
        .limit(100)
        .populate("category", "name")
        .populate("priceList");
      const fProducts = product.filter((p) => p.priceList.length > 0);
      res.status(200).json(fProducts);
    } else {
      // console.log("no query");

      // regular pagination
      query = {};

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          ean: 1,
          unit: 1,
          article_code: 1,
          priceList: 1,
          category: 1,
          promo_price: 1,
          promo_start: 1,
          promo_end: 1,
          promo_type: 1,
        })
        .populate("category", "name")
        .populate("priceList");

      const fProducts = product.filter((p) => p.priceList.length > 0);
      res.status(200).json(fProducts);
      // console.log("done:", query);
    }
  })
);
ecomRouter.get(
  "/product/:page/:size",
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
        // if number search in ean and article code
        query = {
          $or: [
            { ean: { $regex: RegExp("^" + queryString + ".*", "i") } },
            {
              article_code: {
                $regex: RegExp("^" + queryString + ".*", "i"),
              },
            },
          ],
        };
      }
      // console.log(query);

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          ean: 1,
          unit: 1,
          article_code: 1,
          priceList: 1,
          category: 1,
          promo_price: 1,
          promo_start: 1,
          promo_end: 1,
          promo_type: 1,
        })
        .limit(100)
        .populate("category", "name")
        .populate("priceList");
      const fProducts = product.filter((p) => p.priceList.length > 0);
      res.status(200).json(fProducts);
    } else {
      // console.log("no query");

      // regular pagination
      query = {};

      product = await Product.find(query)
        .select({
          _id: 1,
          name: 1,
          ean: 1,
          unit: 1,
          article_code: 1,
          priceList: 1,
          category: 1,
          promo_price: 1,
          promo_start: 1,
          promo_end: 1,
          promo_type: 1,
        })
        .limit(size)
        .skip(size * page)
        .populate("category", "name")
        .populate("priceList");

      const fProducts = product.filter((p) => p.priceList.length > 0);
      res.status(200).json(fProducts);
      // console.log("done:", query);
    }
  })
);

// GET PRODUCTS DETAILS BY ID
ecomRouter.get(
  "/product/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.findOne({ _id: id })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        vat: 1,
        unit: 1,
        article_code: 1,
        priceList: 1,
        ean: 1,
        promo_start: 1,
        promo_end: 1,
        promo_price: 1,
        promo_type: 1,
        category: 1,
        photo: 1,
      })
      .populate("priceList", { mrp: 1, tp: 1, supplier: 1, _id: 1, status: 1 })
      .populate("category", { name: 1 });
    if (products) {
      // const fProducts = products.filter(p => p.priceList.length > 0)
      // console.log(fProducts);
      res.send(products);
    }
  })
);

// GET PRODUCT BY CATEGORY
ecomRouter.get(
  "/product-similar/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.findOne({ _id: id });
    // const cProducts = await Product.find({ category: products?.category })
    const cProducts = await Product.find({
      category: products?.category,
      _id: { $ne: id },
    })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        vat: 1,
        unit: 1,
        article_code: 1,
        priceList: 1,
        ean: 1,
        promo_start: 1,
        promo_end: 1,
        promo_price: 1,
        promo_type: 1,
        category: 1,
        photo: 1,
      })
      .limit(15)
      .populate("priceList", { mrp: 1, tp: 1, supplier: 1, _id: 1, status: 1 })
      .populate("category", { name: 1 });
    // const similarP = cProducts.filter(p => p._id === id)
    if (cProducts) {
      const fProducts = cProducts.filter((p) => p.priceList.length > 0);
      res.send(fProducts);
      // res.send({ products: products, cProducts: cProducts, similarP: similarP });
    }
  })
);
// GET PRODUCT BY CATEGORY
ecomRouter.get(
  "/product_category/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const products = await Product.find({ category: id })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        vat: 1,
        unit: 1,
        article_code: 1,
        priceList: 1,
        ean: 1,
        promo_start: 1,
        promo_end: 1,
        promo_price: 1,
        promo_type: 1,
        photo: 1,
      })
      .populate("priceList", { mrp: 1, tp: 1, supplier: 1, _id: 1, status: 1 });
    if (products) {
      //   console.log(products);
      const fProducts = products.filter((p) => p.priceList.length > 0);
      res.send(fProducts);
    }
  })
);

/*==========================
* CATEGORY
===========================*/
// GET ALL CATEGORY BY GROUP
ecomRouter.get(
  "/category/group/:group",
  expressAsyncHandler(async (req, res) => {
    const group = req.params.group;
    const categories = await Category.find({ group: group });
    res.send(categories);
  })
);

// GET ALL CATEGORY BY MASTER CATEGORY
ecomRouter.get(
  "/category/master/:mcId",
  expressAsyncHandler(async (req, res) => {
    const mcId = req.params.mcId;
    const categories = await Category.find({
      mcId: mcId,
      mc: { $exists: true },
    });
    res.send(categories);
  })
);

/*==========================
* SALE
===========================*/
/*==========================
* CUSTOMERS
===========================*/
// GET ALL sales
ecomRouter.get(
  "/sale",
  expressAsyncHandler(async (req, res) => {
    const sales = await Sale.find({
      source: "web",
    }).select({
      invoiceId: 1,
      totalItem: 1,
      grossTotalRound: 1,
      total: 1,
      status: 1,
      billerId: 1,
      createdAt: 1,
      changeAmount: 1,
      status: 1,
    });
    // .populate("billerId", "name");
    res.send(sales);
    // // res.send('removed');
  })
);
// GET ALL order sales
ecomRouter.get(
  "/sale/order",
  expressAsyncHandler(async (req, res) => {
    const sales = await Sale.find({
      source: "web",
      status: "order",
    }).select({
      invoiceId: 1,
      totalItem: 1,
      grossTotalRound: 1,
      total: 1,
      status: 1,
      billerId: 1,
      createdAt: 1,
      changeAmount: 1,
      status: 1,
    });
    // .populate("billerId", "name");
    res.send(sales);
    // // res.send('removed');
  })
);
// GET ALL order sales
ecomRouter.get(
  "/sale/process",
  expressAsyncHandler(async (req, res) => {
    const sales = await Sale.find({
      source: "web",
      status: { $in: ["confirm", "deliver", "process"] },
    }).select({
      invoiceId: 1,
      totalItem: 1,
      grossTotalRound: 1,
      total: 1,
      status: 1,
      billerId: 1,
      createdAt: 1,
      changeAmount: 1,
      status: 1,
    });
    // .populate("billerId", "name");
    res.send(sales);
    // // res.send('removed');
  })
);
// GET ALL order sales
ecomRouter.get(
  "/sale/cancel",
  expressAsyncHandler(async (req, res) => {
    const sales = await Sale.find({
      source: "web",
      status: "cancel",
    }).select({
      invoiceId: 1,
      totalItem: 1,
      grossTotalRound: 1,
      total: 1,
      status: 1,
      billerId: 1,
      createdAt: 1,
      changeAmount: 1,
      status: 1,
    });
    // .populate("billerId", "name");
    res.send(sales);
    // // res.send('removed');
  })
);
// GET ALL order sales
ecomRouter.get(
  "/sale/complete",
  expressAsyncHandler(async (req, res) => {
    const sales = await Sale.find({
      source: "web",
      status: "complete",
    }).select({
      invoiceId: 1,
      totalItem: 1,
      grossTotalRound: 1,
      total: 1,
      status: 1,
      billerId: 1,
      createdAt: 1,
      changeAmount: 1,
      status: 1,
    });
    // .populate("billerId", "name");
    res.send(sales);
    // // res.send('removed');
  })
);
// GET ALL sales by customer
ecomRouter.get(
  "/sale/:cId",
  expressAsyncHandler(async (req, res) => {
    const cId = req.params.cId;
    const sales = await Sale.find({
      customerId: cId,
      source: "web",
    }).select({
      invoiceId: 1,
      totalItem: 1,
      grossTotalRound: 1,
      total: 1,
      status: 1,
      billerId: 1,
      createdAt: 1,
      changeAmount: 1,
      status: 1,
      products: 1,
    });
    // .populate("billerId", "name");
    res.send(sales);
    // // res.send('removed');
  })
);
// // GET ALL type sale
// ecomRouter.get(
//   "/sale/:status",
//   expressAsyncHandler(async (req, res) => {
//     let query = {};
//     let statusType = {};
//     let status = req.params.status;

//     console.log("status", status);

//     if (status === "process") {
//       statusType = { status: { $in: ["confirm", "deliver", "process"] } };
//     } else {
//       statusType = { status: status };
//     }
//     query = {
//       source: "web",
//       status: statusType.status,
//     };

//     console.log(query);
//     const sales = await Sale.find(query).select({
//       invoiceId: 1,
//       totalItem: 1,
//       grossTotalRound: 1,
//       total: 1,
//       status: 1,
//       billerId: 1,
//       createdAt: 1,
//       changeAmount: 1,
//       status: 1,
//     });
//     console.log("billerId", sales);
//     res.send(sales);
//     // // res.send('removed');
//   })
// );

// GET ONE sales
ecomRouter.get(
  "/sale/details/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    // console.log(id);
    const sales = await Sale.find({ _id: id, source: "web" })
      .populate("billerId", "name")
      .populate("customerId", {
        phone: 1,
        name: 1,
        point: 1,
        email: 1,
        address: 1,
      });
    res.send(sales[0]);
    // // res.send('removed');
    // console.log(sales);
  })
);

ecomRouter.post(
  "/sale",
  generateEcomId,
  // updateInventoryOutOnSaleIn,
  expressAsyncHandler(async (req, res) => {
    // console.log("body", req.body);
    let newSale = new Sale(req.body);
    // console.log("newSale", newSale);
    try {
      await newSale.save((err, sale) => {
        if (err) {
          console.log("err:", res, err);
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

// UPDATE ONE Sale
ecomRouter.put(
  "/sale/:id",
  // updateInventoryInOnSaleDel,
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body.newData;
    // console.log("ecom sale Update", update);
    // console.log("id", id);
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
// // GET ALL CATEGORY BY GROUP
// ecomRouter.get(
//     "/category/group/:group",
//     expressAsyncHandler(async (req, res) => {
//         const group = req.params.group.toLowerCase();
//         const categories = await Category.find({ group: group });
//         res.send(categories);
//     })
// );

// // GET ALL CATEGORY BY GROUP
ecomRouter.get(
  "/product/:catID",
  expressAsyncHandler(async (req, res) => {
    const catID = req.params.catID;
    const product = await Product.find({ category: catID })
      .select({
        _id: 1,
        name: 1,
        ean: 1,
        unit: 1,
        article_code: 1,
        priceList: 1,
        category: 1,
        promo_price: 1,
        promo_start: 1,
        promo_end: 1,
        promo_type: 1,
      })
      .limit(100)
      .populate("category", "name")
      .populate("priceList");
    const fProducts = product.filter((p) => p.priceList.length > 0);
    res.status(200).json(fProducts);
  })
);

/*==========================
* log in register
===========================*/
//get one Customer
ecomRouter.get(
  "/customer/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const customer = await Customer.find({ _id: id, status: "active" }).select({
      name: 1,
      email: 1,
      username: 1,
      membership: 1,
      address: 1,
      point: 1,
      phone: 1,
      dob: 1,
      gender: 1,
      photo: 1,
    });
    if (customer) {
      console.log(customer);
    }
    res.status(200).json(customer[0]);
  })
);

// UPDATE ONE Customer address
ecomRouter.put(
  "/customer/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body.customerData;
    // console.log("id", id, "update", update);
    try {
      // const customer = await Customer.updateOne({ _id: id }, { $set: update })
      // console.log("customer", customer)
      // if (customer) {
      //   res.send(customer);
      // } else {
      //   res.send({ message: "Server Side Error" })
      // }
      await Customer.updateOne({ _id: id }, { $set: update })
        .then(async (response) => {
          // console.log(response);
          await Customer.findOne({ _id: id })
            .select({
              name: 1,
              email: 1,
              username: 1,
              membership: 1,
              dob: 1,
              gender: 1,
              // type:1,
              point: 1,
              phone: 1,
            })
            .then((resp) => {
              // console.log("customer full info", resp);
              res.send(resp);
            })
            .catch((err) => {
              console.log(err);
              res.send(err);
            });
          // res.send(customer);
        })
        .catch((err) => {
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);
// UPDATE ONE Customer address
ecomRouter.put(
  "/customer/address/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body.address;
    // console.log("id", id, "update", update);
    try {
      await Customer.updateOne({ _id: id }, { $set: { address: update } })
        .then((response) => {
          // console.log(response);
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
// UPDATE ONE Customer point
ecomRouter.put(
  "/customer/point/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body.point;
    // console.log("id", id, "update", update);
    try {
      await Customer.updateOne({ _id: id }, { $set: { point: update } })
        .then((response) => {
          // console.log(response);
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

// Customer SIGNIN

ecomRouter.post(
  "/customer/register",
  expressAsyncHandler(async (req, res) => {
    console.table(req.body);
    const hashPassword = await bcrypt.hash(req.body.password, 10);
    // console.log("hashpassss", hashPassword);
    const updatedUser = {
      name: req.body.name,
      username: req.body.username,
      phone: req.body.phone,
      type: req.body.type,
      membership: req.body.membership,
      password: hashPassword,
      status: req.body.status,
    };
    // console.log(hashPassword);
    const newUser = new Customer(updatedUser);
    try {
      // console.log("newUser", newUser);
      // await newUser.save()
      //   .then(savedCustomer => {
      //     console.log('Customer saved:', savedCustomer);
      //   })
      //   .catch(error => {
      //     console.error('Error saving customer:', error);
      //   });

      const user = await newUser.save();
      // console.log("p", user);
      if (user) {
        const token = jwt.sign(
          {
            // username: user.username,
            // userId: user._id,
            // type: user.type,
            userId: user._id,
            name: user.name,
            username: user.username,
            phone: user.phone,
            type: user.type,
            point: user.point,
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.status(200).json({
          access_token: token,
          status: true,
          message: "Registration Successful",
          user: {
            id: user._id,
            name: user.name,
            username: user.username,
            phone: user.phone,
            type: user.type,
            point: user.point,
          },
          //   newUser: user,
        });
      }
    } catch (error) {
      console.log("some errors", error);
      // res.status(400).json({
      res
        .status(500)
        .json({ message: "There was a server side error", error: error });
      // });
    }

    // res.send(newUser);
  })
);

// Customer LOGIN
// ecomRouter.post(
//   "/customer/login",
//   expressAsyncHandler(async (req, res) => {
//     const isEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
//       req.body.email
//     );
//     // console.log({ body: req.body, email: isEmail })
//     try {
//       let user;
//       if (isEmail) {
//         user = await Customer.find({
//           status: "active",
//           email: req.body.email.toLowerCase(),
//         });
//       } else {
//         user = await Customer.find({
//           status: "active",
//           username: req.body.email.toLowerCase(),
//         });
//       }
//       // console.log(user)
//       if (user && user.length > 0) {
//         console.log("user", user);
//         const isValidPassword = await bcrypt.compare(
//           req.body.password,
//           user[0].password
//         );
//         if (isValidPassword) {
//           // generate token
//           const token = jwt.sign(
//             {
//               username: user[0].username,
//               userId: user[0]._id,
//               type: user[0].type,
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//           );

//           res.status(200).json({
//             access_token: token,
//             status: true,
//             user: {
//               id: user[0]._id,
//               name: user[0].name,
//               username: user[0].username,
//               email: user[0].email,
//               type: user[0].type,
//             },
//             message: "Login Successful",
//           });
//         } else {
//           res.status(401).json({
//             status: false,
//             error: "Password Does not Match",
//           });
//         }
//       } else {
//         res.status(401).json({
//           status: false,
//           error: "User Not Found",
//         });
//       }
//     } catch (err) {
//       res.status(404).json({
//         status: false,
//         error: err,
//       });
//     }
//   })
// );

ecomRouter.post(
  "/customer/isPhone",
  expressAsyncHandler(async (req, res) => {
    const isPhone = req.body.phone;
    // console.log({ body: req.body, phone: isPhone });
    try {
      let user;
      if (isPhone) {
        user = await Customer.find({
          status: "active",
          phone: req.body.phone,
        });
      } else {
        res.send({ isFound: false, message: "User is not Found" });
      }
      // console.log(user)
      if (user && user.length > 0) {
        // console.log("user", user);

        res.status(200).json({ isFound: true, message: "User is Found" });
      } else {
        res.status(401).json({
          isFound: false,
          message: "User is not Found",
          error: "User Not Found",
        });
      }
    } catch (err) {
      res.status(404).json({
        isFound: false,
        message: "User is not Found",
        error: err,
      });
    }
  })
);

ecomRouter.put(
  "/customer/password/:phone",
  expressAsyncHandler(async (req, res) => {
    const phone = req.params.phone;
    // console.log("phone", phone);
    const password = req.body.password;
    // console.log("phone", phone, "password", password);
    const hashPassword = await bcrypt.hash(req.body.password, 10);
    // console.log("hashPassword", hashPassword);
    try {
      // res.status(200).json({ message: "User is Found" });
      if (phone) {
        let user;
        user = await Customer.find({
          status: "active",
          phone: phone,
        });
        // console.log("user", user);
        if (user && user.length > 0) {
          // console.log("user", user);
          // console.log("user", { password: hashPassword });
          // console.log("user", { _id: user[0]._id });
          const updateCustomer = await Customer.updateOne(
            { _id: user[0]._id },
            { $set: { password: hashPassword } }
          );
          // console.log("updateCustomer", updateCustomer);
          if (updateCustomer) {
            const token = jwt.sign(
              {
                userId: user[0]._id,
                name: user[0].name,
                username: user[0].username,
                phone: user[0].phone,
                type: user[0].type,
                point: user[0].point,
              },
              process.env.JWT_SECRET,
              { expiresIn: "7d" }
            );
            res.status(200).json({
              access_token: token,
              status: true,
              user: {
                id: user[0]._id,
                name: user[0].name,
                username: user[0].username,
                phone: user[0].phone,
                type: user[0].type,
                point: user[0].point,
              },
              message: "Password Reset Successful",
            });
          } else {
            res.status(403).json({
              status: false,
              error: "User Not Found",
            });
          }
        } else {
          res.status(401).json({
            status: false,
            error: "User Not Found",
          });
        }
      }
    } catch {
      res.status(404).json({
        status: false,
        error: err,
      });
    }
  })
);
ecomRouter.post(
  "/customer/login",
  expressAsyncHandler(async (req, res) => {
    const isPhone = req.body.phone;
    // console.log({ body: req.body, phone: isPhone });
    try {
      let user;
      if (isPhone) {
        user = await Customer.find({
          status: "active",
          phone: req.body.phone,
        });
      } else {
        user = await Customer.find({
          status: "active",
          username: req.body.username,
        });
      }
      // console.log(user)
      if (user && user.length > 0) {
        // console.log("user", user);
        const isValidPassword = await bcrypt.compare(
          req.body.password,
          user[0].password
        );
        if (isValidPassword) {
          // generate token
          const token = jwt.sign(
            {
              // username: user[0].username,
              // userId: user[0]._id,
              // type: user[0].type,
              userId: user[0]._id,
              name: user[0].name,
              username: user[0].username,
              phone: user[0].phone,
              type: user[0].type,
              point: user[0].point,
              // email: user[0]?.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
          );

          res.status(200).json({
            access_token: token,
            status: true,
            user: {
              id: user[0]._id,
              name: user[0].name,
              username: user[0].username,
              phone: user[0].phone,
              type: user[0].type,
              point: user[0].point,
            },
            message: "Login Successful",
          });
        } else {
          res.status(401).json({
            status: false,
            error: "Password Does not Match",
          });
        }
      } else {
        res.status(401).json({
          status: false,
          error: "User Not Found",
        });
      }
    } catch (err) {
      res.status(404).json({
        status: false,
        error: err,
      });
    }
  })
);
// PRODUCT PHOTO UPLOAD
// Upload Endpoint
ecomRouter.post(
  "/upload/customer/:id",
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

    file.mv(`${appRoot}/uploads/customer/${fileName}`, async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      } else {
        await Customer.updateOne(
          { _id: id },
          { $set: { photo: `/uploads/customer/${fileName}` } }
        )
          .then((response) => {
            // res.send(response);
            res.json({
              fileName: fileName,
              filePath: `/uploads/customer/${fileName}`,
            });
          })
          .catch((err) => {
            res.send(err);
          });
      }
    });
  })
);

module.exports = ecomRouter;
