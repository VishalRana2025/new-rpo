const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  action: String,        // CREATE / UPDATE / DELETE
  module: String,        // candidate
  itemId: String,
  itemName: String,
    userName: String,   // ✅ ADD THIS LINE

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ActivityLog", activitySchema);