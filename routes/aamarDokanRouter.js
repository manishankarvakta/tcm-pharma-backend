/**
 * USERS API
 * 1. get all Users
 * 2. get user by id
 * 3. get user by type
 * 3.1 get user by email
 * 3.2 get user by phone
 * 4. create one
 * 5. create many
 * 6. updateOne
 * 7. delete one
 */

/**
 * warehouse
 * user
 * defaultSupplier
 * defaultCustomer
 * setting
 */
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const checklogin = require("../middlewares/checkLogin");
const { default: mongoose, mongo } = require("mongoose");
const Settings = require("../models/settingsModel");
const Supplier = require("../models/supplierModel");
const Warehouse = require("../models/warehouseModel");
const Customer = require("../models/customerModel");
const ObjectId = mongoose.Types.ObjectId;
const aidPackage = require("../utility/aidpackage.json");

const aamarDokanRouter = express.Router();

//GENERATE ACCOUNT
aamarDokanRouter.post(
  "/create",
  expressAsyncHandler(async (req, res) => {
    const {
      name,
      email,
      username,
      password,
      address,
      phone,
      warehouse,
      aamarId,
      state,
      city,
      street,
      zip,
      post,
      pId,
    } = req.body;

    try {
      // Check if the warehouse exists
      let existingWarehouse = await Warehouse.findOne({ aamarId });
      let createWarehouse;

      if (existingWarehouse) {
        // Update existing warehouse
        existingWarehouse.name = warehouse;
        existingWarehouse.phone = phone;
        existingWarehouse.status = "active";
        createWarehouse = await existingWarehouse.save();
      } else {
        // Create a new warehouse
        const newWarehouse = new Warehouse({
          name: warehouse,
          code: aamarId,
          address: `${street}, ${city}, ${state}, ${zip}, ${post}`,
          type: "Outlet",
          phone: phone,
          aamarId: aamarId,
          status: "active",
        });
        createWarehouse = await newWarehouse.save();
      }

      // Check if the user exists
      let existingUser = await User.findOne({ aamarId });
      let userCreate;

      if (existingUser) {
        // Update existing user
        existingUser.name = name;
        existingUser.email = email;
        existingUser.username = username.toLowerCase();
        existingUser.phone = phone;
        existingUser.address = address;
        existingUser.warehouse = createWarehouse?._id;
        if (password) {
          const hashPassword = await bcrypt.hash(password, 10);
          existingUser.password = hashPassword;
        }
        userCreate = await existingUser.save();
      } else {
        // Create a new user
        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
          name: name,
          email: email,
          username: username.toLowerCase(),
          phone: phone,
          type: "admin",
          address: address,
          privilege: {},
          password: hashPassword,
          status: "active",
          aamarId: aamarId,
          warehouse: createWarehouse?._id,
        });
        userCreate = await newUser.save();
      }

      // Check if the mrcash exists
      let existingMrCash = await Supplier.findOne({ aamarId, code:"100110" });
      let mrCashCreate;

      if (existingMrCash) {
        // console.log('existingMrCash', existingMrCash)
        mrCashCreate = existingMrCash;
      } else {
        // Create a new mrCash
        const newMrCash = new Supplier({
          company: "Mr. Cash",
          name: "Mr. Cash",
          email: "no-reply@mail.com",
          code:"100110",
          status: "active",
          phone: "01700000000",
          aamarId: aamarId,
        });
        mrCashCreate = await newMrCash.save();
        // console.log("mrCashCreate",mrCashCreate);
      }

      //TODO:: Craete walkway customer, setting add defaoult customer add feild-  frontend

      // Check if the mrcash exists
      let existingCustomer = await Customer.findOne({ aamarId, phone:'01700000000' });
      let walkwayCustomerCreate;

      if (existingCustomer) {
        // console.log('existingCustomer', existingCustomer)
        walkwayCustomerCreate = existingCustomer;
      } else {
        // Create a new mrCash
        const newCustomer = new Customer({
          name: "Walkway Customer",
          userName: "walkwayCustomer",
          email: "no-reply@mail.com",
          phone: "01700000000",
          status: "active",
          warehouse: createWarehouse?._id,
          aamarId: aamarId,
        });
        walkwayCustomerCreate = await newCustomer.save();
        // console.log("walkwayCustomerCreate",walkwayCustomerCreate);
      }

      // Check if settings exist
      let existingSetting = await Settings.findOne({ aamarId });
      let createAccountSetting;

      if (existingSetting) {
        // Update existing settings
        existingSetting.storeName = warehouse;
        existingSetting.email = email;
        existingSetting.phone = phone;
        existingSetting.pId = pId || existingSetting.pId ;
        existingSetting.address = {
          street: street,
          city: city,
          state: state,
          zip: zip,
          post: post,
          country: "Bangladesh",
        };
        existingSetting.updateUser = userCreate?._id;
        createAccountSetting = await existingSetting.save();
        // console.log("createAccountSetting", createAccountSetting);
      } else {
        // Create new settings
        const newSetting = new Settings({
          aamarId: aamarId,
          storeName: warehouse,
          posScreen: "pos",
          email: email,
          phone: phone,
          defaultSupplier: existingMrCash?._id,
          defaultCustomer: existingCustomer?._id,
          pId: pId || "AID-PHARMA-03",
          address: {
            street: street, // Street Address
            city: city,
            state: state,
            zip: zip,
            post: post,
            country: "Bangladesh",
          },
          vatPercentage: 0,
          enableTaxExemptions: false,
          invoiceIdPrefix: "AD",
          defaultInvoiceSize: "88",
          paymentMethods:  [
            { order: "bKash", name: "bKash", type: "mfs", status: true },
            { order: "nagad", name: "Nagad", type: "mfs", status: true },
            { order: "rocket", name: "Rocket", type: "mfs", status: true },
            { order: "upay", name: "Upay", type: "mfs", status: true },
            { order: "visa", name: "Visa", type: "card", status: true },
            { order: "dbbl", name: "DBBL", type: "card", status: true },
            { order: "mtb", name: "MTB", type: "card", status: true },
            { order: "amex", name: "AMEX", type: "card", status: true },
            { order: "ebl", name: "EBL", type: "card", status: true },
            { order: "brac", name: "BRAC", type: "card", status: true },
            { order: "masterCard", name: "MasterCard", type: "card", status: true }
          ],
          updateUser: ObjectId(userCreate._id),
          isApiEnabled: false,
        });
        createAccountSetting = await newSetting.save();
        // console.log("createAccountSetting", createAccountSetting);
      }



      // Respond with success message
      res.status(200).json({
        message: "Registration Successful",
        status: "success",
      });
    } catch (error) {
      // res.status(400).json({
      console.error(error);
      res
        .status(500)
        .json({ message: "There was a server side error", error: error });
      // });
    }

    // res.send(newUser);?
  })
);

//LOGIN
aamarDokanRouter.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const isEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
      req.body.email
    );
    // console.log({ body: req.body, email: isEmail })
    try {
      let user;
      if (isEmail) {
        user = await User.find({
          status: "active",
          email: req.body.email.toLowerCase(),
        });
      } else {
        user = await User.find({
          status: "active",
          username: req.body.email.toLowerCase(),
        });
      }
      // console.log(user)
      if (user && user.length > 0) {
        const isValidPassword = await bcrypt.compare(
          req.body.password,
          user[0].password
        );
        if (isValidPassword) {
          // Fetch the user's settings
          // console.log("AID", user);
          const settings = await Settings.findOne({ aamarId: user[0].aamarId });
          // console.log("SETTINGS", settings);

          const package =
            aidPackage.find((p) => p.pId === settings?.pId) || aidPackage[0];

          // generate token
          const token = jwt.sign(
            {
              id: user[0]._id,
              name: user[0].name,
              username: user[0].username,
              email: user[0].email,
              type: user[0].type,
              warehouse: user[0].warehouse,
              aamarId: user[0].aamarId,
              package: package,
              storeSettings: settings,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
          );

          res.status(200).json({
            access_token: token,
            status: true,
            holdSale: user[0]?.holdSale,
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

// USER Validation
aamarDokanRouter.post(
  "/ecom/valid",
  expressAsyncHandler(async (req, res) => {
    try {
      let user;
      // console.log(req.body);

      user = await User.find({
        status: "active",
        username: req.body.username.toLowerCase(),
      });
      // console.log("user:", user);

      if (user && user.length > 0) {
        const isValidPassword = await bcrypt.compare(
          req.body.password,
          user[0].password
        );
        if (isValidPassword) {
          res.status(200).json({ status: true });
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
      res.status(500).json({
        status: false,
        error: err,
      });
    }
  })
);

// AUTHORIZATION CHECK
aamarDokanRouter.post(
  "/valid",
  expressAsyncHandler(async (req, res) => {
    try {
      let user;
      // console.log(req.body);

      user = await User.find({
        status: "active",
        username: req.body.username.toLowerCase(),
      });
      // console.log("user:", user);

      if (user && user.length > 0) {
        const isValidPassword = await bcrypt.compare(
          req.body.password,
          user[0].password
        );
        if (isValidPassword) {
          // console.log("status:", true, "userId:", user[0]._id);
          res.status(200).json({ status: true, userId: user[0]._id });
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
      res.status(500).json({
        status: false,
        error: err,
      });
    }
  })
);

//Revalidate JWT
aamarDokanRouter.get(
  "/jwt-revalidate/:aamarDokanId/:userId",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarDokanId;
    const userId = req.params.userId;

    // console.log(aamarId, userId);
    //   const aamarId = req.params.aamarId;
    //   const userId = req.params.userId;
    //   // console.log({ body: req.body, email: isEmail })
    try {
      const user = await User.findOne({
        status: "active",
        aamarId: aamarId,
        _id: new ObjectId(userId),
      });
      // console.log("USER", user);
      const settings = await Settings.findOne({ aamarId: aamarId });
      // console.log("SETTINGS", settings);

      const package =
        aidPackage.find((p) => p.pId === settings?.pId) || aidPackage[0];

      //     // generate token
      const token = jwt.sign(
        {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          type: user.type,
          warehouse: user.warehouse,
          aamarId: user.aamarId,
          package: package,
          storeSettings: settings,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      // console.log("TOKEN", token);
      res.status(200).json({
        access_token: token,
        status: true,
        holdSale: user[0]?.holdSale,
        message: "JWS Authentication Revalidated Success",
      });
    } catch (err) {
      res.status(404).json({
        status: false,
        error: err,
      });
    }
  })
);

// Check User Name Exist
aamarDokanRouter.get(
  "/username/:username",
  expressAsyncHandler(async (req, res) => {
    const { username } = req.params;
    try {
      const user = await User.find({
        username: username.toLowerCase(),
      });
      // console.log("user:", user);

      if (user && user.length > 0) {
        res.status(200).json({ status: true });
      } else {
        res.status(401).json({
          status: false,
        });
      }
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err,
      });
    }
  })
);

module.exports = aamarDokanRouter;
