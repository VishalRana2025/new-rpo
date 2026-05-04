import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";

const RequirementFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
 const [clients, setClients] = useState(() => {
  const cached = localStorage.getItem("clients");
  return cached ? JSON.parse(cached) : [];
});
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  // Form Manager States
  const [showFormManager, setShowFormManager] = useState(false);
  const [showNewFieldPopup, setShowNewFieldPopup] = useState(false);
  const [showEditFieldsPopup, setShowEditFieldsPopup] = useState(false);
  const [dynamicFields, setDynamicFields] = useState([]);
  
  // State for field creation
  const [newFieldType, setNewFieldType] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [showFieldNamePopup, setShowFieldNamePopup] = useState(false);
  
  // Search state
  const [searchField, setSearchField] = useState("");

  // Requirement form state
  const [requirementForm, setRequirementForm] = useState({
    clientName: "",
    requirementReceivedDate: "",
clientLocation: "",
    agent: "",
    process: "",
    designationPosition: "",
    requirementType: "",
    noOfRequirement: "",
    driveDate: "",
    requirementDeadline: "",
    budget: "",
    payoutCommissionRs: "",
    payoutCommissionPercent: "",
    additionalNotes: "",
  });

  const [requirementAttachments, setRequirementAttachments] = useState([]);
  const [requirementUploadProgress, setRequirementUploadProgress] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === "admin";

  // DEFAULT FIELD CONFIG
  const defaultFieldConfig = [
    { id: "clientName", label: "Client Name", isDefault: true, type: "select", required: true },
    { id: "requirementReceivedDate", label: "Requirement Received Date", isDefault: true, type: "date", required: true },
    { id: "agent", label: "Agent", isDefault: true, type: "text", required: true },
    { id: "process", label: "Process", isDefault: true, type: "text", required: true },
    { id: "designationPosition", label: "Designation/Position", isDefault: true, type: "text", required: true },
    { id: "requirementType", label: "Requirement Type", isDefault: true, type: "select", required: true },
    { id: "noOfRequirement", label: "Number of Requirements", isDefault: true, type: "number", required: false },
    { id: "driveDate", label: "Drive Date", isDefault: true, type: "date", required: false },
    { id: "requirementDeadline", label: "Requirement Deadline", isDefault: true, type: "date", required: false },
    { id: "budget", label: "Budget", isDefault: true, type: "text", required: true },
    { id: "payoutCommissionRs", label: "Payout ₹", isDefault: true, type: "number", required: false },
    { id: "payoutCommissionPercent", label: "Payout %", isDefault: true, type: "number", required: false },
    { id: "additionalNotes", label: "Additional Notes", isDefault: true, type: "longtext", required: false },
  ];

  // Load dynamic fields from database
  const loadDynamicFieldsFromDB = async () => {
    try {
      const res = await api.get("/form-fields");
      setDynamicFields(res.data.map(f => ({ ...f, value: "" })));
      console.log("✅ Loaded fields from /form-fields:", res.data.length);
    } catch (err) {
      console.error("Error loading fields:", err);
      setDynamicFields([]);
    }
  };

  // Load fields when component mounts
  useEffect(() => {
    loadDynamicFieldsFromDB();
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) {
      navigate("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.removeItem("currentUser");
      navigate("/login");
    }
  }, [navigate]);
useEffect(() => {
  loadClients();   // ✅ load immediately
}, []);
  // Check if we're editing from navigation state
  useEffect(() => {
    const editData = location.state?.editRequirement;
    if (editData) {
      loadRequirementForEdit(editData);
    }
  }, [location]);

