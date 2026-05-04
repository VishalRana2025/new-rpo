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
const ActivityLog = require("./models/ActivityLog");

const app = express();

// ================== MIDDLEWARE ==================

// Custom CORS handler for OPTIONS preflight requests
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://bdats.eclipticinsight.com",
    "https://ats.eclipticinsight.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// ✅ VERY IMPORTANT (preflight fix)
app.options("*", cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/resume", resumeRoutes);

// ================== FILE UPLOAD ==================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB
});

// ================== PARSE RESUME API ==================
const pdfParse = require("pdf-parse");

app.post("/api/parse-resume", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text;

    console.log("📄 PDF TEXT:", text.substring(0, 500));

    // ✅ Extract basic data
    const emailMatch = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    const phoneMatch = text.match(/\d{10}/);
    const nameMatch = text.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/m);

    res.json({
      firstName: nameMatch?.[1] || "",
      lastName: nameMatch?.[2] || "",
      email: emailMatch?.[0] || "",
      phone: phoneMatch?.[0] || "",
      rawText: text
    });

  } catch (err) {
    console.error("❌ Parse error:", err);
    res.status(500).json({ error: "Parsing failed" });
  }
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

// ================== CLIENT APIs (FIXED) ==================

// ✅ FIX 1: ADD MISSING GET /api/clients endpoint
app.get("/api/clients", async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 }).lean();
    console.log(`✅ Fetched ${clients.length} clients`);
    res.json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ 
      message: "Error fetching clients", 
      error: err.message 
    });
  }
});

app.post("/api/add-client", async (req, res) => {
  try {
    const saved = await new Client(req.body).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving client", error: err.message });
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

// ================== REQUIREMENT APIs (FIXED - NO LIMIT) ==================

// ✅ CREATE REQUIREMENT with Activity Log
app.post("/api/add-requirement", upload.array("fileUploads"), async (req, res) => {
  try {

    console.log("FILES RECEIVED:", req.files); // ✅ ALWAYS log

    if (req.body.recruiterLocation && !req.body.clientLocation) {
      req.body.clientLocation = req.body.recruiterLocation;
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
    
    // ✅ Activity Log for CREATE Requirement
    await ActivityLog.create({
      action: "CREATE",
      module: "requirement",
      itemId: saved._id,
      itemName: saved.clientName || saved.requirementName || "Requirement",
      userName: req.body.createdByName || req.body.userName || "System"
    });
    
    console.log(`   Dynamic fields saved: ${dynamicFields.length}`);
    
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving requirement:", err);
    res.status(500).json({ message: "Error saving requirement", error: err.message });
  }
});

// ✅ FIX 4: GET requirements - NO LIMIT
app.get("/api/requirements", async (req, res) => {
  try {
    const data = await Requirement.find()
      .sort({ createdAt: -1 })
      .lean(); // No .limit() here!
    
    console.log(`✅ Fetched ${data.length} requirements (no limit)`);
    res.json(data);
  } catch (err) {
    console.error("Error fetching requirements:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE REQUIREMENT with Activity Log
app.put("/api/update-requirement/:id", async (req, res) => {
  try {
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
      { new: true, runValidators: false }
    );

    if (!updated) {
      return res.status(404).json({ 
        success: false,
        message: "Requirement not found" 
      });
    }

    // ✅ Activity Log for UPDATE Requirement
    await ActivityLog.create({
      action: "UPDATE",
      module: "requirement",
      itemId: updated._id,
      itemName: updated.clientName || updated.requirementName || "Requirement",
      userName: req.body.updatedByName || req.body.userName || "System"
    });

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

// ✅ DELETE REQUIREMENT with Activity Log
app.delete("/api/delete-requirement/:id", async (req, res) => {
  try {
    // First find the requirement to get its name
    const reqData = await Requirement.findById(req.params.id);
    
    if (!reqData) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    // Delete the requirement
    await Requirement.findByIdAndDelete(req.params.id);

    // ✅ Activity Log for DELETE Requirement
    await ActivityLog.create({
      action: "DELETE",
      module: "requirement",
      itemId: req.params.id,
      itemName: reqData.clientName || reqData.requirementName || "Requirement",
      userName: req.body.deletedByName || req.body.userName || "System"
    });

    console.log(`✅ Requirement deleted: ${req.params.id}`);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting requirement:", err);
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

// ================== CANDIDATE APIs (FIXED - SINGLE VERSION, NO LIMIT) ==================

// ✅ SINGLE CANDIDATE API - NO LIMIT (FIXED)
app.get("/api/candidates", async (req, res) => {
  try {
    const data = await Candidate.find()
      .select("-resume") // ✅ FIX
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`✅ Fetched ${data.length} candidates (no limit)`);
    res.json(data);
  } catch (err) {
    console.error("Error fetching candidates:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE CANDIDATE BY ID
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

// ADD CANDIDATE
app.post("/api/add-candidate", async (req, res) => {
  try {
    console.log("📦 Incoming request body keys:", Object.keys(req.body));
    
    let attachments = req.body.attachments;
    
    if (typeof attachments === "string") {
      try {
        attachments = JSON.parse(attachments);
        console.log("✅ Parsed attachments from string to array");
      } catch (parseError) {
        console.error("❌ Failed to parse attachments string:", parseError);
        attachments = [];
      }
    }
    
    if (!Array.isArray(attachments)) {
      console.warn("⚠️ Attachments is not an array, resetting to empty array");
      attachments = [];
    }
    
   const validAttachments = attachments
  .filter(att => att && typeof att === 'object')
  .map(att => {
    console.log("📎 Attachment received:", {
      name: att.name,
      hasData: !!att.data,
      dataLength: att.data ? att.data.length : 0
    });

    return {
      id: att.id || `${Date.now()}-${Math.random()}`,
      name: att.name || "unnamed",
      type: att.type || "application/octet-stream",
      size: att.size || 0,
      uploadedAt: att.uploadedAt || new Date().toISOString(),

      // ✅ STRICT SAVE (NO auto-null)
      data: typeof att.data === "string" && att.data.startsWith("data:")
        ? att.data
        : null
    };
  });
    console.log(`✅ Processing ${validAttachments.length} valid attachments`);
    
    const newCandidate = new Candidate({
      firstName: req.body.firstName || "",
      lastName: req.body.lastName || "",
      email: req.body.email || "",
      phone: req.body.phone || "",
      secondaryPhone: req.body.secondaryPhone || "",
      gender: req.body.gender || "",
      city: req.body.city || "",
      state: req.body.state || "",
      country: req.body.country || "",
      recruiter: req.body.recruiter || "",
      sourcedFrom: req.body.sourcedFrom || "",
      sourceDate: req.body.sourceDate || "",
      qualification: req.body.qualification || "",
      totalExperience: req.body.totalExperience || "",
      currentCTC: req.body.currentCTC || "",
      expectedCTC: req.body.expectedCTC || "",
      noticePeriod: req.body.noticePeriod || "",
      resume: req.body.resume || "",
      status: req.body.status || "",
      candidateStatus: req.body.candidateStatus || "",
      remark: req.body.remark || "",
      tags: req.body.tags || [],
      clientSections: (req.body.clientSections || []).map(cs => ({
        clientName: cs.clientName || "",
        designation: cs.designation || "",
        clientLocation: cs.clientLocation || "",
        process: cs.process || "",
        processLOB: cs.processLOB || "",
        salary: cs.salary || "",
        hrRemark: cs.hrRemark || "",
        clientStatus: cs.clientStatus || ""
      })),
      interviewRounds: req.body.interviewRounds || [],
      attachments: validAttachments,
      createdByName: req.body.createdByName || "",
      createdBy: req.body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const saved = await newCandidate.save();
    
    // ✅ Activity Log (CREATE)
    await ActivityLog.create({
      action: "CREATE",
      module: "candidate",
      itemId: saved._id,
      itemName: saved.firstName + " " + saved.lastName,
      userName: req.body.createdByName || "System"
    });
    
    console.log(`✅ Candidate saved successfully with ID: ${saved._id}`);
    console.log(`✅ Saved ${saved.attachments?.length || 0} attachments with data`);
    
    res.status(201).json(saved);
    
  } catch (err) {
    console.error("❌ FINAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE CANDIDATE
app.put("/api/update-candidate/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const cleanClientSections = (req.body.clientSections || []).map(cs => ({
      clientName: cs?.clientName || "",
      designation: cs?.designation || "",
      clientLocation: cs?.clientLocation || "",
      process: cs?.process || "",
      processLOB: cs?.processLOB || "",
      salary: cs?.salary || "",
      hrRemark: cs?.hrRemark || "",
      clientStatus: cs?.clientStatus || ""
    }));

    const updateData = {
      firstName: req.body.firstName || "",
      lastName: req.body.lastName || "",
      email: req.body.email || "",
      phone: req.body.phone || "",
      secondaryPhone: req.body.secondaryPhone || "",
      gender: req.body.gender || "",
      city: req.body.city || "",
      state: req.body.state || "",
      country: req.body.country || "",
      recruiter: req.body.recruiter || "",
      sourcedFrom: req.body.sourcedFrom || "",
      sourceDate: req.body.sourceDate || "",
      qualification: req.body.qualification || "",
      totalExperience: req.body.totalExperience || "",
      currentCTC: req.body.currentCTC || "",
      expectedCTC: req.body.expectedCTC || "",
      noticePeriod: req.body.noticePeriod || "",
      resume: req.body.resume || "",
      status: req.body.status || "",
      candidateStatus: req.body.candidateStatus || "",
      remark: req.body.remark || "",
      tags: req.body.tags || [],
      interviewRounds: req.body.interviewRounds || [],
      attachments: req.body.attachments || [],
      clientSections: cleanClientSections,
      updatedAt: new Date()
    };

    const updated = await Candidate.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Candidate not found" });
    }

    // ✅ Activity Log (UPDATE)
    await ActivityLog.create({
      action: "UPDATE",
      module: "candidate",
      itemId: id,
      itemName: updated.firstName + " " + updated.lastName,
      userName: req.body.updatedByName,
      status: updated.status,
      clientName: updated.clientSections?.length
        ? updated.clientSections[updated.clientSections.length - 1].clientName
        : ""
    });

    res.json({
      success: true,
      message: "Candidate updated successfully ✅",
      data: updated
    });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating candidate",
      error: err.message
    });
  }
});

// DELETE CANDIDATE
app.delete("/api/delete-candidate/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Candidate.findByIdAndDelete(id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.log("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== FORM FIELDS APIs ==================
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

// ================== ACTIVITY DASHBOARD APIs ==================

// ✅ Chart data with module filter
app.get("/api/activity-stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const module = req.query.module;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let match = {
      createdAt: { $gte: startDate }
    };
    
    if (module && module !== "all") {
      match.module = module;
    }

    const logs = await ActivityLog.find(match)
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    const grouped = {};

    logs.forEach(log => {
      const date = new Date(log.createdAt).toLocaleDateString("en-GB");

      if (!grouped[date]) {
        grouped[date] = {
          CREATE: 0,
          UPDATE: 0,
          DELETE: 0
        };
      }

      grouped[date][log.action]++;
    });

    res.json(grouped);

  } catch (err) {
    console.error("Error in activity-stats:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Recent activities
app.get("/api/recent-activities", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(logs);

  } catch (err) {
    console.error("Error in recent-activities:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Summary stats
app.get("/api/activity-summary", async (req, res) => {
  try {
    const data = await ActivityLog.aggregate([
      {
        $group: {
          _id: { module: "$module", action: "$action" },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: { create: 0, update: 0, delete: 0 },
      candidate: { create: 0, update: 0, delete: 0 },
      requirement: { create: 0, update: 0, delete: 0 }
    };

    data.forEach(item => {
      const { module, action } = item._id;
      const actionKey = action.toLowerCase();

      result.total[actionKey] += item.count;
      
      if (module === "candidate") {
        result.candidate[actionKey] += item.count;
      } else if (module === "requirement") {
        result.requirement[actionKey] += item.count;
      }
    });

    res.json(result);
  } catch (err) {
    console.error("Error in activity-summary:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== BACKEND CACHE ==================
let dashboardCache = null;
let lastFetchTime = 0;

app.get("/api/dashboard-fast", async (req, res) => {
  try {
    const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

    // ✅ 1. USE CACHE (NO DB CALL)
    if (dashboardCache && Date.now() - lastFetchTime < CACHE_TIME) {
      console.log("⚡ Backend cache hit");
      return res.json(dashboardCache);
    }

    console.log("🔄 Fetching from DB");

    // ✅ 2. FETCH FROM DB
    const [candidates, activities, summary, clients] = await Promise.all([
      Candidate.find()
        .select("-resume -attachments.data")
        .limit(100)
        .lean(),
      ActivityLog.find().limit(100).lean(),
      ActivityLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } }
      ]),
      Client.find().limit(100).lean()
    ]);

    const data = { candidates, activities, summary, clients };

    // ✅ 3. SAVE CACHE
    dashboardCache = data;
    lastFetchTime = Date.now();

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Dashboard error" });
  }
});

// ================== SERVER ==================

app.use((err, req, res, next) => {
  if (err.message === "Request aborted") {
    console.warn("⚠️ Upload request aborted by client");
    return res.status(499).json({ error: "Upload cancelled" });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" });
  }

  next(err);
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

