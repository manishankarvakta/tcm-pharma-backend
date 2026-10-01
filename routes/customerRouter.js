/**
 * customers API
 * 1. get all customers
 * 2. get Customer by id
 * 3. get Customer by type
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */
const { default: mongoose } = require("mongoose");
const express = require("express");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Customer = require("../models/customerModel");
const checklogin = require("../middlewares/checkLogin");
const { ObjectId } = require("mongoose").Types;

const customerRouter = express.Router();

// COUNT CUSTOMER
customerRouter.get(
  "/count",
  expressAsyncHandler(async (req, res) => {
    const total = await Customer.countDocuments({});
    // console.log("id");
    res.status(200).json(total);
  })
);

// GET ALL customers
customerRouter.get(
  "/all/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId;
    const customers = await Customer.find({ aamarId, status: "active" }).select(
      {
        name: 1,
        // gender: 1,
        point: 1,
        phone: 1,
      }
    );
    res.send(customers);
  })
);
// GET ALL customers for imports
customerRouter.get(
  "/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const warehouse = req.params.warehouse;
    const aamarId = req.params.aamarId;
    // Build the query object based on the warehouse
    let query = {
      aamarId: aamarId,
      status: "active", // Explicitly checks for "active"
    };
    if (warehouse) {
      query.warehouse = ObjectId(warehouse);
    }

    try {
      const customers = await Customer.find(query).select({
        name: 1,
        point: 1,
        phone: 1,
        email: 1,

        membership: 1,

        status: 1,
      });
      res.send(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Error fetching customers" });
    }
  })
);
// GET ALL customers
customerRouter.get(
  "/export/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId || "";

    // console.log("Warehouse:", warehouse);

    let query = {
      status: "active",
      aamarId: aamarId,
    };

    // Add warehouse filter if it’s not "allWh"
    if (warehouse !== "allWh") {
      query.warehouse = mongoose.Types.ObjectId(warehouse);
    }

    // console.log("Query:", query);

    try {
      // Fetch customers and populate the warehouse field
      const customers = await Customer.find(query)
        .select("name address phone warehouse status") // Include required fields
        .populate("warehouse", "name"); // Populates warehouse name only

      res.status(200).send(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: error.message });
    }
  })
);

// GET customers by phone
customerRouter.get(
  "/phone/:phone",
  expressAsyncHandler(async (req, res) => {
    const phone = req.params.phone;
    const customers = await Customer.find({ phone: phone });
    res.send(customers);
    // console.log(customers);
    // // res.send('removed');
  })
);

// GET ALL CUSTOMER WITH PAGINATION, SEARCH, AND WAREHOUSE FILTERING
customerRouter.get(
  "/all/:page/:size/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const queryString = req.query?.q?.trim().toLowerCase();
    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId || "";

    let query = { aamarId: aamarId };

    // Check if there is a search query
    if (queryString) {
      const isNumber = /^\d/.test(queryString);

      if (isNumber) {
        // Search by phone number if the query is a number
        query.phone = {
          $regex: new RegExp("^" + queryString + ".*", "i"),
        };
      } else {
        // Search by name or email if the query is a string
        query.$or = [
          { name: { $regex: new RegExp(queryString + ".*?", "i") } },
          { email: { $regex: new RegExp("^" + queryString + ".*", "i") } },
        ];
      }
    }

    // Add warehouse filter if provided and not "All"
    if (warehouse !== "allWh" && warehouse) {
      query.warehouse = warehouse;
    }

    try {
      // If there's a search query, limit the results to 50
      if (queryString) {
        const customers = await Customer.find(query)
          .select("_id name phone warehouse")
          .populate("warehouse", "name") // Populates warehouse with its name
          .limit(50);

        res.status(200).json(customers);
      } else {
        // Regular pagination without a search query
        const customers = await Customer.find(query)
          .select("_id name phone warehouse")
          .populate("warehouse", "name") // Populates warehouse with its name
          .limit(size)
          .skip(size * page);

        res.status(200).json(customers);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  })
);

// GET ALL CUSTOMER WITH PAGENATION & SEARCH
customerRouter.get(
  "/contact/:page/:size",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.params.page);
    const size = parseInt(req.params.size);
    const queryString = req.query?.q?.trim().toString().toLocaleLowerCase();
    const currentPage = page + 0;

    let query = {};
    let customer = [];
    // const size = parseInt(req.query.size);
    // console.log("page:", currentPage, "size:", size, "search:", queryString);

    //check if search or the pagenation

    if (queryString) {
      // console.log("search:", query);
      // search check if num or string
      const isNumber = /^\d/.test(queryString);
      // console.log(isNumber);
      if (!isNumber) {
        // if text then search name
        query = {
          $or: [
            { name: { $regex: new RegExp(queryString + ".*?", "i") } },
            { email: { $regex: new RegExp("^" + queryString + ".*", "i") } },
          ],
        };
        // query = { name:  queryString  };
      } else {
        // if number search in ean and article code
        query = {
          phone: {
            $regex: RegExp("^" + queryString + ".*", "i"),
          },
        };
      }

      customer = await Customer.find(query)
        .select({
          _id: 1,
          name: 1,
          phone: 1,
          point: 1,
        })
        .limit(50);
      res.status(200).json(customer);
    } else {
      // regular pagination
      query = {};

      customer = await Customer.find(query)
        .select({
          _id: 1,
          name: 1,
          phone: 1,
          point: 1,
        })
        .limit(size)
        .skip(size * page);
      res.status(200).json(customer);
      // console.log("done:", query);
    }
  })
);

// GET ALL CUSTOMER DW
customerRouter.get(
  "/dw",
  expressAsyncHandler(async (req, res) => {
    const customers = await Customer.find({ status: "active" }).select({
      _id: 1,
      name: 1,
      phone: 1,
      point: 1,
    });
    res.send(customers);
    // // res.send('removed');
  })
);

// CUSTOMER SRARCH
customerRouter.get(
  "/search/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId?.trim() || ""; // Ensure `aamarId` is sanitized
    const payload = req.params.q?.trim().toString().toLowerCase(); // Sanitize and normalize `q`

    if (!payload || payload === "undefined" || payload === "null" || payload === "all") {
      try {
        const customers = await Customer.find({ aamarId, status: "active" })
          .select("_id name email phone point")
          .limit(10);
        return res.status(200).json(customers);
      } catch (error) {
        return res.status(500).json({ message: "Error fetching default customers" });
      }
    }

    const isNumber = /^\d/.test(payload); // Check if the payload starts with a number

    let query = { aamarId }; // Base query to include `aamarId`

    if (isNumber) {
      // If payload starts with a number, search in phone
      query.phone = { $regex: new RegExp("^" + payload + ".*", "i") };
    } else {
      // If payload is not a number, search in `name` or `email`
      query.$or = [
        { name: { $regex: new RegExp("\\b" + payload + ".*", "i") } },
        { email: { $regex: new RegExp("^" + payload + ".*", "i") } },
      ];
    }

    try {
      const searchResults = await Customer.find(query)
        .select("_id name email phone point") // Restrict fields to only those required
        .limit(10); // Limit the results to 10 entries

      res.status(200).json(searchResults);
    } catch (error) {
      console.error("Error while searching customers:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  })
);

// GET ONE customers
customerRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const customers = await Customer.find({ _id: id, status: "active" });
    res.send(customers[0]);
    // // res.send('removed');
    // console.log(customers);
  })
);

// GET ONE customers
customerRouter.get(
  "/select/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId || "";
    let query = { _id: id, status: "active", aamarId: aamarId };

    const customers = await Customer.find(query).select({
      _id: 1,
      name: 1,
      username: 1,
      phone: 1,
      point: 1,
      type: 1,
      address: 1,
      email: 1,
      membership: 1,
      group: 1,
      batch: 1,
      status: 1,
    });

    res.send(customers[0]);
    // // res.send('removed');
    // console.log(customers);
  })
);

// GET ONE CUSTOMER POINT
customerRouter.get(
  "/point/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const customers = await Customer.find({ _id: id, status: "active" }).select(
      {
        _id: 1,
        point: 1,
      }
    );
    res.send(customers[0]);
    // // res.send('removed');
    // console.log(customers);
  })
);