const loadClients = async () => {
  try {
    const cached = localStorage.getItem("clients");

    // ✅ ONLY set if state is empty
    if (cached && clients.length === 0) {
      setClients(JSON.parse(cached));
    }

   const res = await api.get("/clients"); 

    let clientsData = [];

    if (Array.isArray(res.data)) {
      clientsData = res.data;
    } else if (Array.isArray(res.data.data)) {
      clientsData = res.data.data;
    } else if (Array.isArray(res.data.clients)) {
      clientsData = res.data.clients;
    }

    // ✅ update ONLY if data changed
    if (JSON.stringify(clientsData) !== JSON.stringify(clients)) {
      setClients(clientsData);
      localStorage.setItem("clients", JSON.stringify(clientsData));
    }

  } catch (error) {
    console.error("Error loading clients:", error);
  }
};
  // Add dynamic field
  const addDynamicField = async (type, customLabel, isRequired) => {
    const field = {
      id: Date.now(),
      type,
      label: customLabel,
      required: isRequired,
    };

    setDynamicFields(prev => [...prev, { ...field, value: "" }]);

    try {
      await api.post("/form-fields", field);
      alert(`✅ Field "${customLabel}" added successfully!`);
    } catch (err) {
      console.error("Error saving field:", err);
      alert("Error saving field. Please try again.");
      setDynamicFields(prev => prev.filter(f => f.id !== field.id));
    }
  };

  // Remove dynamic field
  const removeDynamicField = async (id) => {
    if (!isAdmin) return;
    
    if (!window.confirm("Remove this field? It will be removed from ALL requirements permanently.")) {
      return;
    }

    try {
      await api.delete(`/form-fields/${id}`);
      await loadDynamicFieldsFromDB();
      alert("✅ Field removed successfully!");
    } catch (err) {
      console.error("Error deleting field:", err);
      alert("Failed to delete field. Please try again.");
    }
  };

  // Update field label
  const updateFieldLabel = (id, newLabel, isDefault) => {
    if (isDefault) {
      const saved = JSON.parse(localStorage.getItem("defaultFieldLabels") || "{}");
      saved[id] = newLabel;
      localStorage.setItem("defaultFieldLabels", JSON.stringify(saved));
      setRequirementForm(prev => ({ ...prev }));
    } else {
      setDynamicFields(prev =>
        prev.map(f =>
          f.id === id ? { ...f, label: newLabel } : f
        )
      );
    }
  };

  // Toggle required field
  const toggleRequired = (id, isDefault) => {
    if (isDefault) {
      const saved = JSON.parse(localStorage.getItem("defaultFieldRequired") || "{}");
      saved[id] = !saved[id];
      localStorage.setItem("defaultFieldRequired", JSON.stringify(saved));
      setRequirementForm(prev => ({ ...prev }));
    } else {
      setDynamicFields(prev =>
        prev.map(f =>
          f.id === id ? { ...f, required: !f.required } : f
        )
      );
    }
  };

  // Get required value
  const isFieldRequired = (id, isDefault, defaultVal) => {
    if (isDefault) {
      const saved = JSON.parse(localStorage.getItem("defaultFieldRequired") || "{}");
      return saved[id] !== undefined ? saved[id] : defaultVal;
    }
    return defaultVal;
  };

  // Delete/Hide field
  const deleteField = (id, isDefault) => {
    if (isDefault) {
      const hidden = JSON.parse(localStorage.getItem("hiddenFields") || "[]");
      if (!hidden.includes(id)) {
        hidden.push(id);
        localStorage.setItem("hiddenFields", JSON.stringify(hidden));
        setRequirementForm(prev => ({ ...prev }));
      }
    } else {
      removeDynamicField(id);
    }
  };

  // Check if a default field is hidden
  const isFieldHidden = (id) => {
    const hidden = JSON.parse(localStorage.getItem("hiddenFields") || "[]");
    return hidden.includes(id);
  };

  // Get custom label for default field
  const getFieldLabel = (id, defaultLabel) => {
    const saved = JSON.parse(localStorage.getItem("defaultFieldLabels") || "{}");
    return saved[id] || defaultLabel;
  };

  // Load requirement for edit
  const loadRequirementForEdit = (data) => {
    setEditingRequirement(data);

    setRequirementForm({
      clientName: data.clientName || "",
    clientLocation: data.clientLocation || data.recruiterLocation || "",
      agent: data.agent || "",
      process: data.process || "",
      designationPosition: data.designationPosition || "",
      requirementType: data.requirementType || "",
      noOfRequirement: data.noOfRequirement || "",
      driveDate: data.driveDate || "",
      requirementDeadline: data.requirementDeadline || "",
      budget: data.budget || "",
      payoutCommissionRs: data.payoutCommissionRs || "",
      payoutCommissionPercent: data.payoutCommissionPercent || "",
      additionalNotes: data.additionalNotes || "",
    });

    if (data.fileUploads && Array.isArray(data.fileUploads)) {
      setRequirementAttachments(data.fileUploads);
    } else {
      setRequirementAttachments([]);
    }

    if (data.dynamicFieldsConfig) {
      try {
        const savedFields = JSON.parse(data.dynamicFieldsConfig);
        setDynamicFields(savedFields.map(f => ({ ...f, value: f.value || "" })));
      } catch (e) {
        console.error("Error parsing dynamic fields:", e);
        setDynamicFields([]);
      }
    } else {
      setDynamicFields([]);
    }
  };

  // Handle dynamic input change
  const handleDynamicChange = (id, value) => {
    setDynamicFields(prev =>
      prev.map(f => f.id === id ? { ...f, value } : f)
    );
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.6);
        };
        
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsLoading(true);
    
    for (const file of files) {
      try {
        let processedFile = file;
        
        if (file.type.startsWith('image/')) {
          processedFile = await compressImage(file);
        }
        
        if (processedFile.size > 3 * 1024 * 1024) {
          alert(`File "${file.name}" still exceeds 3 MB after compression.`);
          continue;
        }
        
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${processedFile.name}`;
        
        setRequirementUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));
        
        const fileData = {
          id: fileId,
          name: processedFile.name,
          type: processedFile.type,
          size: processedFile.size,
          file: processedFile,
          uploadedAt: new Date().toISOString(),
        };
        
        setRequirementAttachments((prev) => {
          const updated = [...prev, fileData];
          return updated;
        });
        
        setRequirementUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
        setTimeout(() => {
          setRequirementUploadProgress((prev) => {
            const updated = { ...prev };
            delete updated[fileId];
            return updated;
          });
        }, 1000);
      } catch (error) {
        console.error('Error processing file:', error);
        alert(`Failed to process file "${file.name}".`);
      }
    }
    
    setIsLoading(false);
    e.target.value = "";
  };

  const removeAttachment = (fileId) => {
    setRequirementAttachments((prev) => prev.filter((f) => f.id !== fileId));
  };

  const downloadFile = (file) => {
    if (file.file) {
      const url = URL.createObjectURL(file.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (file.data) {
      try {
        const link = document.createElement('a');
        if (file.data.startsWith('data:')) {
          link.href = file.data;
        } else {
          const mimeType = file.type || 'application/octet-stream';
          link.href = `data:${mimeType};base64,${file.data}`;
        }
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error downloading file:", error);
        alert("Failed to download file.");
      }
    } else {
      alert("File data not available for download");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRequirementForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    for (const field of defaultFieldConfig) {
      if (isFieldRequired(field.id, true, field.required) && !isFieldHidden(field.id)) {
        const value = requirementForm[field.id];
        if (!value || (typeof value === 'string' && !value.trim())) {
          alert(`${getFieldLabel(field.id, field.label)} is required.`);
          return false;
        }
      }
    }
    
    for (const field of dynamicFields) {
      if (field.required) {
        const value = field.value;
        if (!value || (typeof value === 'string' && !value.trim())) {
          alert(`${field.label} is required.`);
          return false;
        }
      }
    }
    
    const totalSize = requirementAttachments.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      alert("Total attachments size exceeds 10 MB.");
      return false;
    }
    
    return true;
  };

  const saveRequirement = async () => {
    if (!validateForm()) return;
    if (!currentUser) { alert("User not authenticated."); return; }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      
      Object.keys(requirementForm).forEach((key) => {
        if (requirementForm[key]) {
          formData.append(key, requirementForm[key]);
        }
      });
      
      // Add dynamic fields with label-based keys
      dynamicFields.forEach((field) => {
        const key = field.label.replace(/\s+/g, "_").toLowerCase();
        if (field.value) {
          formData.append(key, field.value);
        }
      });
      
      if (!editingRequirement) {
        formData.append("createdBy", currentUser.id);
        formData.append("createdByEmail", currentUser.email);
        formData.append("createdByName", `${currentUser.firstName} ${currentUser.lastName}`);
        formData.append("createdByEmployeeId", currentUser.employeeId);
        formData.append("createdAt", new Date().toISOString());
      }
      formData.append("updatedAt", new Date().toISOString());
      formData.append("dynamicFieldsConfig", JSON.stringify(dynamicFields));




     
requirementAttachments.forEach((file) => {
  if (file.file instanceof File) {
    formData.append("fileUploads", file.file);
  }
});
      if (editingRequirement) {
        await api.put(`/update-requirement/${editingRequirement._id || editingRequirement.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Requirement updated successfully!");
        navigate("/all-requirements");
      } else {
await api.post("/add-requirement", formData, {
  headers: {
    "Content-Type": "multipart/form-data"
  }
});

alert("Requirement added successfully!");

// ✅ clear cache
localStorage.removeItem("requirementsCache");

// ✅ trigger refresh
window.dispatchEvent(new Event("requirementAdded"));

// ✅ reset form
resetForm();
      }
      
    } catch (error) {
      console.error("Error saving requirement:", error);
      alert("Failed to save requirement. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

 const resetForm = () => {
  setRequirementForm({
    clientName: "",
    requirementReceivedDate: "",
    clientLocation: "", // ✅ MUST ADD
    agent: "",
    process: "",
    designationPosition: "",
    requirementType: "",
    noOfRequirement: "",
    driveDate: "",
    requirementDeadline: "",
    budget: "",
    payoutCommissionRs: "",
    payoutCommissionPercent: "",
    additionalNotes: "",
  });

  setRequirementAttachments([]);
  setEditingRequirement(null);
  loadDynamicFieldsFromDB();
};

  const getFileIcon = (fileType) => {
    if (fileType?.includes("pdf")) return "📕";
    if (fileType?.includes("image")) return "🖼️";
    if (fileType?.includes("word") || fileType?.includes("document")) return "📝";
    if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) return "📊";
    if (fileType?.includes("text")) return "📄";
    return "📎";
  };

  const allFields = [
    ...defaultFieldConfig,
    ...dynamicFields.map(f => ({ ...f, isDefault: false }))
  ].filter(field => {
    if (field.isDefault && isFieldHidden(field.id)) return false;
    return true;
  }).filter(field =>
    field.label.toLowerCase().includes(searchField.toLowerCase())
  );

  const themeStyles = {
    background: isDarkMode ? "bg-gray-900" : "bg-gray-100",
    text: isDarkMode ? "text-white" : "text-gray-900",
    secondaryText: isDarkMode ? "text-gray-300" : "text-gray-600",
    card: isDarkMode ? "bg-gray-800" : "bg-white",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
    input: isDarkMode
      ? "bg-gray-700 border-gray-600 text-white"
      : "bg-white border-gray-300 text-gray-900",
    tableHeader: isDarkMode ? "bg-gray-700" : "bg-gray-200",
    tableRow: isDarkMode
      ? "border-gray-700 hover:bg-gray-700"
      : "border-gray-200 hover:bg-gray-50",
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

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.background} ${themeStyles.text} transition-colors duration-200`}>
      {/* FORM MANAGEMENT POPUP */}
      {showFormManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 rounded-lg w-96 shadow-lg`}>
            <h2 className="text-xl font-bold mb-4 text-center">⚙️ Form Management</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowFormManager(false);
                  setShowNewFieldPopup(true);
                }}
                className="w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
              >
                ➕ Add New Form Field
              </button>
              <button
                onClick={() => {
                  setShowEditFieldsPopup(true);
                  setShowFormManager(false);
                }}
                className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
              >
                ✏️ Edit Existing Fields
              </button>
              <button
                onClick={() => setShowFormManager(false)}
                className="w-full p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                ❌ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW FIELD TYPE POPUP */}
      {showNewFieldPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 rounded-lg w-96 shadow-lg`}>
            <h2 className="text-lg font-bold mb-4 text-center">➕ Select Field Type</h2>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setNewFieldType("text");
                  setShowFieldNamePopup(true);
                  setShowNewFieldPopup(false);
                }} 
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🔤</span> Text
              </button>
              <button 
                onClick={() => {
                  setNewFieldType("longtext");
                  setShowFieldNamePopup(true);
                  setShowNewFieldPopup(false);
                }} 
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>📝</span> Long Text
              </button>
              <button 
                onClick={() => {
                  setNewFieldType("number");
                  setShowFieldNamePopup(true);
                  setShowNewFieldPopup(false);
                }} 
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>🔢</span> Number
              </button>
              <button 
                onClick={() => {
                  setNewFieldType("phone");
                  setShowFieldNamePopup(true);
                  setShowNewFieldPopup(false);
                }} 
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>📞</span> Phone
              </button>
              <button 
                onClick={() => {
                  setNewFieldType("email");
                  setShowFieldNamePopup(true);
                  setShowNewFieldPopup(false);
                }} 
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>📧</span> Email
              </button>
              <button 
                onClick={() => {
                  setNewFieldType("date");
                  setShowFieldNamePopup(true);
                  setShowNewFieldPopup(false);
                }} 
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>📅</span> Date
              </button>
              <button 
                onClick={() => {
                  setNewFieldType("file");
                  setShowFieldNamePopup(true);
                  setShowNewFieldPopup(false);
                }} 
                className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span>📎</span> File Upload
              </button>
              <button 
                onClick={() => setShowNewFieldPopup(false)} 
                className="w-full p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIELD NAME POPUP */}
      {showFieldNamePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 rounded-lg w-96 shadow-lg`}>
            <h2 className="text-lg font-bold mb-4 text-center">✏️ Enter Field Name</h2>
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="Enter field name..."
              className={`${themeStyles.input} border p-3 w-full rounded-lg mb-4`}
              autoFocus
            />
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={newFieldRequired}
                onChange={() => setNewFieldRequired(!newFieldRequired)}
              />
              <span className="text-sm">Required Field</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!newFieldLabel.trim()) {
                    alert("Field name is required");
                    return;
                  }
                  addDynamicField(newFieldType, newFieldLabel, newFieldRequired);
                  setNewFieldLabel("");
                  setNewFieldRequired(false);
                  setShowFieldNamePopup(false);
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowFieldNamePopup(false);
                  setNewFieldLabel("");
                  setNewFieldRequired(false);
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT FIELDS POPUP */}
      {showEditFieldsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${themeStyles.card} p-6 rounded-lg w-[500px] shadow-lg max-h-[80vh] flex flex-col`}>
            <h2 className="text-xl font-bold mb-4 text-center">✏️ Edit All Fields</h2>
            
            <input
              type="text"
              placeholder="🔍 Search field by name..."
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className={`${themeStyles.input} border p-2 w-full mb-3 rounded-lg`}
            />
            
            <p className={`text-xs ${themeStyles.secondaryText} mb-2`}>
              Found {allFields.length} field(s)
            </p>
            
            <div className="space-y-3 overflow-y-auto flex-1 mb-4">
              {allFields.map((field) => (
                <div key={field.id} className={`p-4 rounded-lg ${themeStyles.border} border ${field.isDefault ? 'bg-opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-1">
                      {field.type === "text" && "🔤"}
                      {field.type === "longtext" && "📝"}
                      {field.type === "number" && "🔢"}
                      {field.type === "phone" && "📞"}
                      {field.type === "email" && "📧"}
                      {field.type === "date" && "📅"}
                      {field.type === "file" && "📎"}
                      {field.type === "select" && "📋"}
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1 opacity-70">
                        Field Label {field.isDefault && <span className="text-blue-500">(Default)</span>}
                      </label>
                      <input
                        type="text"
                        value={field.isDefault ? getFieldLabel(field.id, field.label) : field.label}
                        onChange={(e) => updateFieldLabel(field.id, e.target.value, field.isDefault)}
                        className={`${themeStyles.input} border p-2 rounded w-full text-sm`}
                        placeholder="Enter field label"
                      />
                      <p className="text-xs mt-1 opacity-60">
                        Type: {field.type === "longtext" ? "Long Text" : field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id={`required_${field.id}`}
                          checked={isFieldRequired(field.id, field.isDefault, field.required)}
                          onChange={() => toggleRequired(field.id, field.isDefault)}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`required_${field.id}`} className="text-xs cursor-pointer">
                          Required Field
                        </label>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteField(field.id, field.isDefault)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title={field.isDefault ? "Hide field" : "Delete field"}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowEditFieldsPopup(false);
                  setSearchField("");
                }}
                className="flex-1 p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

