const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "employee", enum: ["admin", "manager", "employee"] },
  employeeId: { type: String, unique: true, required: true },
  department: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  permissions: {
    newClient: { type: Boolean, default: false },
    allClients: { type: Boolean, default: false },
    newRequirement: { type: Boolean, default: false },
    allRequirement: { type: Boolean, default: false },
    newCandidate: { type: Boolean, default: false },
    allCandidates: { type: Boolean, default: false }
  }
}, { timestamps: true });

// PERFORMANCE INDEXES
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);