const { parseISO, format, startOfDay, endOfDay } = require("date-fns");
// const { parseISO } = require("date-fns/esm");
const Damage = require("../models/damageModel");
const Grn = require("../models/grnModel");
const Tpn = require("../models/tpnModel");
const Inventory = require("../models/inventoryModel");
const Rtv = require("../models/rtvModel");
const Sale = require("../models/saleModel");

// Generate Damage In -> inventory Out
const updateInventoryOutOnDamageIn = async (req, res, next) => {
  const products = await req.body.products;

  // console.log("inventory Products", products);

  try {
    if (products.length > 0) {
      products.map(async (product) => {
        // console.log("single product", product);
        const { id, article_code, qty, name } = product;
        // console.log(article_code);
        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) - Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty) + Number(qty),
            rtvQty: success.rtvQty,
            tpnQty: success.tpnQty ? success.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        } else {
          inventory = {
            name: name,
            article_code: article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: -Number(qty),
            openingQty: Number(qty),
            totalQty: Number(qty),
            soldQty: 0,
            damageQty: Number(qty),
            rtvQty: 0,
            tpnQty: 0,
            status: "active",
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          };
          const newInventory = new Inventory(inventory);
          const update = await newInventory.save();
          // console.log("CREATE");
        }
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};
// Generate Damage out -> inventory in
const updateInventoryInOnDamageOut = async (req, res, next) => {
  const id = req.params.id;
  const damageData = await Damage.find({ _id: id });
  const products = damageData[0].products;

  try {
    if (products.length > 0) {
      products.map(async (product) => {
        // console.log("single product", product);
        const id = product.get("id");
        const name = product.get("name");
        const article_code = product.get("article_code");
        const qty = product.get("qty");

        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) + Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty) - Number(qty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        }
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};

// Generate Rtv In -> inventory Out
const updateInventoryOutOnRTVIn = async (req, res, next) => {
  // TODO:: todays total

  // const todayTotal = await Damage.countDocuments({
  //     createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  // });
  const products = await req.body.products;

  // console.log("inventory Products", products);

  try {
    if (products.length > 0) {
      products.map(async (product) => {
        // console.log("single product", product);
        const { article_code, qty, priceId, name } = product;
        // console.log(article_code);
        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) - Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty + Number(qty),
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        } else {
          inventory = {
            name: name,
            article_code: article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: -Number(qty),
            openingQty: Number(qty),
            totalQty: Number(qty),
            soldQty: 0,
            damageQty: 0,
            rtvQty: Number(qty),
            tpnQty: 0,
            status: "active",
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          };
          const newInventory = new Inventory(inventory);
          const update = await newInventory.save();
          // console.log("CREATE");
        }
        // res.send(inventory)
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};
// Generate Rtv out -> inventory in
const updateInventoryINOnRTVOut = async (req, res, next) => {
  const id = req.params.id;
  // console.log("rtv delete", id)
  const rtvData = await Rtv.find({ _id: id });
  // console.log("rtv Data", rtvData)
  const products = rtvData[0].products;

  try {
    if (products.length > 0) {
      products.map(async (product) => {
        const name = product.get("name");
        const article_code = product.get("article_code");
        const qty = product.get("qty");

        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) + Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty - Number(qty),
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        }
        // res.send(inventory)
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};

// Generate Sale Del -> inventory in
const updateInventoryInOnSaleDel = async (req, res, next) => {
  try {
    const id = req.params.id;
    const saleData = await Sale.find({ _id: id });
    const products = saleData[0].products;
    const returnProducts = saleData[0].returnProducts;

    if (products.length > 0) {
      products.map(async (product) => {
        const name = product.get("name");
        const article_code = product.get("article_code");
        const qty = product.get("qty");

        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) + Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty - Number(qty),
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          // con
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        }
      });
    }
    if (returnProducts.length > 0) {
      returnProducts.map(async (product) => {
        // console.log("single product", product);
        // const { article_code, qty, priceId, name } = product;
        // console.log(article_code);
        console.log("return single product", product);
        const id = product.get("id");
        const name = product.get("name");
        const article_code = product.get("article_code");
        const qty = product.get("qty");

        // console.log("return newProduct", newProduct)
        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) - Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty + Number(qty),
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        }
      });
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};
// Generate Sale in -> inventory Out
// const adjustInventoryOnSale = async (req, res, next) => {
//   // TODO:: todays total

//   try {
//     const products = await req.body;
//     console.log("pp", products)
//     if (products.length > 0) {
//       products.map(async (product) => {
//         // console.log("single product", product);
//         const { code: article_code, qty, priceId, name } = product;
//         console.log("article_code", article_code?.length);
//         if (article_code?.length > 0) {
//           let inventory = {};
//           const success = await Inventory.findOne({ article_code: article_code });

//           if (success) {
//             inventory = {
//               name: success.name,
//               article_code: success.article_code,
//               warehouse: "645c9297ed6d5d94af257be9",
//               currentQty: Number(success.currentQty)
//                 - Number(qty),
//               openingQty: success.openingQty,
//               totalQty: Number(success.totalQty),
//               soldQty: Number(success.soldQty) + Number(qty),
//               damageQty: Number(success.damageQty),
//               rtvQty: success.rtvQty,
//               tpnQty: success?.tpnQty ? success?.tpnQty : 0,
//               status: success.status,
//               createdAt: success.createdAt !== undefined ? new Date(Date.parse(success.createdAt)) : new Date(Date.now()),
//               updatedAt: new Date(Date.parse(success.updatedAt)),

//             }

//           } else {
//             inventory = {
//               name: name,
//               article_code: article_code,
//               warehouse: "645c9297ed6d5d94af257be9",
//               currentQty: 0 - Number(qty),
//               openingQty: Number(qty),
//               totalQty: Number(qty),
//               soldQty: Number(qty),
//               damageQty: 0,
//               rtvQty: 0,
//               tpnQty: 0,
//               status: "active",
//               createdAt: new Date(Date.now()),
//               updatedAt: new Date(Date.now()),

//             };
//           }
//           const update = await Inventory.updateOne({ article_code: article_code }, { $set: inventory })
//           if (update) {
//             req.body.update = update
//           }
//         } else {
//           console.log("no update")
//         }
//       });
//     }
//   } catch (err) {
//     console.log(err)
//   } finally {
//     next()
//   }

// };

const updateInventoryOutOnSaleIn = async (req, res, next) => {
  // TODO:: todays total

  // const todayTotal = await Damage.countDocuments({
  //     createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  // });
  try {
    const products = await req.body.products;
    const returnProducts = await req.body.returnProducts;

    // console.log("inventory Products", products);

    if (products.length > 0) {
      products.map(async (product) => {
        // console.log("single product", product);
        const { article_code, qty, name } = product;
        // console.log(article_code);
        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) - Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty + Number(qty),
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success.tpnQty ? success.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };

          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        } else {
          inventory = {
            name: name,
            article_code: article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: 0 - Number(qty),
            openingQty: Number(qty),
            totalQty: Number(qty),
            soldQty: Number(qty),
            damageQty: 0,
            rtvQty: 0,
            tpnQty: 0,
            status: "active",
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          };
          const newInventory = new Inventory(inventory);
          const update = await newInventory.save();
        }
      });
    }

    if (returnProducts.length > 0) {
      returnProducts.map(async (product) => {
        // console.log("single product", product);
        const { article_code, qty, name } = product;
        // console.log(article_code);
        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          // console.log("success", success);
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) + Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty - Number(qty),
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        } else {
          inventory = {
            name: name,
            article_code: article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(qty),
            openingQty: Number(qty),
            totalQty: Number(qty),
            soldQty: 0 - Number(qty),
            damageQty: 0,
            rtvQty: 0,
            tpnQty: 0,
            status: "active",
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          };
          const newInventory = new Inventory(inventory);
          const update = await newInventory.save();
          // console.log("CREATE");
        }
        // res.send(inventory)
        // res.send(inventory)
        // console.log("inventory final", inventory);
      });
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};

/**
 * ====================================================================================
 * GRN INVENTORY OPERATIONS
 * =====================================================================================
 * **/
// Generate grn in -> inventory in
const updateInventoryInOnGRNIn = async (req, res, next) => {
  // TODO:: todays total

  // const todayTotal = await Damage.countDocuments({
  //     createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  // });
  try {
    const products = await req.body.products;

    // console.log("req Products", products);

    if (products.length > 0) {
      products.map(async (product) => {
        // console.log("single product", product);
        const { _id, article_code, qty, name } = product;
        // console.log(article_code);
        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) + Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty + Number(qty),
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        } else {
          inventory = {
            name: name,
            article_code: article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(qty),
            openingQty: Number(qty),
            totalQty: Number(qty),
            soldQty: 0,
            damageQty: 0,
            rtvQty: 0,
            tpnQty: 0,
            status: "active",
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          };
          const newInventory = new Inventory(inventory);
          const update = await newInventory.save();
        }
        // res.send(inventory)
        // console.log("inventory final", inventory);
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};
// Generate grn del -> inventory Out
const updateInventoryOutOnGRNDel = async (req, res, next) => {
  const id = req.params.id;
  const grnData = await Grn.findOne({ _id: id });
  const products = grnData.products;
  try {
    if (products.length > 0) {
      products.map(async (product) => {
        // console.log("single product", product);
        // console.log("single product", product);
        const id = product.get("id");
        const name = product.get("name");
        const article_code = product.get("article_code");
        const qty = product.get("qty");

        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) - Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty - Number(qty),
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty ? success?.tpnQty : 0,
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        }
        // res.send(inventory)
        // console.log("inventory final", inventory);
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};

// Generate tpn in -> inventory Out
const updateInventoryOutOnTPNIn = async (req, res, next) => {
  // TODO:: todays total

  // const todayTotal = await Damage.countDocuments({
  //     createdAt: { $gte: startOfDay(new Date()), $lte: endOfDay(new Date()) },
  // });
  try {
    const products = await req.body.products;

    // console.log("req Products", products);

    if (products.length > 0) {
      products.map(async (product) => {
        // console.log("single product", product);
        const { article_code, qty, priceId, name } = product;
        // console.log(article_code);
        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) - Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty
              ? success?.tpnQty + Number(qty)
              : 0 + Number(qty),
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        } else {
          inventory = {
            name: name,
            article_code: article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: -Number(qty),
            openingQty: Number(qty),
            totalQty: Number(qty),
            soldQty: 0,
            damageQty: 0,
            rtvQty: 0,
            tpnQty: Number(qty),
            status: "active",
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          };
          const newInventory = new Inventory(inventory);
          const update = await newInventory.save();
          console.log("CREATE");
        }
        // res.send(inventory)
        // console.log("inventory final", inventory);
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};
// Generate tpn del -> inventory in
const updateInventoryInOnTpnDel = async (req, res, next) => {
  const id = req.params.id;
  // console.log("grn delete", id)
  const tpnData = await Tpn.find({ _id: id });
  // console.log("GRN Data", grnData)
  const products = tpnData[0].products;
  // console.log("inventory Products", products);
  try {
    if (products.length > 0) {
      products.map(async (product) => {
        const name = product.get("name");
        const article_code = product.get("article_code");
        const qty = product.get("qty");

        let inventory = {};
        const success = await Inventory.findOne({ article_code: article_code });

        if (success) {
          inventory = {
            name: success.name,
            article_code: success.article_code,
            warehouse: "645c9297ed6d5d94af257be9",
            currentQty: Number(success.currentQty) + Number(qty),
            openingQty: success.openingQty,
            totalQty: success.totalQty,
            soldQty: success.soldQty,
            damageQty: Number(success.damageQty),
            rtvQty: success.rtvQty,
            tpnQty: success?.tpnQty
              ? success?.tpnQty - Number(qty)
              : 0 - Number(qty),
            status: success.status,
            createdAt:
              success.createdAt !== undefined
                ? new Date(Date.parse(success.createdAt))
                : new Date(Date.now()),
            updatedAt: new Date(Date.parse(success.updatedAt)),
          };
          const update = await Inventory.updateOne(
            { article_code: article_code },
            { $set: inventory }
          );
        }
      });
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};

module.exports = {
  updateInventoryOutOnDamageIn,
  updateInventoryInOnDamageOut,
  updateInventoryOutOnRTVIn,
  updateInventoryINOnRTVOut,
  updateInventoryInOnSaleDel,
  updateInventoryOutOnSaleIn,
  // adjustInventoryOnSale,
  updateInventoryInOnGRNIn,
  updateInventoryOutOnGRNDel,
  updateInventoryOutOnTPNIn,
  updateInventoryInOnTpnDel,
};