<div className="w-full">
  <div className="max-w-2xl mx-auto">
          <div className={`${themeStyles.card} p-6 rounded-lg shadow-lg`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingRequirement ? "Edit Requirement" : "Add New Requirement"}
                </h2>
                <p className={`text-sm ${themeStyles.secondaryText} mt-1`}>
                  Fill in the requirement details below
                </p>
              </div>
              <div className="flex gap-3">
                {isAdmin && !editingRequirement && (
                  <button
                    onClick={() => setShowFormManager(true)}
                    className="px-3 py-2 text-sm bg-purple-600  hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span> Form Management
                  </button>
                )}
                {editingRequirement && (
                  <button
                    onClick={() => navigate("/requirements")}
                    className={`px-4 py-2 rounded text-white ${themeStyles.buttonSecondary}`}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Client Name Field */}
              {!isFieldHidden("clientName") && (
                <div>
                  <label className="block mb-2 font-medium">
                    {getFieldLabel("clientName", "Client Name")}
                    {isFieldRequired("clientName", true, true) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                 <select
  name="clientName"
  value={requirementForm.clientName}
  onChange={handleInputChange}
  required={isFieldRequired("clientName", true, true)}
  className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
>
  <option value="">
    {clients.length === 0 ? "Loading clients..." : "Select Client"}
  </option>

  {clients.map((client, index) => (
    <option
      key={client._id || index}
      value={client.clientName || client.name}
    >
      {client.clientName || client.name}
    </option>
  ))}
</select>
                </div>
              )}

              {/* Requirement Received Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

  {/* Requirement Received Date */}
  {!isFieldHidden("requirementReceivedDate") && (
    <div>
      <label className="block mb-2 font-medium">
        {getFieldLabel("requirementReceivedDate", "Requirement Received Date")}
        {isFieldRequired("requirementReceivedDate", true, true) && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>
      <input
        type="date"
        name="requirementReceivedDate"
        value={requirementForm.requirementReceivedDate}
        onChange={handleInputChange}
        required={isFieldRequired("requirementReceivedDate", true, true)}
        className={`${themeStyles.input} border p-3 w-full rounded-lg`}
      />
    </div>
  )}

 {/* Client Location */}
<div>
  <label className="block mb-2 font-medium">
    Client Location <span className="text-red-500">*</span>
  </label>

  <input
    type="text"
    name="clientLocation"
    value={requirementForm.clientLocation || ""}
    onChange={handleInputChange}
    className={`${themeStyles.input} border p-3 w-full rounded-lg`}
    placeholder="Enter client location"
  />
</div>
</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agent */}
                {!isFieldHidden("agent") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("agent", "Agent")}
                      {isFieldRequired("agent", true, true) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      name="agent"
                      value={requirementForm.agent}
                      onChange={handleInputChange}
                      required={isFieldRequired("agent", true, true)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Enter agent name"
                    />
                  </div>
                )}

                {/* Process */}
                {!isFieldHidden("process") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("process", "Process")}
                      {isFieldRequired("process", true, true) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      name="process"
                      value={requirementForm.process}
                      onChange={handleInputChange}
                      required={isFieldRequired("process", true, true)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Enter process name"
                    />
                  </div>
                )}
              </div>

              {/* Designation/Position */}
              {!isFieldHidden("designationPosition") && (
                <div>
                  <label className="block mb-2 font-medium">
                    {getFieldLabel("designationPosition", "Designation/Position")}
                    {isFieldRequired("designationPosition", true, true) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    name="designationPosition"
                    value={requirementForm.designationPosition}
                    onChange={handleInputChange}
                    required={isFieldRequired("designationPosition", true, true)}
                    className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter designation or position"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Requirement Type */}
                {!isFieldHidden("requirementType") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("requirementType", "Requirement Type")}
                      {isFieldRequired("requirementType", true, true) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      name="requirementType"
                      value={requirementForm.requirementType}
                      onChange={handleInputChange}
                      required={isFieldRequired("requirementType", true, true)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    >
                      <option value="">Select Requirement Type</option>
                      <option value="Bonanza">Bonanza</option>
                      <option value="Regular">Regular</option>
                      <option value="FLR">FLR</option>
                    </select>
                  </div>
                )}

                {/* Number of Requirements */}
                {!isFieldHidden("noOfRequirement") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("noOfRequirement", "Number of Requirements")}
                      {isFieldRequired("noOfRequirement", true, false) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="number"
                      name="noOfRequirement"
                      value={requirementForm.noOfRequirement}
                      onChange={handleInputChange}
                      required={isFieldRequired("noOfRequirement", true, false)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Enter number of positions"
                      min="1"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drive Date */}
                {!isFieldHidden("driveDate") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("driveDate", "Drive Date")}
                      {isFieldRequired("driveDate", true, false) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="date"
                      name="driveDate"
                      value={requirementForm.driveDate}
                      onChange={handleInputChange}
                      required={isFieldRequired("driveDate", true, false)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    />
                  </div>
                )}

                {/* Requirement Deadline */}
                {!isFieldHidden("requirementDeadline") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("requirementDeadline", "Requirement Deadline")}
                      {isFieldRequired("requirementDeadline", true, false) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="date"
                      name="requirementDeadline"
                      value={requirementForm.requirementDeadline}
                      onChange={handleInputChange}
                      required={isFieldRequired("requirementDeadline", true, false)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    />
                  </div>
                )}
              </div>

              {/* Budget */}
              {!isFieldHidden("budget") && (
                <div>
                  <label className="block mb-2 font-medium">
                    {getFieldLabel("budget", "Budget")}
                    {isFieldRequired("budget", true, true) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    name="budget"
                    value={requirementForm.budget}
                    onChange={handleInputChange}
                    required={isFieldRequired("budget", true, true)}
                    className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter budget amount"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payout Commission Rs */}
                {!isFieldHidden("payoutCommissionRs") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("payoutCommissionRs", "Payout Commission (₹)")}
                      {isFieldRequired("payoutCommissionRs", true, false) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="number"
                      name="payoutCommissionRs"
                      value={requirementForm.payoutCommissionRs}
                      onChange={handleInputChange}
                      required={isFieldRequired("payoutCommissionRs", true, false)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Enter payout amount"
                      step="0.01"
                    />
                  </div>
                )}

                {/* Payout Commission Percent */}
                {!isFieldHidden("payoutCommissionPercent") && (
                  <div>
                    <label className="block mb-2 font-medium">
                      {getFieldLabel("payoutCommissionPercent", "Payout Commission (%)")}
                      {isFieldRequired("payoutCommissionPercent", true, false) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="number"
                      name="payoutCommissionPercent"
                      value={requirementForm.payoutCommissionPercent}
                      onChange={handleInputChange}
                      required={isFieldRequired("payoutCommissionPercent", true, false)}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                      placeholder="Enter payout percentage"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                  </div>
                )}
              </div>

              {/* RENDER DYNAMIC FIELDS */}
              {dynamicFields.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">📋 Additional Fields</h3>
                  {dynamicFields.map(field => (
                    <div key={field.id} className="mb-4 relative group">
                      <div className="flex justify-between items-center mb-2">
                        <label className="font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {isAdmin && !editingRequirement && (
                          <button
                            onClick={() => removeDynamicField(field.id)}
                            className="text-red-500 hover:text-red-700 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove field"
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>

                      {field.type === "text" && (
                        <input
                          type="text"
                          maxLength={20}
                          value={field.value || ""}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.required}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}

                      {field.type === "longtext" && (
                        <textarea
                          maxLength={100}
                          value={field.value || ""}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.required}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                          rows="3"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}

                      {field.type === "number" && (
                        <input
                          type="number"
                          value={field.value || ""}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.required}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}

                      {field.type === "phone" && (
                        <input
                          type="tel"
                          value={field.value || ""}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.required}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                          placeholder="+91 1234567890"
                        />
                      )}

                      {field.type === "email" && (
                        <input
                          type="email"
                          value={field.value || ""}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.required}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                          placeholder="example@domain.com"
                        />
                      )}

                      {field.type === "date" && (
                        <input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                          required={field.required}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                        />
                      )}

                      {field.type === "file" && (
                        <input
                          type="file"
                          onChange={(e) => handleDynamicChange(field.id, e.target.files[0])}
                          required={field.required}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Additional Notes */}
              {!isFieldHidden("additionalNotes") && (
                <div>
                  <label className="block mb-2 font-medium">
                    {getFieldLabel("additionalNotes", "Additional Notes")}
                    {isFieldRequired("additionalNotes", true, false) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <textarea
                    name="additionalNotes"
                    value={requirementForm.additionalNotes}
                    onChange={handleInputChange}
                    required={isFieldRequired("additionalNotes", true, false)}
                    className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter any additional notes"
                    rows="3"
                  />
                </div>
              )}

              {/* File Upload Section */}
              <div className="border-t pt-6">
                <label className="block mb-4 font-medium text-lg">📎 File Upload (Max 3MB per file, 10MB total)</label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                />
                <div
                  className={`border-2 border-dashed ${themeStyles.border} rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer`}
                  onClick={() => document.getElementById("file-upload").click()}
                >
                  <div className="space-y-2">
                    <span className="text-4xl block">📁</span>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className={`text-sm ${themeStyles.secondaryText}`}>
                      Supported: PDF, DOC, DOCX, XLS, XLSX, Images (JPG, PNG, GIF, BMP), TXT
                    </p>
                  </div>
                </div>

                {Object.keys(requirementUploadProgress).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(requirementUploadProgress).map(([fileId, progress]) => (
                      <div key={fileId} className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs">{progress}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {requirementAttachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium mb-2">Uploaded Files:</h4>
                    {requirementAttachments.map((file) => (
                      <div key={file.id} className={`flex items-center justify-between p-3 ${themeStyles.border} border rounded-lg`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl">{getFileIcon(file.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className={`text-xs ${themeStyles.secondaryText}`}>
                              {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => downloadFile(file)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg" title="Download">📥</button>
                          <button onClick={() => removeAttachment(file.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg" title="Remove">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={saveRequirement}
                  disabled={isLoading}
                  className={`px-6 py-3 rounded-lg text-white ${themeStyles.buttonSuccess} flex-1 font-medium disabled:opacity-60`}
                >
                  {isLoading ? "Saving..." : editingRequirement ? "Update Requirement" : "Save Requirement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequirementFormPage;