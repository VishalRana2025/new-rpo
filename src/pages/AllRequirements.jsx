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
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Current user and role checks
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const isEmployee = currentUser?.role === "employee";
  const canEditDelete = isAdmin || isManager;
  const canViewSensitive = isAdmin || isManager;
  const canAddRequirement = isAdmin || currentUser?.permissions?.newRequirement === true;

  // OPTIMIZED: Load dynamic fields with cache
  const loadDynamicFields = async () => {
    try {
      const cached = localStorage.getItem("dynamicFieldsCache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data?.length > 0) {
          console.log("⚡ Using cached dynamic fields");
          setAllDynamicFields(parsed.data);
          return;
        }
      }

      const res = await api.get("/form-fields");
      setAllDynamicFields(res.data);
      
      localStorage.setItem("dynamicFieldsCache", JSON.stringify({
        data: res.data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error("Error loading dynamic fields:", err);
      const cached = localStorage.getItem("dynamicFieldsCache");
      if (cached) {
        const parsed = JSON.parse(cached);
        setAllDynamicFields(parsed.data || []);
      }
    }
  };

  // OPTIMIZED: Load requirements with cache
  const loadRequirements = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem("requirementsCache");
        if (cached) {
          const parsed = JSON.parse(cached);
          
          if (parsed.data?.length > 0) {
            console.log("⚡ Loading requirements from cache instantly");
            setRequirements(parsed.data);
            setIsLoading(false);
            return;
          }
        }
      }
      
      console.log("🔄 Fetching fresh requirements from API");
      const res = await api.get("/requirements");
      const processedRequirements = (res.data || []).map(req => ({
        ...req,
        requirementStatus: req.requirementStatus || "Open",
        clientLocation: req.clientLocation || req.recruiterLocation || "",
        fileUploads: (req.fileUploads || []).map(file => ({
  name: file.name,
  type: file.type,
  url: file.url,
  data: file.data   // ✅ IMPORTANT FIX
}))
      }));
      
      setRequirements(processedRequirements);
      
      localStorage.setItem("requirementsCache", JSON.stringify({
        data: processedRequirements,
        timestamp: Date.now()
      }));
      console.log("✅ Requirements cached with", processedRequirements.length, "items");
      
    } catch (error) {
      console.error("Error loading requirements:", error);
      
      const cached = localStorage.getItem("requirementsCache");
      if (!cached) {
        setRequirements([]);
        setFilteredRequirements([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OPTIMIZED: Single effect for initial load
  useEffect(() => {
    // Load from cache instantly
    // const cached = localStorage.getItem("requirementsCache");
    // if (cached) {
    //   try {
    //     const parsed = JSON.parse(cached);
    //     if (parsed.data?.length > 0) {
    //       setRequirements(parsed.data);
    //     }
    //   } catch(e) {}
    // }
    
    // Load dynamic fields from cache
    const cachedFields = localStorage.getItem("dynamicFieldsCache");
    if (cachedFields) {
      try {
        const parsed = JSON.parse(cachedFields);
        if (parsed.data?.length > 0) {
          setAllDynamicFields(parsed.data);
        }
      } catch(e) {}
    }
    
    // Fetch fresh data in background
    const timer = setTimeout(() => {
     loadRequirements(true);
      loadDynamicFields();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleNewRequirement = () => {
      console.log("🔥 Requirement added → refreshing list");
      localStorage.removeItem("requirementsCache");
      loadRequirements(true);
      setShowAddPopup(false);
    };

    window.addEventListener("requirementAdded", handleNewRequirement);

    return () => {
      window.removeEventListener("requirementAdded", handleNewRequirement);
    };
  }, []);

  // Filtering effect
  useEffect(() => {
    let data = [...requirements];

    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      data = data.filter((req) =>
        req.clientName?.toLowerCase().includes(searchLower) ||
        req.agent?.toLowerCase().includes(searchLower) ||
        req.process?.toLowerCase().includes(searchLower) ||
        req.designationPosition?.toLowerCase().includes(searchLower) ||
        req.requirementType?.toLowerCase().includes(searchLower) ||
        req.budget?.toLowerCase().includes(searchLower) ||
        req.requirementStatus?.toLowerCase().includes(searchLower) ||
        req.clientLocation?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "") {
      data = data.filter((req) => req.requirementStatus === statusFilter);
    }

    setFilteredRequirements(data);
  }, [searchTerm, requirements, statusFilter]);

  const handleRefresh = () => {
    console.log("🔄 Manual refresh - clearing cache");
    localStorage.removeItem("requirementsCache");
    loadRequirements(true);
  };

  const deleteRequirement = async () => {
    if (!requirementToDelete) return;
    try {
      await api.delete(`/delete-requirement/${requirementToDelete._id || requirementToDelete.id}`);
      localStorage.removeItem("requirementsCache");
      await loadRequirements(true);
      setShowDeleteModal(false);
      setRequirementToDelete(null);
    } catch (error) {
      console.error("Error deleting requirement:", error);
      alert("Failed to delete requirement.");
    }
  };

  const updateRequirementStatus = async (requirementId, newStatus) => {
    try {
      const existingReq = requirements.find((r) => (r._id || r.id) === requirementId);
      if (!existingReq) return;

      const { _id, createdAt, createdBy, __v, ...safeData } = existingReq;
      const updateData = { ...safeData, requirementStatus: newStatus, updatedAt: new Date().toISOString() };

      await api.put(`/update-requirement/${requirementId}`, updateData);
      localStorage.removeItem("requirementsCache");
      await loadRequirements(true);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  const startEditRequirement = (req) => {
    setEditDynamicFields(
      allDynamicFields.map(field => ({
        ...field,
        value: req[`dynamic_${field.id}`] || ""
      }))
    );
    setEditingRequirementId(req._id || req.id);
    setEditFormData({
      clientName: req.clientName || "",
      agent: req.agent || "",
      process: req.process || "",
      designationPosition: req.designationPosition || "",
      requirementType: req.requirementType || "",
      noOfRequirement: req.noOfRequirement || "",
      requirementReceivedDate: req.requirementReceivedDate || "",
      driveDate: req.driveDate ? req.driveDate.split("T")[0] : "",
      requirementDeadline: req.requirementDeadline ? req.requirementDeadline.split("T")[0] : "",
      budget: req.budget || "",
      payoutCommissionRs: req.payoutCommissionRs || "",
      payoutCommissionPercent: req.payoutCommissionPercent || "",
      additionalNotes: req.additionalNotes || "",
      requirementStatus: req.requirementStatus || "Open",
      clientLocation: req.clientLocation || req.recruiterLocation || "",
    });
    setShowEditPopup(true);
  };

  const saveEditedRequirement = async (requirementId) => {
    if (!editFormData) return;

    if (!editFormData.clientName?.trim() || !editFormData.agent?.trim() || 
        !editFormData.process?.trim() || !editFormData.designationPosition?.trim() || 
        !editFormData.requirementType || !editFormData.budget) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      const existingReq = requirements.find((r) => (r._id || r.id) === requirementId);
      if (!existingReq) return;

      const { _id, createdAt, createdBy, __v, ...safeData } = existingReq;
      const updateData = { ...safeData, ...editFormData, updatedAt: new Date().toISOString() };

      editDynamicFields.forEach(field => {
        updateData[`dynamic_${field.id}`] = field.value;
      });

      await api.put(`/update-requirement/${requirementId}`, updateData);
      localStorage.removeItem("requirementsCache");
      await loadRequirements(true);
      setEditingRequirementId(null);
      setEditFormData(null);
      setEditDynamicFields([]);
      setShowEditPopup(false);
      alert("Requirement updated successfully!");
    } catch (error) {
      console.error("Error updating requirement:", error);
      alert("Failed to update requirement.");
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

  const clearSearch = () => setSearchTerm("");

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

  const getFileUrl = (file) => {
    if (file.url) return file.url;
    if (file.data) {
      return `data:${file.type || 'application/octet-stream'};base64,${file.data}`;
    }
    return null;
  };

  const downloadFile = (file) => {
    try {
      const fileUrl = getFileUrl(file);
      if (!fileUrl) {
        alert("File data not available");
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
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
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
    if (req[idKey] !== undefined && req[idKey] !== null && req[idKey] !== "") return req[idKey];
    const labelKey = field.label.replace(/\s+/g, "_").toLowerCase();
    if (req[labelKey] !== undefined && req[labelKey] !== null && req[labelKey] !== "") return req[labelKey];
    return "-";
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Open": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "Close": return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      case "On Hold": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      default: return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  const openDetailsModal = (req) => {
    setSelectedRequirement(req);
    setShowDetailsModal(true);
  };

  const getCacheAge = () => {
    try {
      const cached = localStorage.getItem("requirementsCache");
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

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
            <div>
              <h1 className="text-2xl font-semibold text-white">Requirements</h1>
              <p className="text-sm text-gray-400 mt-1">
                {isEmployee ? "View assigned requirements" : "Manage client requirements"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg pl-10 pr-4 py-2 w-full sm:w-72 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button onClick={clearSearch} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all">
                  Clear
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
                title="Refresh data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              {canAddRequirement && (
                <button
                  onClick={() => setShowAddPopup(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg w-full sm:w-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Requirement
                </button>
              )}
            </div>
          </div>
          
          {/* Cache status indicator */}
          {localStorage.getItem("requirementsCache") && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                ⚡ Cached data (updated {getCacheAge()} ago)
              </span>
            </div>
          )}
        </div>

        {/* Active Filter Badge */}
        {statusFilter && (
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter("")} className="ml-2 hover:text-red-300">✕</button>
            </span>
          </div>
        )}

        {/* Small loading indicator (non-blocking) */}
        {isLoading && requirements.length === 0 && (
          <div className="mb-4 flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2" />
            <p className="text-xs text-gray-400">Loading requirements...</p>
          </div>
        )}

        {/* Stats Cards - Clickable */}
        {!isEmployee && filteredRequirements.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div 
              onClick={() => setStatusFilter("")}
              className={`bg-gray-900 rounded-lg p-4 border border-gray-800 shadow-sm cursor-pointer hover:scale-105 transition-all duration-200 ${
                statusFilter === "" ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
              <p className="text-2xl font-semibold mt-1 text-white">{filteredRequirements.length}</p>
            </div>
            
            <div 
              onClick={() => setStatusFilter("Open")}
              className={`bg-gray-900 rounded-lg p-4 border border-gray-800 shadow-sm cursor-pointer hover:scale-105 transition-all duration-200 ${
                statusFilter === "Open" ? "ring-2 ring-emerald-500" : ""
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">Open</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-400">
                {requirements.filter(r => r.requirementStatus === "Open").length}
              </p>
            </div>
            
            <div 
              onClick={() => setStatusFilter("Close")}
              className={`bg-gray-900 rounded-lg p-4 border border-gray-800 shadow-sm cursor-pointer hover:scale-105 transition-all duration-200 ${
                statusFilter === "Close" ? "ring-2 ring-gray-500" : ""
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">Closed</p>
              <p className="text-2xl font-semibold mt-1 text-gray-400">
                {requirements.filter(r => r.requirementStatus === "Close").length}
              </p>
            </div>
            
            <div 
              onClick={() => setStatusFilter("On Hold")}
              className={`bg-gray-900 rounded-lg p-4 border border-gray-800 shadow-sm cursor-pointer hover:scale-105 transition-all duration-200 ${
                statusFilter === "On Hold" ? "ring-2 ring-amber-500" : ""
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">On Hold</p>
              <p className="text-2xl font-semibold mt-1 text-amber-400">
                {requirements.filter(r => r.requirementStatus === "On Hold").length}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {filteredRequirements.length === 0 && requirements.length === 0 && !isLoading ? (
          <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4 text-gray-600">📋</div>
            <p className="text-gray-400">No requirements found</p>
            {canAddRequirement && (
              <button onClick={() => setShowAddPopup(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm transition-all">
                Add Requirement
              </button>
            )}
          </div>
        ) : filteredRequirements.length === 0 && requirements.length > 0 ? (
          <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4 text-gray-600">🔍</div>
            <p className="text-gray-400">No requirements match your search</p>
            <button onClick={clearSearch} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm transition-all">
              Clear Search
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b border-gray-800">
                  <tr>
                    {isEmployee ? (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Client</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Process</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Req Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Location</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Created By</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200"></th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">#</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Client</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Received</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Agent</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Process</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Designation</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Location</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">No Of Req.</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Drive</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Deadline</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Budget</th>
                        {canViewSensitive && (
                          <>
                            <th className="px-4 py-3 text-left font-medium text-gray-200">Payout</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-200">%</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-200">Files</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Notes</th>
                        {allDynamicFields.map(field => (
                          <th key={field.id} className="px-4 py-3 text-left font-medium text-gray-200">{field.label}</th>
                        ))}
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Created By</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Created At</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-200">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.map((req, index) => {
                    const requirementId = req._id || req.id;
                   const fileUploads = Array.isArray(req.fileUploads) ? req.fileUploads : [];
                    
                    return (
                      <tr key={requirementId} className={`border-b border-gray-800 hover:bg-gray-900/50 transition-colors`}>
                        {isEmployee ? (
                          <>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(req.requirementStatus)}`}>
                                {req.requirementStatus || "Open"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-200">{req.clientName}</td>
                            <td className="px-4 py-3 text-gray-300">{req.process}</td>
                            <td className="px-4 py-3 text-gray-300">
                              {req.requirementReceivedDate ? new Date(req.requirementReceivedDate).toLocaleDateString("en-IN") : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-800">
                                {req.requirementType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-300">{req.clientLocation || "-"}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{req.createdByName || req.createdByEmail || "-"}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => openDetailsModal(req)} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                                View
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-gray-300">{index + 1}</td>
                            <td className="px-4 py-3">
                              {canEditDelete ? (
                                <select
                                  value={req.requirementStatus || "Open"}
                                  onChange={(e) => updateRequirementStatus(requirementId, e.target.value)}
                                  className="bg-gray-800 border border-gray-700 text-gray-100 rounded px-2 py-1 text-sm cursor-pointer"
                                >
                                  <option value="Open">Open</option>
                                  <option value="Close">Close</option>
                                  <option value="On Hold">On Hold</option>
                                </select>
                              ) : (
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(req.requirementStatus)}`}>
                                  {req.requirementStatus || "Open"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-200">{req.clientName}</td>
                            <td className="px-4 py-3 text-gray-300">
                              {req.requirementReceivedDate ? new Date(req.requirementReceivedDate).toLocaleDateString("en-IN") : "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-300">{req.agent}</td>
                            <td className="px-4 py-3 text-gray-300">{req.process}</td>
                            <td className="px-4 py-3 text-gray-300">{req.designationPosition}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-800">
                                {req.requirementType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-300">{req.clientLocation || "-"}</td>
                            <td className="px-4 py-3 text-center text-gray-300">{req.noOfRequirement || "-"}</td>
                            <td className="px-4 py-3 text-gray-300">{formatDateOnly(req.driveDate)}</td>
                            <td className="px-4 py-3 text-gray-300">{formatDateOnly(req.requirementDeadline)}</td>
                            <td className="px-4 py-3 font-medium text-blue-400">{req.budget}</td>
                            {canViewSensitive && (
                              <>
                                <td className="px-4 py-3 text-gray-300">{req.payoutCommissionRs || "-"}</td>
                                <td className="px-4 py-3 text-gray-300">{req.payoutCommissionPercent ? `${req.payoutCommissionPercent}%` : "-"}</td>
                                <td className="px-4 py-3">
                                {Array.isArray(fileUploads) && fileUploads.length > 0 ? (
                                    <button onClick={() => viewAttachments(req)} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                                      {fileUploads.length} file(s)
                                    </button>
                                  ) : "-"}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3">
                              {req.additionalNotes ? (
                                <button onClick={() => { setSelectedNotes(req.additionalNotes); setShowNotesModal(true); }} className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
                                  View
                                </button>
                              ) : "-"}
                            </td>
                            {allDynamicFields.map(field => (
                              <td key={field.id} className="px-4 py-3 text-gray-300">
                                {getDynamicFieldValue(req, field)}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-xs text-gray-400">{req.createdByName || req.createdByEmail || "-"}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{formatDateTime(req.createdAt)}</td>
                            <td className="px-4 py-3">
                              {canEditDelete && (
                                <div className="flex gap-2">
                                  <button onClick={() => startEditRequirement(req)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Edit">✎</button>
                                  <button onClick={() => openDeleteModal(req)} className="text-red-400 hover:text-red-300 transition-colors" title="Delete">🗑</button>
                                </div>
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

      {/* ================== MODALS (unchanged) ================== */}

      {/* Add Requirement Modal */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-start z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-4xl bg-gray-900 rounded-lg shadow-2xl relative border border-blue-900 mt-4">
            <button 
              onClick={() => setShowAddPopup(false)} 
              className="absolute top-3 right-3 z-10 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
            >
              Close
            </button>
            <div className="p-4 sm:p-6 pt-14 max-h-[90vh] overflow-y-auto">
              <RequirementFormPage />
            </div>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {showEditPopup && editFormData && (
        <div className="fixed inset-0 bg-black/95 flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-4xl bg-black rounded-lg shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-800">
            <div className="sticky top-0 bg-black border-b border-gray-800 p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Edit Requirement</h2>
              <button 
                onClick={() => setShowEditPopup(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Client Name *</label>
                  <input
                    type="text"
                    value={editFormData.clientName}
                    onChange={(e) => handleEditInputChange(e, "clientName")}
                    placeholder="Client Name"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Agent *</label>
                  <input
                    type="text"
                    value={editFormData.agent}
                    onChange={(e) => handleEditInputChange(e, "agent")}
                    placeholder="Agent"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Process *</label>
                  <input
                    type="text"
                    value={editFormData.process}
                    onChange={(e) => handleEditInputChange(e, "process")}
                    placeholder="Process"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Designation *</label>
                  <input
                    type="text"
                    value={editFormData.designationPosition}
                    onChange={(e) => handleEditInputChange(e, "designationPosition")}
                    placeholder="Designation"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Requirement Type *</label>
                  <select
                    value={editFormData.requirementType}
                    onChange={(e) => handleEditInputChange(e, "requirementType")}
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Bonanza">Bonanza</option>
                    <option value="Regular">Regular</option>
                    <option value="FLR">FLR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">No of Requirements</label>
                  <input
                    type="number"
                    value={editFormData.noOfRequirement}
                    onChange={(e) => handleEditInputChange(e, "noOfRequirement")}
                    placeholder="No of Requirement"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Requirement Received Date</label>
                  <input
                    type="date"
                    value={editFormData.requirementReceivedDate?.split("T")[0] || editFormData.requirementReceivedDate || ""}
                    onChange={(e) => handleEditInputChange(e, "requirementReceivedDate")}
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Drive Date</label>
                  <input
                    type="date"
                    value={editFormData.driveDate}
                    onChange={(e) => handleEditInputChange(e, "driveDate")}
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Requirement Deadline</label>
                  <input
                    type="date"
                    value={editFormData.requirementDeadline}
                    onChange={(e) => handleEditInputChange(e, "requirementDeadline")}
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Budget *</label>
                  <input
                    type="text"
                    value={editFormData.budget}
                    onChange={(e) => handleEditInputChange(e, "budget")}
                    placeholder="Budget"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Client Location</label>
                  <input
                    type="text"
                    value={editFormData.clientLocation}
                    onChange={(e) => handleEditInputChange(e, "clientLocation")}
                    placeholder="Client Location"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Status</label>
                  <select
                    value={editFormData.requirementStatus}
                    onChange={(e) => handleEditInputChange(e, "requirementStatus")}
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Open">Open</option>
                    <option value="Close">Close</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                {canViewSensitive && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Payout Commission (Rs)</label>
                      <input
                        type="text"
                        value={editFormData.payoutCommissionRs}
                        onChange={(e) => handleEditInputChange(e, "payoutCommissionRs")}
                        placeholder="Payout Commission Rs"
                        className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Payout Commission (%)</label>
                      <input
                        type="text"
                        value={editFormData.payoutCommissionPercent}
                        onChange={(e) => handleEditInputChange(e, "payoutCommissionPercent")}
                        placeholder="Payout Commission %"
                        className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-300">Additional Notes</label>
                  <textarea
                    value={editFormData.additionalNotes}
                    onChange={(e) => handleEditInputChange(e, "additionalNotes")}
                    placeholder="Additional Notes"
                    rows="3"
                    className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {allDynamicFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium mb-1 text-gray-300">{field.label}</label>
                    <input
                      type="text"
                      value={editDynamicFields.find(f => f.id === field.id)?.value || ""}
                      onChange={(e) => setEditDynamicFields(prev => 
                        prev.map(f => f.id === field.id ? { ...f, value: e.target.value } : f)
                      )}
                      placeholder={field.label}
                      className="w-full p-2 border border-gray-700 rounded bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                <button
                  onClick={() => setShowEditPopup(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveEditedRequirement(editingRequirementId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequirement && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Requirement Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-300 transition-colors">✕</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase text-gray-500">Client</p><p className="font-medium text-gray-200">{selectedRequirement.clientName}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Process</p><p className="text-gray-300">{selectedRequirement.process}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Req Received</p><p className="text-gray-300">{selectedRequirement.requirementReceivedDate ? new Date(selectedRequirement.requirementReceivedDate).toLocaleDateString("en-IN") : "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Type</p><p className="text-gray-300">{selectedRequirement.requirementType}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Status</p><p><span className={`inline-flex px-2 py-0.5 rounded text-xs ${getStatusBadgeStyle(selectedRequirement.requirementStatus)}`}>{selectedRequirement.requirementStatus}</span></p></div>
                <div><p className="text-xs uppercase text-gray-500">Agent</p><p className="text-gray-300">{selectedRequirement.agent || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Designation</p><p className="text-gray-300">{selectedRequirement.designationPosition || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Location</p><p className="text-gray-300">{selectedRequirement.clientLocation || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500"># Requirements</p><p className="text-gray-300">{selectedRequirement.noOfRequirement || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Drive Date</p><p className="text-gray-300">{formatDateOnly(selectedRequirement.driveDate)}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Deadline</p><p className="text-gray-300">{formatDateOnly(selectedRequirement.requirementDeadline)}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Budget</p><p className="font-medium text-blue-400">{selectedRequirement.budget}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Created By</p><p className="text-gray-300">{selectedRequirement.createdByName || selectedRequirement.createdByEmail || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Created At</p><p className="text-gray-300">{formatDateTime(selectedRequirement.createdAt)}</p></div>
                {selectedRequirement.additionalNotes && (
                  <div className="col-span-2"><p className="text-xs uppercase text-gray-500 mb-1">Notes</p><div className="p-3 bg-gray-900 rounded text-sm text-gray-300">{selectedRequirement.additionalNotes}</div></div>
                )}
                {selectedRequirement.fileUploads?.length > 0 && (
                  <div className="col-span-2"><p className="text-xs uppercase text-gray-500 mb-1">Attachments</p><div className="space-y-1">{selectedRequirement.fileUploads.map((file, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-gray-900 rounded"><span className="text-sm text-gray-300">{getFileIcon(file.type)} {file.name}</span><button onClick={() => downloadFile(file)} className="text-blue-400 hover:text-blue-300 text-sm">Download</button></div>))}</div></div>
                )}
                {allDynamicFields.map(field => (
                  <div key={field.id}><p className="text-xs uppercase text-gray-500">{field.label}</p><p className="text-gray-300">{getDynamicFieldValue(selectedRequirement, field)}</p></div>
                ))}
              </div>
            </div>
            <div className="flex justify-end p-5 border-t border-gray-800">
              <button onClick={() => setShowDetailsModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && selectedRequirementAttachments && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Attachments</h3>
              <button onClick={() => setShowAttachmentsModal(false)} className="text-gray-400 hover:text-gray-300 transition-colors">✕</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {selectedRequirementAttachments.fileUploads?.length > 0 ? (
                <div className="space-y-2">
                  {selectedRequirementAttachments.fileUploads.map((file, idx) => {
                    const isImage = file.type?.toLowerCase().includes('image');
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-gray-900/50">
                        <div className="flex items-center gap-3"><span className="text-2xl">{getFileIcon(file.type)}</span><span className="text-sm text-gray-300">{file.name}</span></div>
                        <div className="flex gap-2"><button onClick={() => downloadFile(file)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-all">Download</button>{isImage && <button onClick={() => previewImage(file)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-all">Preview</button>}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-center py-12"><div className="text-5xl mb-2">📂</div><p className="text-gray-400">No attachments</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && requirementToDelete && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-800">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Requirement</h3>
              <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete "{requirementToDelete.clientName}"? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDeleteModal(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-all">Cancel</button>
                <button onClick={deleteRequirement} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-all">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg shadow-2xl max-w-lg w-full border border-gray-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="font-semibold text-white">Notes</h3>
              <button onClick={() => setShowNotesModal(false)} className="text-gray-400 hover:text-gray-300 transition-colors">✕</button>
            </div>
            <div className="p-5">
              <div className="p-4 bg-gray-900 rounded text-sm text-gray-300">{selectedNotes}</div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => setShowNotesModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-all">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllRequirements;