const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  clientName: String,
  clientPocName: String,
  clientPocEmail: String,
  clientPocMobile: String,
  clientVendorEmail: String,
  ourPocName: String,
  startDate: String,
  paymentTerms: String,
  attachments: Array,
  createdBy: String
}, { timestamps: true });

// 🔥 ADD THESE INDEXES
clientSchema.index({ createdAt: -1 });
clientSchema.index({ clientName: 1 });

module.exports = mongoose.models.Client || mongoose.model("Client", clientSchema);