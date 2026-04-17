const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  requirementReceivedDate: { type: String, required: true },
  agent: { type: String, required: true },
  process: { type: String, required: true },
  designationPosition: { type: String, required: true },
  requirementType: { type: String, required: true, enum: ['Bonanza', 'Regular', 'FLR'] },

  // ✅ UPDATED FIELD
  clientLocation: { type: String, default: '' },

  noOfRequirement: { type: Number, default: 0 },
  driveDate: { type: String, default: null },
  requirementDeadline: { type: String, default: null },
  budget: { type: String, required: true },
  payoutCommissionRs: { type: Number, default: 0 },
  payoutCommissionPercent: { type: Number, default: 0 },
  additionalNotes: { type: String, default: '' },
  fileUploads: { type: Array, default: [] },
  createdBy: { type: String, required: true },
  createdByEmail: { type: String, required: true },
  createdByName: { type: String, required: true },
  createdByEmployeeId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }

}, { strict: false });

module.exports = mongoose.model("Requirement", requirementSchema);