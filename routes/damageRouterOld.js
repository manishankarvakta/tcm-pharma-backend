/**
 * damages API
 * 1. get all damages
 * 2. get Damage by id
 * 3. get Damage by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Damage = require("../models/damageModel");
const checklogin = require("../middlewares/checkLogin");

const damageRouter = express.Router();

// GET ALL damages
damageRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const damages = await Damage.find({})
      .select({
        _id: 1,
        product: 1,
        warehouse: 1,
        reason: 1,
        userId: 1,
        qty: 1,
      })
      .populate("product", "name")
      .populate("warehouse", "name")
      .populate("userId", "name");

    res.send(damages);
    // // res.send('removed');
    // console.log(damages);
  })
);
// GET ALL damages
damageRouter.get(
  "/export",
  expressAsyncHandler(async (req, res) => {
    const damages = await Damage.find({})
      .populate("product", { name: 1, article_code: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");

    res.send(damages);
    // // res.send('removed');
    // console.log(damages);
  })
);

// GET ONE damages
damageRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const damages = await Damage.find({ _id: id })
      .select({
        _id: 1,
        product: 1,
        warehouse: 1,
        priceId: 1,
        userId: 1,
        qty: 1,
        reason: 1,
        createdAt: 1,
      })
      .populate("product", "name")
      .populate("product", "article_code")
      .populate("product", "priceList")
      .populate("product", { name: 1, article_code: 1 })
      .populate("warehouse", "name")
      .populate("userId", "name");
    res.send(damages[0]);
    // // res.send('removed');
    // console.log(damages);
  })
);

// CREATE ONE Damage
damageRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newDamage = new Damage(req.body);
    try {
      await newDamage.save();
      res.status(200).json({
        message: "Damage is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI damages
damageRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Damage.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "damages are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Damage
damageRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Damage.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Damage
damageRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Damage.deleteOne({ _id: id })
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

module.exports = damageRouter;
