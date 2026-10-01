/**
 * comapnies API
 * 1. get all comapnies
 * 2. get Company by id
 * 3. get Company by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Company = require("../models/companyModel");
const checklogin = require("../middlewares/checkLogin");

const companyRouter = express.Router();

// GET ALL comapnies
companyRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const comapnies = await Company.find();
    res.send(comapnies);
    // // res.send('removed');
    // console.log(comapnies);
  })
);

// GET ONE comapnies
companyRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const comapnies = await Company.find({ _id: id });
    res.send(comapnies[0]);
    // // res.send('removed');
    // console.log(comapnies);
  })
);

// CREATE ONE Company
companyRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newCompany = new Company(req.body);
    try {
      await newCompany.save();
      res.status(200).json({
        message: "Company is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI comapnies
companyRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Company.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "comapnies are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Company
companyRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Company.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Company
companyRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Company.deleteOne({ _id: id })
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

module.exports = companyRouter;
