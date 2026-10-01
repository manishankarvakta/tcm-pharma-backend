/**
 * warehouses API
 * 1. get all warehouses
 * 2. get Warehouse by id
 * 3. get Warehouse by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Warehouse = require("../models/warehouseModel");
const checklogin = require("../middlewares/checkLogin");

const warehouseRouter = express.Router();


// user Count
warehouseRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { aamarId } = req.params;

    try {
      // console.log("Received aamarId:", aamarId);

      // Check if aamarId is a valid ObjectId (if necessary)
      const count = await Warehouse.countDocuments({ aamarId });

      res.status(200).json( count );
    } catch (error) {
      console.error("Error fetching count:", error); // Log the error
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  })
);


// GET ALL warehouses
warehouseRouter.get(
  "/all/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId || "";
    const warehouses = await Warehouse.find({
      status: "active",
      aamarId: aamarId,
    });
    res.send(warehouses);
    // // res.send('removed');
    // console.log(warehouses);
  })
);

warehouseRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(200).json(null);
    }

    try {
      const warehouse = await Warehouse.findOne({ _id: new mongoose.Types.ObjectId(id), status: "active" });
      res.status(200).json(warehouse || null);
    } catch (error) {
      console.error("Error fetching warehouse by ID:", error);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  })
);

// CREATE ONE Warehouse
warehouseRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newWarehouse = new Warehouse(req.body);
    try {
      await newWarehouse.save();
      res.status(200).json({
        message: "Warehouse is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI warehouses
warehouseRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Warehouse.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "warehouses are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Warehouse
warehouseRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Warehouse.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Warehouse
warehouseRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Warehouse.deleteOne({ _id: id })
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

module.exports = warehouseRouter;
