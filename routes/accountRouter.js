const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Account = require("../models/accountModel");
const checklogin = require("../middlewares/checkLogin");
const { generateAccId } = require("../middlewares/generateId");
const { startOfDay, endOfDay } = require("date-fns");

const accountRouter = express.Router();

accountRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const account = await Account.find({}).populate("supplier", "company");
    res.send(account);
    // // res.send('removed');
    // console.log(account);
  })
);
accountRouter.get(
  "/byDate/:start/:end/:aamarId",
  expressAsyncHandler(async (req, res) => {
    const start = req.params.start
      ? startOfDay(new Date(req.params.start))
      : startOfDay(new Date.now());
    const end = req.params.end
      ? endOfDay(new Date(req.params.end))
      : endOfDay(new Date.now());
    const aamarId = req.params.aamarId || "";
    // console.log(start, end, new Date());
    const account = await Account.find({
      createdAt: { $gte: start, $lte: end },
      status: "active",
      aamarId: aamarId,
    })
      .populate("supplier", "company")
      .populate("accountHead", "name");
    res.send(account);
    // // res.send('removed');
    // console.log(account);
  })
);
accountRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const account = await Account.findOne({ _id: id, status: "active" })
      .populate("supplier", {
        name: 1,
        phone: 1,
        email: 1,
        address: 1,
        company: 1,
      })
      .populate("accountHead", { name: 1, maId: 1 })
      .populate("user", { name: 1 })
      .populate("poId", { poNo: 1 })
      .populate("grnId", { grnNo: 1 });
    res.send(account);
    // // res.send('removed');
    // console.log(account);
  })
);

accountRouter.post(
  "/",
  generateAccId,
  expressAsyncHandler(async (req, res) => {
    const newAccount = new Account(req.body);

    try {
      await newAccount.save();
      res.status(200).json({
        message: "Account is created Successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "There was a server side error", error: err });
    }
  })
);

// CREATE MULTI Account
accountRouter.post(
  "/all",
  expressAsyncHandler(async (req, res) => {
    await Account.insertMany(req.body, (err) => {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({
          message: "Accounts are created Successfully",
        });
      }
    });
  })
);

// UPDATE ONE Account
accountRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    try {
      await Account.updateOne({ _id: id }, { $set: update })
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
// DELETE ONE Account
accountRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;
    try {
      await Account.deleteOne({ _id: id })
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
// Upload Endpoint
accountRouter.post(
  "/upload/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;

    // APPRoot
    // const appRoot = path.dirname(require.main.filename);
    // const appRoot = process.env.PWD;
    const appRoot = process.cwd();
    // APPRoot
    if (req.files === null) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const file = req.files.file;
    const name = file.name.split(".");
    const ext = name[1];
    const time = Date.now();
    const fileName = `${id}-${time}.${ext}`;
    // console.log(`../uploads/${fileName}`);

    file.mv(`${appRoot}/uploads/account/${fileName}`, async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      } else {
        await Account.updateOne(
          { _id: id },
          { $set: { photo: `/uploads/account/${fileName}` } }
        )
          .then((response) => {
            // res.send(response);
            res.json({
              fileName: fileName,
              filePath: `/uploads/account/${fileName}`,
            });
          })
          .catch((err) => {
            res.send(err);
          });
      }
    });
  })
);

module.exports = accountRouter;
