const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["CREATE", "UPDATE", "DELETE"],
    required: true
  },
  module: {
    type: String,
    enum: ["candidate", "requirement", "client"],
    required: true
  },
  itemId: {
    type: String,
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    default: "System"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  deletedAt: {
    type: Date
  }
});

// 🔥 PERFORMANCE INDEXES
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ module: 1, action: 1 });
activityLogSchema.index({ userName: 1 });

module.exports =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);