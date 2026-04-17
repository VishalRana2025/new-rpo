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
  const [roundDropdown, setRoundDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });
  
  // State for multiple interview rounds
  const [interviewRounds, setInterviewRounds] = useState([]);
  
  // State for designation options
  const [designationOptions, setDesignationOptions] = useState([]);

  // ================== CURRENT USER & PERMISSIONS ==================
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    loadData();
    loadDesignations();
  }, []);

  // ================== PERMISSION-BASED ADD NEW BUTTON ==================
  // ✅ CORRECT: Based on Admin Panel permission newCandidate
  const canAddCandidate = currentUser?.permissions?.newCandidate === true;

  // Alternative: If your permission name is different, use:
  // const canAddCandidate = currentUser?.permissions?.addCandidate === true;
  // Or for multiple permission names:
  // const canAddCandidate = currentUser?.permissions?.newCandidate === true || 
  //                        currentUser?.permissions?.addCandidate === true;

  // ✅ Load data from API and sync with localStorage
  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/candidates");
      const candidates = res.data || [];
      setData(candidates);
      
      // ✅ Sync with localStorage
      localStorage.setItem("candidates", JSON.stringify(candidates));
    } catch (err) {
      console.error("Error loading candidates:", err);
      // ✅ Fallback to localStorage if API fails
      const stored = localStorage.getItem("candidates");
      if (stored) {
        setData(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load designations from API
  const loadDesignations = async () => {
    try {
      const res = await api.get("/requirements");
      const uniqueDesignations = [
        ...new Set(res.data.map(req => req.designationPosition).filter(Boolean))
      ];
      setDesignationOptions(uniqueDesignations);
      
      // ✅ Cache designations in localStorage
      localStorage.setItem("designations", JSON.stringify(uniqueDesignations));
    } catch (error) {
      console.error("Error loading designations:", error);
      // ✅ Fallback to localStorage
      const stored = localStorage.getItem("designations");
      if (stored) {
        setDesignationOptions(JSON.parse(stored));
      }
    }
  };

  const filteredData = data.filter((c) => {
    const searchString = searchTerm.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchString) ||
      c.email?.toLowerCase().includes(searchString) ||
      c.phone?.toLowerCase().includes(searchString) ||
      c.recruiter?.toLowerCase().includes(searchString) ||
      c.sourcedFrom?.toLowerCase().includes(searchString) ||
      c.city?.toLowerCase().includes(searchString)
    );
  });

  // ✅ Updated handleEdit with proper data loading
  const handleEdit = (candidate) => {
    console.log("Edit clicked for:", candidate.firstName);
    
    setEditCandidate({
      ...candidate,
      clientName: candidate.clientName || "",
      clientLocation: candidate.clientLocation || "",
      designation: candidate.designation || "",
      process: candidate.process || "",
      processLOB: candidate.processLOB || "",
      salary: candidate.salary || "",
      hrRemark: candidate.hrRemark || candidate.Remark || "",
    });
    
    setInterviewRounds(candidate.interviewRounds || []);
    setNewFiles([]);
    setActiveSection("candidate");
    setRoundDropdown(false);
  };

  // ✅ Updated handleDelete - removes from both API and localStorage
  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${name}?`);
    if (!confirmDelete) return;

    try {
      // Delete from API
      await api.delete(`/delete-candidate/${id}`);
      
      // Update local state
      const updatedData = data.filter(c => c._id !== id);
      setData(updatedData);
      
      // ✅ Update localStorage
      localStorage.setItem("candidates", JSON.stringify(updatedData));
      
      alert("✅ Candidate deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Delete failed. Please try again.");
    }
  };

  const handleView = (candidate) => {
    console.log("View clicked for:", candidate.firstName);
    setSelectedCandidate(candidate);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // ✅ Updated handleSaveEdit - updates both API and localStorage
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
        updatedAt: new Date().toISOString()
      };
      
      // Update API
      await api.put(`/update-candidate/${editCandidate._id}`, updateData);
      
      // Update local state
      const updatedData = data.map(c => 
        c._id === editCandidate._id ? updateData : c
      );
      setData(updatedData);
      
      // ✅ Update localStorage
      localStorage.setItem("candidates", JSON.stringify(updatedData));
      
      alert("✅ Candidate updated successfully!");
      setEditCandidate(null);
      setNewFiles([]);
      setInterviewRounds([]);
    } catch (err) {
      console.error("Save error:", err);
      alert("❌ Update failed. Please try again.");
    }
  };

  const handleResetForm = () => {
    if (!editCandidate) return;
    const confirmReset = window.confirm("Are you sure you want to reset the form? All unsaved changes will be lost.");
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
      clientName: "",
      clientLocation: "",
      designation: "",
      process: "",
      processLOB: "",
      salary: "",
      hrRemark: "",
    });
    setInterviewRounds([]);
    setNewFiles([]);
    setRoundDropdown(false);
  };

  // Select round function for adding multiple rounds
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

  // Remove round function
  const removeRound = (roundId) => {
    setInterviewRounds(prev => prev.filter(round => round.id !== roundId));
  };

  // Update round field function
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
        alert("Download not available - file data missing");
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
        alert("Preview not available - file data missing");
        return;
      }

      const isImage =
        file.type?.toLowerCase().includes("image") ||
        file.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);

      const isPdf =
        file.type?.toLowerCase().includes("pdf") ||
        file.name?.toLowerCase().endsWith(".pdf");

      if (isImage) {
        setPreviewImage({ url: fileUrl, name: file.name });
      } else if (isPdf) {
        const newWindow = window.open();
        if (!newWindow) {
          alert("Popup blocked! Please allow popups for preview.");
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
        alert("Preview not supported for this file type");
      }
    } catch (error) {
      console.error("Preview error:", error);
      alert("Failed to preview file");
    }
  };

  const themeStyles = {
    background: isDarkMode ? "bg-gray-900" : "bg-gray-100",
    text: isDarkMode ? "text-white" : "text-gray-900",
    secondaryText: isDarkMode ? "text-gray-300" : "text-gray-600",
    card: isDarkMode ? "bg-gray-800" : "bg-white",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
    tableHeader: isDarkMode ? "bg-gray-700" : "bg-gray-200",
    tableRow: isDarkMode 
      ? "border-gray-700 hover:bg-gray-700" 
      : "border-gray-200 hover:bg-gray-50",
    input: isDarkMode 
      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
      : "bg-white border-gray-300 text-gray-900",
    button: isDarkMode
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-blue-500 hover:bg-blue-600",
    buttonSecondary: isDarkMode
      ? "bg-gray-600 hover:bg-gray-700"
      : "bg-gray-500 hover:bg-gray-600",
    buttonSuccess: isDarkMode
      ? "bg-green-600 hover:bg-green-700"
      : "bg-green-500 hover:bg-green-600",
    buttonDanger: isDarkMode
      ? "bg-red-600 hover:bg-red-700"
      : "bg-red-500 hover:bg-red-600",
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

  const menuSections = [
    { id: "candidate", label: "Candidate Details", icon: "👤" },
    { id: "clientInterview", label: "Client & Interview", icon: "🏢" },
  ];

  const getHrStatusColor = (status) => {
    switch(status) {
      case "Selected": return "text-green-600";
      case "Rejected": return "text-red-600";
      case "Pending": return "text-yellow-600";
      case "On Hold": return "text-orange-600";
      default: return "";
    }
  };

  const qualificationOptions = [
    "10th Pass",
    "12th Pass",
    "Diploma",
    "Graduate",
    "Post Graduate",
    "MBA",
    "BCA",
    "MCA",
    "B.Tech",
    "M.Tech",
    "PhD",
    "Other"
  ];

  const renderFormSection = () => {
    switch(activeSection) {
      case "candidate":
        return (
          <div className="space-y-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg border ${themeStyles.border}`}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">👤 Basic Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>First Name *</label>
                  <input type="text" value={editCandidate.firstName || ""} onChange={(e) => handleEditChange("firstName", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Last Name </label>
                  <input type="text" value={editCandidate.lastName || ""} onChange={(e) => handleEditChange("lastName", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Email *</label>
                  <input type="email" value={editCandidate.email || ""} onChange={(e) => handleEditChange("email", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Phone *</label>
                  <input type="text" value={editCandidate.phone || ""} onChange={(e) => handleEditChange("phone", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Secondary Phone</label>
                  <input type="text" value={editCandidate.secondaryPhone || ""} onChange={(e) => handleEditChange("secondaryPhone", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Gender</label>
                  <select value={editCandidate.gender || ""} onChange={(e) => handleEditChange("gender", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg border ${themeStyles.border}`}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">📍 Contact & Location</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>City</label>
                  <input type="text" value={editCandidate.city || ""} onChange={(e) => handleEditChange("city", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>State</label>
                  <input type="text" value={editCandidate.state || ""} onChange={(e) => handleEditChange("state", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Country</label>
                  <input type="text" value={editCandidate.country || ""} onChange={(e) => handleEditChange("country", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Recruiter</label>
                  <input type="text" value={editCandidate.recruiter || ""} onChange={(e) => handleEditChange("recruiter", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Sourced From</label>
                  <input type="text" value={editCandidate.sourcedFrom || ""} onChange={(e) => handleEditChange("sourcedFrom", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeStyles.secondaryText}`}>Source Date</label>
                  <input type="date" value={editCandidate.sourceDate ? editCandidate.sourceDate.split("T")[0] : ""} onChange={(e) => handleEditChange("sourceDate", e.target.value)} className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg border ${themeStyles.border}`}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">📄 Additional Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Qualification</label>
                  <select
                    value={editCandidate.qualification || ""}
                    onChange={(e) => handleEditChange("qualification", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                  >
                    <option value="">Select Qualification</option>
                    {qualificationOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Total Experience</label>
                  <input
                    type="text"
                    value={editCandidate.totalExperience || ""}
                    onChange={(e) => handleEditChange("totalExperience", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="e.g., 2 years 6 months"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Current CTC</label>
                  <input
                    type="text"
                    value={editCandidate.currentCTC || ""}
                    onChange={(e) => handleEditChange("currentCTC", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="₹ X.XX LPA"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Expected CTC</label>
                  <input
                    type="text"
                    value={editCandidate.expectedCTC || ""}
                    onChange={(e) => handleEditChange("expectedCTC", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="₹ X.XX LPA"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Notice Period</label>
                  <input
                    type="text"
                    value={editCandidate.noticePeriod || ""}
                    onChange={(e) => handleEditChange("noticePeriod", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="e.g., 15 days, 1 month"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Resume Link</label>
                  <input
                    type="url"
                    value={editCandidate.resume || ""}
                    onChange={(e) => handleEditChange("resume", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case "clientInterview":
        return (
          <div className="space-y-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg border ${themeStyles.border}`}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">🏢 Client Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Client Name</label>
                  <input
                    value={editCandidate.clientName || ""}
                    onChange={(e) => handleEditChange("clientName", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter client name"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Designation</label>
                  <select
                    value={editCandidate.designation || ""}
                    onChange={(e) => handleEditChange("designation", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                  >
                    <option value="">Select Designation</option>
                    {designationOptions.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
               
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Client Location</label>
                  <input
                    value={editCandidate.clientLocation || ""}
                    onChange={(e) => handleEditChange("clientLocation", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter client location"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Process Aligned</label>
                  <input
                    value={editCandidate.process || ""}
                    onChange={(e) => handleEditChange("process", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter process"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Process LOB</label>
                  <input
                    value={editCandidate.processLOB || ""}
                    onChange={(e) => handleEditChange("processLOB", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter process LOB"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Salary Offered</label>
                  <input
                    value={editCandidate.salary || ""}
                    onChange={(e) => handleEditChange("salary", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter salary offered"
                  />
                </div>
                <div className="col-span-2">
                  <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Remark</label>
                  <textarea
                    rows="3"
                    value={editCandidate.hrRemark || ""}
                    onChange={(e) => handleEditChange("hrRemark", e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter HR remarks or feedback..."
                  />
                </div>
              </div>
            </div>

            {/* Interview Section with MULTIPLE ROUNDS Support */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg border ${themeStyles.border}`}>
              <div className="flex justify-between items-center mb-3 relative">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  🎤 Interview Rounds
                </h4>

                <div className="relative inline-block">
                  <button
                    onClick={() => setRoundDropdown(!roundDropdown)}
                    className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                  >
                    + Add Round
                  </button>

                  {roundDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-[99998]" 
                        onClick={() => setRoundDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-[99999]">
                        {[1, 2, 3, 4, 5].map((round) => (
                          <div
                            key={round}
                            onClick={() => selectRound(round)}
                            className="px-4 py-2 text-sm cursor-pointer text-white hover:bg-blue-600 transition-all"
                          >
                            Round {round}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Display ALL Interview Rounds */}
              {interviewRounds.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No interview rounds added yet.</p>
                  <p className="text-xs mt-1">Click "+ Add Round" to add interview rounds.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviewRounds.map((round, index) => (
                    <div key={round.id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-sm font-semibold text-blue-500 dark:text-blue-400">
                          🎯 {round.roundName}
                        </h5>
                        <button
                          onClick={() => removeRound(round.id)}
                          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        >
                          ❌ Remove Round
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Interview Date</label>
                          <input
                            type="date"
                            value={round.interviewDate}
                            onChange={(e) => updateRoundField(round.id, "interviewDate", e.target.value)}
                            className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Interview Time</label>
                          <input
                            type="time"
                            value={round.interviewTime}
                            onChange={(e) => updateRoundField(round.id, "interviewTime", e.target.value)}
                            className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                          />
                        </div>
                        <div>
                          <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Status</label>
                          <select
                            value={round.hrStatus}
                            onChange={(e) => updateRoundField(round.id, "hrStatus", e.target.value)}
                            className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                          >
                            <option value="">Select Status</option>
                            <option value="Selected">✅ Selected</option>
                            <option value="Rejected">❌ Rejected</option>
                            <option value="Pending">⏳ Pending</option>
                            <option value="On Hold">📌 On Hold</option>
                          </select>
                        </div>
                        <div>
                          <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Interview Mode</label>
                          <select
                            value={round.interviewMode}
                            onChange={(e) => updateRoundField(round.id, "interviewMode", e.target.value)}
                            className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                          >
                            <option value="">Select Mode</option>
                            <option value="Online">💻 Online</option>
                            <option value="Offline">🏢 Offline</option>
                            <option value="Telephonic">📞 Telephonic</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Remark</label>
                          <textarea
                            rows="2"
                            value={round.hrRemark}
                            onChange={(e) => updateRoundField(round.id, "hrRemark", e.target.value)}
                            className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                            placeholder="Enter remarks for this round..."
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-xs mb-1 block ${themeStyles.secondaryText}`}>Final Feedback</label>
                          <textarea
                            rows="2"
                            value={round.finalFeedback}
                            onChange={(e) => updateRoundField(round.id, "finalFeedback", e.target.value)}
                            className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                            placeholder="Enter final feedback for this round..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg border ${themeStyles.border}`}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">📎 Attachments</h4>
              
              {editCandidate.attachments && editCandidate.attachments.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-semibold mb-2">Existing Files ({editCandidate.attachments.length})</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editCandidate.attachments.map((file, idx) => (
                      <div key={file.id || idx} className={`flex items-center justify-between p-2 rounded-lg border ${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{getFileIcon(file.type, file.name)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.name}</p>
                            <p className={`text-xs ${themeStyles.secondaryText}`}>{file.size ? formatFileSize(file.size) : "Unknown size"}</p>
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
                <label className={`block text-sm font-medium mb-2 ${themeStyles.secondaryText}`}>
                  Upload New Files
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,image/*"
                  onChange={(e) => setNewFiles([...newFiles, ...Array.from(e.target.files)])}
                  className={`${themeStyles.input} border p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none`}
                />
                <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                  Max 3MB per file. Supported: PDF, DOC, DOCX, TXT, Images
                </p>
              </div>

              {newFiles.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-2">New Files to Upload ({newFiles.length})</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {newFiles.map((file, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"}`}>
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
    <div className={`p-4 sm:p-6 ${themeStyles.background} ${themeStyles.text} min-h-screen transition-colors duration-200`}>
      <div className="max-w-full mx-auto">
        {/* Updated Header with Add New Button - PERMISSION BASED */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>🎯</span> All Candidates
            </h2>
            <p className={`text-sm ${themeStyles.secondaryText} mt-1`}>
              Total {filteredData.length} candidate(s) found
            </p>
          </div>
          
          {/* ADD NEW BUTTON - Only visible when newCandidate permission is true */}
          {canAddCandidate && (
            <button
              onClick={() => setShowAddPopup(true)}
              className="px-5 py-2.5 rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New
            </button>
          )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Search by name, email, phone, recruiter, source, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${themeStyles.input} border px-4 py-2 rounded-lg w-full max-w-md focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
          />
        </div>

        <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-[1500px] w-full text-sm text-left">
            <thead className="bg-blue-600 text-white uppercase text-xs font-bold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Secondary</th>
                <th className="px-4 py-3">Recruiter</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Source Date</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Files</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
              {isLoading ? (
                <tr>
                  <td colSpan="16" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                      <p className={`text-sm ${themeStyles.secondaryText}`}>Loading candidates...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="16" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-5xl opacity-50">📭</span>
                      <p className={`text-lg ${themeStyles.secondaryText}`}>No candidates found</p>
                      <p className={`text-sm ${themeStyles.secondaryText}`}>
                        {searchTerm ? "Try a different search term" : "Add your first candidate to get started"}
                      </p>
                      {canAddCandidate && !searchTerm && (
                        <button
                          onClick={() => setShowAddPopup(true)}
                          className="mt-4 px-4 py-2 rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 transition-all text-sm"
                        >
                          + Add New Candidate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((c, index) => (
                  <tr key={c._id} className={`border-b ${themeStyles.tableRow} transition-colors duration-150 ${index % 2 === 0 ? (isDarkMode ? "bg-gray-800/50" : "bg-gray-50") : ""}`}>
                    <td className="px-4 py-3 font-medium text-center">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="px-4 py-3"><a href={`mailto:${c.email}`} className="text-blue-500 hover:text-blue-600 hover:underline">{c.email}</a></td>
                    <td className="px-4 py-3"><a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a></td>
                    <td className="px-4 py-3">{c.secondaryPhone || "—"}</td>
                    <td className="px-4 py-3">{c.recruiter || "—"}</td>
                    <td className="px-4 py-3">{c.sourcedFrom ? <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">{c.sourcedFrom}</span> : "—"}</td>
                    <td className="px-4 py-3">{c.sourceDate ? new Date(c.sourceDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">{c.gender ? <span className="capitalize">{c.gender === "male" ? "👨 Male" : c.gender === "female" ? "👩 Female" : c.gender}</span> : "—"}</td>
                    <td className="px-4 py-3">{c.city || "—"}</td>
                    <td className="px-4 py-3">{c.state || "—"}</td>
                    <td className="px-4 py-3">{c.country || "—"}</td>
                    
                    <td className="px-4 py-3">
                      {c.attachments && c.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-green-600 font-semibold text-xs">📎 {c.attachments.length} file(s)</span>
                          <div className="flex flex-wrap gap-1">
                            {c.attachments.slice(0, 2).map((file, i) => (
                              <div key={file.id || i} className="flex gap-1">
                                <button onClick={() => downloadFile(file)} className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors" title={`Download ${file.name}`}>⬇️</button>
                                <button onClick={() => previewFileHandler(file)} className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors" title={`Preview ${file.name}`}>👁️</button>
                              </div>
                            ))}
                            {c.attachments.length > 2 && <span className="text-xs text-gray-500 ml-1">+{c.attachments.length - 2} more</span>}
                          </div>
                        </div>
                      ) : "—"}
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{c.createdByName || "—"}</span>
                        {c.createdByEmail && <span className="text-xs opacity-70">{c.createdByEmail}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.createdAt ? (
                        <div className="flex flex-col">
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span className="text-xs opacity-70">{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleEdit(c)} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-xs flex items-center gap-1 transition-colors" title="Edit Candidate">✏️ Edit</button>
                        <button onClick={() => handleDelete(c._id, `${c.firstName} ${c.lastName}`)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs flex items-center gap-1 transition-colors" title="Delete Candidate">🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredData.length > 0 && (
          <div className={`mt-4 text-sm ${themeStyles.secondaryText} text-right`}>
            Showing {filteredData.length} of {data.length} candidate(s)
          </div>
        )}
      </div>

      {/* ADD NEW CANDIDATE FULL FORM POPUP */}
      {showAddPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden relative">
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

            {/* Full Candidate Form */}
            <div className="h-full overflow-y-auto">
              <CandidateFormPage />
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedCandidate(null);
        }}>
          <div className={`${themeStyles.card} rounded-xl shadow-2xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-y-auto`}>
            <button onClick={() => setSelectedCandidate(null)} className="absolute top-3 right-3 text-xl font-bold text-gray-500 hover:text-red-500 transition-colors z-10">✖</button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span>👁️</span> Candidate Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><b>Name:</b> {selectedCandidate.firstName} {selectedCandidate.lastName}</p>
              <p><b>Email:</b> {selectedCandidate.email}</p>
              <p><b>Phone:</b> {selectedCandidate.phone}</p>
              <p><b>Secondary:</b> {selectedCandidate.secondaryPhone || "—"}</p>
              <p><b>Recruiter:</b> {selectedCandidate.recruiter || "—"}</p>
              <p><b>Source:</b> {selectedCandidate.sourcedFrom || "—"}</p>
              <p><b>Source Date:</b> {selectedCandidate.sourceDate || "—"}</p>
              <p><b>Gender:</b> {selectedCandidate.gender || "—"}</p>
              <p><b>City:</b> {selectedCandidate.city || "—"}</p>
              <p><b>State:</b> {selectedCandidate.state || "—"}</p>
              <p><b>Country:</b> {selectedCandidate.country || "—"}</p>
              <p><b>Created By:</b> {selectedCandidate.createdByName || "—"}</p>
              <p className="col-span-2"><b>Created At:</b> {selectedCandidate.createdAt ? new Date(selectedCandidate.createdAt).toLocaleString() : "—"}</p>
            </div>

            {/* Show Interview Rounds in View Modal */}
            {selectedCandidate.interviewRounds && selectedCandidate.interviewRounds.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2"><span>🎤</span> Interview Rounds ({selectedCandidate.interviewRounds.length})</h3>
                <div className="space-y-3">
                  {selectedCandidate.interviewRounds.map((round, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">{round.roundName}</p>
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
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2"><span>📎</span> Attachments ({selectedCandidate.attachments.length})</h3>
                <div className="space-y-3">
                  {selectedCandidate.attachments.map((file, idx) => (
                    <div key={file.id || idx} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white border-gray-200 shadow-sm hover:shadow-md"}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`text-2xl ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>{getFileIcon(file.type, file.name)}</span>
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{file.name || "Unnamed File"}</p>
                          <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{file.size ? formatFileSize(file.size) : "Unknown size"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => previewFileHandler(file)} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs flex items-center gap-1 transition-all shadow-sm">👁️ Preview</button>
                        <button onClick={() => downloadFile(file)} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs flex items-center gap-1 transition-all shadow-sm">📥 Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT POPUP */}
      {editCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setEditCandidate(null);
            setNewFiles([]);
            setInterviewRounds([]);
          }
        }}>
          <div className="relative w-[1100px] max-w-[90vw] h-[85vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex overflow-visible">
            
            <div className={`w-[280px] ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border-r ${themeStyles.border} flex flex-col`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg">Sections</h3>
                <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>Edit Candidate</p>
              </div>
              <ul className="flex-1 p-2 space-y-1 overflow-y-auto">
                {menuSections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 text-sm font-medium
                        ${activeSection === section.id 
                          ? `bg-blue-500 text-white shadow-md` 
                          : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${themeStyles.text}`
                        }`}
                    >
                      <span className="text-lg">{section.icon}</span>
                      {section.label}
                      {activeSection === section.id && (
                        <span className="ml-auto text-xs">▶</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              
              <div className={`p-4 border-t ${themeStyles.border} text-xs ${themeStyles.secondaryText}`}>
                Editing: <span className="font-semibold">{editCandidate.firstName} {editCandidate.lastName}</span>
              </div>
            </div>

            <div className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} flex flex-col overflow-hidden`}>
              <div className={`flex justify-between items-center p-6 border-b ${themeStyles.border} ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <div>
                  <h2 className="text-xl font-bold">
                    Edit "{editCandidate.firstName} {editCandidate.lastName}"
                  </h2>
                  <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                    {menuSections.find(s => s.id === activeSection)?.label || 'Candidate Details'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setEditCandidate(null);
                    setNewFiles([]);
                    setInterviewRounds([]);
                  }} 
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xl"
                >
                  ✖
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {renderFormSection()}
              </div>

              <div className={`flex justify-end gap-3 p-6 border-t ${themeStyles.border} ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <button 
                  onClick={handleResetForm} 
                  className="px-5 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all hover:scale-105"
                >
                  Reset
                </button>
                <button 
                  onClick={() => {
                    setEditCandidate(null);
                    setNewFiles([]);
                    setInterviewRounds([]);
                  }} 
                  className={`px-5 py-2.5 rounded-lg text-white ${themeStyles.buttonSecondary} transition-all hover:scale-105`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  className={`px-5 py-2.5 rounded-lg text-white ${themeStyles.buttonSuccess} transition-all flex items-center gap-2 hover:scale-105`}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300 transition-colors">✖ Close</button>
            <img src={previewImage.url} alt={previewImage.name} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            <p className="text-center text-white mt-4 text-sm">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCandidates;