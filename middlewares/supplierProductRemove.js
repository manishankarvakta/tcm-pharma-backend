const { parseISO, format, startOfDay, endOfDay } = require("date-fns");
const { response } = require("express");
// const { parseISO } = require("date-fns/esm");
const Product = require("../models/productModel");
const Supplier = require("../models/supplierModel");

const updateSupplierProducts = async (req, res, next) => {
  const a = req.body;
  // console.log("a", a)
  const id = req.params.id;
  // console.log("product id", id)
  const findProduct = await Product.findOne({ _id: id }).select({
    article_code: 1,
  });
  // console.log("findProduct", findProduct)
  try {
    const supplierProduct = await Supplier.aggregate([
      {
        $match: {
          "products.article_code": findProduct.article_code, // Match suppliers that have a product with id=1
        },
      },
      {
        $unwind: "$products", // Unwind the products array
      },
      {
        $match: {
          "products.article_code": findProduct.article_code, // Match products with id=1
        },
      },
    ]);
    const pSupplier = [];
    if (supplierProduct?.length > 0) {
      supplierProduct.map(async (s) => {
        // console.log(s)
        const findProducts = await Supplier.findOne({ code: s.code }).select({
          code: 1,
          products: 1,
        });
        const products = findProducts.products;
        const filterProducts = products.filter(
          (pro) => pro.get("article_code") !== findProduct.article_code
        );
        // console.log(products.length)
        // console.log(filterProducts.length)
        try {
          await Supplier.updateOne(
            { _id: s._id },
            { $set: { products: filterProducts } }
          )
            .then((response) => {
              console.log(response);
            })
            .catch((err) => {
              res.send(err);
            });
        } catch (err) {
          console.log(err);
        }
        // console.log("products", products)
        // console.log("findProducts", findProducts)
      });
    }
    // console.log(supplierProduct)
    // res.send(supplierProduct)
  } catch (err) {
  } finally {
    next();
  }
};

module.exports = {
  updateSupplierProducts,
};
