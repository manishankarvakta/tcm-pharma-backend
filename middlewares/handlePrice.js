const Price = require("../models/priceModel");
const Product = require("../models/productModel");
const handleNewPrice = async (req, res, next) => {
  // console.log("new Price", req.body)
  let grnData = req.body;
  let products = grnData.products;
  // let updatedProducts = []
  let upProducts = [];
  let temp = false;
  // console.log("grn products", grnData.products)

  // LOOP
  try {
    const updatedProducts = products?.map(async (product) => {
      // console.log("product", product)
      // CHECK PRODUCT PRICE
      if (product.newPrice === true) {
        const update = await Product.updateOne(
          { _id: product.id },
          { $set: { tp: product.tp, mrp: product.mrp } }
        );
      } // Data match and create new price
    }); //Loop END
  } catch (err) {
    console.log(err);
  } finally {
    next();
  }
};
module.exports = {
  handleNewPrice,
};
