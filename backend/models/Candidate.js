const mongoose = require("mongoose");

// 📎 Attachment Schema
const attachmentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: String, default: () => new Date().toISOString() },
  data: { type: String, default: null }
});

// ✅ Client Section Schema
const clientSectionSchema = new mongoose.Schema({
  clientName: { type: String, default: "" },
  designation: { type: String, default: "" },
  clientLocation: { type: String, default: "" },
  process: { type: String, default: "" },
  processLOB: { type: String, default: "" },
  salary: { type: String, default: "" },
  hrRemark: { type: String, default: "" },

  // ✅ IMPORTANT
  clientStatus: { type: String, default: "" },

  status: { type: String, default: "" },
  remark: { type: String, default: "" }
});

// 👤 Candidate Schema
const candidateSchema = new mongoose.Schema({
  // Basic
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

  // Professional
  qualification: { type: String, default: "" },
  totalExperience: { type: String, default: "" },
  currentCTC: { type: String, default: "" },
  expectedCTC: { type: String, default: "" },
  noticePeriod: { type: String, default: "" },
  resume: { type: String, default: "" },

  // Recruiter Status
  status: { type: String, default: "" },
  remark: { type: String, default: "" },

  tags: {
    type: [String],
    default: []
  },

  // Client Sections
  clientSections: {
    type: [clientSectionSchema],
    default: []
  },

  // Interview Rounds
  interviewRounds: {
    type: Array,
    default: []
  },

  // Attachments
  attachments: {
    type: [attachmentSchema],
    default: []
  },

  // Created Info
  createdBy: { type: String, default: "" },
  createdByName: { type: String, default: "" },
  createdByEmail: { type: String, default: "" },
  createdByEmployeeId: { type: String, default: "" },

  // Time
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 🔥🔥🔥 MOST IMPORTANT (PERFORMANCE BOOST)
candidateSchema.index({ createdAt: -1 });

// 🔥 OPTIONAL (ADVANCED BOOST)
candidateSchema.index({ createdAt: -1, status: 1 });

module.exports =
  mongoose.models.Candidate ||
  mongoose.model("Candidate", candidateSchema);