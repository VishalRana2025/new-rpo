const mongoose = require("mongoose");

const formFieldSchema = new mongoose.Schema({
  id: Number,
  label: String,
  type: String,
  required: Boolean,
});

module.exports = mongoose.model("FormField", formFieldSchema);