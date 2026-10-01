/**
 * prices API
 * 1. get all prices
 * 2. get Price by id
 * 3. get Price by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Price = require("../models/priceModel");
const Product = require("../models/productModel");
const checklogin = require("../middlewares/checkLogin");
const { handleNewPrice } = require("../middlewares/handlePrice");
const { response } = require("express");

const priceRouter = express.Router();

// GET ALL prices
priceRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const prices = await Price.find({});
    res.send(prices);
    // // res.send('removed');
    // console.log(prices);
  })
);
// GET ALL prices
priceRouter.get(
  "/export",
  expressAsyncHandler(async (req, res) => {
    const prices = await Price.find({})
      // .select({
      //   article_code: 1,
      //   tp: 1,
      //   mrp: 1
      // })
      .populate("article_code", { article_code: 1 });
    res.send(prices);
    // // res.send('removed');
    // console.log(prices);
  })
);

// GET ONE prices
priceRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const prices = await Price.find({ _id: id });
    res.send(prices[0]);
    // // res.send('removed');
    // console.log(prices);
  })
);

// GET prices By Product Article Code
priceRouter.get(
  "/product/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const prices = await Price.find({
      article_code: id,
      status: "active",
    });
    // .populate("supplier", "name")
    // .populate("warehouse", "name")
    res.send(prices);
    // // res.send('removed');
    // console.log("product:", prices);
  })
);
// GET prices By Product Article Code
priceRouter.get(
  "/productswitch/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const prices = await Price.find({
      article_code: id,
      // status: "active"
    });
    // .populate("supplier", "name")
    // .populate("warehouse", "name")
    res.send(prices);
    // // res.send('removed');
    // console.log("product:", prices);
  })
);

// CREATE ONE Price
priceRouter.post(
  "/",
  // handleNewPrice,
  expressAsyncHandler(async (req, res) => {
    const newPrice = new Price(req.body);
    // console.log("grn price", req.body);
    try {
      // console.log("before save");
      let savePrice = await newPrice.save(); //when fail its goes to catch
      // console.log(savePrice); //when success it print.
      // console.log("after save");
      res.status(200).json({
        status: "success",
        message: "Price is created Successfully",
        id: savePrice._id,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);
// CREATE ONE Price
priceRouter.post(
  "/new",
  // handleNewPrice,
  expressAsyncHandler(async (req, res) => {
    const newPrice = new Price(req.body);
    // console.log("price", req.body);
    try {
      // console.log("before save");
      let savePrice = await newPrice.save(); //when fail its goes to catch
      // console.log(savePrice); //when success it print.
      // console.log("after save");
      res.status(200).json({
        status: "success",
        message: "Price is created Successfully",
        id: savePrice._id,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI prices
priceRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Price.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "prices are created Successfully",
        });
      }
    });
  })
);
// CREATE MULTI prices
priceRouter.put(
  "/multiprice",
  expressAsyncHandler(async (req, res) => {
    const allPrices = req.body;
    // console.log("allPrices", allPrices);

    const updatePriceList = allPrices.map(async (price) => {
      let priceList = [];
      if (price?._id) {
        return new Promise(async (resolve, reject) => {
          try {
            await Price.updateOne(
              { _id: price?._id },
              { $set: price },
              { upsert: true }
            )
              .then((response) => {
                // console.log("response update", response);
                // Resolve
                resolve([...priceList, price?._id]);
              })
              .catch((err) => {
                // console.log("err", err)
                // reject
              });
          } catch (err) {
            reject();
            // console.log("err", err)
            // res.status(500).json({ error: err });
          }
        });
      } else {
        const newPrice = new Price(price);
        return new Promise(async (resolve, reject) => {
          try {
            await newPrice.save((error) => {
              if (error) {
                console.log(error);
              } else {
                // console.log("save price", newPrice);
                resolve([...priceList, newPrice._id]);
              }
            });
            //when fail its goes to catch
            // console.log(savePrice); //when success it print.
            // console.log("after save");

            // res.status(200).json({
            //   status: "success",
            //   message: "Price is created Successfully",
            //   // id: savePrice._id,
            // });
          } catch (err) {
            reject();
          }
        });
      }
    });

    // console.log("updatePRice", updatePriceList);
    // res.send(updatePriceList)
    Promise.all(updatePriceList).then(async (response) => {
      // console.log("updatePRice2", updatePriceList);
      // console.log("response", response);
      const article_code = allPrices[0]?.article_code
        ? allPrices[0]?.article_code
        : "";
      // console.log("article", article_code);
      // const prices = await Price.find({ _id: id });
      const selectedProducts = await Product?.find({ _id: article_code });
      // console.log("selected", selectedProducts);
      selectedProducts[0].priceList = response;
      // console.log("selected updated", selectedProducts);

      await Product.updateOne(
        { _id: article_code },
        { $set: { priceList: response } },
        { upsert: true }
      )
        .then((response) => {
          // console.log("product update", response);
          res.status(200).json({
            status: "success",
            message: "Price is created Successfully",
          });
        })
        .catch((err) => {
          console.log("product err", err);
          res
            .status(500)
            .json({ message: "There was a server side error", error: err });
        });
      // response.map(result => {
      //   console.log("result", result)
      // })
    });
  })
);

// UPDATE ONE Price
priceRouter.put(
  "/edit/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body.priceList;
    // console.log(id, update);
    try {
      await Price.updateOne({ _id: id }, { $set: update })
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
// UPDATE ONE Price
priceRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    // console.log(id, update);
    try {
      await Price.updateOne({ _id: id }, { $set: update })
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
// UPDATE many

// DELETE ONE Price
priceRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Price.deleteOne({ _id: id })
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

module.exports = priceRouter;
