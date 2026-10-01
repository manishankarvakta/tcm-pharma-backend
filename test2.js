const mongoose = require('mongoose');
const Supplier = require('./models/supplierModel');
require('dotenv').config();

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  try {
    const s = await Supplier.findById("6a411a548c2e4c62f30ef2ec").lean();
    console.log("Raw Supplier:", JSON.stringify(s, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
});
