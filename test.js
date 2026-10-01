const mongoose = require('mongoose');
const Product = require('./models/productModel');
require('dotenv').config();

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  try {
    const p2 = await Product.aggregate([
      { $match: { article_code: "1193851471846" } },
      {
        $addFields: {
          brandObjId: { $convert: { input: "$brand", to: "objectId", onError: null, onNull: null } }
        }
      },
      {
        $lookup: {
          from: "brands",
          localField: "brandObjId",
          foreignField: "_id",
          as: "brandDetails"
        }
      },
      {
        $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          brand: "$brandDetails",
          brandObjId: 1
        }
      }
    ]);
    console.log("Aggregated:", JSON.stringify(p2, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
});
