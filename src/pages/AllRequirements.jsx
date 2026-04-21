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
    return savedTheme ? savedTheme === "dark" : false; // Default to light mode for professional look
  });

  // Current user and role checks
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";
  const isEmployee = currentUser?.role === "employee";
  const canEditDelete = isAdmin || isManager;
  const canViewSensitive = isAdmin || isManager;

  // ================== PERMISSION-BASED ADD NEW BUTTON ==================
  const canAddRequirement = isAdmin || currentUser?.permissions?.newRequirement === true;

  // Load dynamic fields from /form-fields API
  const loadDynamicFields = async () => {
    try {
      const res = await api.get("/form-fields");
      setAllDynamicFields(res.data);
    } catch (err) {
      console.error("Error loading dynamic fields:", err);
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
      await loadRequirements();
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
      await loadRequirements();
      setEditingRequirementId(null);
      setEditFormData(null);
      setEditDynamicFields([]);
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
    if (req[idKey] !== undefined && req[idKey] !== null && req[idKey] !== "") return req[idKey];
    const labelKey = field.label.replace(/\s+/g, "_").toLowerCase();
    if (req[labelKey] !== undefined && req[labelKey] !== null && req[labelKey] !== "") return req[labelKey];
    return "-";
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Open": return "bg-emerald-100 text-emerald-700";
      case "Close": return "bg-gray-100 text-gray-700";
      case "On Hold": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const openDetailsModal = (req) => {
    setSelectedRequirement(req);
    setShowDetailsModal(true);
  };

  // Professional clean theme
  const themeStyles = {
    background: isDarkMode ? "bg-gray-900" : "bg-gray-50",
    text: isDarkMode ? "text-gray-100" : "text-gray-800",
    secondaryText: isDarkMode ? "text-gray-400" : "text-gray-500",
    card: isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
    input: isDarkMode
      ? "bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
      : "bg-white border-gray-300 text-gray-800 focus:ring-blue-500 focus:border-blue-500",
    tableHeader: isDarkMode ? "bg-gray-700" : "bg-gray-100",
    tableRow: isDarkMode
      ? "border-gray-700 hover:bg-gray-700/50"
      : "border-gray-100 hover:bg-gray-50",
    button: isDarkMode
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-blue-600 hover:bg-blue-700",
    buttonSecondary: isDarkMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600",
    buttonSuccess: isDarkMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700",
    buttonDanger: isDarkMode ? "bg-red-600 hover:bg-red-700" : "bg-red-600 hover:bg-red-700",
    buttonAdd: isDarkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className={themeStyles.secondaryText}>Loading requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.background} ${themeStyles.text}`}>
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Requirements</h1>
              <p className={`text-sm ${themeStyles.secondaryText} mt-1`}>
                {isEmployee ? "View assigned requirements" : "Manage client requirements"}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${themeStyles.input} border rounded-lg pl-10 pr-4 py-2 w-72 text-sm focus:outline-none focus:ring-2`}
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button onClick={clearSearch} className={`${themeStyles.buttonSecondary} text-white px-4 py-2 rounded-lg text-sm`}>
                  Clear
                </button>
              )}
              {canAddRequirement && (
                <button
                  onClick={() => setShowAddPopup(true)}
                  className={`${themeStyles.buttonAdd} text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Requirement
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!isEmployee && filteredRequirements.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className={`${themeStyles.card} rounded-lg p-4 border shadow-sm`}>
              <p className={`text-xs uppercase tracking-wide ${themeStyles.secondaryText}`}>Total</p>
              <p className="text-2xl font-semibold mt-1">{filteredRequirements.length}</p>
            </div>
            <div className={`${themeStyles.card} rounded-lg p-4 border shadow-sm`}>
              <p className={`text-xs uppercase tracking-wide ${themeStyles.secondaryText}`}>Open</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-600">
                {filteredRequirements.filter(r => r.requirementStatus === "Open").length}
              </p>
            </div>
            <div className={`${themeStyles.card} rounded-lg p-4 border shadow-sm`}>
              <p className={`text-xs uppercase tracking-wide ${themeStyles.secondaryText}`}>Closed</p>
              <p className="text-2xl font-semibold mt-1 text-gray-600">
                {filteredRequirements.filter(r => r.requirementStatus === "Close").length}
              </p>
            </div>
            <div className={`${themeStyles.card} rounded-lg p-4 border shadow-sm`}>
              <p className={`text-xs uppercase tracking-wide ${themeStyles.secondaryText}`}>On Hold</p>
              <p className="text-2xl font-semibold mt-1 text-amber-600">
                {filteredRequirements.filter(r => r.requirementStatus === "On Hold").length}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {filteredRequirements.length === 0 ? (
          <div className={`${themeStyles.card} rounded-lg border shadow-sm p-12 text-center`}>
            <div className="text-5xl mb-4 text-gray-400">📋</div>
            <p className={`${themeStyles.secondaryText}`}>No requirements found</p>
            {canAddRequirement && (
              <button onClick={() => setShowAddPopup(true)} className={`mt-4 ${themeStyles.button} text-white px-5 py-2 rounded-lg text-sm`}>
                Add Requirement
              </button>
            )}
          </div>
        ) : (
          <div className={`${themeStyles.card} rounded-lg border shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`${themeStyles.tableHeader}`}>
                  <tr>
                    {isEmployee ? (
                      <>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Client</th>
                        <th className="px-4 py-3 text-left font-medium">Process</th>
                        <th className="px-4 py-3 text-left font-medium">Req Date</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Location</th>
                        <th className="px-4 py-3 text-left font-medium">Created By</th>
                        <th className="px-4 py-3 text-left font-medium"></th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left font-medium">#</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Client</th>
                        <th className="px-4 py-3 text-left font-medium">Received</th>
                        <th className="px-4 py-3 text-left font-medium">Agent</th>
                        <th className="px-4 py-3 text-left font-medium">Process</th>
                        <th className="px-4 py-3 text-left font-medium">Designation</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Location</th>
                        <th className="px-4 py-3 text-left font-medium">No Of Req.</th>
                        <th className="px-4 py-3 text-left font-medium">Drive</th>
                        <th className="px-4 py-3 text-left font-medium">Deadline</th>
                        <th className="px-4 py-3 text-left font-medium">Budget</th>
                        {canViewSensitive && (
                          <>
                            <th className="px-4 py-3 text-left font-medium">Payout</th>
                            <th className="px-4 py-3 text-left font-medium">%</th>
                            <th className="px-4 py-3 text-left font-medium">Files</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-left font-medium">Notes</th>
                        {allDynamicFields.map(field => (
                          <th key={field.id} className="px-4 py-3 text-left font-medium">{field.label}</th>
                        ))}
                        <th className="px-4 py-3 text-left font-medium">Created By</th>
                        <th className="px-4 py-3 text-left font-medium">Created At</th>
                        <th className="px-4 py-3 text-left font-medium">Actions</th>
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
                      <tr key={requirementId} className={`border-b ${themeStyles.border} ${themeStyles.tableRow}`}>
                        {isEmployee ? (
                          <>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(req.requirementStatus)}`}>
                                {req.requirementStatus || "Open"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">{req.clientName}</td>
                            <td className="px-4 py-3">{req.process}</td>
                            <td className="px-4 py-3">
                              {req.requirementReceivedDate ? new Date(req.requirementReceivedDate).toLocaleDateString("en-IN") : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                {req.requirementType}
                              </span>
                            </td>
                            <td className="px-4 py-3">{req.clientLocation || "-"}</td>
                            <td className="px-4 py-3 text-xs">{req.createdByName || req.createdByEmail || "-"}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => openDetailsModal(req)} className="text-blue-600 hover:text-blue-700 text-sm">
                                View
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <select
                                  value={editFormData?.requirementStatus || "Open"}
                                  onChange={(e) => handleEditInputChange(e, "requirementStatus")}
                                  className={`${themeStyles.input} border rounded px-2 py-1 text-sm`}
                                >
                                  <option value="Open">Open</option>
                                  <option value="Close">Close</option>
                                  <option value="On Hold">On Hold</option>
                                </select>
                              ) : canEditDelete ? (
                                <select
                                  value={req.requirementStatus || "Open"}
                                  onChange={(e) => updateRequirementStatus(requirementId, e.target.value)}
                                  className={`${themeStyles.input} border rounded px-2 py-1 text-sm cursor-pointer`}
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
                            <td className="px-4 py-3 font-medium">
                              {isEditing && canEditDelete ? (
                                <input type="text" value={editFormData?.clientName || ""} onChange={(e) => handleEditInputChange(e, "clientName")} className={`${themeStyles.input} border rounded px-2 py-1 w-32`} />
                              ) : (
                                req.clientName
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input type="date" value={editFormData?.requirementReceivedDate || ""} onChange={(e) => handleEditInputChange(e, "requirementReceivedDate")} className={`${themeStyles.input} border rounded px-2 py-1`} />
                              ) : (
                                req.requirementReceivedDate ? new Date(req.requirementReceivedDate).toLocaleDateString("en-IN") : "-"
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input type="text" value={editFormData?.agent || ""} onChange={(e) => handleEditInputChange(e, "agent")} className={`${themeStyles.input} border rounded px-2 py-1 w-28`} />
                              ) : (
                                req.agent
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input type="text" value={editFormData?.process || ""} onChange={(e) => handleEditInputChange(e, "process")} className={`${themeStyles.input} border rounded px-2 py-1 w-28`} />
                              ) : (
                                req.process
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input type="text" value={editFormData?.designationPosition || ""} onChange={(e) => handleEditInputChange(e, "designationPosition")} className={`${themeStyles.input} border rounded px-2 py-1 w-28`} />
                              ) : (
                                req.designationPosition
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <select value={editFormData?.requirementType || ""} onChange={(e) => handleEditInputChange(e, "requirementType")} className={`${themeStyles.input} border rounded px-2 py-1`}>
                                  <option value="">Select</option>
                                  <option value="Bonanza">Bonanza</option>
                                  <option value="Regular">Regular</option>
                                  <option value="FLR">FLR</option>
                                </select>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  {req.requirementType}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <input type="text" value={editFormData?.clientLocation || ""} onChange={(e) => handleEditInputChange(e, "clientLocation")} className={`${themeStyles.input} border rounded px-2 py-1 w-24`} />
                              ) : (
                                req.clientLocation || "-"
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isEditing && canEditDelete ? (
                                <input type="number" value={editFormData?.noOfRequirement || ""} onChange={(e) => handleEditInputChange(e, "noOfRequirement")} className={`${themeStyles.input} border rounded px-2 py-1 w-16 text-center`} />
                              ) : (
                                req.noOfRequirement || "-"
                              )}
                            </td>
                            <td className="px-4 py-3">{formatDateOnly(req.driveDate)}</td>
                            <td className="px-4 py-3">{formatDateOnly(req.requirementDeadline)}</td>
                            <td className="px-4 py-3 font-medium text-blue-600">{req.budget}</td>
                            {canViewSensitive && (
                              <>
                                <td className="px-4 py-3">{req.payoutCommissionRs || "-"}</td>
                                <td className="px-4 py-3">{req.payoutCommissionPercent ? `${req.payoutCommissionPercent}%` : "-"}</td>
                                <td className="px-4 py-3">
                                  {fileUploads.length > 0 ? (
                                    <button onClick={() => viewAttachments(req)} className="text-blue-600 hover:text-blue-700 text-sm">
                                      {fileUploads.length} file(s)
                                    </button>
                                  ) : "-"}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <textarea value={editFormData?.additionalNotes || ""} onChange={(e) => handleEditInputChange(e, "additionalNotes")} className={`${themeStyles.input} border rounded px-2 py-1 w-36 text-xs`} rows={2} />
                              ) : (
                                req.additionalNotes ? (
                                  <button onClick={() => { setSelectedNotes(req.additionalNotes); setShowNotesModal(true); }} className="text-blue-600 text-sm">
                                    View
                                  </button>
                                ) : "-"
                              )}
                            </td>
                            {allDynamicFields.map(field => (
                              <td key={field.id} className="px-4 py-3">
                                {isEditing ? (
                                  <input type="text" value={editDynamicFields.find(f => f.id === field.id)?.value || ""} onChange={(e) => setEditDynamicFields(prev => prev.map(f => f.id === field.id ? { ...f, value: e.target.value } : f))} className={`${themeStyles.input} border rounded px-2 py-1 w-24`} />
                                ) : (
                                  getDynamicFieldValue(req, field)
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-xs">{req.createdByName || req.createdByEmail || "-"}</td>
                            <td className="px-4 py-3 text-xs">{formatDateTime(req.createdAt)}</td>
                            <td className="px-4 py-3">
                              {isEditing && canEditDelete ? (
                                <div className="flex gap-2">
                                  <button onClick={() => saveEditedRequirement(requirementId)} className="text-emerald-600 hover:text-emerald-700" title="Save">✓</button>
                                  <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700" title="Cancel">✗</button>
                                </div>
                              ) : (
                                canEditDelete && (
                                  <div className="flex gap-2">
                                    <button onClick={() => startEditRequirement(req)} className="text-blue-600 hover:text-blue-700" title="Edit">✎</button>
                                    <button onClick={() => openDeleteModal(req)} className="text-red-600 hover:text-red-700" title="Delete">🗑</button>
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

      {/* Add Requirement Modal */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden relative">
          <button 
  onClick={() => setShowAddPopup(false)} 
  className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white rounded text-sm"
>
  Close
</button>
            <div className="h-full overflow-y-auto p-6">
              <RequirementFormPage />
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequirement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden`}>
            <div className={`flex justify-between items-center p-5 border-b ${themeStyles.border}`}>
              <h3 className="text-lg font-semibold">Requirement Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs uppercase text-gray-500">Client</p><p className="font-medium">{selectedRequirement.clientName}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Process</p><p>{selectedRequirement.process}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Req Received</p><p>{selectedRequirement.requirementReceivedDate ? new Date(selectedRequirement.requirementReceivedDate).toLocaleDateString("en-IN") : "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Type</p><p>{selectedRequirement.requirementType}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Status</p><p><span className={`inline-flex px-2 py-0.5 rounded text-xs ${getStatusBadgeStyle(selectedRequirement.requirementStatus)}`}>{selectedRequirement.requirementStatus}</span></p></div>
                <div><p className="text-xs uppercase text-gray-500">Agent</p><p>{selectedRequirement.agent || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Designation</p><p>{selectedRequirement.designationPosition || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Location</p><p>{selectedRequirement.clientLocation || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500"># Requirements</p><p>{selectedRequirement.noOfRequirement || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Drive Date</p><p>{formatDateOnly(selectedRequirement.driveDate)}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Deadline</p><p>{formatDateOnly(selectedRequirement.requirementDeadline)}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Budget</p><p className="font-medium text-blue-600">{selectedRequirement.budget}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Created By</p><p>{selectedRequirement.createdByName || selectedRequirement.createdByEmail || "-"}</p></div>
                <div><p className="text-xs uppercase text-gray-500">Created At</p><p>{formatDateTime(selectedRequirement.createdAt)}</p></div>
                {selectedRequirement.additionalNotes && (
                  <div className="col-span-2"><p className="text-xs uppercase text-gray-500 mb-1">Notes</p><div className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">{selectedRequirement.additionalNotes}</div></div>
                )}
                {selectedRequirement.fileUploads?.length > 0 && (
                  <div className="col-span-2"><p className="text-xs uppercase text-gray-500 mb-1">Attachments</p><div className="space-y-1">{selectedRequirement.fileUploads.map((file, idx) => (<div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"><span className="text-sm">{getFileIcon(file.type)} {file.name}</span><button onClick={() => downloadFile(file)} className="text-blue-600 text-sm">Download</button></div>))}</div></div>
                )}
                {allDynamicFields.map(field => (
                  <div key={field.id}><p className="text-xs uppercase text-gray-500">{field.label}</p><p>{getDynamicFieldValue(selectedRequirement, field)}</p></div>
                ))}
              </div>
            </div>
            <div className="flex justify-end p-5 border-t"><button onClick={() => setShowDetailsModal(false)} className={`${themeStyles.button} text-white px-4 py-2 rounded-lg text-sm`}>Close</button></div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && selectedRequirementAttachments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden`}>
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">Attachments</h3>
              <button onClick={() => setShowAttachmentsModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {selectedRequirementAttachments.fileUploads?.length > 0 ? (
                <div className="space-y-2">
                  {selectedRequirementAttachments.fileUploads.map((file, idx) => {
                    const isImage = file.type?.toLowerCase().includes('image');
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3"><span className="text-2xl">{getFileIcon(file.type)}</span><span className="text-sm">{file.name}</span></div>
                        <div className="flex gap-2"><button onClick={() => downloadFile(file)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Download</button>{isImage && <button onClick={() => previewImage(file)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Preview</button>}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-center py-12"><div className="text-5xl mb-2">📂</div><p>No attachments</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && requirementToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-lg shadow-xl max-w-md w-full p-6`}>
            <div className="text-center"><div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><h3 className="text-lg font-semibold mb-2">Delete Requirement</h3><p className={`text-sm ${themeStyles.secondaryText} mb-6`}>Are you sure you want to delete "{requirementToDelete.clientName}"? This action cannot be undone.</p><div className="flex gap-3 justify-end"><button onClick={() => setShowDeleteModal(false)} className={`${themeStyles.buttonSecondary} text-white px-4 py-2 rounded text-sm`}>Cancel</button><button onClick={deleteRequirement} className={`${themeStyles.buttonDanger} text-white px-4 py-2 rounded text-sm`}>Delete</button></div></div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} rounded-lg shadow-xl max-w-lg w-full`}>
            <div className="flex justify-between items-center p-5 border-b"><h3 className="font-semibold">Notes</h3><button onClick={() => setShowNotesModal(false)} className="text-gray-400">✕</button></div>
            <div className="p-5"><div className={`p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded text-sm`}>{selectedNotes}</div><div className="mt-5 flex justify-end"><button onClick={() => setShowNotesModal(false)} className={`${themeStyles.button} text-white px-4 py-2 rounded text-sm`}>Close</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllRequirements;