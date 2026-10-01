const { format, startOfDay, endOfDay } = require("date-fns");
const Damage = require("../models/damageModel");
const Grn = require("../models/grnModel");
const Purchase = require("../models/purchaseModel");
const Rtv = require("../models/rtvModel");
const Sale = require("../models/saleModel");
const Tpn = require("../models/tpnModel");
const Account = require("../models/accountModel");
const Settings = require("../models/settingsModel");
const Adjust = require("../models/adjustModel");


// Generate POS Sales ID
const generatePosId = async (req, res, next) => {
  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });

  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Sale.countDocuments({
    aamarId,
    warehouse,
    status: "complete",
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) }
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);

  req.body.invoiceId = newId; // Attach the generated ID to the request body
  next();
};

// Generate sale Ecom ID
const generateEcomId = async (req, res, next) => {
  // TODO:: todays total

  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });
  
  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  const todayTotal = await Sale.countDocuments({
    aamarId,
    warehouse,
    status: "complete",
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) }
  });

    // Generate a random 6-digit number
    const randomSixDigit = Math.floor(100000 + Math.random() * 900000);
 // Create a sequential number padded to 4 digits
 const number = ("000" + (todayTotal + 1)).toString();
 const current = number.substring(number.length - 4);

 // Construct the ID with the prefix
 const newId = `${prefix}${randomSixDigit}${current}`;
//  console.log(newId);

 req.body.invoiceId = newId; // Attach the generated ID to the request body
 next();
};

// Generate PO Id
const generatePoId = async (req, res, next) => {
  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });
  
  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Purchase.countDocuments({
    aamarId,
    warehouse,
    status: { $in: ["Received", "Pending"] },
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);
  // console.log(newId);
  req.body.poNo = newId;
  next();
};

// Generate Grn Id
const generateGrnId = async (req, res, next) => {
  // Extract aamarId and warehouse from request body or authenticated user fallback
  const aamarId = req.body.aamarId || req.user?.aamarId;
  const warehouse = req.body.warehouse || req.user?.warehouse;

  // Validate aamarId and warehouse
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  req.body.aamarId = aamarId;
  req.body.warehouse = warehouse;
  if (!req.body.userId && req.user?._id) {
    req.body.userId = req.user._id;
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });

  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Grn.countDocuments({
    aamarId,
    warehouse,
    status: { $in: ["Complete", "Pending"] },
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);
  // console.log(newId);
  req.body.grnNo = newId;
  // console.log(newId);
  next();
};


// Generate rtv Id
const generateRtvId = async (req, res, next) => {
  // TODO:: todays total

  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });

  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Rtv.countDocuments({
    aamarId,
    warehouse,
    status: "Complete",
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);
  req.body.rtvNo = newId;
  next();
};

// Generate tpn Id
const generateTpnId = async (req, res, next) => {
  // TODO:: todays total

  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });

  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Tpn.countDocuments({
    aamarId,
    warehouse,
    status: { $in: ["Complete", "Pending"] },
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);
  req.body.tpnNo = newId;
  next();
};


// Generate Account ID
const generateAccId = async (req, res, next) => {
  // TODO:: todays total

  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });

  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Account.countDocuments({
    aamarId,
    warehouse,
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);
  req.body.acId = newId;
  next();
};

// Generate Damage Id
const generateDamageId = async (req, res, next) => {
  // TODO:: todays total

  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });

  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Damage.countDocuments({
    aamarId,
    warehouse,
    status: "active",
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);
  req.body.damageNo = newId;
  next();
};

// Generate adjust Id
const generateAdjustId = async (req, res, next) => {
  // TODO:: todays total

  const { aamarId, warehouse } = req.body; // Extract aamarId and warehouse from the request body

  // Validate aamarId
  if (!aamarId || !warehouse) {
    return res.status(400).json({ error: "aamarId is required" });
  }

  // Fetch the settings for the provided aamarId
  const settings = await Settings.findOne({ aamarId });

  // Extract the invoice prefix from settings
  const prefix = settings?.invoiceIdPrefix || "AID";

  // Count today's total sales matching the aamarId and warehouse
  const todayTotal = await Adjust.countDocuments({
    aamarId,
    warehouse,
    status: "active",
    createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  });

  // Generate a random 6-digit number
  const randomSixDigit = Math.floor(100000 + Math.random() * 900000);

  // Create a sequential number padded to 4 digits
  const number = ("000" + (todayTotal + 1)).toString();
  const current = number.substring(number.length - 4);

  // Construct the ID with the prefix
  const newId = `${prefix}${randomSixDigit}${current}`;
  // console.log(newId);
  req.body.adjustNo = newId;
  next();
};

module.exports = {
  generatePosId,
  generateEcomId,
  generatePoId,
  generateGrnId,
  generateRtvId,
  generateTpnId,
  generateDamageId,
  generateAccId,
  generateAdjustId
};
