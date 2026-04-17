const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const FormField = require("./models/FormField");
const resumeRoutes = require("./src/routes/resumeRoutes");
const Requirement = require("./models/Requirement");
const Client = require("./models/Client");
const Candidate = require("./models/Candidate");

const app = express();

// ================== MIDDLEWARE ==================

// Custom CORS handler for OPTIONS preflight requests
app.use(cors({
  origin: [
    "http://localhost:5173",           // local
    "https://ats.eclipticinsight.com"  // your frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json({ limit: "50mb" })); // Increased limit for base64 files

// ================== FILE UPLOAD ==================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB
});

// ================== DB ==================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// ================== USER MODEL ==================
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  
  employeeId: String,
  department: String,
  phoneNumber: String,
  
  role: { type: String, default: "employee" },
  
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  permissions: {
  newClient: { type: Boolean, default: false },
  allClients: { type: Boolean, default: false },
  newRequirement: { type: Boolean, default: false },
  allRequirement: { type: Boolean, default: false },

  // 🔥 ADD THIS
  newCandidate: { type: Boolean, default: false },
  allCandidates: { type: Boolean, default: false },
},
  registeredAt: { type: Date, default: Date.now },
  profileImage: String,
  attendance: Array,
  locationHistory: Array,
  companyLocation: Object,
  officeLocation: Object,
});

const User = mongoose.model("User", userSchema);

// ================== TEST ==================
app.get("/", (req, res) => res.send("Backend running ✅"));

// ================== AUTH ==================

// REGISTER API
app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      employeeId,
      department,
      phoneNumber,
      role,
      isApproved,
      isActive
    } = req.body;

    if (!name || !email || !password || !employeeId || !department || !phoneNumber) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
    
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters and include letters, numbers, and a special character"
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { employeeId }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ success: false, message: "Email already exists" });
      }
      if (existingUser.employeeId === employeeId) {
        return res.status(409).json({ success: false, message: "Employee ID already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      employeeId,
      department,
      phoneNumber,
      role: role || "employee",
      isApproved: false,
      isActive: true,
      permissions: {
  newClient: false,
  allClients: false,
  newRequirement: false,
  allRequirement: false,
  newCandidate: false,
  allCandidates: false,
},
      registeredAt: new Date(),
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registration successful! Please wait for admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      success: false,
      message: "Registration error", 
      error: err.message 
    });
  }
});

// LOGIN API
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    let isPasswordValid = false;

    if (user.password && user.password.startsWith("$2")) {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      isPasswordValid = (password === user.password);
      
      if (isPasswordValid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();
        console.log(`✅ Migrated user ${user.email} to hashed password`);
      }
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "⏳ Waiting for admin approval ❌"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin."
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        phoneNumber: user.phoneNumber,
        isApproved: user.isApproved,
        isActive: user.isActive,
        permissions: user.permissions,
      },
      token: "dummy-token",
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login error", error: err.message });
  }
});

// ================== ADMIN APIs ==================

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

// PASSWORD CHANGE API
app.put("/api/users/:id/password", async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;

    if (!password || password.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "Password is required" 
      });
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters and include letters, numbers, and a special character"
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: "Password updated successfully" 
    });

  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ 
      success: false,
      message: "Error updating password", 
      error: error.message 
    });
  }
});

// Set permissions
app.post("/api/set-permissions", async (req, res) => {
  try {
    const { userId, permissions } = req.body;

    const user = await User.findByIdAndUpdate(
      userId, 
      { permissions },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      success: true,
      message: "Permissions updated successfully",
      user 
    });
  } catch (err) {
    res.status(500).json({ message: "Error updating permissions", error: err.message });
  }
});

// Update role with auto permissions
app.put("/api/users/:userId/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !["admin", "manager", "employee"].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role. Must be admin, manager, or employee" 
      });
    }

    let permissions = {};

    if (role === "admin") {
  permissions = {
    newClient: true,
    allClients: true,
    newRequirement: true,
    allRequirement: true,
    newCandidate: true,
    allCandidates: true,
  };
}

if (role === "manager") {
  permissions = {
    newClient: true,
    allClients: true,
    newRequirement: true,
    allRequirement: false,
    newCandidate: true,
    allCandidates: true,
  };
}

if (role === "employee") {
  permissions = {
    newClient: true,
    allClients: false,
    newRequirement: false,
    allRequirement: false,
    newCandidate: true,
    allCandidates: false,
  };
}

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        role, 
        permissions,
        isApproved: true
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ 
      success: true, 
      message: `Role updated to ${role} with auto permissions ✅`, 
      user 
    });
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ success: false, message: "Error updating role" });
  }
});

// Update user approval status
app.put("/api/users/:userId/approve", async (req, res) => {
  try {
    const { isApproved } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isApproved },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, message: `User ${isApproved ? "approved" : "unapproved"} successfully`, user });
  } catch (err) {
    res.status(500).json({ message: "Error updating approval status" });
  }
});

// Update user active status
app.put("/api/users/:userId/active", async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, message: "Active status updated", user });
  } catch (err) {
    res.status(500).json({ message: "Error updating active status" });
  }
});

// Delete user
app.delete("/api/users/:userId", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

// ================== CLIENT APIs ==================
app.post("/api/add-client", async (req, res) => {
  try {
    const saved = await new Client(req.body).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving client", error: err.message });
  }
});

app.get("/api/clients", async (req, res) => {
  try {
    res.json(await Client.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: "Error fetching clients", error: err.message });
  }
});

app.put("/api/update-client/:id", async (req, res) => {
  try {
    res.json(await Client.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (err) {
    res.status(500).json({ message: "Error updating client", error: err.message });
  }
});

app.delete("/api/delete-client/:id", async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting client", error: err.message });
  }
});

// ================== REQUIREMENT APIs ==================
app.post("/api/add-requirement", upload.array("files"), async (req, res) => {
  try {
    // ✅ Convert old field to new (recruiterLocation → clientLocation)
    if (req.body.recruiterLocation && !req.body.clientLocation) {
      req.body.clientLocation = req.body.recruiterLocation;
      console.log("✅ Converted recruiterLocation to clientLocation");
    }

    const files = req.files?.map(f => ({
      name: f.originalname,
      data: f.buffer.toString("base64"),
      type: f.mimetype,
      size: f.size,
      uploadedAt: new Date().toISOString()
    })) || [];

    let dynamicFields = [];
    try {
      if (req.body.dynamicFieldsConfig) {
        dynamicFields = JSON.parse(req.body.dynamicFieldsConfig);
      }
    } catch (e) {
      console.log("Error parsing dynamicFieldsConfig:", e);
    }

    const newReq = new Requirement({
      ...req.body,
      dynamicFieldsConfig: JSON.stringify(dynamicFields),
      fileUploads: files,
    });

    dynamicFields.forEach(field => {
      const key = `dynamic_${field.id}`;
      if (field.value) {
        newReq[key] = field.value;
      }
    });

    const saved = await newReq.save();
    console.log(`✅ Requirement saved with ID: ${saved._id}`);
    console.log(`   Dynamic fields saved: ${dynamicFields.length}`);
    
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving requirement:", err);
    res.status(500).json({ message: "Error saving requirement", error: err.message });
  }
});

app.get("/api/requirements", async (req, res) => {
  try {
    res.json(await Requirement.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: "Error fetching requirements", error: err.message });
  }
});

app.put("/api/update-requirement/:id", async (req, res) => {
  try {
    // ✅ Convert old field to new (recruiterLocation → clientLocation)
    if (req.body.recruiterLocation && !req.body.clientLocation) {
      req.body.clientLocation = req.body.recruiterLocation;
      console.log("✅ Converted recruiterLocation to clientLocation");
    }

    let dynamicFields = [];
    try {
      if (req.body.dynamicFieldsConfig) {
        dynamicFields = JSON.parse(req.body.dynamicFieldsConfig);
      }
    } catch (e) {
      console.log("Error parsing dynamicFieldsConfig:", e);
    }

    const updateData = {
      ...req.body,
      dynamicFieldsConfig: JSON.stringify(dynamicFields),
      updatedAt: new Date().toISOString(),
    };

    dynamicFields.forEach(field => {
      const key = `dynamic_${field.id}`;
      if (field.value) {
        updateData[key] = field.value;
      }
    });

    const updated = await Requirement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ 
        success: false,
        message: "Requirement not found" 
      });
    }

    console.log(`✅ Requirement updated: ${req.params.id}`);
    res.json({ 
      success: true,
      message: "Requirement updated successfully",
      data: updated 
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ 
      success: false,
      message: "Error updating requirement", 
      error: err.message 
    });
  }
});

app.delete("/api/delete-requirement/:id", async (req, res) => {
  try {
    await Requirement.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting requirement", error: err.message });
  }
});

// ================== LOGIN HISTORY APIs ==================
const loginHistorySchema = new mongoose.Schema({
  userId: String,
  email: String,
  role: String,
  loginTime: String,
  ip: String,
  firstName: String,
  lastName: String,
  employeeId: String,
  department: String,
});

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

app.get("/api/login-history", async (req, res) => {
  try {
    const logs = await LoginHistory.find().sort({ _id: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching history", error: err.message });
  }
});

app.post("/api/login-history", async (req, res) => {
  try {
    const log = new LoginHistory(req.body);
    await log.save();
    res.json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ message: "Error saving history", error: err.message });
  }
});

app.delete("/api/login-history", async (req, res) => {
  try {
    await LoginHistory.deleteMany({});
    res.json({ message: "Deleted all history" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting history", error: err.message });
  }
});

// ================== CANDIDATE APIs ==================

// ✅ ADD THIS: GET SINGLE CANDIDATE BY ID
app.get("/api/candidates/:id", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }
    res.json(candidate);
  } catch (err) {
    console.error("Error fetching candidate:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET ALL CANDIDATES
app.get("/api/candidates", async (req, res) => {
  try {
    const data = await Candidate.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD CANDIDATE - FIXED VERSION (preserves file data)
app.post("/api/add-candidate", async (req, res) => {
  try {
    console.log("📦 Incoming request body keys:", Object.keys(req.body));
    
    let attachments = req.body.attachments;
    
    // Parse attachments if it's a string
    if (typeof attachments === "string") {
      try {
        attachments = JSON.parse(attachments);
        console.log("✅ Parsed attachments from string to array");
      } catch (parseError) {
        console.error("❌ Failed to parse attachments string:", parseError);
        attachments = [];
      }
    }
    
    // Ensure attachments is an array
    if (!Array.isArray(attachments)) {
      console.warn("⚠️ Attachments is not an array, resetting to empty array");
      attachments = [];
    }
    
    // Preserve ALL attachment fields including 'data'
    const validAttachments = attachments
      .filter(att => att && typeof att === 'object')
      .map(att => ({
        id: att.id || `${Date.now()}-${Math.random()}`,
        name: att.name || "unnamed",
        type: att.type || "application/octet-stream",
        size: att.size || 0,
        uploadedAt: att.uploadedAt || new Date().toISOString(),
        data: att.data || null  // CRITICAL: Preserve the base64 file data
      }));
    
    console.log(`✅ Processing ${validAttachments.length} valid attachments`);
    if (validAttachments.length > 0) {
      console.log(`✅ First attachment has data: ${!!validAttachments[0]?.data}`);
      console.log(`✅ First attachment name: ${validAttachments[0]?.name}`);
    }
    
    // Create new candidate object
    const { attachments: _, ...rest } = req.body;
    
    const newCandidate = new Candidate({
      ...rest,
      attachments: validAttachments,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const saved = await newCandidate.save();
    console.log(`✅ Candidate saved successfully with ID: ${saved._id}`);
    console.log(`✅ Saved ${saved.attachments?.length || 0} attachments with data`);
    
    res.status(201).json(saved);
    
  } catch (err) {
    console.error("❌ FINAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE CANDIDATE - FIXED VERSION (preserves file data)
app.put("/api/update-candidate/:id", async (req, res) => {
  try {
    let attachments = req.body.attachments;
    
    // Parse attachments if it's a string
    if (typeof attachments === "string") {
      try {
        attachments = JSON.parse(attachments);
      } catch (parseError) {
        attachments = [];
      }
    }
    
    if (!Array.isArray(attachments)) {
      attachments = [];
    }
    
    // Preserve ALL attachment fields including 'data'
    const validAttachments = attachments
      .filter(att => att && typeof att === 'object')
      .map(att => ({
        id: att.id || `${Date.now()}-${Math.random()}`,
        name: att.name || "unnamed",
        type: att.type || "application/octet-stream",
        size: att.size || 0,
        uploadedAt: att.uploadedAt || new Date().toISOString(),
        data: att.data || null  // CRITICAL: Preserve the base64 file data
      }));
    
    const updated = await Candidate.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body, 
        attachments: validAttachments,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }
    
    console.log(`✅ Candidate updated: ${req.params.id}`);
    console.log(`✅ Updated with ${validAttachments.length} attachments`);
    
    res.json({ success: true, message: "Candidate updated successfully", data: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE CANDIDATE
app.delete("/api/delete-candidate/:id", async (req, res) => {
  try {
    const deleted = await Candidate.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }
    
    console.log(`✅ Candidate deleted: ${req.params.id}`);
    res.json({ success: true, message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== FORM FIELDS APIs (DYNAMIC FORM BUILDER) ==================
// GET all form fields
app.get("/api/form-fields", async (req, res) => {
  try {
    const fields = await FormField.find();
    console.log(`✅ Retrieved ${fields.length} form fields`);
    res.json(fields);
  } catch (err) {
    console.error("Error fetching form fields:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD new form field
app.post("/api/form-fields", async (req, res) => {
  try {
    const field = new FormField(req.body);
    await field.save();
    console.log(`✅ Added new form field: ${field.label} (${field.type})`);
    res.status(201).json(field);
  } catch (err) {
    console.error("Error adding form field:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE form field by id
app.delete("/api/form-fields/:id", async (req, res) => {
  try {
    const result = await FormField.deleteOne({ id: parseInt(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Field not found" });
    }
    console.log(`✅ Deleted form field with id: ${req.params.id}`);
    res.json({ message: "Field deleted successfully" });
  } catch (err) {
    console.error("Error deleting form field:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE form field (label or required status)
app.put("/api/form-fields/:id", async (req, res) => {
  try {
    const updated = await FormField.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Field not found" });
    }
    console.log(`✅ Updated form field: ${updated.label}`);
    res.json(updated);
  } catch (err) {
    console.error("Error updating form field:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== SERVER ==================
const PORT = 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Form Fields API available at: /api/form-fields`);
  console.log(`✅ File upload limit: 10MB`);
});