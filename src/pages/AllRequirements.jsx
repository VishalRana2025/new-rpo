import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import RequirementFormPage from "./RequirementForm";

const AllRequirements = () => {
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [editDynamicFields, setEditDynamicFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingRequirementId, setEditingRequirementId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState(null);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [selectedRequirementAttachments, setSelectedRequirementAttachments] = useState(null);
  const [allDynamicFields, setAllDynamicFields] = useState([]);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  
  // ================== ADD NEW REQUIREMENT POPUP STATE ==================
  const [showAddPopup, setShowAddPopup] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  // Current user and role checks
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const isEmployee = currentUser?.role === "employee";
  const canEditDelete = isAdmin || isManager;
  const canViewSensitive = isAdmin || isManager;

  // ================== PERMISSION-BASED ADD NEW BUTTON ==================
  // Check if user has permission to add new requirement
  const canAddRequirement = 
    isAdmin || 
    currentUser?.permissions?.newRequirement === true;

  // Load dynamic fields from /form-fields API
  const loadDynamicFields = async () => {
    try {
      const res = await api.get("/form-fields");
      setAllDynamicFields(res.data);
      console.log("✅ Loaded dynamic fields from /form-fields:", res.data.length);
    } catch (err) {
      console.error("Error loading dynamic fields from /form-fields:", err);
      setAllDynamicFields([]);
    }
  };

  useEffect(() => {
    loadRequirements();
    loadDynamicFields();
  }, []);

  // Filter requirements whenever search term or requirements change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredRequirements(requirements);
    } else {
      const filtered = requirements.filter((req) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          req.clientName?.toLowerCase().includes(searchLower) ||
          req.agent?.toLowerCase().includes(searchLower) ||
          req.process?.toLowerCase().includes(searchLower) ||
          req.designationPosition?.toLowerCase().includes(searchLower) ||
          req.requirementType?.toLowerCase().includes(searchLower) ||
          req.budget?.toLowerCase().includes(searchLower) ||
          req.requirementStatus?.toLowerCase().includes(searchLower) ||
          req.clientLocation?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredRequirements(filtered);
    }
  }, [searchTerm, requirements]);

  const loadRequirements = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/requirements");
      console.log("Loaded requirements:", res.data);
      const processedRequirements = (res.data || []).map(req => ({
        ...req,
        requirementStatus: req.requirementStatus || "Open",
        clientLocation: req.clientLocation || req.recruiterLocation || "",
        fileUploads: (req.fileUploads || []).map(file => ({
          ...file,
          data: file.data || file.fileData || file.content,
          url: file.url || (file.data ? `data:${file.type || 'application/octet-stream'};base64,${file.data}` : null)
        }))
      }));
      setRequirements(processedRequirements);
      setFilteredRequirements(processedRequirements);
    } catch (error) {
      console.error("Error loading requirements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRequirement = async () => {
    if (!requirementToDelete) return;
    try {
      await api.delete(`/delete-requirement/${requirementToDelete._id || requirementToDelete.id}`);
      await loadRequirements();
      setShowDeleteModal(false);
      setRequirementToDelete(null);
      alert("Requirement deleted successfully!");
    } catch (error) {
      console.error("Error deleting requirement:", error);
      alert("Failed to delete requirement.");
    }
  };

  const updateRequirementStatus = async (requirementId, newStatus) => {
    try {
      const existingReq = requirements.find(
        (r) => (r._id || r.id) === requirementId
      );

      if (!existingReq) {
        alert("Requirement not found");
        return;
      }

      const { _id, createdAt, createdBy, __v, ...safeData } = existingReq;

      const updateData = {
        ...safeData,
        requirementStatus: newStatus,
        updatedAt: new Date().toISOString(),
      };

      await api.put(`/update-requirement/${requirementId}`, updateData);
      await loadRequirements();
      alert(`Status updated to ${newStatus}!`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  const startEditRequirement = (req) => {
    setEditDynamicFields(
      allDynamicFields.map(field => {
        const key = `dynamic_${field.id}`;
        return {
          ...field,
          value: req[key] || ""
        };
      })
    );
    setEditingRequirementId(req._id || req.id);
    setEditFormData({
      clientName: req.clientName || "",
      agent: req.agent || "",
      process: req.process || "",
      designationPosition: req.designationPosition || "",
      requirementType: req.requirementType || "",
      noOfRequirement: req.noOfRequirement || "",
      driveDate: req.driveDate ? req.driveDate.split("T")[0] : "",
      requirementDeadline: req.requirementDeadline ? req.requirementDeadline.split("T")[0] : "",
      budget: req.budget || "",
      payoutCommissionRs: req.payoutCommissionRs || "",
      payoutCommissionPercent: req.payoutCommissionPercent || "",
      additionalNotes: req.additionalNotes || "",
      requirementStatus: req.requirementStatus || "Open",
      clientLocation: req.clientLocation || req.recruiterLocation || "",
    });
  };

  const cancelEdit = () => {
    setEditingRequirementId(null);
    setEditFormData(null);
    setEditDynamicFields([]);
  };

  const saveEditedRequirement = async (requirementId) => {
    if (!editFormData) return;

    if (!editFormData.clientName?.trim()) {
      alert("Client Name is required.");
      return;
    }
    if (!editFormData.agent?.trim()) {
      alert("Agent is required.");
      return;
    }
    if (!editFormData.process?.trim()) {
      alert("Process is required.");
      return;
    }
    if (!editFormData.designationPosition?.trim()) {
      alert("Designation/Position is required.");
      return;
    }
    if (!editFormData.requirementType) {
      alert("Requirement Type is required.");
      return;
    }
    if (!editFormData.budget) {
      alert("Budget is required.");
      return;
    }

    try {
      const existingReq = requirements.find(
        (r) => (r._id || r.id) === requirementId
      );

      if (!existingReq) {
        alert("Requirement not found");
        return;
      }

      const { _id, createdAt, createdBy, __v, ...safeData } = existingReq;

      const updateData = {
        ...safeData,
        ...editFormData,
        updatedAt: new Date().toISOString(),
      };

      editDynamicFields.forEach(field => {
        const key = `dynamic_${field.id}`;
        updateData[key] = field.value;
      });

      const response = await api.put(`/update-requirement/${requirementId}`, updateData);
      
      if (response.data) {
        await loadRequirements();
        setEditingRequirementId(null);
        setEditFormData(null);
        setEditDynamicFields([]);
        alert("Requirement updated successfully!");
      }
    } catch (error) {
      console.error("Error updating requirement:", error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          "Failed to update requirement.";
      alert(`Update failed: ${errorMessage}`);
    }
  };

  const openDeleteModal = (req) => {
    setRequirementToDelete(req);
    setShowDeleteModal(true);
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const handleEditInputChange = (e, field) => {
    const { value } = e.target;
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return "📎";
    const type = fileType.toLowerCase();
    if (type.includes("pdf")) return "📕";
    if (type.includes("image")) return "🖼️";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    if (type.includes("text")) return "📄";
    return "📎";
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileUrl = (file) => {
    if (file.url) return file.url;
    if (file.data) {
      const mimeType = file.type || 'application/octet-stream';
      return `data:${mimeType};base64,${file.data}`;
    }
    return null;
  };

  const downloadFile = (file) => {
    try {
      const fileUrl = getFileUrl(file);
      if (!fileUrl) {
        alert("File data not available for download");
        return;
      }

      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = file.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file.");
    }
  };

  const previewImage = (file) => {
    const fileUrl = getFileUrl(file);
    if (!fileUrl) {
      alert("Cannot preview this file");
      return;
    }

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.cursor = 'pointer';

    const img = document.createElement('img');
    img.src = fileUrl;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';

    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
  };

  const viewAttachments = (req) => {
    setSelectedRequirementAttachments(req);
    setShowAttachmentsModal(true);
  };

  const getDynamicFieldValue = (req, field) => {
    const idKey = `dynamic_${field.id}`;

    if (req[idKey] !== undefined && req[idKey] !== null && req[idKey] !== "") {
      return req[idKey];
    }

    const labelKey = field.label.replace(/\s+/g, "_").toLowerCase();
    if (req[labelKey] !== undefined && req[labelKey] !== null && req[labelKey] !== "") {
      return req[labelKey];
    }

    const oldKey = `dynamic_${field.id}_${field.type}`;
    if (req[oldKey] !== undefined && req[oldKey] !== null && req[oldKey] !== "") {
      return req[oldKey];
    }

    return "-";
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Open":
        return "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-sm";
      case "Close":
        return "bg-gradient-to-r from-rose-400 to-rose-500 text-white shadow-sm";
      case "On Hold":
        return "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm";
    }
  };

  const openDetailsModal = (req) => {
    setSelectedRequirement(req);
    setShowDetailsModal(true);
  };

  // Modern gradient color scheme
  const themeStyles = {
    background: isDarkMode 
      ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" 
      : "bg-gradient-to-br from-slate-50 via-white to-slate-50",
    text: isDarkMode ? "text-slate-100" : "text-slate-800",
    secondaryText: isDarkMode ? "text-slate-300" : "text-slate-500",
    card: isDarkMode 
      ? "bg-slate-800/80 backdrop-blur-sm border-slate-700" 
      : "bg-white/80 backdrop-blur-sm border-slate-200",
    border: isDarkMode ? "border-slate-700" : "border-slate-200",
    input: isDarkMode
      ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500"
      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500",
    tableHeader: isDarkMode 
      ? "bg-gradient-to-r from-indigo-600 to-purple-600" 
      : "bg-gradient-to-r from-indigo-500 to-purple-500",
    tableRow: isDarkMode
      ? "border-slate-700 hover:bg-slate-700/50 transition-all duration-200"
      : "border-slate-100 hover:bg-indigo-50/50 transition-all duration-200",
    button: isDarkMode
      ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25"
      : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25",
    buttonSecondary: isDarkMode
      ? "bg-slate-600 hover:bg-slate-700"
      : "bg-slate-500 hover:bg-slate-600",
    buttonSuccess: isDarkMode
      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
    buttonDanger: isDarkMode
      ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
      : "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600",
    buttonAdd: isDarkMode
      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25"
      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className={`${themeStyles.secondaryText} text-sm`}>Loading requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.background} ${themeStyles.text} transition-all duration-300`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Requirements Dashboard
              </h1>
              <p className={`text-sm ${themeStyles.secondaryText} mt-1`}>
                {isEmployee ? "View your requirements" : "Manage and track all client requirements"}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search requirements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${themeStyles.input} border pl-10 pr-4 py-2.5 rounded-xl w-full md:w-80 text-sm focus:outline-none focus:ring-2 transition-all`}
                />
                <svg className="absolute left-3 top-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className={`px-4 py-2.5 rounded-xl text-white ${themeStyles.buttonSecondary} flex items-center gap-2 justify-center text-sm transition-all hover:scale-105`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
              {/* ADD NEW REQUIREMENT BUTTON - PERMISSION BASED */}
              {canAddRequirement && (
                <button
                  onClick={() => setShowAddPopup(true)}
                  className={`px-5 py-2.5 rounded-xl text-white ${themeStyles.buttonAdd} flex items-center gap-2 justify-center text-sm font-medium transition-all hover:scale-105 shadow-lg`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Only for Admin/Manager */}
        {!isEmployee && filteredRequirements.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className={`${themeStyles.card} rounded-xl p-4 shadow-lg border ${themeStyles.border} backdrop-blur-sm transition-all hover:scale-105 duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${themeStyles.secondaryText} uppercase tracking-wide`}>Total</p>
                  <p className="text-2xl font-bold mt-1 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{filteredRequirements.length}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={`${themeStyles.card} rounded-xl p-4 shadow-lg border ${themeStyles.border} backdrop-blur-sm transition-all hover:scale-105 duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${themeStyles.secondaryText} uppercase tracking-wide`}>Open</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-600">
                    {filteredRequirements.filter(r => r.requirementStatus === "Open").length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={`${themeStyles.card} rounded-xl p-4 shadow-lg border ${themeStyles.border} backdrop-blur-sm transition-all hover:scale-105 duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${themeStyles.secondaryText} uppercase tracking-wide`}>Closed</p>
                  <p className="text-2xl font-bold mt-1 text-rose-600">
                    {filteredRequirements.filter(r => r.requirementStatus === "Close").length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12L11 14L15 10M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className={`${themeStyles.card} rounded-xl p-4 shadow-lg border ${themeStyles.border} backdrop-blur-sm transition-all hover:scale-105 duration-300`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${themeStyles.secondaryText} uppercase tracking-wide`}>On Hold</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">
                    {filteredRequirements.filter(r => r.requirementStatus === "On Hold").length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results Summary */}
        {searchTerm && filteredRequirements.length > 0 && (
          <div className={`mb-6 p-4 rounded-xl ${themeStyles.card} border ${themeStyles.border} backdrop-blur-sm`}>
            <p className={`text-sm ${themeStyles.secondaryText}`}>
              Found <span className="font-semibold text-indigo-600">{filteredRequirements.length}</span> requirement(s) matching 
              <span className="font-medium ml-1">"{searchTerm}"</span>
            </p>
          </div>
        )}

        {/* Main Table - Role Based View */}
        {filteredRequirements.length === 0 ? (
          <div className={`${themeStyles.card} rounded-xl shadow-lg border ${themeStyles.border} p-12 text-center backdrop-blur-sm`}>
            <div className="text-6xl mb-4 opacity-50">📋</div>
            {searchTerm ? (
              <>
                <h3 className={`text-lg font-medium ${themeStyles.secondaryText} mb-2`}>
                  No results found
                </h3>
                <p className={`text-sm ${themeStyles.secondaryText} mb-4`}>
                  No requirements match "{searchTerm}"
                </p>
                <button
                  onClick={clearSearch}
                  className={`px-6 py-2 rounded-xl text-white ${themeStyles.button} inline-flex items-center gap-2 text-sm transition-all hover:scale-105`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <h3 className={`text-lg font-medium ${themeStyles.secondaryText}`}>No requirements found</h3>
                <p className={`text-sm ${themeStyles.secondaryText} mt-2`}>
                  Add your first requirement to get started
                </p>
                {canAddRequirement && (
                  <button
                    onClick={() => setShowAddPopup(true)}
                    className={`mt-4 px-6 py-2 rounded-xl text-white ${themeStyles.buttonAdd} inline-flex items-center gap-2 text-sm transition-all hover:scale-105`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Requirement
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className={`${themeStyles.card} rounded-xl shadow-lg border ${themeStyles.border} overflow-hidden backdrop-blur-sm`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${themeStyles.border}`}>
                    {isEmployee ? (
                      // Employee Compact View Headers
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Process</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Req Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Client Location</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Created By</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Details</th>
                      </>
                    ) : (
                      // Admin/Manager Full View Headers
                      <>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Received Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Agent</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Process</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Designation</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Client Location</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">No. of Req</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Drive Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Deadline</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Budget</th>
                        {canViewSensitive && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Payout (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Payout (%)</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Attachments</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Notes</th>
                        {allDynamicFields.map(field => (
                          <th key={field.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">
                            {field.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Created By</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Created At</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 to-purple-600">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.map((req, index) => {
                    const isEditing = editingRequirementId === (req._id || req.id);
                    const requirementId = req._id || req.id;
                    const fileUploads = req.fileUploads || [];
                    
                    return (
                      <tr
                        key={requirementId}
                        className={`border-b ${themeStyles.border} ${themeStyles.tableRow} transition-colors ${isEmployee ? 'cursor-pointer' : ''}`}
                        onClick={() => isEmployee && openDetailsModal(req)}
                      >
                        {isEmployee ? (
                          // Employee Compact View Row
                          <>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusBadgeStyle(req.requirementStatus || "Open")}`}>
                                <span className={`w-2 h-2 rounded-full ${req.requirementStatus === "Open" ? "bg-white" : req.requirementStatus === "Close" ? "bg-white" : "bg-white"}`}></span>
                                {req.requirementStatus || "Open"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{req.clientName}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{req.process}</td>
                            <td className="px-4 py-3 text-sm">
                              {req.requirementReceivedDate
                                ? new Date(req.requirementReceivedDate).toLocaleDateString("en-IN")
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                                req.requirementType === 'Bonanza' ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-white' :
                                req.requirementType === 'Regular' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white' :
                                'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                              }`}>
                                {req.requirementType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{req.clientLocation || "-"}</td>
                            <td className="px-4 py-3 text-sm">
                              {req.createdByName || req.createdByEmail || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailsModal(req);
                                }}
                                className="p-1.5 text-indigo-500 hover:text-indigo-600 transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </>
                        ) : (
                          // Admin/Manager Full View Row
                          <>
                            <td className="px-4 py-3 text-sm font-medium">{index + 1}</td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <select
                                  value={editFormData?.requirementStatus || "Open"}
                                  onChange={(e) => handleEditInputChange(e, "requirementStatus")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2`}
                                >
                                  <option value="Open">Open</option>
                                  <option value="Close">Close</option>
                                  <option value="On Hold">On Hold</option>
                                </select>
                              ) : canEditDelete ? (
                                <select
                                  value={req.requirementStatus || "Open"}
                                  onChange={(e) => updateRequirementStatus(requirementId, e.target.value)}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2`}
                                >
                                  <option value="Open">Open</option>
                                  <option value="Close">Close</option>
                                  <option value="On Hold">On Hold</option>
                                </select>
                              ) : (
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getStatusBadgeStyle(req.requirementStatus)}`}>
                                  {req.requirementStatus || "Open"}
                                </span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.clientName || ""}
                                  onChange={(e) => handleEditInputChange(e, "clientName")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-full focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                <span className="text-sm font-medium">{req.clientName}</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editFormData?.requirementReceivedDate || ""}
                                  onChange={(e) => handleEditInputChange(e, "requirementReceivedDate")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                req.requirementReceivedDate
                                  ? new Date(req.requirementReceivedDate).toLocaleDateString("en-IN")
                                  : "-"
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.agent || ""}
                                  onChange={(e) => handleEditInputChange(e, "agent")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-full focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                <span className="text-sm">{req.agent}</span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.process || ""}
                                  onChange={(e) => handleEditInputChange(e, "process")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-full focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                <span className="text-sm">{req.process}</span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.designationPosition || ""}
                                  onChange={(e) => handleEditInputChange(e, "designationPosition")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-full focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                <span className="text-sm">{req.designationPosition}</span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <select
                                  value={editFormData?.requirementType || ""}
                                  onChange={(e) => handleEditInputChange(e, "requirementType")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2`}
                                >
                                  <option value="">Select Type</option>
                                  <option value="Bonanza">Bonanza</option>
                                  <option value="Regular">Regular</option>
                                  <option value="FLR">FLR</option>
                                </select>
                              ) : (
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                                  req.requirementType === 'Bonanza' ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-white' :
                                  req.requirementType === 'Regular' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white' :
                                  'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                                }`}>
                                  {req.requirementType}
                                </span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                 value={editFormData?.clientLocation || ""}
onChange={(e) => handleEditInputChange(e, "clientLocation")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-full focus:outline-none focus:ring-2`}
                                  placeholder="e.g., Mumbai, Delhi, Bangalore"
                                />
                              ) : (
                                <span className="text-sm">{req.clientLocation || "-"}</span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 text-center">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="number"
                                  value={editFormData?.noOfRequirement || ""}
                                  onChange={(e) => handleEditInputChange(e, "noOfRequirement")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-20 text-center focus:outline-none focus:ring-2`}
                                  min="1"
                                />
                              ) : (
                                <span className="text-sm">{req.noOfRequirement || "-"}</span>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 text-sm">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="date"
                                  value={editFormData?.driveDate || ""}
                                  onChange={(e) => handleEditInputChange(e, "driveDate")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                formatDateOnly(req.driveDate)
                              )}
                            </td>
                            
                            <td className="px-4 py-3 text-sm">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="date"
                                  value={editFormData?.requirementDeadline || ""}
                                  onChange={(e) => handleEditInputChange(e, "requirementDeadline")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                formatDateOnly(req.requirementDeadline)
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.budget || ""}
                                  onChange={(e) => handleEditInputChange(e, "budget")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-full focus:outline-none focus:ring-2`}
                                />
                              ) : (
                                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{req.budget}</span>
                              )}
                            </td>

                            {canViewSensitive && (
                              <>
                                <td className="px-4 py-3">
                                  {isEditing && canEditDelete ? (
                                    <input
                                      type="number"
                                      value={editFormData?.payoutCommissionRs || ""}
                                      onChange={(e) => handleEditInputChange(e, "payoutCommissionRs")}
                                      className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-24 focus:outline-none focus:ring-2`}
                                      step="0.01"
                                    />
                                  ) : (
                                    <span className="text-sm">{req.payoutCommissionRs || "-"}</span>
                                  )}
                                </td>
  
                                <td className="px-4 py-3">
                                  {isEditing && canEditDelete ? (
                                    <input
                                      type="number"
                                      value={editFormData?.payoutCommissionPercent || ""}
                                      onChange={(e) => handleEditInputChange(e, "payoutCommissionPercent")}
                                      className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-20 focus:outline-none focus:ring-2`}
                                      step="0.01"
                                      min="0"
                                      max="100"
                                    />
                                  ) : (
                                    <span className="text-sm">
                                      {req.payoutCommissionPercent ? `${req.payoutCommissionPercent}%` : "-"}
                                    </span>
                                  )}
                                </td>
  
                                <td className="px-4 py-3">
                                  {fileUploads.length > 0 ? (
                                    <button
                                      onClick={() => viewAttachments(req)}
                                      className="inline-flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 transition-colors text-sm font-medium"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                      </svg>
                                      {fileUploads.length} file(s)
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </>
                            )}
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <textarea
                                  value={editFormData?.additionalNotes || ""}
                                  onChange={(e) => handleEditInputChange(e, "additionalNotes")}
                                  className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-48 focus:outline-none focus:ring-2`}
                                  rows="2"
                                />
                              ) : (
                                <div className="max-w-[200px]">
                                  <button
                                    className="text-sm text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1"
                                    onClick={() => {
                                      setSelectedNotes(req.additionalNotes || "No notes available");
                                      setShowNotesModal(true);
                                    }}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    {req.additionalNotes ? "View Notes" : "No notes"}
                                  </button>
                                </div>
                              )}
                            </td>
                            
                            {allDynamicFields.map(field => (
                              <td key={field.id} className="px-4 py-3 text-sm">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editDynamicFields.find(f => f.id === field.id)?.value || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setEditDynamicFields(prev =>
                                        prev.map(f =>
                                          f.id === field.id ? { ...f, value } : f
                                        )
                                      );
                                    }}
                                    className={`${themeStyles.input} border px-3 py-1.5 rounded-lg text-sm w-32 focus:outline-none focus:ring-2`}
                                  />
                                ) : (
                                  <span>{getDynamicFieldValue(req, field)}</span>
                                )}
                              </td>
                            ))}
                            
                            <td className="px-4 py-3 text-xs">
                              {req.createdByName || req.createdByEmail || "-"}
                            </td>
                            
                            <td className="px-4 py-3 text-xs">
                              {req.createdDate ? (
                                <div>
                                  <div className="font-medium">{req.createdDate}</div>
                                  <div className={themeStyles.secondaryText}>{req.createdTime || ""}</div>
                                </div>
                              ) : (
                                formatDateTime(req.createdAt)
                              )}
                            </td>
                            
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveEditedRequirement(requirementId)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Save"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Cancel"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                canEditDelete && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => startEditRequirement(req)}
                                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(req)}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD NEW REQUIREMENT FULL FORM POPUP */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={() => setShowAddPopup(false)}
              className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-lg flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>

            {/* Full Requirement Form */}
            <div className="h-full overflow-y-auto">
              <RequirementFormPage />
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequirement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden`}>
            <div className={`flex justify-between items-center p-6 border-b ${themeStyles.border}`}>
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Requirement Details</h3>
                <p className={`text-sm ${themeStyles.secondaryText} mt-1`}>
                  {selectedRequirement.clientName}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Client</p>
                  <p className="text-sm mt-1 font-medium">{selectedRequirement.clientName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Process</p>
                  <p className="text-sm mt-1">{selectedRequirement.process}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Req Received Date</p>
                  <p className="text-sm mt-1">
                    {selectedRequirement.requirementReceivedDate
                      ? new Date(selectedRequirement.requirementReceivedDate).toLocaleDateString("en-IN")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Requirement Type</p>
                  <p className="text-sm mt-1">{selectedRequirement.requirementType}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Status</p>
                  <p className="text-sm mt-1">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${getStatusBadgeStyle(selectedRequirement.requirementStatus)}`}>
                      {selectedRequirement.requirementStatus || "Open"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Agent</p>
                  <p className="text-sm mt-1">{selectedRequirement.agent || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Designation</p>
                  <p className="text-sm mt-1">{selectedRequirement.designationPosition || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Client Location</p>
                  <p className="text-sm mt-1">{selectedRequirement.clientLocation || selectedRequirement.recruiterLocation || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">No. of Requirements</p>
                  <p className="text-sm mt-1">{selectedRequirement.noOfRequirement || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Drive Date</p>
                  <p className="text-sm mt-1">{formatDateOnly(selectedRequirement.driveDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Deadline</p>
                  <p className="text-sm mt-1">{formatDateOnly(selectedRequirement.requirementDeadline)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Budget</p>
                  <p className="text-sm mt-1 font-semibold text-indigo-600">{selectedRequirement.budget}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Created By</p>
                  <p className="text-sm mt-1">{selectedRequirement.createdByName || selectedRequirement.createdByEmail || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">Created At</p>
                  <p className="text-sm mt-1">{formatDateTime(selectedRequirement.createdAt)}</p>
                </div>
                {selectedRequirement.additionalNotes && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400 mb-2">
                      Additional Notes
                    </p>
                    <div className="mt-1 p-4 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-800 dark:text-slate-200 text-sm leading-relaxed border border-slate-200 dark:border-slate-700 shadow-sm">
                      {selectedRequirement.additionalNotes}
                    </div>
                  </div>
                )}
                {selectedRequirement.fileUploads?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400 mb-2">Attachments</p>
                    <div className="space-y-2">
                      {selectedRequirement.fileUploads.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getFileIcon(file.type)}</span>
                            <span className="text-sm truncate">{file.name}</span>
                          </div>
                          <button
                            onClick={() => downloadFile(file)}
                            className="px-3 py-1 rounded-lg text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-xs shadow-sm"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {allDynamicFields.map(field => (
                  <div key={field.id}>
                    <p className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">{field.label}</p>
                    <p className="text-sm mt-1">{getDynamicFieldValue(selectedRequirement, field)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={`flex justify-end p-6 border-t ${themeStyles.border}`}>
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${themeStyles.button} text-white shadow-lg`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && selectedRequirementAttachments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden`}>
            <div className={`flex justify-between items-center p-6 border-b ${themeStyles.border}`}>
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Attachments</h3>
                <p className={`text-sm ${themeStyles.secondaryText} mt-1`}>
                  {selectedRequirementAttachments.clientName} • {selectedRequirementAttachments.fileUploads?.length || 0} file(s)
                </p>
              </div>
              <button
                onClick={() => setShowAttachmentsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedRequirementAttachments.fileUploads?.length > 0 ? (
                <div className="space-y-3">
                  {selectedRequirementAttachments.fileUploads.map((file, index) => {
                    const fileUrl = getFileUrl(file);
                    const isImage = file.type?.toLowerCase().includes('image');
                    
                    return (
                      <div key={file.id || file._id || index} className={`flex items-center justify-between p-4 ${themeStyles.border} border rounded-xl hover:shadow-md transition-all`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-3xl">{getFileIcon(file.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name || 'Unnamed file'}</p>
                            <div className="flex gap-3 mt-1">
                              {file.size && (
                                <p className={`text-xs ${themeStyles.secondaryText}`}>{formatFileSize(file.size)}</p>
                              )}
                              {file.type && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                  {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadFile(file)}
                            className={`px-3 py-2 rounded-lg text-white ${themeStyles.button} text-sm transition-all hover:scale-105 shadow-sm`}
                          >
                            Download
                          </button>
                          {isImage && (
                            <button
                              onClick={() => previewImage(file)}
                              className={`px-3 py-2 rounded-lg text-white ${themeStyles.buttonSecondary} text-sm transition-all hover:scale-105`}
                            >
                              Preview
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">📂</div>
                  <p className={`text-lg ${themeStyles.secondaryText}`}>No attachments found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && requirementToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-2xl shadow-2xl max-w-md w-full p-6`}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-r from-rose-100 to-red-100 mb-4">
                <svg className="h-6 w-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Delete Requirement</h3>
              <p className={`text-sm ${themeStyles.secondaryText} mb-6`}>
                Are you sure you want to delete requirement for <span className="font-semibold text-rose-600">"{requirementToDelete.clientName}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium ${themeStyles.buttonSecondary} text-white transition-all`}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteRequirement}
                  className={`px-4 py-2 rounded-xl text-sm font-medium ${themeStyles.buttonDanger} text-white transition-all shadow-lg`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-2xl shadow-2xl max-w-lg w-full`}>
            <div className={`flex justify-between items-center p-6 border-b ${themeStyles.border}`}>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Additional Notes</h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className={`p-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'} rounded-xl text-sm leading-relaxed`}>
                {selectedNotes}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium ${themeStyles.button} text-white shadow-lg`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllRequirements;