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
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const checklogin = require("../middlewares/checkLogin");
const { default: mongoose } = require("mongoose");
const Settings = require("../models/settingsModel");
const { ObjectId } = require("mongoose").Types;
const userRouter = express.Router();
const aidPackages = require("../utility/aidpackage.json");

// user Count
userRouter.get(
  "/count/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const { aamarId } = req.params;

    try {
      // console.log("Received aamarId:", aamarId);

      // Check if aamarId is a valid ObjectId (if necessary)
      const count = await User.countDocuments({ aamarId });

      res.status(200).json(count);
    } catch (error) {
      console.error("Error fetching count:", error); // Log the error
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  })
);

// CUSTOMER SRARCH
userRouter.get(
  "/search/:aamarId/:q",
  expressAsyncHandler(async (req, res) => {
    const aamarId = req.params.aamarId?.trim() || ""; // Ensure `aamarId` is sanitized
    const payload = req.params.q?.trim().toString().toLowerCase(); // Sanitize and normalize `q`

    if (!payload || payload === "undefined" || payload === "null" || payload === "all") {
      try {
        const searchResults = await User.find({ aamarId, status: "active" })
          .select("_id name email phone point")
          .limit(10);
        return res.status(200).json(searchResults);
      } catch (error) {
        return res.status(500).json({ message: "Error fetching default users" });
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
      const searchResults = await User.find(query)
        .select("_id name email phone point") // Restrict fields to only those required
        .limit(10); // Limit the results to 10 entries

      res.status(200).json(searchResults);
    } catch (error) {
      console.error("Error while searching users:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  })
);


// GET ONE users
userRouter.get(
  "/select/:aamarId/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const aamarId = req.params.aamarId || "";
    let query = { _id: id, status: "active", aamarId: aamarId };

    const users = await User.find(query).select({
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

    res.send(users[0]);
    // // res.send('removed');
    // console.log(users);
  })
);

// GET ALL USERS
userRouter.get(
  "/:warehouse/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const warehouse = req.params.warehouse || "";
    const aamarId = req.params.aamarId || "";

    // console.log("Warehouse ID:", warehouse);
    let matchQuery = { aamarId: aamarId };
    if (warehouse !== "allWh" && warehouse) {
      matchQuery.warehouse = mongoose.Types.ObjectId(warehouse);
    }

    // console.log("Match Query:", matchQuery);
    try {
      // Fetch users and populate the warehouse field
      const users = await User.find(matchQuery)

        .select({
          // _id: 1,
          name: 1,
          username: 1,
          email: 1,
          phone: 1,
          type: 1,
          status: 1,
          warehouse: 1,
        })
        .populate("warehouse", "name"); // This will include only the 'name' field of the warehouse

      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message });
    }
  })
);

// POS USER DW
userRouter.get(
  "/posdw",
  expressAsyncHandler(async (req, res) => {
    try {
      const users = await User.find({ type: "POS" }).select({
        _id: 1,
        name: 1,
      });
      // console.log(users);
      res.send(users); // Send the response back to the client
    } catch (err) {
      console.error(err); // Log the error to the console
      res.status(500).send({ message: err.message }); // Send an error response
    }
  })
);

// USER POS DW,
userRouter.get(
  "/dw",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const users = await User.find({}).select({
      _id: 1,
      name: 1,
      username: 1,
      phone: 1,
    });
    res.status(200).json(users);
    // // res.send('removed');
    // console.log(users);
  })
);

// GET ALL USERS BY TYPE
userRouter.get(
  "/type/:type",
  expressAsyncHandler(async (req, res) => {
    const type = req.params.type;
    const users = await User.find({ type: type });
    res.send(users);
  })
);

// GET USE BY ID
userRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const user = await User.find({ _id: id }).select({
      name: 1,
      email: 1,
      phone: 1,
      type: 1,
      status: 1,
      username: 1,
      aamarId: 1,
      warehouse: 1,
    });
    res.send(user[0]);
  })
);

// GET USER BY PHONE
userRouter.get(
  "/phone/:phone",
  expressAsyncHandler(async (req, res) => {
    const phone = req.params.phone;
    const user = await User.find({ phone: phone });
    res.send(user);
  })
);

// GET USER BY EMAIL
userRouter.get(
  "/email/:email",
  expressAsyncHandler(async (req, res) => {
    const email = req.params.email;
    const user = await User.find({ email: email });
    res.send(user);
  })
);

// CREATE ONE USER
userRouter.post(
  "/",
  // checklogin,
  expressAsyncHandler(async (req, res) => {
    const newUser = new User(req.body);
    // console.log(newUser);
    try {
      await newUser.save();
      res.status(200).json({
        message: "User is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI USERS
userRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await User.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "Users are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE USER
userRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    // console.log(req);
    const id = req.params.id;
    let update = req.body;
    if (update.password) {
      const hashPassword = await bcrypt.hash(req.body.password, 10);
      update = { ...update, password: hashPassword };
    }

    // console.log(req.body)
    // console.log(update);
    try {
      await User.updateOne({ _id: id }, { $set: update })
        .then((response) => {
          res.send(response);
        })
        .catch((err) => {
          // console.log(err)
          res.send(err);
        });
    } catch (error) {
      console.error(error);
    }
  })
);

// DELETE ONE USER
userRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await User.deleteOne({ _id: id })
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

userRouter.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    try {
      const hashPassword = await bcrypt.hash(req.body.password, 10);
      // console.log(hashPassword);
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        username: req.body.username,
        phone: req.body.phone,
        type: req.body.type,
        address: "",
        privilege: {},
        password: hashPassword,
        aamarId: req.body.aamarId,
        status: req.body.status,
        warehouse: req.body.warehouse,
      });
      await newUser.save();
      res.status(200).json({
        message: "Registration Successful",
        status: "success",
      });
    } catch (error) {
      // res.status(400).json({
      res
        .status(500)
        .json({ message: "There was a server side error", error: error });
      // });
    }

    // res.send(newUser);?
  })
);

// userRouter.post(
//   "/login",
//   expressAsyncHandler(async (req, res) => {
//     const isEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
//       req.body.email
//     );
//     console.log("isEmail:", isEmail);

//     try {
//       let user;
//       if (isEmail) {
//         user = await User.findOne({
//           status: "active",
//           email: req.body.email.toLowerCase(),
//         });
//         console.log("user1", user);
//       } else {
//         user = await User.findOne({
//           status: "active",
//           username: req.body.email.toLowerCase(),
//         });
//         console.log("user2", user);
//       }

//       if (user) {
//         const isValidPassword = await bcrypt.compare(

//           req.body.password,
//           user?.password
//         );
//         if (isValidPassword) {
//           const settings = await Settings.findOne({ aamarId: user?.aamarId });
//           console.log("isValidPassword:", isValidPassword);

//           // Package data
//           let ammarDokanApi = {
//             pId: "AID-POS-03",
//             status: "active",
//             expiryDate: "01-01-2025",
//           };

//           // Find the matching package from aidPackages
//           const matchPackage = aidPackages.find(
//             (pkg) => pkg.pId === ammarDokanApi.pId
//           );

//           // If package is found, combine with ammarDokanApi data, otherwise handle undefined
//           if (matchPackage) {
//           const packageData = {
//             ...matchPackage,
//             status: ammarDokanApi.status,
//             expiryDate: ammarDokanApi.expiryDate,
//           };

//           console.log("Package Data", packageData);

//           // Generate token
//           const token = jwt.sign(
//             {
//               id: user?._id,
//               name: user?.name,
//               username: user?.username,
//               email: user?.email,
//               type: user?.type,
//               warehouse: user?.warehouse,
//               aamarId: user?.aamarId,
//               storeSettings: settings,
//               package: packageData,
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//           );

//           return res.status(200).json({
//             access_token: token,
//             status: true,
//             holdSale: user?.holdSale,
//             message: "Login Successful",
//           });
//           } else {
//             console.log("No matching package found.");
//             return res.status(404).json({
//               status: false,
//               error: "Package not found",
//             });
//           }
//         } else {
//           return res.status(401).json({
//             status: false,
//             error: "Password Does not Match",
//           });
//         }
//       } else {
//         return res.status(401).json({
//           status: false,
//           error: "User Not Found",
//         });
//       }
//     } catch (err) {
//       console.error("Error during login:", err);
//       return res.status(500).json({
//         status: false,
//         error: err.message || "An unexpected error occurred",
//       });
//     }
//   })
// );

userRouter.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const isEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(
      req.body.email
    );
    // console.log("isEmail:", isEmail);

    try {
      let user;
      if (isEmail) {
        user = await User.findOne({
          status: "active",
          email: req.body.email.toLowerCase(),
        });
        // console.log("user1", user);
      } else {
        user = await User.findOne({
          status: "active",
          username: req.body.email.toLowerCase(),
        });
        // console.log("user2", user);
      }

      if (user) {
        const isValidPassword = await bcrypt.compare(
          req.body.password,
          user?.password
        );
        if (isValidPassword) {
          const settings = await Settings.findOne({ aamarId: user?.aamarId });
          // console.log("isValidPassword:", isValidPassword);

          // Package data
          let ammarDokanApi = {
            pId: "AID-PHARMA-01",
            status: "active",
            expiryDate: "01-01-2025",
          };

          // Find the matching package from aidPackages
          const matchPackage = aidPackages.find(
            (pkg) => pkg.pId === ammarDokanApi.pId
          );

          // If package is found, combine with ammarDokanApi data, otherwise handle undefined
          if (matchPackage) {
            const packageData = {
              ...matchPackage,
              status: ammarDokanApi.status,
              expiryDate: ammarDokanApi.expiryDate,
            };

            // console.log("Package Data", packageData);

            // Generate token
            const token = jwt.sign(
              {
                id: user?._id,
                name: user?.name,
                username: user?.username,
                email: user?.email,
                type: user?.type,
                warehouse: user?.warehouse,
                aamarId: user?.aamarId,
                storeSettings: settings,
                package: packageData,
              },
              process.env.JWT_SECRET,
              { expiresIn: "7d" }
            );

            return res.status(200).json({
              access_token: token,
              status: true,
              holdSale: user?.holdSale,
              message: "Login Successful",
            });
          } else {
            // console.log("No matching package found.");
            return res.status(404).json({
              status: false,
              error: "Package not found",
            });
          }
        } else {
          return res.status(401).json({
            status: false,
            error: "Password Does not Match",
          });
        }
      } else {
        return res.status(401).json({
          status: false,
          error: "User Not Found",
        });
      }
    } catch (err) {
      console.error("Error during login:", err);
      return res.status(500).json({
        status: false,
        error: err.message || "An unexpected error occurred",
      });
    }
  })
);

// USER Validation
userRouter.post(
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
userRouter.post(
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

module.exports = userRouter;
