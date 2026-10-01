const cron = require("node-cron");
const Grn = require("./models/grnModel");
const Sale = require("./models/saleModel");
const Rtv = require("./models/rtvModel");
const Tpn = require("./models/tpnModel");
const Damage = require("./models/damageModel");
// const Adjust = require("./models/adjustModel");
const Product = require("./models/productModel");
const Warehouse = require("./models/warehouseModel");
const { startOfDay, addDays, endOfDay } = require("date-fns");
const StockTimeSeries = require("./models/stockTimeSeriesModel");
const Inventory = require("./models/inventoryModel");
const mongoose = require("mongoose");
const { default: axios } = require("axios");
const Settings = require("./models/settingsModel");
const ObjectId = mongoose.Types.ObjectId;

const TELEGRAM_BOT_TOKEN = "7754866323:AAF6kHkEKyNM65Ps3hVBZ9_dHjynunURKjw";
const TELEGRAM_CHAT_ID = "877939799"; // User or group chat ID

// new api
// const TELEGRAM_BOT_TOKEN = "8030819649:AAEmiDa-fZWUfdqirBSu3xHnkuinjlx1P0Q";
// const TELEGRAM_CHAT_ID = "877939799"; // User or group chat ID



//BRANCH WH
// Schedule the cron job to run daily at a specific time (e.g., midnight)
// cron.schedule(
//   "53 16 * * *",

//   async () => {
//     const today = new Date();
//     // console.log("today", today);
//     const previousDate = today.setDate(today.getDate() - 1);
//     // const previousDate = today.setDate(today.getDate());

//     console.log("Previous day", new Date(previousDate));
//     // console.log("Current day", currentDate);

//     const getByDate = async (date, products, warehouseId, aamarId) => {
//       // const start = startOfDay(new Date("17/01/2025"));
//       const start = startOfDay(new Date(date));

//       const end = endOfDay(new Date(date));

//       console.log("Start Date::>>", start);
//       console.log("End Date::>>", end);
//       console.log("AamarId::>>", aamarId);
//       console.log("Warehouse::>>", warehouseId);

//       try {
//         // grn Products
//         const grnProducts = await Grn.aggregate([
//           {
//             $match: {
//               createdAt: {
//                 $gte: start,
//                 $lte: end
//               },
//               status: { $ne: "Deleted" },
//               warehouse: ObjectId(warehouseId),
//               aamarId: aamarId
//             }
//           },
//           { $unwind: "$products" },
//           {
//             $group: {
//               _id: "$products.article_code",
//               qty: { $sum: { $toDouble: "$products.qty" } }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               article_code: "$_id",
//               qty: 1
//             }
//           }
//         ]);
//         console.log("grnProducts::>>", warehouseId, aamarId, grnProducts.length);
//         // Rtv Products
//         const rtvProducts = await Rtv.aggregate([
//           {
//             $match: {
//               createdAt: {
//                 $gte: start,
//                 $lte: end
//               },
//               status: "Complete",
//               warehouse: ObjectId(warehouseId),
//               aamarId: aamarId
//             }
//           },
//           { $unwind: "$products" },
//           {
//             $group: {
//               _id: "$products.article_code",
//               qty: { $sum: { $toDouble: "$products.qty" } }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               article_code: "$_id",
//               qty: 1
//             }
//           }
//         ]);
//         console.log("rtvProducts::>>", warehouseId, aamarId, rtvProducts.length);
//         // Sale Products
//         const saleProducts = await Sale.aggregate([
//           {
//             $match: {
//               createdAt: {
//                 $gte: start,
//                 $lte: end
//               },
//               status: "complete",
//               warehouse: ObjectId(warehouseId),
//               aamarId: aamarId
//             }
//           },
//           { $unwind: "$products" },
//           {
//             $group: {
//               _id: "$products.article_code",
//               qty: { $sum: { $toDouble: "$products.qty" } }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               article_code: "$_id",
//               qty: 1
//             }
//           }
//         ]);
//         console.log("saleProducts::>>", warehouseId, aamarId, saleProducts);
//         // salesReturn Products
//         const salesReturnProducts = await Sale.aggregate([
//           {
//             $match: {
//               createdAt: {
//                 $gte: start,
//                 $lte: end
//               },
//               status: "complete",
//               warehouse: ObjectId(warehouseId),
//               aamarId: aamarId
//             }
//           },
//           { $unwind: "$returnProducts" },
//           {
//             $group: {
//               _id: "$returnProducts.article_code",
//               qty: { $sum: { $toDouble: "$returnProducts.qty" } }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               article_code: "$_id",
//               qty: 1
//             }
//           }
//         ]);
//         console.log(
//           "salesReturnProducts::>>",
//           warehouseId,
//           aamarId,
//           salesReturnProducts.length
//         );
//         // damage Products
//         const damageProducts = await Damage.aggregate([
//           {
//             $match: {
//               createdAt: {
//                 $gte: start,
//                 $lte: end
//               },
//               status: "active",
//               warehouse: ObjectId(warehouseId),
//               aamarId: aamarId
//             }
//           },
//           { $unwind: "$products" },
//           {
//             $group: {
//               _id: "$products.article_code",
//               qty: { $sum: { $toDouble: "$products.qty" } }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               article_code: "$_id",
//               qty: 1
//             }
//           }
//         ]);
//         console.log(
//           "damageProducts::>>",
//           warehouseId,
//           aamarId,
//           damageProducts.length
//         );

//         // StockTimeSeries Get Previous Date Stock
//         const openingStockProducts = await StockTimeSeries.aggregate([
//           {
//             $match: {
//               date: {
//                 $gte: start,
//                 $lte: end
//               },
//               warehouse: ObjectId(warehouseId),
//               aamarId: aamarId
//             }
//           }
//         ]);

//         console.log(
//           "openingStockProducts ::>>",
//           warehouseId,
//           aamarId,
//           openingStockProducts
//         );

//         // INIT Product Movement
//         let productsMovement = [];
//         let inventoryMovement = [];
//         let i = 0;

//         // Loop Products
//         products.forEach(async (product) => {
//           const grnMatched = grnProducts.find(
//             (grn) => grn.article_code === product.article_code
//           );

//           const rtvMatched = rtvProducts.find(
//             (rtv) => rtv.article_code === product.article_code
//           );
//           const saleMatched = saleProducts.find(
//             (sale) => sale.article_code === product.article_code
//           );
//           const salesReturnMatched = salesReturnProducts.find(
//             (salesReturn) => salesReturn.article_code === product.article_code
//           );
//           const damageMatched = damageProducts.find(
//             (damage) => damage.article_code === product.article_code
//           );
//           // const adjustMatched = adjustProducts.filter(
//           //   (adjust) => adjust.article_code === product.article_code
//           // );
//           const openingStockMatched = openingStockProducts.find(
//             (stock) => stock.article_code === product.article_code
//           );

//           // let adjustQty = 0;
//           // let otherAdjustQty = 0;

//           // if (adjustMatched.length > 0) {
//           //   adjustMatched.map((adj) => {
//           //     if (adj?.type === true) {
//           //       adjustQty = adjustQty + parseFloat(adj?.qty);
//           //     } else {
//           //       otherAdjustQty = otherAdjustQty + parseFloat(adj?.qty);
//           //     }
//           //   });
//           // }

//           const currentStock =
//             (openingStockMatched
//               ? parseFloat(openingStockMatched.openingStock)
//               : 0) +
//             // parseFloat(adjustQty) +
//             (grnMatched ? parseFloat(grnMatched.qty) : 0) +
//             (salesReturnMatched ? parseFloat(salesReturnMatched.qty) : 0) -
//             ((rtvMatched ? parseFloat(rtvMatched.qty) : 0) +
//               (saleMatched ? parseFloat(saleMatched.qty) : 0) +
//               // parseFloat(otherAdjustQty) +
//               (damageMatched ? parseFloat(damageMatched.qty) : 0));
//           // (tpnMatched ? parseFloat(tpnMatched.qty) : 0)

//           // console.log("Cureent", currentStock);

//           const newProduct = {
//             article_code: product.article_code,
//             openingStock: currentStock,
//             date: startOfDay(new Date()),
//             warehouse: warehouseId,
//             aamarId: aamarId
//           };

//           const newInventory = {
//             name: product.name,
//             article_code: product.article_code,
//             warehouse: warehouseId,
//             aamarId: aamarId,
//             currentQty: Number(currentStock),
//             openingQty: Number(currentStock),
//             totalQty: 0, //This will work as GRN
//             soldQty: 0,
//             soldReturnQty: 0,
//             damageQty: 0,
//             // adjustQty: 0,
//             // otherAdjustQty: 0,
//             rtvQty: 0,
//             tpnQty: 0,
//             status: "active",
//             createdAt: new Date(Date.now()),
//             updatedAt: new Date(Date.now())
//           };

//           // console.log("New Inventory", newInventory);
//           //SKIP O OpeningStock
//           // if (parseFloat(newProduct.openingStock) === 0) {
//           //   i++;
//           // }
//           // console.log(i);

//           if (parseFloat(newProduct.openingStock) !== 0) {
//             // console.log(
//             //   newProduct.article_code,
//             //   "->",
//             //   openingStockMatched?.openingStock | 0,
//             //   grnMatched?.qty | 0,
//             //   salesReturnMatched?.qty | 0,
//             //   rtvMatched?.qty | 0,
//             //   adjustQty,
//             //   saleMatched | 0?.qty | 0,
//             //   otherAdjustQty,
//             //   damageMatched | 0?.qty | 0,
//             //   tpnMatched?.qty | 0,
//             //   currentStock
//             // );
//             // console.log(newProduct.article_code, "=>", newProduct.openingStock);
//             // console.log(newProduct.article_code, "=>", newProduct.openingStock);
//             productsMovement = [...productsMovement, newProduct];
//           }
//           inventoryMovement = [...inventoryMovement, newInventory];
//         });
//         // if (openingStockProducts?.length === 0) {
//         //   return 0;
//         // } else {
//         const stock = { productsMovement, inventoryMovement };
//         // console.log("stock::>",stock);
//         return stock;
//         // }
//       } catch (error) {
//         console.log(error);
//       }
//     };
//     //   const products = await Inventory.find(); // Fetch all products
//     console.log(`
//   ####    #####   ######   ##   ##                ##   #####   ######
//  ##  ##  ### ###   ##  ##  ###  ##                ##  ### ###   ##  ##
// ##       ##   ##   ##  ##  #### ##                ##  ##   ##   ##  ##
// ##       ##   ##   #####   #######                ##  ##   ##   #####
// ##       ##   ##   ## ##   ## ####           ##   ##  ##   ##   ##  ##
//  ##  ##  ### ###   ## ##   ##  ###            ## ##   ### ###   ##  ##
//   ####    #####   #### ##  ##   ##             ###     #####   ######
// `);

//     console.log("Corn Job Started");

//     // Get AamarId from Settings
//     const aamarDokan = await Settings.find({ status: "active" }).select({
//       aamarId: 1
//     });
//     console.log("aamarID::>", aamarDokan);

//     // TODO:: INIT Inventory
//     try {
//       await Inventory.deleteMany({});
//       console.log("Inventory cleared successfully");
//     } catch (error) {
//       console.error("Error clearing inventory:", error);
//     }

//     for (const dokan of aamarDokan) {
//       const aamarId = dokan.aamarId;
//       console.log("aamarId: ", aamarId);
//       // CHECK IF TODAY OPENING STOCK IS AVAILABLE
//       //==================
//       // StockTimeSeries Get Previous Date Stock
//       const todayStock = await StockTimeSeries.aggregate([
//         {
//           $match: {
//             date: {
//               $gte: startOfDay(new Date()),
//               $lte: endOfDay(new Date())
//             },
//             aamarId: aamarId
//           }
//         }
//       ]);

//       console.log("todayStock", todayStock.length);

//       // Get all products
//       const products = await Product.find({
//         aamarId: aamarId,
//         status: "active"
//       }).select({
//         article_code: 1,
//         name: 1,
//         aamarId: 1
//       });

//       // console.log("Products::>", products.map((products) => products.name));
//       //   get all warehouse
//       const warehouse = await Warehouse.find({
//         aamarId: aamarId,
//         status: "active"
//       }).select({
//         _id: 1,
//         name: 1,
//         aamarId: 1
//       });

//       console.log(
//         "warehouse::>",
//         aamarId,
//         warehouse.map((warehouse) => warehouse.name)
//       );

//       for (const wh of warehouse) {
//         const openingStock = await getByDate(
//           previousDate,
//           products,
//           wh._id,
//           aamarId
//         );

//         if (todayStock?.length !== 0) {
//           //condition shoud be  not !==
//           console.log("Opening Stock already Stored.");
//         } else {
//           console.log(
//             "Opening Stock By Warehouse: ",
//             wh?.name,
//             openingStock.productsMovement,
//             openingStock.inventoryMovement.length
//           );

//           //   TODO:: Entry to DB

//           const storeStock = await StockTimeSeries.insertMany(
//             openingStock.productsMovement
//           );
//           console.log("StoreStock ::>", storeStock.length);

//           const { format } = require("date-fns"); // Import date-fns for date formatting

//           if (storeStock?.length > 0) {
//             try {
//               // Format the message with emojis
//               const message = `
//                   ✅ Aamar Dokan Pharma - Opening Stock Generation Successfully!
//                   Date: *${format(new Date(), "dd/MM/yyyy, h:mm a")}*
//                   Aamar ID: *${wh?.aamarId}*
//                   Warehouse: *${wh?.name}*
//                   Closing Stock: *${openingStock.inventoryMovement.length}*

//                   `;

//               // Send the message via Telegram
//               const response = await axios.post(
//                 `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
//                 {
//                   chat_id: TELEGRAM_CHAT_ID,
//                   text: message,
//                   parse_mode: "Markdown"
//                 }
//               );

//               if (response.data.ok) {
//                 console.log(
//                   "Notification sent successfully:",
//                   response.data.result
//                 );
//               } else {
//                 console.warn("Notification failed:", response.data.description);
//               }
//             } catch (error) {
//               console.error(
//                 "Error sending notification:",
//                 error.message,
//                 error.response?.data || error
//               );
//             }
//           }
//         }

//         // // TODO:: INIT Inventory
//         // await Inventory.deleteMany({});

//         // // TODO:: InsertMany Today'Ins Inventory
//         // console.log("inventoryMovement", openingStock.inventoryMovement.length);
//         // const options = { ordered: false };

//         // await Inventory.insertMany(openingStock.inventoryMovement, options);

//         try {
//           // TODO:: InsertMany Today's Inventory
//           console.log(
//             "inventoryMovement",
//             openingStock.inventoryMovement.length
//           );

//           const options = { ordered: false };
//           await Inventory.insertMany(openingStock.inventoryMovement, options);
//           console.log("Inventory inserted successfully");
//         } catch (error) {
//           console.error("Error managing inventory:", error);
//         }

//         console.log("<::Warehouse Id END::>");
//       }

//       console.log("<::Aamar Dokan Id END::>");
//     }

//     console.log("Corn Job Finished");
//   },
//   {
//     scheduled: true,
//     timezone: "Asia/Dhaka"
//   }
// );
