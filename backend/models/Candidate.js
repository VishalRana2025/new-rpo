// models/Candidate.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: String, default: () => new Date().toISOString() },
  data: { type: String, default: null }  // 🔥 ADD THIS FIELD to store base64 data
});

const candidateSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  secondaryPhone: { type: String, default: "" },
  recruiter: { type: String, default: "" },
  sourcedFrom: { type: String, default: "" },
  sourceDate: { type: String, default: "" },
  gender: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "" },

  attachments: {
    type: [attachmentSchema],
    default: []
  },

  createdBy: { type: String, default: "" },
  createdByName: { type: String, default: "" },
  createdByEmail: { type: String, default: "" },
  createdByEmployeeId: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Prevent model recompilation error
module.exports = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);