// CREATE ONE Customer
customerRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const newCustomer = new Customer(req.body);
    try {
      await newCustomer.save((err, customer) => {
        if (err) {
          res
            .status(500)
            .json({ message: "There was a server side error", error: err });
        } else {
          // console.log(customer);
          res.status(200).json({
            message: "Customer is created Successfully",
            id: customer._id,
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

// CREATE MULTI customers
customerRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Customer.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "customers are created Successfully",
        });
      }
    });
  })
);
// create import customer
customerRouter.post(
  "/import",
  expressAsyncHandler(async (req, res) => {
    // console.log("Request body:", req.body); // Log to see what is in the body

    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ message: "No data received in the request" });
    }

    const newCustomer = new Customer(req.body);

    try {
      const result = await newCustomer.save();
      if (result) {
        res.status(200).json({
          // Customer: result,
          message: "Customer created successfully",
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
      console.error("Error saving Customer:", err); // Log the error
      res
        .status(500)
        .json({ message: "There was a server-side error", error: err });
    }
  })
);

// check email
customerRouter.get(
  "/checkEmail/:aamarId/:email",
  expressAsyncHandler(async (req, res) => {
    try {
      const { aamarId, email } = req.params;
      // console.log("aamarid", aamarId, email);
      // Find the product with the given aamarId and article_code
      const existing = await Customer.findOne({ aamarId, email: email });

      if (existing) {
        // console.log("existing");
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
// check Phone
customerRouter.get(
  "/checkPhone/:aamarId/:phone",
  expressAsyncHandler(async (req, res) => {
    try {
      const { aamarId, phone } = req.params;

      // Find the product with the given aamarId and article_code
      const existing = await Customer.findOne({ aamarId, phone: phone });

      if (existing) {
        // console.log("existing");

        return res.json({ exists: true });
      } else {
        // console.log(" not existing");

        return res.json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking article code:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  })
);
// UPDATE ONE Customer
customerRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body.newCustomer;
    // console.log("id", id, "update", update);
    try {
      await Customer.updateOne({ _id: id }, { $set: update })
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
// UPDATE ONE Customer
customerRouter.put(
  "/point/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    // console.log("id", id, "update", update);
    // console.log("req.body", req.body);
    try {
      await Customer.updateOne({ _id: id }, { $set: update })
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

// DELETE ONE Customer
customerRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Customer.deleteOne({ _id: id })
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

// USER SIGNIN
customerRouter.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    try {
      const hashPassword = await bcrypt.hash(req.body.password, 10);
      let userNameGen = req.body.name;
      let un = userNameGen.replace(" ", "").substring(0, 10).toLowerCase();
      const newCustomer = new Customer({
        name: req.body.name,
        email: req.body.email,
        username: un,
        phone: req.body.phone,
        type: req.body.type,
        address: req.body.address,
        membership: req.body.membership,
        password: hashPassword,
        status: req.body.status,
      });
      await newCustomer.save();
      res.status(200).json({
        message: "Registration Successful",
        status: "success",
        data: un,
      });
    } catch (error) {
      res.status(400).json({
        message: "Registration Unsuccessful",
        error: error,
        status: "fail",
      });
    }

    // res.send(newUser);?
  })
);

// USER LOGIN
customerRouter.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    try {
      const customer = await Customer.find({
        status: "active",
        username: req.body.username,
      });

      if (customer && customer.length > 0) {
        const isValidPassword = await bcrypt.compare(
          req.body.password,
          user[0].password
        );
        if (isValidPassword) {
          // generate token
          const token = jwt.sign(
            {
              username: customer[0].username,
              userId: customer[0]._id,
              type: customer[0].type,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
          );

          res.status(200).json({
            access_token: token,
            status: "success",
            message: "Login Successful",
          });
        } else {
          res.status(401).json({
            status: "fail",
            error: "Password Doesnot Match",
          });
        }
      } else {
        res.status(401).json({
          status: "fail",
          error: "User Not Found",
        });
      }
    } catch (err) {
      res.status(500).json({
        status: "fail",
        error: err,
      });
    }
  })
);

module.exports = customerRouter;
