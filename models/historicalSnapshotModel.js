const mongoose = require("mongoose");

// const priceTable

const historicalSnapshotSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  aamarId: { type: String, require: true },

  inventoryData: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory", // Reference to the Inventory collection
    },
  ],
});

const HistoricalSnapshot = mongoose.model(
  "HistoricalSnapshot",
  historicalSnapshotSchema
);

module.exports = HistoricalSnapshot;
