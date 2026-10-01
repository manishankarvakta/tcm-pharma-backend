const mongoose = require("mongoose");

// const priceTable

const stockTimeSeries = new mongoose.Schema(
  {
    aamarId: { type: String, require: true },
    article_code: { type: String, required: true },
    openingStock: { type: String, required: true },
    warehouse: {
      type: mongoose.Types.ObjectId,
      ref: "Warehouse",
      require: true,
    },
    date: { type: Date, required: true },
  },
  {
    timeseries: {
      timeField: "date",
      metaField: "article_code",
    },
  }
);
// Create a compound index to ensure unique stock entries
// stockTimeSeries.index({ article_code: 1, warehouse: 1, date: 1 }, { unique: true });

const StockTimeSeries = new mongoose.model("StockTimeSeries", stockTimeSeries);


module.exports = StockTimeSeries;
