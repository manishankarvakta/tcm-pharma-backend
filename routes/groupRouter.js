/**
 * groups API
 * 1. get all groups
 * 2. get Group by id
 * 3. get Group by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Group = require("../models/groupModel");
const checklogin = require("../middlewares/checkLogin");

const groupRouter = express.Router();



// Here I have used this route to set it within the AamarID product.
// groupRouter.get(
//   "/updateAamarId",
//   expressAsyncHandler(async (req, res) => {
//     const aamarId = "50599";

//     try {
//       const result = await Group.updateMany({
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




// Group Count
groupRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { aamarId } = req.params;

    try {
      // Check if aamarId is a valid ObjectId (if necessary)
      const count = await Group.countDocuments({ aamarId });

      res.status(200).json(count);
    } catch (error) {
      console.error("Error fetching count:", error); // Log the error
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  })
);

// GET ALL groups
groupRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const groups = await Group.find({});
    res.send(groups);
    // // res.send('removed');
    // console.log(groups);
  })
);
groupRouter.get(
  "/unique/:code/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { code, aamarId } = req.params;

    try {
      // Check if the specific code exists in the database
      const generic = await Group.findOne({ code: code, aamarId });

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
// GET ALL groups Exports
groupRouter.get(
  "/export/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const groups = await Group.find({ aamarId });
    res.send(groups);
    // // res.send('removed');
    // console.log(groups);
  })
);

// GET CATEGORY BY MC ID
groupRouter.get(
  "/mc/:mcId",
  expressAsyncHandler(async (req, res) => {
    const parent = req.params.mcId;
    const category = await Group.find({ mcId: parent, mc: { $ne: "mc" } });
    res.send(category);
  })
);

// GET ALL group WITH PAGENATION & SEARCH
groupRouter.get(
  "/all/:page/:size/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const aamarId = req.params.aamarId;
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = page + 0;

    let query = { aamarId: aamarId };
    console.log("aamarId", aamarId);
    let group = [];
    // const size = parseInt(req.query.size);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);

    //check if search or the pagenation
    if (queryString) {
      const isNumber = /^\d/.test(queryString);
      if (!isNumber) {
        query = {
          $and: [
            { aamarId: aamarId }, // Add aamarId filter
            { name: { $regex: new RegExp(queryString + ".*?", "i") } },
          ],
        };
      } else {
        query = {
          $and: [
            { aamarId: aamarId }, // Add aamarId filter
            { code: { $regex: RegExp("^" + queryString + ".*", "i") } },
          ],
        };
      }
      group = await Group.find(query).limit(100);
      res.status(200).json(group);
      console.log("group", group);
    } else {
      group = await Group.find(query)
        .limit(size)
        .skip(size * page);
      res.status(200).json(group);
    }
  })
);

// GET ONE groups
groupRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const group = await Group.findOne({ _id: id });
    // console.log(group);
    res.send(group);
    // // res.send('removed');
  })
);

// GET ONE Group by Name
groupRouter.get(
  "/name/:name/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const name = req.params.name;
    const aamarId = req.params.aamarId;
    const group = await Group.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      aamarId,
    });
    // console.log(group);
    res.send(group);
    // // res.send('removed');
  })
);

//  GET GROUP BY TYPE and select 
groupRouter.get("/list/:aamarId", async (req, res) => {
  try {
    const { aamarId } = req.params;
    const groups = await Group.find({ aamarId });
    if (!groups.length) {
      return res.status(200).json([]);
    }
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// CREATE ONE Group
groupRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newGroup = new Group(req.body);

    try {
      await newGroup.save();
      res.status(200).json({
        message: "Group is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// check code
groupRouter.get(
  "/checkCode/:aamarId/:code",
  expressAsyncHandler(async (req, res) => {
    try {
      const { aamarId, code } = req.params;

      // Find the product with the given aamarId and article_code
      const existing = await Group.findOne({ aamarId, code: code});

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

// check code
groupRouter.get(
  "/checkName/:aamarId/:name",
  expressAsyncHandler(async (req, res) => {
    try {
      const { aamarId, name } = req.params;

      // Find the product with the given aamarId and article_code
      const existing = await Group.findOne({ aamarId, name: name});

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

// CREATE ONE PRODUCT Import
groupRouter.post(
  "/import",
  expressAsyncHandler(async (req, res) => {
    // console.log("Request body:", req.body); // Log to see what is in the body

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "No data received in the request" });
    }

    const newGroup = new Group(req.body);

    try {
      const result = await newGroup.save();
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
          status: "faild",
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

// GROUP DW SEARCH
groupRouter.get(
  "/search/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const payload = req.params?.q?.trim().toString().toLocaleLowerCase();

    let query = {};
    if (aamarId) {
      query.aamarId = aamarId; // Assuming aamarId is an ObjectId in the database
    }

    if (payload === "") {
      query = {};
    } else {
      const isNumber = /^\d/.test(payload);
      if (!isNumber) {
        query.name = { $regex: new RegExp("\\b" + payload + ".*?", "i") };
      } else {
        query = {
          $or: [{ code: { $regex: new RegExp("^" + payload + ".*", "i") } }],
        };
      }
    }

    try {
      const search = await Group.find(query)
        .select({
          _id: 1,
          name: 1,
        })
        .limit(10);

      res.send(search);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error occurred while searching" });
    }
  })
);

// CREATE MULTI groups
groupRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Group.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "groups are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Group
groupRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    // console.log("id", id, "update", update);
    try {
      await Group.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          res.send(response);
          console.error(response);
        })
        .catch((err) => {
          res.send(err);
          console.error(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

// DELETE ONE Group
groupRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Group.deleteOne({ _id: id })
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

// group Dw LIST
groupRouter.get(
  "/groupDw/:aamarId/:warehouse",
  expressAsyncHandler(async (req, res) => {
    const { aamarId, warehouse } = req.params;

    const query = {
      aamarId: aamarId,
      status: "active",
    };

    if (warehouse !== "allWh" && warehouse) {
      query.warehouse = warehouse;
    }
    try {
      const groupDw = await Group.find(query).select({
        _id: 1,
        name: 1,
        discount: 1,
        code: 1,
        aamarId: 1,
        status: 1,
      });

      res.status(200).json(groupDw);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .send({ message: "An error occurred while processing your request." });
    }
  })
);

module.exports = groupRouter;
