const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  clientName: String,
  clientPocName: String,
  clientPocEmail: String,
  clientPocMobile: String,
  clientVendorEmail: String, // ✅ FIXED
  ourPocName: String,
  startDate: String,
  paymentTerms: String,
  attachments: Array,
  createdBy: String
}, { timestamps: true });
clientSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Client", clientSchema);