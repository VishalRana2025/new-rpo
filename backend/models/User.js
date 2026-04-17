const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "employee" },
  employeeId: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
  permissions: {
    can_view_new_client: { type: Boolean, default: false },
    can_view_all_clients: { type: Boolean, default: false },
    can_create_client: { type: Boolean, default: false },
    can_edit_client: { type: Boolean, default: false },
    can_delete_client: { type: Boolean, default: false },
    can_view_new_requirement: { type: Boolean, default: false },
    can_view_all_requirements: { type: Boolean, default: false },
    can_create_requirement: { type: Boolean, default: false },
    can_edit_requirement: { type: Boolean, default: false },
    can_delete_requirement: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);