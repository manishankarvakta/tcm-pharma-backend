/**
 * generics API
 * 1. get all generics
 * 2. get Generic by id
 * 3. get Generic by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Generic = require("../models/genericModel");
const checklogin = require("../middlewares/checkLogin");

const genericRouter = express.Router();





// // Here I have used this route to set it within the AamarID product.

// genericRouter.get(
//   "/updateAamarId",
//   expressAsyncHandler(async (req, res) => {
//     const aamarId = "50599";

//     try {
//       const result = await Generic.updateMany({
//         $set: { aamarId: aamarId },
//       });
//       res
//         .status(200)
//         .json({ message: "aamarId updated successfully", result });
//     } catch (error) {
//       // If an error occurs, handle it and send an error response
//       res
//         .status(500)
//         .send({ message: "Error fetching", error: error.message });
//     }
//   })
// );







// COUNT PRODUCT
genericRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const generic = await Generic.countDocuments({ aamarId: aamarId });
    res.status(200).json(generic);
  })
);
// GET ALL generics
genericRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const generics = await Generic.find({});
    res.send(generics);
    // // res.send('removed');
    // console.log(generics);
  })
);

genericRouter.get(
  "/unique/:code/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { code,aamarId } = req.params;

    try {
      // Check if the specific code exists in the database
      const generic = await Generic.findOne({ code: code, aamarId });

      if (generic) {
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

genericRouter.get(
  "/export/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const generics = await Generic.find({ aamarId });
    res.send(generics);
    // // res.send('removed');
    // console.log(generics);
  })
);
genericRouter.get(
  "/new",
  expressAsyncHandler(async (req, res) => {
    const generics = await Generic.find({}).limit(20);
    res.send(generics);
    // // res.send('removed');
    // console.log(generics);
  })
);
// GET ALL generic WITH PAGENATION & SEARCH
genericRouter.get(
  "/all/:page/:size/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const aamarId = req.params.aamarId;
    const queryString = req.query?.q?.trim()?.toLowerCase();
    const currentPage = page || 0;

    let query = { aamarId }; // Always include aamarId

    // 🛠️ Check if there's a search query
    if (queryString) {
      const isNumber = /^\d/.test(queryString);

      if (!isNumber) {
        // If search is text, search by name
        query.$or = [
          { name: { $regex: new RegExp(queryString + ".*?", "i") } },
        ];
      } else {
        // If search is number, search by code
        query.code = { $regex: new RegExp("^" + queryString + ".*", "i") };
      }

      // 🔄 Perform search with aamarId filter
      generic = await Generic.find(query).limit(100);
    } else {
      // 🔄 Regular pagination with aamarId filter
      generic = await Generic.find(query)
        .limit(size)
        .skip(size * currentPage);
    }

    // Return results
    res.status(200).json(generic);
  })
);

// Generic DW SEARCH
genericRouter.get(
  "/search/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();
    const aamarId = req.params?.aamarId || "";
    let query = {};

    if (aamarId) {
      query.aamarId = aamarId;
    }

    if (payload !== "") {
      const isNumber = /^\d/.test(payload);
      if (!isNumber) {
        query.name = { $regex: new RegExp("\\b" + payload + ".*?", "i") };
      } else {
        query.$or = [
          { code: { $regex: new RegExp("^" + payload + ".*", "i") } },
        ];
      }
    }

    try {
      const search = await Generic.find(query)
        .select({
          _id: 1,
          name: 1,
          code: 1,
        })
        .limit(20);

      res.send(search);
    } catch (err) {
      console.error("Error fetching data:", err);
      res.status(500).send({ message: "Error searching generic items" });
    }
  })
);

// GET ONE generics
genericRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const generic = await Generic.findOne({ _id: id });
    res.send(generic);
    // // res.send('removed');
    // console.log(generics);
  })
);

// GET ONE generics
genericRouter.get(
  "/name/:name/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const name = req.params.name;
    const aamarId = req.params.aamarId;
    const generic = await Generic.findOne( {name: { $regex: new RegExp(`^${name}$`, "i") },aamarId});
    res.send(generic);
    // // res.send('removed');
    // console.log(generics);
  })
);

// CREATE ONE PRODUCT Import
genericRouter.post(
  "/import",
  expressAsyncHandler(async (req, res) => {
    // console.log("Request body:", req.body); // Log to see what is in the body

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "No data received in the request" });
    }

    const newGeneric = new Generic(req.body);

    try {
      const result = await newGeneric.save();
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
genericRouter.get(
  "/checkName/:aamarId/:name",
  expressAsyncHandler(async (req, res) => {
    try {
      const { aamarId, name } = req.params;

      // Find the product with the given aamarId and article_code
      const existing = await Generic.findOne({ aamarId, name: name});

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

//  GET GROUP BY TYPE and select 
genericRouter.get("/list/:aamarId", async (req, res) => {
  try {
    const { aamarId } = req.params;
    const groups = await Generic.find({ aamarId });
    if (!groups.length) {
      return res.status(200).json([]);
    }
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// CREATE ONE Generic
genericRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newGeneric = new Generic(req.body);

    try {
      await newGeneric.save();
      res.status(200).json({
        message: "Generic is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI generics
genericRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Generic.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "generics are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Generic
genericRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Generic.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Generic
genericRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Generic.deleteOne({ _id: id })
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

module.exports = genericRouter;
