require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const productRouter = require("./routes/productRouter");
const userRouter = require("./routes/userRouter");
const categoryRouter = require("./routes/categoryRouter");
const genericRouter = require("./routes/genericRouter");
const groupRouter = require("./routes/groupRouter");
const saleRouter = require("./routes/saleRouter");
const supplierRouter = require("./routes/supplierRouter");
const customerRouter = require("./routes/customerRouter");
const brandRouter = require("./routes/brandRouter");
const unitRouter = require("./routes/unitRouter");
const priceRouter = require("./routes/priceRouter");
const warehouseRouter = require("./routes/warehouseRouter");
const inventoryRouter = require("./routes/inventoryRouter");
const inventoryCountRouter = require("./routes/inventoryCountRouter");
const purchaseRouter = require("./routes/purchaseRouter");
const grnRouter = require("./routes/grnRouter");
const rtvRouter = require("./routes/rtvRouter");
const tpnRouter = require("./routes/tpnRouter");
const companyRouter = require("./routes/companyRouter");
const damageRouter = require("./routes/damageRouter");
const ecomRouter = require("./routes/ecomRouter");
const aamarDokanRouter = require("./routes/aamarDokanRouter");
const accountHeadRouter = require("./routes/accountHeadRouter");
const accountRouter = require("./routes/accountRouter");
const adjustRouter = require("./routes/adjustRouter");
const multer = require("multer");
const fileUpload = require("express-fileupload");
const settingsRouter = require("./routes/settingsRouter");
const fileManagerRouter = require("./routes/fileManagerRouter");
const reportsRouter = require("./routes/reportsRouter");
const backupRouter = require("./routes/backupRouter");

process.env.TZ = "Asia/Dhaka";
const PORT = process.env.PORT || 5006;

// app init`mongoose.set('strictQuery',
const app = express();

// MiddleWare
app.use(cors());
// app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.use(express.json());
app.use(express.static(__dirname + "/template"));

const dbUrl = process.env.DB_URL
  ? process.env.DB_URL
  : `mongodb://localhost:27017/pharmacy`;

console.log(dbUrl);

require("./corn");
const { performBackup } = require("./Backup");



mongoose
  .connect(dbUrl)
  .then(() => console.log("connection successful"))
  .catch((err) => console.log(err));

mongoose.set("strictQuery", false);

// application router
app.use(fileUpload());
app.use("/api/product", productRouter);
app.use("/api/user", userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/group", groupRouter);
app.use("/api/generic", genericRouter);
app.use("/api/sale", saleRouter);
app.use("/api/supplier", supplierRouter);
app.use("/api/customer", customerRouter);
app.use("/api/brand", brandRouter);
app.use("/api/unit", unitRouter);
app.use("/api/price", priceRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/inventoryCount", inventoryCountRouter);
app.use("/api/purchase", purchaseRouter);
app.use("/api/grn", grnRouter);
app.use("/api/rtv", rtvRouter);
app.use("/api/tpn", tpnRouter);
app.use("/api/company", companyRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/damage", damageRouter);
app.use("/api/ecom", ecomRouter);
app.use("/api/accounthead", accountHeadRouter);
app.use("/api/account", accountRouter);
app.use("/api/adjust", adjustRouter);
app.use("/api/aamarDokan", aamarDokanRouter);
app.use("/api/fileManager", fileManagerRouter);
app.use("/api/stock-ledger", require("./routes/stockLedgerRouter"));
app.use("/api/reports", reportsRouter);
app.use("/api/backup", backupRouter);
app.use("/uploads", express.static("uploads"));
// Home
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname + "/template/home.html"));
});

// API DOCS
app.get("/api/v1/docs", async (req, res) => {
  res.sendFile(path.join(__dirname + "/template/docs.html"));
});

// error Handle
const errorHandler = (err, req, res, next) => {
  if (res.headerSent) {
    return next(err);
  } else {
    if (err === "Authentication Failure!") {
      res.status(401).json({ err: err });
    } else if (err instanceof multer.MulterError) {
      res.status(500).send(err.message);
    } else {
      res.status(500).json({ err: err });
    }
  }
};

app.use(errorHandler);

// start app
app.listen(PORT, () => {
  console.log("Listing port:", PORT);
});
