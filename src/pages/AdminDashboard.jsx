import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [activeTab, setActiveTab] = useState("users");
  const [newManager, setNewManager] = useState({
    name: "",
    email: "",
    password: "",
    department: ""
  });
  const [tempPermissions, setTempPermissions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mainAdmin, setMainAdmin] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);

  // State for permission modal
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [rolePermissions, setRolePermissions] = useState({
    newClient: false,
    allClients: false,
    newRequirement: false,
    allRequirement: false,
    newCandidate: false,
    allCandidates: false
  });

  // Cache configuration
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Security check - Must be admin to access this page
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="bg-red-600 text-white p-6 sm:p-8 rounded-lg shadow-xl text-center max-w-sm">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Access Denied ❌</h1>
          <p className="mb-4 text-sm sm:text-base">You don't have permission to access this page.</p>
          <button
            onClick={() => navigate("/employee")}
            className="bg-white text-red-600 px-4 sm:px-6 py-2 rounded font-bold hover:bg-gray-100 transition-colors text-sm sm:text-base"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ✅ OPTIMIZED: Load from cache first, then fetch fresh
  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    
    // ✅ 1. Load from cache first (if not force refresh)
    if (!forceRefresh) {
      const cached = localStorage.getItem("adminCache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const isFresh = Date.now() - parsed.timestamp < CACHE_DURATION;
          
          if (isFresh && parsed.users?.length > 0) {
            console.log("⚡ Using fresh admin cache - API call skipped");
            setUsers(parsed.users);
            setRequirements(parsed.requirements || []);
            setLoginHistory(parsed.loginHistory || []);
            setMainAdmin(parsed.mainAdmin || null);
            
            // Initialize temp permissions from cached users
            const initialTempPerms = {};
            parsed.users.forEach((user) => {
              initialTempPerms[user._id] = { ...user.permissions };
            });
            setTempPermissions(initialTempPerms);
            
            setLoading(false);
            return; // 🚀 Skip API call completely!
          } else if (parsed.users?.length > 0) {
            console.log("⚡ Using expired cache - will update in background");
            setUsers(parsed.users);
            setRequirements(parsed.requirements || []);
            setLoginHistory(parsed.loginHistory || []);
            setMainAdmin(parsed.mainAdmin || null);
            
            // Initialize temp permissions from cached users
            const initialTempPerms = {};
            parsed.users.forEach((user) => {
              initialTempPerms[user._id] = { ...user.permissions };
            });
            setTempPermissions(initialTempPerms);
          }
        } catch (e) {
          console.error("Error parsing cache:", e);
        }
      }
    }
    
    // ✅ 2. Fetch fresh data in background
    try {
      console.log("🔄 Fetching fresh admin data from API");
      const usersRes = await api.get("/users");
      const reqRes = await api.get("/requirements?limit=50"); // ✅ Reduced limit
      const historyRes = await api.get("/login-history?limit=100"); // ✅ Reduced limit

      const sortedUsers = usersRes.data.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(parseInt(a._id.substring(0, 8), 16) * 1000);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(parseInt(b._id.substring(0, 8), 16) * 1000);
        return dateB - dateA;
      });

      const usersWithPermissions = sortedUsers.map(user => ({
        ...user,
        permissions: {
          newClient: user.permissions?.newClient || false,
          allClients: user.permissions?.allClients || false,
          newRequirement: user.permissions?.newRequirement || false,
          allRequirement: user.permissions?.allRequirement || false,
          newCandidate: user.permissions?.newCandidate || false,
          allCandidates: user.permissions?.allCandidates || false
        },
        isApproved: user.isApproved !== undefined ? user.isApproved : true,
        isActive: user.isActive !== undefined ? user.isActive : true,
        firstName: user.name?.split(" ")[0] || "",
        lastName: user.name?.split(" ")[1] || "",
        fullName: user.name || ""
      }));
      
      setUsers(usersWithPermissions);
      setRequirements(reqRes.data);
      setLoginHistory(historyRes.data);
      
      // Find main admin (first created admin by date)
      const adminUsers = usersWithPermissions.filter(u => u.role === "admin");
      const sortedAdmins = [...adminUsers].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(parseInt(a._id.substring(0, 8), 16) * 1000);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(parseInt(b._id.substring(0, 8), 16) * 1000);
        return dateA - dateB;
      });
      const firstAdmin = sortedAdmins[0];
      setMainAdmin(firstAdmin);
      
      // Initialize temp permissions
      const initialTempPerms = {};
      usersWithPermissions.forEach((user) => {
        initialTempPerms[user._id] = { ...user.permissions };
      });
      setTempPermissions(initialTempPerms);
      
      // ✅ 3. Save to cache
      const cacheData = {
        users: usersWithPermissions,
        requirements: reqRes.data,
        loginHistory: historyRes.data,
        mainAdmin: firstAdmin,
        timestamp: Date.now()
      };
      localStorage.setItem("adminCache", JSON.stringify(cacheData));
      console.log("✅ Admin data cached with", usersWithPermissions.length, "users");
      
    } catch (err) {
      console.error("Error loading data:", err);
      alert("Error loading data from server");
    } finally {
      setLoading(false);
    }
  };

  // ✅ OPTIMIZED: Clear cache on data mutations
  const clearCache = () => {
    localStorage.removeItem("adminCache");
    console.log("🗑️ Admin cache cleared");
  };

  // ✅ OPTIMIZED: Load cache first, then fetch fresh
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("currentUser"));
    const userRole = localStorage.getItem("role");
    
    if (!storedUser) {
      navigate("/login");
      return;
    }
    
    if (userRole !== "admin") {
      alert("Access denied! Only admins can access this page.");
      navigate("/employee");
      return;
    }
    
    setCurrentUser(storedUser);
    
    // ✅ Load from cache instantly (if exists)
    const cached = localStorage.getItem("adminCache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.users?.length > 0) {
          console.log("⚡ Loading admin cache instantly");
          setUsers(parsed.users);
          setRequirements(parsed.requirements || []);
          setLoginHistory(parsed.loginHistory || []);
          setMainAdmin(parsed.mainAdmin || null);
          
          const initialTempPerms = {};
          parsed.users.forEach((user) => {
            initialTempPerms[user._id] = { ...user.permissions };
          });
          setTempPermissions(initialTempPerms);
        }
      } catch (e) {}
    }
    
    // ✅ Fetch fresh data in background (doesn't block UI)
  setTimeout(() => {
  const cached = localStorage.getItem("adminCache");

  if (!cached) {
    loadData();
  } else {
    const parsed = JSON.parse(cached);
    const isFresh = Date.now() - parsed.timestamp < CACHE_DURATION;

    if (!isFresh) {
      loadData();
    }
  }
}, 100);
  }, [navigate]);

  const filteredUsers = users.filter((user) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = (user.fullName || user.name || `${user.firstName} ${user.lastName}`).toLowerCase();
    const email = (user.email || "").toLowerCase();
    const employeeId = (user.employeeId || "").toLowerCase();
    const department = (user.department || "").toLowerCase();
    const role = (user.role || "").toLowerCase();
    const phoneNumber = (user.phoneNumber || "").toLowerCase();
    
    switch(searchField) {
      case "name":
        return fullName.includes(searchLower);
      case "email":
        return email.includes(searchLower);
      case "employeeId":
        return employeeId.includes(searchLower);
      case "department":
        return department.includes(searchLower);
      case "role":
        return role.includes(searchLower);
      case "phone":
        return phoneNumber.includes(searchLower);
      default:
        return fullName.includes(searchLower) || 
               email.includes(searchLower) || 
               employeeId.includes(searchLower) || 
               department.includes(searchLower) ||
               role.includes(searchLower) ||
               phoneNumber.includes(searchLower);
    }
  });

  const clearSearch = () => {
    setSearchTerm("");
    setSearchField("all");
  };

  const getPermissionsByRole = (role) => {
    switch(role) {
      case "admin":
        return {
          newClient: true,
          allClients: true,
          newRequirement: true,
          allRequirement: true,
          newCandidate: true,
          allCandidates: true
        };
      case "manager":
        return {
          newClient: true,
          allClients: true,
          newRequirement: true,
          allRequirement: false,
          newCandidate: true,
          allCandidates: true
        };
      case "employee":
        return {
          newClient: true,
          allClients: false,
          newRequirement: false,
          allRequirement: false,
          newCandidate: true,
          allCandidates: false
        };
      default:
        return {
          newClient: false,
          allClients: false,
          newRequirement: false,
          allRequirement: false,
          newCandidate: false,
          allCandidates: false
        };
    }
  };

  const openPermissionModal = (role) => {
    setSelectedRole(role);
    setRolePermissions(getPermissionsByRole(role));
    setShowPermissionModal(true);
  };

  const applyPermissionsToRole = async () => {
    try {
      setLoading(true);
      const usersToUpdate = users.filter(u => u.role === selectedRole);
      if (usersToUpdate.length === 0) {
        alert(`No ${selectedRole} users found to update.`);
        setShowPermissionModal(false);
        setLoading(false);
        return;
      }
      for (let user of usersToUpdate) {
        await api.post("/set-permissions", {
          userId: user._id,
          permissions: rolePermissions
        });
      }
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      setShowPermissionModal(false);
      alert(`${selectedRole} permissions updated for all ${usersToUpdate.length} users ✅`);
    } catch (err) {
      console.error("Error applying role permissions:", err);
      alert("Failed to apply permissions");
    } finally {
      setLoading(false);
    }
  };

  const updateTempPermission = (userId, key) => {
    setTempPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: !prev[userId]?.[key]
      }
    }));
  };

  const savePermissions = async (userId) => {
    const userToSave = users.find(u => u._id === userId);
    
    try {
      setLoading(true);
      await api.post("/set-permissions", {
        userId: userToSave._id,
        permissions: tempPermissions[userId]
      });
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      const currentUserData = JSON.parse(localStorage.getItem("currentUser"));
      if (currentUserData && currentUserData._id === userToSave._id) {
        currentUserData.permissions = { ...tempPermissions[userId] };
        localStorage.setItem("currentUser", JSON.stringify(currentUserData));
      }
      alert("Permissions saved successfully! ✅");
    } catch (err) {
      console.error("Error saving permissions:", err);
      alert("Failed to save permissions");
    } finally {
      setLoading(false);
    }
  };

  const saveAllPermissions = async () => {
    try {
      setLoading(true);
      for (let user of users) {
        if (user.role !== "admin" && tempPermissions[user._id]) {
          await api.post("/set-permissions", {
            userId: user._id,
            permissions: tempPermissions[user._id]
          });
        }
      }
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      alert("All permissions saved successfully! ✅");
    } catch (err) {
      console.error("Error saving all permissions:", err);
      alert("Failed to save all permissions");
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId, newRole) => {
    const userToUpdate = users.find(u => u._id === userId);
    
    if (currentUser?._id !== mainAdmin?._id) {
      alert("❌ Only Main Admin can change user roles!");
      return;
    }
    
    if (userToUpdate?._id === currentUser?._id) {
      alert("❌ You cannot change your own role!");
      return;
    }
    
    if (userToUpdate.role === newRole) return;
    
    if (!window.confirm(`⚠️ Change ${userToUpdate?.name || userToUpdate?.email}'s role from ${userToUpdate.role} to ${newRole}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      const autoPermissions = getPermissionsByRole(newRole);
      await api.put(`/users/${userId}/role`, {
        role: newRole,
        permissions: autoPermissions
      });
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      alert(`✅ Role updated to ${newRole} with auto permissions!`);
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update role: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    const userToDelete = users.find(u => u._id === userId);
    
    if (userToDelete?._id === currentUser?._id) {
      alert("❌ You cannot delete your own admin account!");
      return;
    }
    
    if (userToDelete?.role === "admin" && currentUser?._id !== mainAdmin?._id) {
      alert("❌ Only Main Admin can delete other admin users!");
      return;
    }
    
    if (mainAdmin && userToDelete?._id === mainAdmin._id) {
      alert("❌ Cannot delete the Main System Administrator!");
      return;
    }
    
    if (!window.confirm(`⚠️ Delete user "${userToDelete?.name || userToDelete?.email}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      await api.delete(`/users/${userId}`);
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      alert(`✅ User "${userToDelete?.name || userToDelete?.email}" deleted successfully!`);
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.trim() === "") {
      alert("❌ Please enter a new password");
      return;
    }
    
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      alert("❌ Password must be at least 6 characters and include:\n• Letters (a-z, A-Z)\n• Numbers (0-9)\n• Special character (@, #, $, !, %, *, ?, &)");
      return;
    }

    try {
      setLoading(true);
      await api.put(`/users/${selectedUser._id}/password`, {
        password: newPassword
      });
      clearCache(); // ✅ Clear cache after mutation
      alert(`✅ Password updated successfully for ${selectedUser.name || selectedUser.email}!`);
      await loadData(true);
      setShowPasswordModal(false);
      setNewPassword("");
      setSelectedUser(null);
      setShowPasswordField(false);
    } catch (err) {
      console.error("Error updating password:", err);
      alert("❌ Failed to update password: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManager = async () => {
    if (!newManager.name || !newManager.email || !newManager.password) {
      alert("Please fill all required fields!");
      return;
    }
    
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;
    
    if (!passwordRegex.test(newManager.password)) {
      alert("❌ Password must be at least 6 characters and include:\n• Letters (a-z, A-Z)\n• Numbers (0-9)\n• Special character (@, #, $, !, %, *, ?, &)");
      return;
    }
    
    try {
      setLoading(true);
      const res = await api.post("/register", {
        name: newManager.name,
        email: newManager.email,
        password: newManager.password,
        employeeId: `MGR${Date.now()}`,
        department: newManager.department || "Management",
        phoneNumber: "N/A",
        role: "manager",
        isApproved: true,
        isActive: true,
        permissions: getPermissionsByRole("manager")
      });
      
      if (res.data.success) {
        clearCache(); // ✅ Clear cache after mutation
        await loadData(true);
        setNewManager({ name: "", email: "", password: "", department: "" });
        setShowManagerModal(false);
        alert(`Manager created successfully! ✅\nEmail: ${newManager.email}\nPassword: ${newManager.password}`);
      }
    } catch (err) {
      console.error("Error creating manager:", err);
      alert("Failed to create manager: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      setLoading(true);
      await api.put(`/users/${userId}/approve`, {
        isApproved: true
      });
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      alert("User approved successfully! ✅ User can now login.");
    } catch (err) {
      console.error("Error approving user:", err);
      alert("Failed to approve user");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (userId) => {
    const userToToggle = users.find(u => u._id === userId);
    
    if (userToToggle?._id === currentUser?._id) {
      alert("❌ You cannot deactivate your own admin account!");
      return;
    }
    
    if (userToToggle?.role === "admin" && currentUser?._id !== mainAdmin?._id) {
      alert("❌ Only Main Admin can deactivate other admin users!");
      return;
    }
    
    if (mainAdmin && userToToggle?._id === mainAdmin._id) {
      alert("❌ Cannot deactivate the Main System Administrator!");
      return;
    }
    
    const newStatus = !userToToggle.isActive;
    
    try {
      setLoading(true);
      await api.put(`/users/${userId}/active`, {
        isActive: newStatus
      });
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      const status = newStatus ? "Activated" : "Deactivated";
      alert(`✅ User ${status} successfully! ${!newStatus ? "User cannot login now." : "User can now login."}`);
    } catch (err) {
      console.error("Error toggling user status:", err);
      alert("Failed to update user status");
    } finally {
      setLoading(false);
    }
  };

  const clearLoginHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all login history?")) return;
    
    try {
      setLoading(true);
      await api.delete("/login-history");
      clearCache(); // ✅ Clear cache after mutation
      await loadData(true);
      alert("Login history cleared successfully!");
    } catch (err) {
      console.error("Error clearing history:", err);
      alert("Failed to clear login history");
    } finally {
      setLoading(false);
    }
  };

  const hasPermissionChanges = (userId) => {
    const user = users.find(u => u._id === userId);
    const originalPerms = user?.permissions || {};
    const currentTempPerms = tempPermissions[userId] || {};
    return JSON.stringify(originalPerms) !== JSON.stringify(currentTempPerms);
  };

  const getTempPermsForUser = (userId) => {
    return tempPermissions[userId] || {};
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("role");
    localStorage.removeItem("activePage");
    navigate("/login");
  };

  // Get cache age for display
  const getCacheAge = () => {
    try {
      const cached = localStorage.getItem("adminCache");
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageSeconds = Math.round((Date.now() - parsed.timestamp) / 1000);
        if (ageSeconds < 60) return `${ageSeconds} seconds`;
        if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)} minutes`;
        return `${Math.round(ageSeconds / 3600)} hours`;
      }
    } catch(e) {}
    return null;
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const pendingApprovals = users.filter(u => !u.isApproved).length;
  const totalRequirements = requirements.length;
  const managers = users.filter(u => u.role === "manager").length;
  const employees = users.filter(u => u.role === "employee").length;
  const admins = users.filter(u => u.role === "admin").length;
  const isMainAdmin = currentUser?._id === mainAdmin?._id;

  // Small loading indicator (non-blocking)
  const showLoading = loading && users.length === 0;

  if (showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl mb-4">⏳</div>
          <div className="text-white text-base sm:text-xl">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-blue-600 p-2 rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-4 sticky top-0 z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                {activeTab === "users" && "👥 User Management"}
                {activeTab === "loginHistory" && "🔐 Login History"}
              </h1>
              <p className="text-gray-300 text-xs sm:text-sm mt-1">
                {activeTab === "users" && "Manage all users, roles, and permissions (Newest users at top)"}
                {activeTab === "loginHistory" && "Track all user login activities"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("users")}
                  className={`${activeTab === "users" ? "bg-blue-600" : "bg-gray-700"} hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1`}
                >
                  <span>👥</span> Users
                </button>
                <button
                  onClick={() => setActiveTab("loginHistory")}
                  className={`${activeTab === "loginHistory" ? "bg-purple-600" : "bg-gray-700"} hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1`}
                >
                  <span>🔐</span> Login History
                </button>
                {isMainAdmin && (
                  <button
                    onClick={() => setShowManagerModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"
                  >
                    <span>➕</span> Create Manager
                  </button>
                )}
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs sm:text-sm text-gray-300">Welcome,</p>
                <p className="font-bold text-yellow-400 text-sm sm:text-base">{currentUser?.firstName || currentUser?.name || "Admin"}</p>
                <p className="text-xs text-gray-400">
                  {isMainAdmin ? "Main Admin 👑" : "Admin"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Cache status indicator */}
          {localStorage.getItem("adminCache") && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                ⚡ Admin data cached (updated {getCacheAge()} ago)
              </span>
              {loading && (
                <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full animate-pulse">
                  🔄 Updating in background...
                </span>
              )}
            </div>
          )}
        </div>
        
        {isMainAdmin && (
          <div className="px-4 pt-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => openPermissionModal("manager")}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition flex items-center gap-2 text-xs sm:text-sm"
                disabled={loading}
              >
                <span>👥</span> Apply Manager Permissions
              </button>
              <button
                onClick={() => openPermissionModal("employee")}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition flex items-center gap-2 text-xs sm:text-sm"
                disabled={loading}
              >
                <span>👤</span> Apply Employee Permissions
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-400">{totalUsers}</p>
              </div>
              <div className="text-2xl sm:text-3xl">👥</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Admins</p>
                <p className="text-xl sm:text-2xl font-bold text-red-400">{admins}</p>
              </div>
              <div className="text-2xl sm:text-3xl">👑</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Pending Approval</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{pendingApprovals}</p>
              </div>
              <div className="text-2xl sm:text-3xl">⏳</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Requirements</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-400">{totalRequirements}</p>
              </div>
              <div className="text-2xl sm:text-3xl">📋</div>
            </div>
          </div>
        </div>
        
        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="p-4">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-base sm:text-lg font-bold mb-3">🔍 Search Users</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, email, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:w-48">
                  <select
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Fields</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="employeeId">Employee ID</option>
                    <option value="department">Department</option>
                    <option value="role">Role</option>
                    <option value="phone">Phone Number</option>
                  </select>
                </div>
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-2 text-xs text-gray-400">
                  Found {filteredUsers.length} user(s) matching "{searchTerm}"
                </div>
              )}
            </div>
            
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="min-w-[1000px] w-full text-xs sm:text-sm">
                  <thead className="bg-gray-700">
                    <tr className="text-gray-300">
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Emp ID</th>
                      <th className="p-3 text-left">Dept</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Active</th>
                      <th className="p-3 text-left">Permissions</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, filteredIndex) => {
                      const isAdminUser = user.role === "admin";
                      const isCurrentUser = user._id === currentUser?._id;
                      const isMainAdminUser = user._id === mainAdmin?._id;
                      const canChangeRole = isMainAdmin && !isCurrentUser && (!isAdminUser || isMainAdmin);
                      
                      return (
                        <tr key={user._id} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="p-3 text-gray-400">{filteredIndex + 1}</td>
                          <td className="p-3">
                            <div className="font-medium text-xs sm:text-sm">
                              {user.name || user.fullName || `${user.firstName} ${user.lastName}`}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {filteredIndex === 0 && (
                                <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded">Newest</span>
                              )}
                              {isCurrentUser && (
                                <span className="text-xs bg-yellow-600 text-white px-1 py-0.5 rounded">You</span>
                              )}
                              {isMainAdminUser && !isCurrentUser && (
                                <span className="text-xs bg-red-600 text-white px-1 py-0.5 rounded">Main</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-xs sm:text-sm break-all">{user.email}</td>
                          <td className="p-3 text-xs sm:text-sm">{user.employeeId || "N/A"}</td>
                          <td className="p-3 text-xs sm:text-sm">{user.department || "N/A"}</td>
                          
                          <td className="p-3">
                            <select
                              key={`${user._id}-${user.role}`}
                              value={user.role || "employee"}
                              onChange={(e) => updateRole(user._id, e.target.value)}
                              className="bg-gray-700 text-white text-xs p-1 rounded w-full"
                              disabled={loading || !canChangeRole}
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="employee">Employee</option>
                            </select>
                          </td>
                          
                          <td className="p-3">
                            {user.isApproved ? (
                              <span className="text-green-400 text-xs">✓ Approved</span>
                            ) : (
                              <button
                                onClick={() => approveUser(user._id)}
                                className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 text-xs rounded whitespace-nowrap"
                                disabled={loading}
                              >
                                Approve
                              </button>
                            )}
                          </td>
                          
                          <td className="p-3">
                            <button
                              onClick={() => toggleActive(user._id)}
                              className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                                user.isActive
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-red-600 hover:bg-red-700"
                              }`}
                              disabled={loading || (isAdminUser && !isMainAdmin) || isMainAdminUser}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          
                          <td className="p-3">
                            {!isAdminUser ? (
                              <div className="space-y-2 min-w-[160px]">
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getTempPermsForUser(user._id)?.newClient || false}
                                      onChange={() => updateTempPermission(user._id, "newClient")}
                                      className="w-3 h-3"
                                      disabled={loading || !isMainAdmin}
                                    />
                                    <span>➕ New Client</span>
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getTempPermsForUser(user._id)?.allClients || false}
                                      onChange={() => updateTempPermission(user._id, "allClients")}
                                      className="w-3 h-3"
                                      disabled={loading || !isMainAdmin}
                                    />
                                    <span>🏢 All Clients</span>
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getTempPermsForUser(user._id)?.newRequirement || false}
                                      onChange={() => updateTempPermission(user._id, "newRequirement")}
                                      className="w-3 h-3"
                                      disabled={loading || !isMainAdmin}
                                    />
                                    <span>📝 New Requirement</span>
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getTempPermsForUser(user._id)?.allRequirement || false}
                                      onChange={() => updateTempPermission(user._id, "allRequirement")}
                                      className="w-3 h-3"
                                      disabled={loading || !isMainAdmin}
                                    />
                                    <span>📋 All Requirements</span>
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getTempPermsForUser(user._id)?.newCandidate || false}
                                      onChange={() => updateTempPermission(user._id, "newCandidate")}
                                      className="w-3 h-3"
                                      disabled={loading || !isMainAdmin}
                                    />
                                    <span>👤 New Candidate</span>
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={getTempPermsForUser(user._id)?.allCandidates || false}
                                      onChange={() => updateTempPermission(user._id, "allCandidates")}
                                      className="w-3 h-3"
                                      disabled={loading || !isMainAdmin}
                                    />
                                    <span>📄 All Candidates</span>
                                  </label>
                                </div>
                                {hasPermissionChanges(user._id) && isMainAdmin && (
                                  <button
                                    onClick={() => savePermissions(user._id)}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1 rounded"
                                    disabled={loading}
                                  >
                                    💾 Save
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-center text-yellow-400 whitespace-nowrap">
                                👑 Full Access
                              </div>
                            )}
                          </td>
                          
                          <td className="p-3">
                            <div className="flex flex-col sm:flex-row gap-1">
                              {isMainAdmin && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowPasswordModal(true);
                                    setNewPassword("");
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs whitespace-nowrap"
                                  title="Change Password"
                                >
                                  🔐 Pwd
                                </button>
                              )}
                              <button
                                onClick={() => deleteUser(user._id)}
                                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs whitespace-nowrap"
                                disabled={isMainAdminUser || isCurrentUser || (isAdminUser && !isMainAdmin) || loading}
                              >
                                🗑️ Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  {searchTerm ? (
                    <div>
                      <p>No users found matching "{searchTerm}"</p>
                      <button
                        onClick={clearSearch}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    "No users registered yet."
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Login History Tab */}
        {activeTab === "loginHistory" && (
          <div className="p-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 flex-wrap">
                <span>🔐</span> Login History
                <span className="text-xs sm:text-sm text-gray-400">
                  (Last {loginHistory.length} logins)
                </span>
              </h3>
              {loginHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No login history available yet.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-[800px] w-full text-xs sm:text-sm">
                    <thead className="bg-gray-700">
                      <tr className="text-gray-300">
                        <th className="p-3 text-left">User</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Emp ID</th>
                        <th className="p-3 text-left">Dept</th>
                        <th className="p-3 text-left">Role</th>
                        <th className="p-3 text-left">Login Time</th>
                        <th className="p-3 text-left">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginHistory.map((log, index) => (
                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-xs sm:text-sm">
                                {log.firstName} {log.lastName}
                              </div>
                              <div className="text-xs text-gray-400">
                                ID: {log.userId}
                              </div>
                            </div>
                           </td>
                          <td className="p-3 text-xs sm:text-sm break-all">{log.email}</td>
                          <td className="p-3 text-xs sm:text-sm">{log.employeeId || "N/A"}</td>
                          <td className="p-3 text-xs sm:text-sm">{log.department || "N/A"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                              log.role === "admin" 
                                ? "bg-purple-600 text-white" 
                                : log.role === "manager"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-600 text-white"
                            }`}>
                              {log.role || "employee"}
                            </span>
                           </td>
                          <td className="p-3">
                            <div className="font-mono text-xs">
                              {log.loginTime}
                            </div>
                           </td>
                          <td className="p-3">
                            <span className="font-mono text-xs text-gray-400">
                              {log.ip || "localhost"}
                            </span>
                           </td>
                         </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              )}
              {loginHistory.length > 0 && isMainAdmin && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearLoginHistory}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                    disabled={loading}
                  >
                    Clear History
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Password Change Modal */}
      {showPasswordModal && isMainAdmin && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-[90%] sm:w-96 shadow-xl">
            <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
              🔐 Change Password
            </h2>
            <p className="text-sm text-gray-400 mb-4 break-all">
              User: <span className="text-white font-medium">{selectedUser.name || selectedUser.email}</span>
              {selectedUser.role === "admin" && (
                <span className="ml-2 text-xs bg-red-600 px-2 py-0.5 rounded">Admin</span>
              )}
            </p>
            <div className="relative">
              <input
                type={showPasswordField ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white mb-2 pr-10 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasswordField(!showPasswordField)}
                className="absolute right-2 top-2 text-gray-400 hover:text-white"
              >
                {showPasswordField ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-4 space-y-1">
              <p>Password must contain:</p>
              <p className="ml-2">✓ At least 6 characters</p>
              <p className="ml-2">✓ Letters (a-z, A-Z)</p>
              <p className="ml-2">✓ Numbers (0-9)</p>
              <p className="ml-2">✓ Special character (@, #, $, !, %, *, ?, &)</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={changePassword}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setNewPassword("");
                  setShowPasswordField(false);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Permission Modal */}
      {showPermissionModal && isMainAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-[90%] sm:w-96 shadow-xl">
            <h2 className="text-lg sm:text-xl font-bold mb-4">
              Set Permissions for {selectedRole === "manager" ? "👥 Managers" : "👤 Employees"}
            </h2>
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolePermissions.newClient}
                  onChange={() =>
                    setRolePermissions(prev => ({ ...prev, newClient: !prev.newClient }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm sm:text-base">➕ New Client</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolePermissions.allClients}
                  onChange={() =>
                    setRolePermissions(prev => ({ ...prev, allClients: !prev.allClients }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm sm:text-base">🏢 All Clients</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolePermissions.newRequirement}
                  onChange={() =>
                    setRolePermissions(prev => ({ ...prev, newRequirement: !prev.newRequirement }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm sm:text-base">📝 New Requirement</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolePermissions.allRequirement}
                  onChange={() =>
                    setRolePermissions(prev => ({ ...prev, allRequirement: !prev.allRequirement }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm sm:text-base">📋 All Requirements</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolePermissions.newCandidate}
                  onChange={() =>
                    setRolePermissions(prev => ({
                      ...prev,
                      newCandidate: !prev.newCandidate
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm sm:text-base">👤 New Candidate</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolePermissions.allCandidates}
                  onChange={() =>
                    setRolePermissions(prev => ({
                      ...prev,
                      allCandidates: !prev.allCandidates
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm sm:text-base">📄 All Candidates</span>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={applyPermissionsToRole}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                disabled={loading}
              >
                {loading ? "Applying..." : "Save"}
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Manager Modal */}
      {showManagerModal && isMainAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-[90%] sm:w-96">
            <h2 className="text-lg sm:text-xl font-bold mb-4">➕ Create Manager Account</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name *"
                value={newManager.name}
                onChange={(e) => setNewManager({...newManager, name: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white text-sm"
                disabled={loading}
              />
              <input
                type="email"
                placeholder="Email *"
                value={newManager.email}
                onChange={(e) => setNewManager({...newManager, email: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white text-sm"
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password *"
                value={newManager.password}
                onChange={(e) => setNewManager({...newManager, password: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white text-sm"
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Department"
                value={newManager.department}
                onChange={(e) => setNewManager({...newManager, department: e.target.value})}
                className="w-full p-2 rounded bg-gray-700 text-white text-sm"
                disabled={loading}
              />
            </div>
            <div className="mt-4 text-xs text-gray-400 p-2 bg-gray-700 rounded">
              <p>Password must include: letters, numbers, and special character</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={handleCreateManager}
                className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-sm"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Manager"}
              </button>
              <button
                onClick={() => setShowManagerModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded text-sm"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;