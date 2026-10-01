/**
 * brands API
 * 1. get all brands
 * 2. get Brand by id
 * 3. get Brand by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Brand = require("../models/brandModel");
const checklogin = require("../middlewares/checkLogin");

const brandRouter = express.Router();





// Here I have used this route to set it within the AamarID product.

brandRouter.get(
  "/updateAamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = "50599";

    try {
      const result = await Brand.updateMany({
        $set: { aamarId: aamarId },
      });
      res
        .status(200)
        .json({ message: "aamarId updated successfully", result });
    } catch (error) {
      // If an error occurs, handle it and send an error response
      res
        .status(500)
        .send({ message: "Error fetching", error: error.message });
    }
  })
);




// COUNT PRODUCT
brandRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const brand = await Brand.countDocuments({ aamarId: aamarId });
    res.status(200).json(brand);
  })
);

// GET ALL brands
brandRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const brands = await Brand.find({});
    res.send(brands);
    // // res.send('removed');
    // console.log(brands);
  })
);
// GET ALL brands
brandRouter.get(
  "/export/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const brands = await Brand.find({ aamarId });
    res.send(brands);
    // // res.send('removed');
    // console.log(brands);
  })
);
// GET ALL brands
brandRouter.get(
  "/new",
  expressAsyncHandler(async (req, res) => {
    const brands = await Brand.find({}).limit(20);
    res.send(brands);
    // // res.send('removed');
    // console.log(brands);
  })
);


// CREATE ONE PRODUCT Import
brandRouter.post(
  "/import",
  expressAsyncHandler(async (req, res) => {
    // console.log("Request body:", req.body); // Log to see what is in the body

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "No data received in the request" });
    }

    const newBrand = new Brand(req.body);

    try {
      const result = await newBrand.save();
      if (result) {
        res.status(200).json({
          // Group: result,
          message: "Group created successfully",
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
      console.error("Error saving Group:", err); // Log the error
      res
        .status(500)
        .json({ message: "There was a server-side error", error: err });
    }
  })
);

// check code
brandRouter.get(
  "/checkName/:aamarId/:name",
  expressAsyncHandler(async (req, res) => {
    try {
      const { aamarId, name } = req.params;

      // Find the product with the given aamarId and article_code
      const existing = await Brand.findOne({ aamarId, name: name});

      if (existing) {
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


brandRouter.get(
  "/unique/:code/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { code,aamarId } = req.params;

    try {
      // Check if the specific code exists in the database
      const group = await Brand.findOne({ code: code, aamarId });

      if (group) {
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

brandRouter.get(
  "/all/:page/:size/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const aamarId = req.params.aamarId;
    const queryString = req.query?.q?.trim()?.toString()?.toLocaleLowerCase();
    const currentPage = page + 0;

    let query = { aamarId }; // Ensure aamarId is always included

    if (queryString) {
      const isNumber = /^\d/.test(queryString);

      if (!isNumber) {
        // Search by name if text
        query.$or = [
          { name: { $regex: new RegExp(queryString + ".*?", "i") } },
        ];
      } else {
        // Search by code if number
        query.code = { $regex: RegExp("^" + queryString + ".*", "i") };
      }

      brand = await Brand.find(query).limit(100);
      res.status(200).json(brand);
    } else {
      // Regular pagination
      brand = await Brand.find(query)
        .limit(size)
        .skip(size * page);
      res.status(200).json(brand);
    }
  })
);

brandRouter.get(
  "/search/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();
    const aamarId = req.params.aamarId;

    const isNumber = /^\d/.test(payload);

    let query = {
      aamarId: aamarId, // Always include aamarId
    };

    if (payload !== "") {
      if (!isNumber) {
        query.name = { $regex: new RegExp(payload, "i") };
      } else {
        query.$or = [{ code: { $regex: new RegExp(payload, "i") } }];
      }
    }

    const search = await Brand.aggregate([
      { $match: query },
      {
        $project: {
          _id: 1,
          name: 1,
          code: 1,
        },
      },
      {
        $addFields: {
          nameLength: { $strLenCP: "$name" },
        },
      },
      {
        $sort: {
          nameLength: 1, // Sort by name length
        },
      },
      {
        $limit: 10,
      },
    ]);

    if (payload === "") {
      const brand = await Brand.find({ aamarId }).limit(100);
      res.send(brand);
    } else {
      res.send(search);
    }
  })
);

// GET ONE brands
brandRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const brand = await Brand.findOne({ _id: id });
    res.send(brand);
    // // res.send('removed');
    // console.log(brand);
  })
);

// GET ONE brand
brandRouter.get(
  "/name/:name/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const name = req.params.name;
    const aamarId = req.params.aamarId;
    const brand = await Brand.findOne( {name: { $regex: new RegExp(`^${name}$`, "i") }, aamarId});
    // console.log(brand);
    res.send(brand);
    // // res.send('removed');
  })
);

//  GET GROUP BY TYPE and select 
brandRouter.get("/list/:aamarId", async (req, res) => {
  try {
    const { aamarId } = req.params;
    const groups = await Brand.find({ aamarId });
    if (!groups.length) {
      return res.status(200).json([]);
    }
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// BRAND DW SEARCH
brandRouter.get(
  "/search/:q",
  expressAsyncHandler(async (req, res) => {
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();

    let query = {};

    if (payload === "") {
      query = {};
    } else {
      const isNumber = /^\d/.test(payload);
      if (!isNumber) {
        query = { name: { $regex: new RegExp("\\b" + payload + ".*?", "i") } };
      } else {
        query = {
          $or: [{ code: { $regex: new RegExp("^" + payload + ".*", "i") } }],
        };
      }
    }

    const search = await Brand.find(query)
      // TODO:: UPDATE AGREEGET FOR GET STOCK VALUE
      .select({
        _id: 1,
        name: 1,
        code: 1,
      })
      .limit(10);

    res.send(search);
  })
);

// CREATE ONE Brand
brandRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    // console.log("Brand", req.body);
    const newBrand = new Brand(req.body);

    try {
      await newBrand.save();
      res.status(200).json({
        message: "Brand is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI brands
brandRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Brand.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "brands are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Brand
brandRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Brand.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Brand
brandRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Brand.deleteOne({ _id: id })
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

module.exports = brandRouter;
