import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import CandidateFormPage from "./CandidateDetail";

const AllCandidates = () => {
  const navigate = useNavigate();
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [editCandidate, setEditCandidate] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [activeSection, setActiveSection] = useState("candidate");
  const [activeClientIndex, setActiveClientIndex] = useState(0);
  const [roundDropdown, setRoundDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : false;
  });
  
  // ================== FILTER SIDEBAR STATE ==================
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [filters, setFilters] = useState([
    { id: Date.now(), field: "", operator: "is", value: "", condition: "AND" }
  ]);

  // ================== SORTING STATE ==================
  const [showSort, setShowSort] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // ================== SOURCE DATE RANGE STATE ==================
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [interviewRounds, setInterviewRounds] = useState([]);
  const [clientSections, setClientSections] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [clients, setClients] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    loadData();
    loadDesignations();
    loadClients();
  }, []);

  const canAddCandidate = currentUser?.permissions?.newCandidate === true;

  // ================== FILTER FUNCTIONS ==================
  const addFilter = () => {
    setFilters(prev => [
      ...prev,
      { id: Date.now(), field: "", operator: "is", value: "", condition: "AND" }
    ]);
  };

  const removeFilter = (id) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  const handleFilterChange = (id, field, value) => {
    setFilters(prev =>
      prev.map(f => f.id === id ? { ...f, [field]: value } : f)
    );
  };

  const resetFilters = () => {
    setFilters([{ id: Date.now(), field: "", operator: "is", value: "", condition: "AND" }]);
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSortField("");
    setSortOrder("asc");
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/candidates");
      const candidates = res.data || [];
      setData(candidates);
      localStorage.setItem("candidates", JSON.stringify(candidates));
    } catch (err) {
      console.error("Error loading candidates:", err);
      const stored = localStorage.getItem("candidates");
      if (stored) {
        setData(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadDesignations = async () => {
    try {
      const res = await api.get("/requirements");
      const uniqueDesignations = [
        ...new Set(res.data.map(req => req.designationPosition).filter(Boolean))
      ];
      setDesignationOptions(uniqueDesignations);
      localStorage.setItem("designations", JSON.stringify(uniqueDesignations));
    } catch (error) {
      console.error("Error loading designations:", error);
      const stored = localStorage.getItem("designations");
      if (stored) {
        setDesignationOptions(JSON.parse(stored));
      }
    }
  };

  const loadClients = async () => {
    try {
      const res = await api.get("/clients");
      let clientsData = [];
      
      if (Array.isArray(res.data)) {
        clientsData = res.data;
      } else if (Array.isArray(res.data.data)) {
        clientsData = res.data.data;
      } else if (Array.isArray(res.data.clients)) {
        clientsData = res.data.clients;
      }
      
      setClients(clientsData);
      localStorage.setItem("clients", JSON.stringify(clientsData));
    } catch (err) {
      console.error("Error loading clients:", err);
      const stored = localStorage.getItem("clients");
      if (stored) {
        setClients(JSON.parse(stored));
      }
    }
  };

  // ================== GET FIELD VALUE ==================
 const getFieldValue = (candidate, field) => {
  switch (field) {
    case "name":
      return `${candidate.firstName} ${candidate.lastName}`.trim();

    case "email":
      return candidate.email || "";

    case "phone":
      return candidate.phone || "";

    case "secondaryPhone":
      return candidate.secondaryPhone || "";

    case "recruiter":
      return candidate.recruiter || "";

    case "source":
      return candidate.sourcedFrom || candidate.source || "";

    case "sourceDate":
      return candidate.sourceDate
        ? new Date(candidate.sourceDate).toISOString().split("T")[0]
        : "";

    case "gender":
      return candidate.gender || "";

    case "city":
      return candidate.city || "";

    case "state":
      return candidate.state || "";

    case "country":
      return candidate.country || "";

    case "createdByName":
      return candidate.createdByName || "";

    case "createdAt":
      return candidate.createdAt
        ? new Date(candidate.createdAt).toISOString().split("T")[0]
        : "";

    default:
      return "";
  }
};

  // ================== FILTERED DATA WITH AND/OR LOGIC ==================
  const applyFilters = (candidatesData) => {
    return candidatesData.filter((candidate) => {
      // First apply search term filter
      if (searchTerm.trim() !== "") {
        const searchString = searchTerm.toLowerCase();
        const matchesSearch = (
          `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchString) ||
          candidate.email?.toLowerCase().includes(searchString) ||
          candidate.phone?.toLowerCase().includes(searchString) ||
          candidate.recruiter?.toLowerCase().includes(searchString) ||
          candidate.sourcedFrom?.toLowerCase().includes(searchString) ||
          candidate.source?.toLowerCase().includes(searchString) ||
          candidate.city?.toLowerCase().includes(searchString)
        );
        if (!matchesSearch) return false;
      }

      // Apply source date range filter
      if (startDate && endDate && candidate.sourceDate) {
        const sourceDate = new Date(candidate.sourceDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (sourceDate < start || sourceDate > end) return false;
      }

      // Apply filter conditions with AND/OR logic
      let result = null;
      
      for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        
        // Skip empty filters
        if (!filter.field || !filter.value) continue;
        
        const fieldValue = getFieldValue(candidate, filter.field);
        if (fieldValue === undefined || fieldValue === null) continue;
        
        const fieldValueStr = fieldValue.toString().toLowerCase();
        const filterValueStr = filter.value.toString().toLowerCase();
        
       const match = fieldValueStr.includes(filterValueStr);
        
        if (result === null) {
          result = match;
        } else {
          if (filter.condition === "AND") {
            result = result && match;
          } else {
            result = result || match;
          }
        }
      }
      
      return result !== null ? result : true;
    });
  };

  const filteredData = applyFilters(data);

  // ================== SORTING FUNCTION ==================
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = "";
    let bVal = "";
    
    // Handle special fields
    if (sortField === "name") {
      aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
      bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
    } else if (sortField === "createdAt") {
      aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    } else if (sortField === "sourceDate") {
      aVal = a.sourceDate ? new Date(a.sourceDate).getTime() : 0;
      bVal = b.sourceDate ? new Date(b.sourceDate).getTime() : 0;
    } else {
      aVal = (a[sortField] || "").toString().toLowerCase();
      bVal = (b[sortField] || "").toString().toLowerCase();
    }
    
    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const addClientSection = () => {
    if (clientSections.length >= 5) {
      alert("Maximum 5 client sections allowed");
      return;
    }
    
    const newSection = {
      id: Date.now(),
      clientName: "",
      designation: "",
      clientLocation: "",
      process: "",
      processLOB: "",
      salary: "",
      hrRemark: ""
    };
    
    setClientSections(prev => {
      const updated = [...prev, newSection];
      setActiveClientIndex(updated.length - 1);
      return updated;
    });
    
    setActiveSection("clientInterview");
  };

  const removeClientSection = (sectionId) => {
    const newSections = clientSections.filter(s => s.id !== sectionId);
    setClientSections(newSections);
    
    if (activeClientIndex >= newSections.length) {
      setActiveClientIndex(Math.max(0, newSections.length - 1));
    }
    
    if (newSections.length === 0) {
      setActiveSection("candidate");
    }
  };

  const updateClientSectionField = (sectionId, field, value) => {
    setClientSections(prev => prev.map(section =>
      section.id === sectionId ? { ...section, [field]: value } : section
    ));
  };

  const handleEdit = (candidate) => {
    setEditCandidate({
      ...candidate,
      status: candidate.status || "",
      remark: candidate.remark || "",
    });
    setInterviewRounds(candidate.interviewRounds || []);
    
    if (candidate.clientSections && candidate.clientSections.length > 0) {
      setClientSections(candidate.clientSections.map((cs, idx) => ({ 
        ...cs, 
        id: cs.id || Date.now() + idx 
      })));
      setActiveClientIndex(0);
    } else {
      setClientSections([{
        id: Date.now(),
        clientName: candidate.clientName || "",
        designation: candidate.designation || "",
        clientLocation: candidate.clientLocation || "",
        process: candidate.process || "",
        processLOB: candidate.processLOB || "",
        salary: candidate.salary || "",
        hrRemark: candidate.hrRemark || ""
      }]);
      setActiveClientIndex(0);
    }
    
    setNewFiles([]);
    setActiveSection("candidate");
    setRoundDropdown(false);
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${name}?`);
    if (!confirmDelete) return;

    try {
      await api.delete(`/delete-candidate/${id}`);
      const updatedData = data.filter(c => c._id !== id);
      setData(updatedData);
      localStorage.setItem("candidates", JSON.stringify(updatedData));
      alert("Candidate deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Delete failed. Please try again.");
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveEdit = async () => {
    if (!editCandidate) return;
    
    try {
      const newAttachments = [];
      for (const file of newFiles) {
        const base64Data = await fileToBase64(file);
        newAttachments.push({
          id: `${Date.now()}-${Math.random()}-${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          data: base64Data
        });
      }
      
      const allAttachments = [...(editCandidate.attachments || []), ...newAttachments];
      
      const updateData = {
        ...editCandidate,
        attachments: allAttachments,
        interviewRounds: interviewRounds,
        clientSections: clientSections,
        updatedAt: new Date().toISOString()
      };
      
      await api.put(`/update-candidate/${editCandidate._id}`, updateData);
      
      const updatedData = data.map(c => 
        c._id === editCandidate._id ? updateData : c
      );
      setData(updatedData);
      localStorage.setItem("candidates", JSON.stringify(updatedData));
      
      alert("Candidate updated successfully!");
      setEditCandidate(null);
      setNewFiles([]);
      setInterviewRounds([]);
      setClientSections([]);
      setActiveClientIndex(0);
    } catch (err) {
      console.error("Save error:", err);
      alert("Update failed. Please try again.");
    }
  };

  const handleResetForm = () => {
    if (!editCandidate) return;
    const confirmReset = window.confirm("Reset all unsaved changes?");
    if (!confirmReset) return;
    
    setEditCandidate({
      ...editCandidate,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      secondaryPhone: "",
      gender: "",
      city: "",
      state: "",
      country: "",
      recruiter: "",
      sourcedFrom: "",
      sourceDate: "",
      qualification: "",
      totalExperience: "",
      currentCTC: "",
      expectedCTC: "",
      noticePeriod: "",
      resume: "",
      status: "",
      remark: "",
    });
    setInterviewRounds([]);
    setClientSections([{
      id: Date.now(),
      clientName: "",
      designation: "",
      clientLocation: "",
      process: "",
      processLOB: "",
      salary: "",
      hrRemark: ""
    }]);
    setActiveClientIndex(0);
    setNewFiles([]);
    setRoundDropdown(false);
  };

  const selectRound = (round) => {
    const newRound = {
      id: Date.now(),
      roundName: `Round ${round}`,
      interviewDate: "",
      interviewTime: "",
      hrStatus: "",
      interviewMode: "",
      hrRemark: "",
      finalFeedback: ""
    };
    setInterviewRounds(prev => [...prev, newRound]);
    setRoundDropdown(false);
  };

  const removeRound = (roundId) => {
    setInterviewRounds(prev => prev.filter(round => round.id !== roundId));
  };

  const updateRoundField = (roundId, field, value) => {
    setInterviewRounds(prev => prev.map(round => 
      round.id === roundId ? { ...round, [field]: value } : round
    ));
  };

  const removeExistingFile = (fileIndex) => {
    const updatedAttachments = [...(editCandidate.attachments || [])];
    updatedAttachments.splice(fileIndex, 1);
    setEditCandidate({ ...editCandidate, attachments: updatedAttachments });
  };

  const removeNewFile = (fileIndex) => {
    const updatedNewFiles = [...newFiles];
    updatedNewFiles.splice(fileIndex, 1);
    setNewFiles(updatedNewFiles);
  };

  const downloadFile = (file) => {
    try {
      const link = document.createElement("a");
      if (file.data) {
        if (file.data.startsWith("data:")) {
          link.href = file.data;
        } else {
          const mimeType = file.type || "application/octet-stream";
          link.href = `data:${mimeType};base64,${file.data}`;
        }
      } else if (file.url) {
        link.href = file.url;
      } else {
        alert("Download not available");
        return;
      }
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    }
  };

  const previewFileHandler = (file) => {
    try {
      let fileUrl = null;
      if (file.data) {
        if (file.data.startsWith("data:")) {
          fileUrl = file.data;
        } else {
          const mimeType = file.type || "application/octet-stream";
          fileUrl = `data:${mimeType};base64,${file.data}`;
        }
      }
      if (!fileUrl) {
        alert("Preview not available");
        return;
      }
      const isImage = file.type?.toLowerCase().includes("image") ||
        file.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);
      const isPdf = file.type?.toLowerCase().includes("pdf") ||
        file.name?.toLowerCase().endsWith(".pdf");
      if (isImage) {
        setPreviewImage({ url: fileUrl, name: file.name });
      } else if (isPdf) {
        const newWindow = window.open();
        if (!newWindow) {
          alert("Popup blocked! Please allow popups.");
          return;
        }
        newWindow.document.write(`
          <html>
            <head><title>PDF Preview</title></head>
            <body style="margin:0">
              <iframe src="${fileUrl}" width="100%" height="100%" style="border:none;"></iframe>
            </body>
          </html>
        `);
      } else {
        alert("Preview not supported");
      }
    } catch (error) {
      console.error("Preview error:", error);
      alert("Failed to preview file");
    }
  };

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

  const getFileIcon = (fileType, fileName) => {
    const type = fileType?.toLowerCase() || '';
    const name = fileName?.toLowerCase() || '';
    if (type.includes("pdf") || name.endsWith('.pdf')) return "📕";
    if (type.includes("image") || name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return "🖼️";
    if (type.includes("word") || type.includes("document") || name.endsWith('.docx') || name.endsWith('.doc')) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet") || name.endsWith('.xlsx') || name.endsWith('.xls')) return "📊";
    if (type.includes("text") || name.endsWith('.txt')) return "📄";
    return "📎";
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleEditChange = (field, value) => {
    setEditCandidate(prev => ({ ...prev, [field]: value }));
  };

  const qualificationOptions = [
    "10th Pass", "12th Pass", "Diploma", "Graduate", "Post Graduate",
    "MBA", "BCA", "MCA", "B.Tech", "M.Tech", "PhD", "Other"
  ];

  const renderFormSection = () => {
    switch(activeSection) {
      case "candidate":
        return (
          <div className="space-y-6">
            <div className={`${themeStyles.card} rounded-lg p-5 border shadow-sm`}>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">👤 Basic Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>First Name *</label>
                  <input type="text" value={editCandidate.firstName || ""} onChange={(e) => handleEditChange("firstName", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Last Name</label>
                  <input type="text" value={editCandidate.lastName || ""} onChange={(e) => handleEditChange("lastName", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Email *</label>
                  <input type="email" value={editCandidate.email || ""} onChange={(e) => handleEditChange("email", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Phone *</label>
                  <input type="text" value={editCandidate.phone || ""} onChange={(e) => handleEditChange("phone", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Secondary Phone</label>
                  <input type="text" value={editCandidate.secondaryPhone || ""} onChange={(e) => handleEditChange("secondaryPhone", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Gender</label>
                  <select value={editCandidate.gender || ""} onChange={(e) => handleEditChange("gender", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`}>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={`${themeStyles.card} rounded-lg p-5 border shadow-sm`}>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">📍 Contact & Location</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>City</label>
                  <input type="text" value={editCandidate.city || ""} onChange={(e) => handleEditChange("city", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>State</label>
                  <input type="text" value={editCandidate.state || ""} onChange={(e) => handleEditChange("state", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Country</label>
                  <input type="text" value={editCandidate.country || ""} onChange={(e) => handleEditChange("country", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Recruiter</label>
                  <input type="text" value={editCandidate.recruiter || ""} onChange={(e) => handleEditChange("recruiter", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Sourced From</label>
                  <input type="text" value={editCandidate.sourcedFrom || ""} onChange={(e) => handleEditChange("sourcedFrom", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Source Date</label>
                  <input type="date" value={editCandidate.sourceDate ? editCandidate.sourceDate.split("T")[0] : ""} onChange={(e) => handleEditChange("sourceDate", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
              </div>
            </div>

            <div className={`${themeStyles.card} rounded-lg p-5 border shadow-sm`}>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">📄 Professional Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Qualification</label>
                  <select value={editCandidate.qualification || ""} onChange={(e) => handleEditChange("qualification", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`}>
                    <option value="">Select Qualification</option>
                    {qualificationOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Total Experience</label>
                  <input type="text" value={editCandidate.totalExperience || ""} onChange={(e) => handleEditChange("totalExperience", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="e.g., 2 years 6 months" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Current CTC</label>
                  <input type="text" value={editCandidate.currentCTC || ""} onChange={(e) => handleEditChange("currentCTC", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="₹ X.XX LPA" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Expected CTC</label>
                  <input type="text" value={editCandidate.expectedCTC || ""} onChange={(e) => handleEditChange("expectedCTC", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="₹ X.XX LPA" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Notice Period</label>
                  <input type="text" value={editCandidate.noticePeriod || ""} onChange={(e) => handleEditChange("noticePeriod", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="e.g., 15 days" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Resume Link</label>
                  <input type="url" value={editCandidate.resume || ""} onChange={(e) => handleEditChange("resume", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="https://..." />
                </div>
              </div>
            </div>
          </div>
        );
      case "remarks":
        return (
          <div className="space-y-6">
            <div className={`${themeStyles.card} rounded-lg p-5 border shadow-sm`}>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">📝 Recruiter Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Status</label>
                  <select
                    value={editCandidate.status || ""}
                    onChange={(e) => handleEditChange("status", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                  >
                    <option value="">Select Status</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Pending</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Remark</label>
                  <textarea
                    rows="4"
                    value={editCandidate.remark || ""}
                    onChange={(e) => handleEditChange("remark", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                    placeholder="Enter remarks..."
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case "clientInterview":
        const currentSection = clientSections[activeClientIndex];
        
        if (!currentSection) {
          return (
            <div className="text-center py-12">
              <p className="text-gray-500">No client section selected. Please add a client.</p>
            </div>
          );
        }
        
        return (
          <div className="space-y-6">
            <div className={`${themeStyles.card} rounded-lg p-5 border shadow-sm`}>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                🏢 Client & Interview {activeClientIndex + 1}
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Client Name</label>
                  <select
                    value={currentSection.clientName}
                    onChange={(e) => updateClientSectionField(currentSection.id, "clientName", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c._id || c.id} value={c.clientName || c.name}>
                        {c.clientName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Designation</label>
                  <select
                    value={currentSection.designation}
                    onChange={(e) => updateClientSectionField(currentSection.id, "designation", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                  >
                    <option value="">Select Designation</option>
                    {designationOptions.map((d, i) => (<option key={i} value={d}>{d}</option>))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Client Location</label>
                  <input
                    value={currentSection.clientLocation}
                    onChange={(e) => updateClientSectionField(currentSection.id, "clientLocation", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                    placeholder="Enter client location"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Process Aligned</label>
                  <input
                    value={currentSection.process}
                    onChange={(e) => updateClientSectionField(currentSection.id, "process", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                    placeholder="Enter process"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Process LOB</label>
                  <input
                    value={currentSection.processLOB}
                    onChange={(e) => updateClientSectionField(currentSection.id, "processLOB", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                    placeholder="Enter process LOB"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Salary Offered</label>
                  <input
                    value={currentSection.salary}
                    onChange={(e) => updateClientSectionField(currentSection.id, "salary", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                    placeholder="Enter salary offered"
                  />
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Remark</label>
                  <textarea
                    rows="3"
                    value={currentSection.hrRemark}
                    onChange={(e) => updateClientSectionField(currentSection.id, "hrRemark", e.target.value)}
                    className={`${themeStyles.input} border rounded-lg p-2 w-full`}
                    placeholder="Enter remarks..."
                  />
                </div>
              </div>
            </div>

            <div className={`${themeStyles.card} rounded-lg p-5 border shadow-sm`}>
              <div className="flex justify-between items-center mb-4 relative">
                <h4 className="text-sm font-semibold flex items-center gap-2">🎤 Interview Rounds</h4>
                <div className="relative inline-block">
                  <button
                    onClick={() => setRoundDropdown(!roundDropdown)}
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    + Add Round
                  </button>
                  {roundDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-[99998]"
                        onClick={() => setRoundDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-[99999]">
                        {[1, 2, 3, 4, 5].map((round) => (
                          <div
                            key={round}
                            onClick={() => selectRound(round)}
                            className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                          >
                            Round {round}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {interviewRounds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No interview rounds added.</p>
                  <p className="text-xs mt-1">Click "+ Add Round" to add rounds.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviewRounds.map((round, idx) => (
                    <div key={round.id} className={`p-4 rounded-lg border ${themeStyles.border}`}>
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-sm font-semibold text-blue-600">{round.roundName}</h5>
                        <button onClick={() => removeRound(round.id)} className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded">Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-xs block mb-1 ${themeStyles.secondaryText}`}>Interview Date</label>
                          <input type="date" value={round.interviewDate} onChange={(e) => updateRoundField(round.id, "interviewDate", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full text-sm`} />
                        </div>
                        <div>
                          <label className={`text-xs block mb-1 ${themeStyles.secondaryText}`}>Interview Time</label>
                          <input type="time" value={round.interviewTime} onChange={(e) => updateRoundField(round.id, "interviewTime", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full text-sm`} />
                        </div>
                        <div>
                          <label className={`text-xs block mb-1 ${themeStyles.secondaryText}`}>Status</label>
                          <select value={round.hrStatus} onChange={(e) => updateRoundField(round.id, "hrStatus", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full text-sm`}>
                            <option value="">Select Status</option>
                            <option value="Selected">Selected</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Pending">Pending</option>
                            <option value="On Hold">On Hold</option>
                          </select>
                        </div>
                        <div>
                          <label className={`text-xs block mb-1 ${themeStyles.secondaryText}`}>Interview Mode</label>
                          <select value={round.interviewMode} onChange={(e) => updateRoundField(round.id, "interviewMode", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full text-sm`}>
                            <option value="">Select Mode</option>
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                            <option value="Telephonic">Telephonic</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className={`text-xs block mb-1 ${themeStyles.secondaryText}`}>Remark</label>
                          <textarea rows="2" value={round.hrRemark} onChange={(e) => updateRoundField(round.id, "hrRemark", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full text-sm`} placeholder="Enter remarks..." />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-xs block mb-1 ${themeStyles.secondaryText}`}>Final Feedback</label>
                          <textarea rows="2" value={round.finalFeedback} onChange={(e) => updateRoundField(round.id, "finalFeedback", e.target.value)} className={`${themeStyles.input} border rounded-lg p-2 w-full text-sm`} placeholder="Enter final feedback..." />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`${themeStyles.card} rounded-lg p-5 border shadow-sm`}>
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">📎 Attachments</h4>
              
              {editCandidate.attachments && editCandidate.attachments.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-semibold mb-2">Existing Files ({editCandidate.attachments.length})</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editCandidate.attachments.map((file, idx) => (
                      <div key={file.id || idx} className={`flex items-center justify-between p-2 rounded-lg border ${themeStyles.border}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{getFileIcon(file.type, file.name)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.name}</p>
                            <p className={`text-xs ${themeStyles.secondaryText}`}>{file.size ? formatFileSize(file.size) : "Unknown"}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => previewFileHandler(file)} className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded">Preview</button>
                          <button onClick={() => downloadFile(file)} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded">Download</button>
                          <button onClick={() => removeExistingFile(idx)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeStyles.secondaryText}`}>Upload New Files</label>
                <input type="file" multiple accept=".pdf,.doc,.docx,.txt,image/*" onChange={(e) => setNewFiles([...newFiles, ...Array.from(e.target.files)])} className={`${themeStyles.input} border rounded-lg p-2 w-full`} />
                <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>Max 3MB per file. Supported: PDF, DOC, DOCX, TXT, Images</p>
              </div>

              {newFiles.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-2">New Files ({newFiles.length})</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {newFiles.map((file, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${themeStyles.border} bg-blue-50 dark:bg-blue-900/20`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{getFileIcon(file.type, file.name)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.name}</p>
                            <p className={`text-xs ${themeStyles.secondaryText}`}>{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button onClick={() => removeNewFile(idx)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${themeStyles.background} ${themeStyles.text} transition-colors duration-200`}>
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold">Candidates</h1>
              <p className={`text-sm ${themeStyles.secondaryText} mt-1`}>
                Total {sortedData.length} candidate(s) found
              </p>
            </div>
            <div className="flex gap-3">
              {canAddCandidate && (
                <button
                  onClick={() => setShowAddPopup(true)}
                  className={`${themeStyles.buttonAdd} text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Candidate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search + Filter + Sort */}
        <div className="mb-4 flex items-center justify-between gap-3">
          {/* LEFT SIDE - Filter Button & Search */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowFilterSidebar(true)}
              className="px-4 py-2 rounded-lg text-white bg-gray-500 hover:bg-gray-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>
            <input
              type="text"
              placeholder="Search by name, email, phone, recruiter, source, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${themeStyles.input} border rounded-lg px-4 py-2 w-full max-w-md`}
            />
          </div>
          
          {/* RIGHT SIDE - Sort Button */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort
            </button>
            
           {/* Sort Dropdown */}
{showSort && (
  <>
    {/* Overlay */}
    <div
      className="fixed inset-0 z-[9998]"
      onClick={() => setShowSort(false)}
    />

    {/* Dropdown */}
    <div className="absolute right-0 mt-2 w-56 bg-black text-white rounded-lg shadow-xl border border-gray-700 z-[9999] overflow-hidden">

      {/* SORT BY */}
      <div className="p-2 border-b border-gray-700">
        <p className="text-xs font-semibold text-gray-400 px-2 mb-1">
          Sort By
        </p>

        {/* NAME */}
        <button
          onClick={() => {
            setSortField("name");
            setShowSort(false);
          }}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
            sortField === "name"
              ? "bg-white text-black font-medium"
              : "hover:bg-gray-800"
          }`}
        >
           Name
        </button>

        {/* CREATED DATE */}
        <button
          onClick={() => {
            setSortField("createdAt");
            setShowSort(false);
          }}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
            sortField === "createdAt"
              ? "bg-white text-black font-medium"
              : "hover:bg-gray-800"
          }`}
        >
          Created Date
        </button>

        {/* SOURCE DATE */}
        <button
          onClick={() => {
            setSortField("sourceDate");
            setShowSort(false);
          }}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
            sortField === "sourceDate"
              ? "bg-white text-black font-medium"
              : "hover:bg-gray-800"
          }`}
        >
           Source Date
        </button>

        {/* CITY */}
        <button
          onClick={() => {
            setSortField("city");
            setShowSort(false);
          }}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
            sortField === "city"
              ? "bg-white text-black font-medium"
              : "hover:bg-gray-800"
          }`}
        >
           City
        </button>
      </div>

      {/* ORDER */}
      <div className="p-2">
        <p className="text-xs font-semibold text-gray-400 px-2 mb-1">
          Order
        </p>

        {/* ASC */}
        <button
          onClick={() => {
            setSortOrder("asc");
            setShowSort(false);
          }}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
            sortOrder === "asc"
              ? "bg-white text-black font-medium"
              : "hover:bg-gray-800"
          }`}
        >
          🔼 Ascending (A → Z)
        </button>

        {/* DESC */}
        <button
          onClick={() => {
            setSortOrder("desc");
            setShowSort(false);
          }}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
            sortOrder === "desc"
              ? "bg-white text-black font-medium"
              : "hover:bg-gray-800"
          }`}
        >
          🔽 Descending (Z → A)
        </button>
      </div>

      {/* CLEAR SORT */}
      {sortField && (
        <div className="p-2 border-t border-gray-700">
          <button
            onClick={() => {
              setSortField("");
              setSortOrder("asc");
              setShowSort(false);
            }}
            className="w-full text-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 rounded-md transition-all"
          >
            ✖ Clear Sort
          </button>
        </div>
      )}
    </div>
  </>
)}
          </div>
        </div>

        {/* Active Filters Display */}
        {filters.some(f => f.field && f.value) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              filter.field && filter.value && (
                <span key={filter.id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  {filter.field}: Is "{filter.value}" {filter.condition === "OR" && "(OR)"}
                </span>
              )
            ))}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                Source Date: {startDate || "any"} → {endDate || "any"}
              </span>
            )}
            <button onClick={resetFilters} className="text-red-500 text-xs hover:underline">Clear all</button>
          </div>
        )}

        {/* Active Sort Display */}
        {sortField && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs">
              Sorting by: {sortField} ({sortOrder === "asc" ? "Ascending" : "Descending"})
            </span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="min-w-[1500px] w-full text-sm">
            <thead className={`${themeStyles.tableHeader} white dark:text-gray-200`}>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-all" onClick={() => {
                  if (sortField === "name") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("name");
                    setSortOrder("asc");
                  }
                }}>
                  Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Secondary</th>
                <th className="px-4 py-3 text-left font-medium">Recruiter</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-all" onClick={() => {
                  if (sortField === "sourceDate") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("sourceDate");
                    setSortOrder("asc");
                  }
                }}>
                  Source Date {sortField === "sourceDate" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-left font-medium">Gender</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-all" onClick={() => {
                  if (sortField === "city") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("city");
                    setSortOrder("asc");
                  }
                }}>
                  City {sortField === "city" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-left font-medium">State</th>
                <th className="px-4 py-3 text-left font-medium">Country</th>
                <th className="px-4 py-3 text-left font-medium">Files</th>
                <th className="px-4 py-3 text-left font-medium">Created By</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-all" onClick={() => {
                  if (sortField === "createdAt") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("createdAt");
                    setSortOrder("asc");
                  }
                }}>
                  Created At {sortField === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
               </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="16" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      <p className={themeStyles.secondaryText}>Loading candidates...</p>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan="16" className="text-center py-12">
                    <div className="text-5xl mb-2 text-gray-400">📭</div>
                    <p className={themeStyles.secondaryText}>No candidates found</p>
                    {canAddCandidate && !searchTerm && (
                      <button onClick={() => setShowAddPopup(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                        + Add Candidate
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                sortedData.map((c, index) => (
                  <tr key={c._id} className={`border-b ${themeStyles.tableRow} ${index % 2 === 0 ? (isDarkMode ? "bg-gray-800/30" : "bg-gray-50/50") : ""}`}>
                    <td className="px-4 py-3 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="px-4 py-3"><a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a></td>
                    <td className="px-4 py-3"><a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a></td>
                    <td className="px-4 py-3">{c.secondaryPhone || "—"}</td>
                    <td className="px-4 py-3">{c.recruiter || "—"}</td>
                    <td className="px-4 py-3">{c.sourcedFrom ? <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">{c.sourcedFrom}</span> : "—"}</td>
                    <td className="px-4 py-3">{c.sourceDate ? new Date(c.sourceDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">{c.gender ? <span className="capitalize">{c.gender === "male" ? "Male" : c.gender === "female" ? "Female" : c.gender}</span> : "—"}</td>
                    <td className="px-4 py-3">{c.city || "—"}</td>
                    <td className="px-4 py-3">{c.state || "—"}</td>
                    <td className="px-4 py-3">{c.country || "—"}</td>
                    <td className="px-4 py-3">
                      {c.attachments && c.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-green-600 text-xs font-medium">{c.attachments.length} file(s)</span>
                          <div className="flex gap-1">
                            {c.attachments.slice(0, 2).map((file, i) => (
                              <div key={file.id || i} className="flex gap-1">
                                <button onClick={() => downloadFile(file)} className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded" title="Download">⬇️</button>
                                <button onClick={() => previewFileHandler(file)} className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded" title="Preview">👁️</button>
                              </div>
                            ))}
                            {c.attachments.length > 2 && <span className="text-xs text-gray-500">+{c.attachments.length - 2}</span>}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{c.createdByName || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.createdAt ? (
                        <div>
                          <div>{new Date(c.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs opacity-70">{new Date(c.createdAt).toLocaleTimeString()}</div>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleEdit(c)} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs">Edit</button>
                        <button onClick={() => handleDelete(c._id, `${c.firstName} ${c.lastName}`)} className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && sortedData.length > 0 && (
          <div className={`mt-4 text-sm ${themeStyles.secondaryText} text-right`}>
            Showing {sortedData.length} of {data.length} candidate(s)
          </div>
        )}
      </div>

      {/* ================== ATS STYLE FILTER SIDEBAR ================== */}
      

         
{showFilterSidebar && (
  <div className="fixed inset-0 z-50 flex">

    {/* Overlay */}
    <div
      className="flex-1 bg-black/60"
      onClick={() => setShowFilterSidebar(false)}
    />

    {/* Sidebar */}
    <div className="w-[450px] bg-black text-white shadow-2xl p-5 overflow-y-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-200">
          Filter Candidates
        </h2>
        <button
          onClick={() => setShowFilterSidebar(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* ================= SOURCE DATE RANGE ================= */}
      <div className="mb-6 p-4 border border-gray-700 rounded-lg bg-black">
        <h3 className="text-sm font-semibold mb-3 text-gray-300">
          Source Date Range
        </h3>

        <div className="grid grid-cols-2 gap-3">

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-600 bg-gray-900 text-white rounded-lg p-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-600 bg-gray-900 text-white rounded-lg p-2 w-full text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

        </div>

        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="mt-3 text-xs text-red-400 hover:text-red-500"
          >
            ✖ Clear date range
          </button>
        )}
      </div>

      {/* ================= FILTER CONDITIONS ================= */}
      {filters.map((filter, idx) => (
        <div
          key={filter.id}
          className="mb-4 p-4 border border-gray-700 rounded-lg bg-black"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-400">
              Filter Condition {idx + 1}
            </span>

            {filters.length > 1 && (
              <button
                onClick={() => removeFilter(filter.id)}
                className="text-red-400 hover:text-red-500 text-sm"
              >
                Remove
              </button>
            )}
          </div>

          {/* AND / OR */}
          {idx > 0 && (
            <select
              value={filter.condition}
              onChange={(e) =>
                handleFilterChange(filter.id, "condition", e.target.value)
              }
              className="border border-gray-600 bg-gray-900 text-white rounded-lg p-2 w-full mb-2 text-sm"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          )}

          {/* FIELD */}
          <select
            value={filter.field}
            onChange={(e) =>
              handleFilterChange(filter.id, "field", e.target.value)
            }
            className="border border-gray-600 bg-gray-900 text-white rounded-lg p-2 w-full mb-2 text-sm"
          >
           <option value="">Select Field</option>
<option value="name">Name</option>
<option value="email">Email</option>
<option value="phone">Phone</option>
<option value="secondaryPhone">Secondary</option>
<option value="recruiter">Recruiter</option>
<option value="source">Source</option>
<option value="sourceDate">Source Date</option>
<option value="gender">Gender</option>
<option value="city">City</option>
<option value="state">State</option>
<option value="country">Country</option>
<option value="createdByName">Created By</option>
<option value="createdAt">Created At</option>
          </select>

          {/* VALUE */}
          {filter.field === "status" ? (
            <select
              value={filter.value}
              onChange={(e) =>
                handleFilterChange(filter.id, "value", e.target.value)
              }
              className="border border-gray-600 bg-gray-900 text-white rounded-lg p-2 w-full text-sm"
            >
              <option value="">Select Status</option>
              <option value="Selected">Selected</option>
              <option value="Rejected">Rejected</option>
              <option value="Pending">Pending</option>
              <option value="On Hold">On Hold</option>
            </select>
          ) : (
            <input
              type="text"
              placeholder="Enter value"
              value={filter.value}
              onChange={(e) =>
                handleFilterChange(filter.id, "value", e.target.value)
              }
              className="border border-gray-600 bg-gray-900 text-white rounded-lg p-2 w-full text-sm placeholder-gray-400"
            />
          )}
        </div>
      ))}

      {/* ADD FILTER */}
      <button
        onClick={addFilter}
        className="mt-2 text-blue-400 hover:text-blue-500 text-sm font-medium flex items-center gap-1"
      >
        + Add Filter
      </button>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">

        <button
          onClick={() => setShowFilterSidebar(false)}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
        >
          Cancel
        </button>

        <button
          onClick={resetFilters}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
        >
          Reset All
        </button>

        <button
          onClick={() => setShowFilterSidebar(false)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
        >
          Apply Filters
        </button>

      </div>

    </div>
  </div>
)}

      {/* Add Candidate Popup */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden relative">
            <button onClick={() => setShowAddPopup(false)} className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <div className="h-full overflow-y-auto">
              <CandidateFormPage />
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedCandidate(null); }}>
          <div className={`${themeStyles.card} rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative`}>
            <button onClick={() => setSelectedCandidate(null)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors">✖</button>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Candidate Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p><span className="font-medium">Name:</span> {selectedCandidate.firstName} {selectedCandidate.lastName}</p>
                <p><span className="font-medium">Email:</span> {selectedCandidate.email}</p>
                <p><span className="font-medium">Phone:</span> {selectedCandidate.phone}</p>
                <p><span className="font-medium">Secondary:</span> {selectedCandidate.secondaryPhone || "—"}</p>
                <p><span className="font-medium">Recruiter:</span> {selectedCandidate.recruiter || "—"}</p>
                <p><span className="font-medium">Source:</span> {selectedCandidate.sourcedFrom || "—"}</p>
                <p><span className="font-medium">Source Date:</span> {selectedCandidate.sourceDate || "—"}</p>
                <p><span className="font-medium">Gender:</span> {selectedCandidate.gender || "—"}</p>
                <p><span className="font-medium">City:</span> {selectedCandidate.city || "—"}</p>
                <p><span className="font-medium">State:</span> {selectedCandidate.state || "—"}</p>
                <p><span className="font-medium">Country:</span> {selectedCandidate.country || "—"}</p>
                <p><span className="font-medium">Created By:</span> {selectedCandidate.createdByName || "—"}</p>
                <p className="col-span-2"><span className="font-medium">Created At:</span> {selectedCandidate.createdAt ? new Date(selectedCandidate.createdAt).toLocaleString() : "—"}</p>
              </div>

              {selectedCandidate.clientSections && selectedCandidate.clientSections.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-md font-semibold mb-3">Client Details ({selectedCandidate.clientSections.length})</h3>
                  <div className="space-y-3">
                    {selectedCandidate.clientSections.map((client, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${themeStyles.border}`}>
                        <p className="font-semibold text-sm text-blue-600">Client {idx + 1}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          {client.clientName && <p><span className="font-medium">Client:</span> {client.clientName}</p>}
                          {client.designation && <p><span className="font-medium">Designation:</span> {client.designation}</p>}
                          {client.clientLocation && <p><span className="font-medium">Location:</span> {client.clientLocation}</p>}
                          {client.process && <p><span className="font-medium">Process:</span> {client.process}</p>}
                          {client.processLOB && <p><span className="font-medium">LOB:</span> {client.processLOB}</p>}
                          {client.salary && <p><span className="font-medium">Salary:</span> {client.salary}</p>}
                          {client.hrRemark && <p className="col-span-2"><span className="font-medium">Remark:</span> {client.hrRemark}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCandidate.interviewRounds && selectedCandidate.interviewRounds.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-md font-semibold mb-3">Interview Rounds ({selectedCandidate.interviewRounds.length})</h3>
                  <div className="space-y-3">
                    {selectedCandidate.interviewRounds.map((round, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${themeStyles.border}`}>
                        <p className="font-semibold text-sm text-blue-600">{round.roundName}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          {round.interviewDate && <p><span className="font-medium">Date:</span> {round.interviewDate}</p>}
                          {round.interviewTime && <p><span className="font-medium">Time:</span> {round.interviewTime}</p>}
                          {round.hrStatus && <p><span className="font-medium">Status:</span> {round.hrStatus}</p>}
                          {round.interviewMode && <p><span className="font-medium">Mode:</span> {round.interviewMode}</p>}
                          {round.hrRemark && <p className="col-span-2"><span className="font-medium">Remark:</span> {round.hrRemark}</p>}
                          {round.finalFeedback && <p className="col-span-2"><span className="font-medium">Feedback:</span> {round.finalFeedback}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCandidate.attachments && selectedCandidate.attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-md font-semibold mb-3">Attachments ({selectedCandidate.attachments.length})</h3>
                  <div className="space-y-2">
                    {selectedCandidate.attachments.map((file, idx) => (
                      <div key={file.id || idx} className={`flex items-center justify-between p-3 rounded-lg border ${themeStyles.border}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(file.type, file.name)}</span>
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => previewFileHandler(file)} className="px-3 py-1 bg-green-500 text-white rounded text-xs">Preview</button>
                          <button onClick={() => downloadFile(file)} className="px-3 py-1 bg-blue-500 text-white rounded text-xs">Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {editCandidate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditCandidate(null);
              setNewFiles([]);
              setInterviewRounds([]);
              setClientSections([]);
            }
          }}
        >
          <div className="relative w-[1100px] max-w-[90vw] h-[85vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex overflow-hidden">
            
            {/* Sidebar */}
            <div
              className={`w-[280px] ${
                isDarkMode ? "bg-gray-800" : "bg-gray-50"
              } border-r ${themeStyles.border} flex flex-col`}
            >
              <div className="p-5 border-b">
                <h3 className="font-semibold text-lg">Sections</h3>
                <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                  Edit Candidate
                </p>
              </div>

              <ul className="flex-1 p-2 space-y-1 overflow-y-auto">
                <li>
                  <button
                    onClick={() => setActiveSection("candidate")}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 text-sm font-medium
                      ${
                        activeSection === "candidate"
                          ? "bg-blue-600 text-white"
                          : "text-white hover:bg-gray-700"
                      }`}
                  >
                    <span>👤</span> Candidate Details
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => setActiveSection("remarks")}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 text-sm font-medium
                      ${
                        activeSection === "remarks"
                          ? "bg-blue-600 text-white"
                          : "text-white hover:bg-gray-700"
                      }`}
                  >
                    <span>📝</span> Recruiter Remarks
                  </button>
                </li>

                {clientSections.map((section, index) => (
                  <li key={section.id}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveSection("clientInterview");
                          setActiveClientIndex(index);
                        }}
                        className={`flex-1 text-left p-3 rounded-lg flex items-center gap-3 text-sm font-medium
                          ${
                            activeSection === "clientInterview" &&
                            activeClientIndex === index
                              ? "bg-blue-600 text-white"
                              : "text-white hover:bg-gray-700"
                          }`}
                      >
                        <span>🏢</span> Client {index + 1}
                      </button>
                      {clientSections.length > 1 && (
                        <button
                          onClick={() => removeClientSection(section.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white text-sm"
                          title="Remove Client"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </li>
                ))}

                <li>
                  <button
                    onClick={addClientSection}
                    className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                  >
                    <span>+</span> Add Client
                  </button>
                </li>
              </ul>

              <div
                className={`p-4 border-t ${themeStyles.border} text-xs ${themeStyles.secondaryText}`}
              >
                Editing:&nbsp;
                <span className="font-semibold">
                  {editCandidate.firstName} {editCandidate.lastName}
                </span>
              </div>
            </div>

            {/* Main Content */}
            <div
              className={`flex-1 ${
                isDarkMode ? "bg-gray-900" : "bg-white"
              } flex flex-col overflow-hidden`}
            >
              <div
                className={`flex justify-between items-center p-5 border-b ${themeStyles.border}`}
              >
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Edit "{editCandidate.firstName} {editCandidate.lastName}"
                  </h2>
                  <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                    {activeSection === "candidate" && "Candidate Details"}
                    {activeSection === "remarks" && "Recruiter Remarks"}
                    {activeSection === "clientInterview" &&
                      `Client ${activeClientIndex + 1}`}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditCandidate(null);
                    setNewFiles([]);
                    setInterviewRounds([]);
                    setClientSections([]);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-gray-700"
                >
                  ✖
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {renderFormSection()}
              </div>

              <div
                className={`flex justify-end gap-3 p-5 border-t ${themeStyles.border}`}
              >
                <button
                  onClick={handleResetForm}
                  className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all"
                >
                  Reset
                </button>

                <button
                  onClick={() => {
                    setEditCandidate(null);
                    setNewFiles([]);
                    setInterviewRounds([]);
                    setClientSections([]);
                  }}
                  className={`px-5 py-2.5 rounded-lg text-white ${themeStyles.buttonSecondary} transition-all`}
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveEdit}
                  className={`px-5 py-2.5 rounded-lg text-white ${themeStyles.buttonSuccess} transition-all flex items-center gap-2`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">✖ Close</button>
            <img src={previewImage.url} alt={previewImage.name} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            <p className="text-center text-white mt-4 text-sm">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCandidates;