import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.webp"; 
import api from "../api";
import RequirementForm from "./RequirementForm";
import Home from "./Home";
import AllRequirements from "./AllRequirements";
import Admin from "./AdminDashboard";
import CandidateDetail from "./CandidateDetail";
import AllCandidates from "./AllCandidates";
import { useLocation } from "react-router-dom";

const ClientOnboardingForm = ({ isAdminView = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

const queryParams = new URLSearchParams(location.search);
const selectedClientName = queryParams.get("name");
  const [currentUser, setCurrentUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({
  newClient: false,
  allClients: false,
  newRequirement: false,
  allRequirement: false,
  newCandidate: false,
  allCandidates: false
});

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isManager = currentUser?.role?.toLowerCase() === "manager";
  const canEditDelete = isAdmin || isManager;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

 const [activePage, setActivePage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handlePageChange = (page) => {
    if (isPageAllowed(page)) {
      setActivePage(page);
      localStorage.setItem("activePage", page);
      setMobileMenuOpen(false);
    }
  };
  
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [editAttachments, setEditAttachments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [selectedClientForAttachments, setSelectedClientForAttachments] = useState(null);
  
  const [editingClientId, setEditingClientId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  // ================== DYNAMIC FIELDS STATE ==================
  const [dynamicFields, setDynamicFields] = useState([]);
  const [showFormManager, setShowFormManager] = useState(false);
  const [showNewFieldPopup, setShowNewFieldPopup] = useState(false);
  const [showEditFieldsPopup, setShowEditFieldsPopup] = useState(false);
  const [newFieldType, setNewFieldType] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [showFieldNamePopup, setShowFieldNamePopup] = useState(false);
  const [searchField, setSearchField] = useState("");
  
  // ================== ADD NEW CLIENT POPUP STATE ==================
  const [showClientPopup, setShowClientPopup] = useState(false);

  const defaultForm = {
    clientName: "",
    clientPocName: "",
    clientPocEmail: "",
    clientPocMobile: "",
    clientVendorEmail: "",
    ourPocName: "",
    startDate: "",
    paymentTerms: "30",
    attachments: [],
  };

  const [clientForm, setClientForm] = useState(defaultForm);

  // ================== DYNAMIC FIELDS FUNCTIONS ==================
  
  // Load dynamic fields from backend
  const loadDynamicFields = async () => {
    try {
      const res = await api.get("/form-fields");
      setDynamicFields(res.data.map(f => ({ ...f, value: "" })));
      console.log("✅ Loaded dynamic fields for clients:", res.data.length);
    } catch (err) {
      console.error("Error loading dynamic fields:", err);
      setDynamicFields([]);
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
    
    if (!window.confirm("Remove this field? It will be removed from ALL clients permanently.")) {
      return;
    }

    try {
      await api.delete(`/form-fields/${id}`);
      await loadDynamicFields();
      alert("✅ Field removed successfully!");
    } catch (err) {
      console.error("Error deleting field:", err);
      alert("Failed to delete field. Please try again.");
    }
  };

  // Update field label in database
  const updateFieldLabelInDB = async (id, newLabel) => {
    try {
      await api.put(`/form-fields/${id}`, { label: newLabel });
      console.log(`✅ Updated field label in DB: ${newLabel}`);
    } catch (err) {
      console.error("Error updating field label in DB:", err);
    }
  };

  // Update field label
  const updateFieldLabel = (id, newLabel) => {
    setDynamicFields(prev =>
      prev.map(f => f.id === id ? { ...f, label: newLabel } : f)
    );
    updateFieldLabelInDB(id, newLabel);
  };

  // Toggle required field in database
  const toggleRequiredInDB = async (id, isRequired) => {
    try {
      await api.put(`/form-fields/${id}`, { required: isRequired });
      console.log(`✅ Updated required status in DB: ${isRequired}`);
    } catch (err) {
      console.error("Error updating required status in DB:", err);
    }
  };

  // Toggle required field
  const toggleRequired = (id) => {
    const field = dynamicFields.find(f => f.id === id);
    const newRequired = !field.required;
    setDynamicFields(prev =>
      prev.map(f => f.id === id ? { ...f, required: newRequired } : f)
    );
    toggleRequiredInDB(id, newRequired);
  };

  // Handle dynamic input change
  const handleDynamicChange = (id, value) => {
    setDynamicFields(prev =>
      prev.map(f => f.id === id ? { ...f, value } : f)
    );
  };

  const isPageAllowed = (page) => {
  if (isAdmin) return true;

  if (!currentUser?.isApproved) return false;

  if (page === "home") return true;
  if (page === "admin") return isAdmin;

  switch(page) {
   case "candidate":
  return userPermissions.newCandidate === true;

case "all-candidates":
  return userPermissions.allCandidates === true;
    case "onboarding":
      return userPermissions.newClient === true;
    case "clients":
      return userPermissions.allClients === true;
    case "requirements":
      return userPermissions.newRequirement === true;
    case "all-requirements":
      return userPermissions.allRequirement === true;
    default:
      return false;
  }
};
 useEffect(() => {
  const userStr = localStorage.getItem("currentUser");
const queryParams = new URLSearchParams(location.search);
const clientName = queryParams.get("name");

if (clientName) {
  setActivePage("clients");
}
  if (!userStr && !isAdminView) {
    navigate("/login");
    return;
  }

  try {
    const user = JSON.parse(userStr);

    setCurrentUser(user);

    // 🔥 STEP 1: Set initial permissions (from localStorage)
    setUserPermissions(user.permissions || {});

    // 🔥 STEP 2: ALWAYS FETCH LATEST PERMISSIONS FROM BACKEND
    const refreshUserPermissions = async () => {
      try {
        const res = await api.get("/users");

        const latestUser = res.data.find(u => u._id === user._id);

        if (latestUser) {
          const latestPermissions = latestUser.permissions || {};

          // ✅ Update state
          setUserPermissions(latestPermissions);

          // ✅ Update localStorage
          const updatedUser = {
            ...user,
            permissions: latestPermissions
          };

          localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error("Permission refresh error:", err);
      }
    };

    refreshUserPermissions();

    // 🔥 STEP 3: Load other data
    loadClients();
    loadDynamicFields();

    // 🔥 STEP 4: Handle active page
    const lastUser = localStorage.getItem("lastUser");
    if (lastUser !== user?.email) {
      localStorage.removeItem("activePage");
    }
    localStorage.setItem("lastUser", user?.email);

    if (!isAdminView) {
      const currentPage = localStorage.getItem("activePage") || "home";

      if (!isPageAllowed(currentPage)) {
        const firstAllowed = getAllowedPages()[0];

        if (firstAllowed) {
          setActivePage(firstAllowed);
          localStorage.setItem("activePage", firstAllowed);
        }
      } else {
        setActivePage(currentPage);
      }
    }

  } catch (error) {
    console.error("Error parsing user data:", error);

    if (!isAdminView) {
      localStorage.removeItem("currentUser");
      navigate("/login");
    }
  }
}, [navigate, isAdminView, location.search]);
const getAllowedPages = () => {
  if (isAdmin) {
   return ["home","admin","onboarding","clients","requirements","all-requirements","candidate","all-candidates"];
  }

  if (!currentUser?.isApproved) return [];

  const allowed = ["home"];

  if (userPermissions.newClient) allowed.push("onboarding");
  if (userPermissions.allClients) allowed.push("clients");
  if (userPermissions.newRequirement) allowed.push("requirements");
  if (userPermissions.allRequirement) allowed.push("all-requirements");

  if (userPermissions.newCandidate) allowed.push("candidate");
if (userPermissions.allCandidates) allowed.push("all-candidates");

  return allowed;
};

  // Load clients
  const loadClients = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/clients");
      
      let clientsData = [];
      
      if (res.data && Array.isArray(res.data)) {
        clientsData = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        clientsData = res.data.data;
      } else if (res.data && res.data.clients && Array.isArray(res.data.clients)) {
        clientsData = res.data.clients;
      } else {
        clientsData = [];
        console.warn("Clients API response is not an array:", res.data);
      }
      
      setClients(
        [...clientsData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    } catch (error) {
      console.error("Error loading clients:", error);
      if (error.response?.status === 401 && !isAdminView) {
        localStorage.removeItem("currentUser");
        navigate("/login");
      } else if (!isAdminView) {
        alert("Failed to load clients. Please check the server.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createClient = async (clientData) => {
    const dataWithUser = {
      ...clientData,
      createdBy: currentUser?.id,
      createdByEmail: currentUser?.email,
      createdByName: `${currentUser?.firstName} ${currentUser?.lastName}`,
      createdByEmployeeId: currentUser?.employeeId,
    };
    const res = await api.post("/add-client", dataWithUser);
    return res.data;
  };

  const updateClient = async (id, clientData) => {
    const res = await api.put(`/update-client/${id}`, clientData);
    return res.data;
  };

  const removeClientFromServer = async (id) => {
    await api.delete(`/delete-client/${id}`);
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newTheme = !prev;
      localStorage.setItem("theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  const themeStyles = {
    background: isDarkMode ? "bg-gray-900" : "bg-gray-100",
    text: isDarkMode ? "text-white" : "text-gray-900",
    secondaryText: isDarkMode ? "text-gray-300" : "text-gray-600",
    card: isDarkMode ? "bg-gray-800" : "bg-white",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
    sidebar: isDarkMode ? "bg-gray-900" : "bg-[#1a1a2e]",
    header: isDarkMode ? "bg-gray-800" : "bg-[#16213e]",
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
          
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          
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
          }, 'image/jpeg', 0.7);
        };
        
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClientForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e, field) => {
    const { value } = e.target;
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsLoading(true);
    
    for (const file of files) {
      try {
        let processedFile = file;

        if (file.type.startsWith("image/")) {
          processedFile = await compressImage(file);
        }

        if (processedFile.size > 3 * 1024 * 1024) {
          alert(`File "${file.name}" still exceeds 3 MB after compression.`);
          continue;
        }

        const fileId = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}-${processedFile.name}`;

        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

        const reader = new FileReader();

        reader.onerror = () => {
          alert(`Failed to read file "${processedFile.name}".`);
          setUploadProgress((prev) => {
            const updated = { ...prev };
            delete updated[fileId];
            return updated;
          });
        };

        reader.onload = (event) => {
          const fileData = {
            id: fileId,
            name: processedFile.name,
            type: processedFile.type,
            size: processedFile.size,
            data: event.target.result,
            uploadedAt: new Date().toISOString(),
          };

          setAttachments((prev) => {
            const updated = [...prev, fileData];
            setClientForm((prevForm) => ({
              ...prevForm,
              attachments: updated,
            }));
            return updated;
          });

          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

          setTimeout(() => {
            setUploadProgress((prev) => {
              const updated = { ...prev };
              delete updated[fileId];
              return updated;
            });
          }, 1000);
        };

        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error("Error processing file:", error);
        alert(`Failed to process file "${file.name}".`);
      }
    }
    
    setIsLoading(false);
    e.target.value = "";
  };

  const handleEditFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
      let processedFile = file;

      if (file.type.startsWith("image/")) {
        processedFile = await compressImage(file);
      }

      if (processedFile.size > 3 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 3 MB.`);
        setIsLoading(false);
        return;
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${processedFile.name}`;
      
      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      const reader = new FileReader();
      
      reader.onloadend = () => {
        const fileData = {
          id: fileId,
          name: processedFile.name,
          type: processedFile.type,
          size: processedFile.size,
          data: reader.result,
          uploadedAt: new Date().toISOString(),
        };
        
        setEditAttachments([fileData]);
        
        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
        
        setTimeout(() => {
          setUploadProgress((prev) => {
            const updated = { ...prev };
            delete updated[fileId];
            return updated;
          });
        }, 1000);
      };
      
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error("Error processing file:", error);
      alert(`Failed to process file "${file.name}".`);
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (fileId) => {
    setAttachments((prev) => prev.filter((f) => f.id !== fileId));
    setClientForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((f) => f.id !== fileId),
    }));
  };

  const removeEditAttachment = (fileId) => {
    setEditAttachments((prev) => prev.filter((f) => f.id !== fileId));
  };

  const downloadFile = (file) => {
    try {
      if (!file.data) {
        alert("File data not available for download");
        return;
      }

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
      alert("Failed to download file. Please try again.");
    }
  };

  const viewAttachments = (client) => {
    setSelectedClientForAttachments(client);
    setShowAttachmentsModal(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const resetForm = () => {
    setClientForm(defaultForm);
    setAttachments([]);
    setEditAttachments([]);
    setSelectedClient(null);
    setEditingClientId(null);
    setEditFormData(null);
    // Reset dynamic field values
    setDynamicFields(prev => prev.map(f => ({ ...f, value: "" })));
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clientForm.clientName?.trim()) { alert("Client Name is required."); return false; }
    if (!clientForm.clientPocName?.trim()) { alert("Client POC Name is required."); return false; }
    if (!clientForm.clientPocEmail?.trim()) { alert("Client POC Email is required."); return false; }
    if (!emailRegex.test(clientForm.clientPocEmail)) { alert("Please enter a valid Client POC email address."); return false; }
    if (!clientForm.clientPocMobile?.trim()) { alert("Client POC Mobile Number is required."); return false; }
    const mobileDigits = clientForm.clientPocMobile.replace(/\D/g, "");
    if (mobileDigits.length !== 10) { alert("Please enter a valid 10-digit mobile number."); return false; }
    if (clientForm.clientVendorEmail && !emailRegex.test(clientForm.clientVendorEmail)) {
      alert("Please enter a valid Vendor email address."); return false;
    }
    if (!clientForm.ourPocName?.trim()) { alert("Our POC Name is required."); return false; }
    if (!clientForm.startDate) { alert("Start Date is required."); return false; }
    
    // Validate dynamic required fields
    for (const field of dynamicFields) {
      if (field.required) {
        const value = field.value;
        if (!value || (typeof value === 'string' && !value.trim())) {
          alert(`${field.label} is required.`);
          return false;
        }
      }
    }
    
    const totalSize = attachments.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) {
      alert("Total attachments size exceeds 10 MB. Please remove some files.");
      return false;
    }
    
    return true;
  };

  const saveClient = async () => {
    if (!validateForm()) return;
    if (!currentUser) { alert("User not authenticated."); return; }

    const mobileDigits = clientForm.clientPocMobile.replace(/\D/g, "");
    const formattedMobile = mobileDigits.replace(/(\d{5})(\d{5})/, "$1-$2");
    const now = new Date();

    const formattedDate = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formattedTime = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const clientData = {
      ...clientForm,
      clientPocMobile: formattedMobile,
      attachments,
      createdBy: currentUser.id,
      createdByEmail: currentUser.email,
      createdByName: `${currentUser.firstName} ${currentUser.lastName}`,
      createdByEmployeeId: currentUser.employeeId,
      updatedAt: now.toISOString(),
      ...(selectedClient
        ? {
            createdAt: selectedClient.createdAt,
            createdDate: selectedClient.createdDate,
            createdTime: selectedClient.createdTime,
          }
        : {
            createdAt: now.toISOString(),
            createdDate: formattedDate,
            createdTime: formattedTime,
          }),
    };

    // ✅ Add dynamic field values using ID-based keys
    dynamicFields.forEach(field => {
      const key = `dynamic_${field.id}`;
      if (field.value) {
        clientData[key] = field.value;
      }
    });
    clientData.dynamicFieldsConfig = JSON.stringify(dynamicFields);

    setIsLoading(true);
    try {
      if (selectedClient) {
        const id = selectedClient._id || selectedClient.id;
        const updated = await updateClient(id, clientData);
        await loadClients();
        alert("Client updated successfully!");
        resetForm();
        setShowClientPopup(false); // Close popup on success
      } else {
        await createClient(clientData);
        await loadClients();
        alert("Client onboarded successfully!");
        resetForm();
        setShowClientPopup(false); // Close popup on success
      }
    } catch (error) {
      console.error("Error saving client:", error);
      if (error.response?.status === 413) {
        alert("File size too large. Please compress images or use smaller files (max 3MB per file, 10MB total).");
      } else if (error.response?.status === 401 && !isAdminView) {
        localStorage.removeItem("currentUser");
        navigate("/login");
      } else {
        alert("Failed to save client. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startEditClient = (client) => {
    setEditingClientId(client._id || client.id);
    setEditFormData({
      clientName: client.clientName || "",
      clientPocName: client.clientPocName || "",
      clientPocEmail: client.clientPocEmail || "",
      clientPocMobile: client.clientPocMobile || "",
      clientVendorEmail: client.clientVendorEmail || client.clientVanderEmail || "",
      ourPocName: client.ourPocName || "",
      startDate: client.startDate ? client.startDate.split("T")[0] : "",
      paymentTerms: client.paymentTerms || "30",
    });
    setEditAttachments([]);
  };

  const cancelEdit = () => {
    setEditingClientId(null);
    setEditFormData(null);
    setEditAttachments([]);
  };

  const saveEditedClient = async (clientId) => {
    if (!editFormData) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editFormData.clientName?.trim()) { alert("Client Name is required."); return; }
    if (!editFormData.clientPocName?.trim()) { alert("Client POC Name is required."); return; }
    if (!editFormData.clientPocEmail?.trim()) { alert("Client POC Email is required."); return; }
    if (!emailRegex.test(editFormData.clientPocEmail)) { alert("Please enter a valid Client POC email address."); return; }
    if (!editFormData.clientPocMobile?.trim()) { alert("Client POC Mobile Number is required."); return; }
    const mobileDigits = editFormData.clientPocMobile.replace(/\D/g, "");
    if (mobileDigits.length !== 10) { alert("Please enter a valid 10-digit mobile number."); return; }
    if (editFormData.clientVendorEmail && !emailRegex.test(editFormData.clientVendorEmail)) {
      alert("Please enter a valid Vendor email address."); return;
    }
    if (!editFormData.ourPocName?.trim()) { alert("Our POC Name is required."); return; }
    if (!editFormData.startDate) { alert("Start Date is required."); return; }

    const formattedMobile = mobileDigits.replace(/(\d{5})(\d{5})/, "$1-$2");
    const now = new Date();

    const formattedDate = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formattedTime = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const clientToUpdate = clients.find(c => (c._id || c.id) === clientId);
    
    const updateData = {
      ...editFormData,
      clientPocMobile: formattedMobile,
      attachments: editAttachments,
      updatedAt: now.toISOString(),
      updatedDate: formattedDate,
      updatedTime: formattedTime,
      createdAt: clientToUpdate?.createdAt,
      createdDate: clientToUpdate?.createdDate,
      createdTime: clientToUpdate?.createdTime,
      createdBy: clientToUpdate?.createdBy,
      createdByEmail: clientToUpdate?.createdByEmail,
      createdByName: clientToUpdate?.createdByName,
      createdByEmployeeId: clientToUpdate?.createdByEmployeeId,
    };
    
    setIsLoading(true);
    try {
      const updated = await updateClient(clientId, updateData);
      await loadClients();
      alert("Client updated successfully!");
      setEditingClientId(null);
      setEditFormData(null);
      setEditAttachments([]);
    } catch (error) {
      console.error("Error updating client:", error);
      alert("Failed to update client. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const deleteClient = async () => {
    if (!clientToDelete) return;
    const id = clientToDelete._id || clientToDelete.id;
    setIsLoading(true);
    try {
      await removeClientFromServer(id);
      setClients((prev) => prev.filter((c) => c._id !== id && c.id !== id));
      if (selectedClient?._id === id || selectedClient?.id === id) resetForm();
      setShowDeleteModal(false);
      setClientToDelete(null);
      alert("Client deleted successfully!");
    } catch (error) {
      console.error("Error deleting client:", error);
      if (error.response?.status === 401 && !isAdminView) {
        localStorage.removeItem("currentUser");
        navigate("/login");
      } else {
        alert("Failed to delete client. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get dynamic field value for table display
  const getDynamicFieldValue = (client, field) => {
    const key = `dynamic_${field.id}`;
    return client[key] !== undefined && client[key] !== null && client[key] !== "" ? client[key] : "-";
  };

  const filteredClients = clients.filter((client) => {

  // 👉 If coming from Home (clicked client)
  if (selectedClientName) {
    return client.clientName === selectedClientName;
  }

  // 👉 Normal search
  return (
    client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientPocName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.ourPocName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientPocEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.clientVendorEmail || client.clientVanderEmail)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientPocMobile?.includes(searchTerm)
  );
});

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

  const logout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("role");
      navigate("/login");
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes("pdf")) return "📕";
    if (fileType?.includes("image")) return "🖼️";
    if (fileType?.includes("word") || fileType?.includes("document")) return "📝";
    if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) return "📊";
    if (fileType?.includes("text")) return "📄";
    return "📎";
  };

  // Combined fields for edit popup
  const allFields = dynamicFields.map(f => ({ ...f, isDefault: false })).filter(field =>
    field.label.toLowerCase().includes(searchField.toLowerCase())
  );

  const allowedPages = getAllowedPages();
  const hasAnyPermission = allowedPages.length > 0 || isAdmin;

  if (currentUser && currentUser?.role?.toLowerCase() !== "admin" && !currentUser.isApproved) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="bg-yellow-500 text-black p-6 rounded-lg text-center shadow-lg max-w-sm">
          <h2 className="text-xl font-bold mb-2">⏳ Waiting for Approval</h2>
          <p>Your account is not approved yet.</p>
          <p>Please contact admin.</p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isAdminView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAnyPermission && currentUser?.role?.toLowerCase() !== "admin") {
    return (
      <div className={`flex items-center justify-center min-h-screen ${themeStyles.background} p-4`}>
        <div className={`${themeStyles.card} p-8 rounded-lg shadow-xl max-w-md text-center`}>
          <div className="mb-4">
            <span className="text-6xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className={`${themeStyles.secondaryText} mb-4`}>
            You don't have permission to view this page.
          </p>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col md:flex-row min-h-screen ${themeStyles.background} ${themeStyles.text} transition-colors duration-200`}>
      
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

      {/* SIDEBAR - Responsive */}
      <div className={`
        fixed md:relative z-40
        w-64 ${themeStyles.sidebar} text-white flex flex-col
        transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-full overflow-y-auto
      `}>
        <div className="p-6 text-center border-b border-gray-700">
          <img src={logo} alt="Company Logo" className="h-12 w-auto mx-auto mb-3 bg-white p-1 rounded-lg" />
          <h1 className="text-xl font-bold text-yellow-400">
            {isAdminView ? "Admin View" : "Client Onboarding"}
          </h1>
          <p className="text-sm text-gray-400 mt-1 truncate">{currentUser?.employeeId}</p>
          <p className="text-xs text-blue-300 mt-1 truncate">{currentUser?.email}</p>
        </div>
        

        <ul className="mt-4 flex-1">
          <li
            onClick={() => handlePageChange("home")}
            className={`px-6 py-3 cursor-pointer flex items-center gap-2 ${
              activePage === "home" ? "bg-blue-600" : "hover:bg-blue-500"
            }`}
          >
            <span>🏠</span> Home
          </li>
          {isAdmin && (
  <li
    onClick={() => handlePageChange("admin")}
    className="px-6 py-3 cursor-pointer transition-colors flex items-center gap-2 hover:bg-blue-500"
  >
    <span>🛠️</span> Admin
  </li>
)}

          

          {(isAdmin || (currentUser?.isApproved && userPermissions.allClients)) && (
            <li
              onClick={() => handlePageChange("clients")}
              className={`px-6 py-3 cursor-pointer transition-colors flex items-center gap-2 ${
                activePage === "clients" ? "bg-blue-600" : "hover:bg-blue-500"
              }`}
            >
              <span>👥</span>  Clients
            </li>
          )}

         

          {(isAdmin || (currentUser?.isApproved && userPermissions.allRequirement)) && (
            <li
              onClick={() => handlePageChange("all-requirements")}
              className={`px-6 py-3 cursor-pointer transition-colors flex items-center gap-2 ${
                activePage === "all-requirements" ? "bg-blue-600" : "hover:bg-blue-500"
              }`}
            >
              <span>📋</span> Requirements
            </li>
          )}
         
{(isAdmin || (currentUser?.isApproved && userPermissions.allCandidates)) && (
  <li 
    onClick={() => handlePageChange("all-candidates")}
    className={`px-6 py-3 cursor-pointer flex items-center gap-2 ${
      activePage === "all-candidates" ? "bg-blue-600" : "hover:bg-blue-500"
    }`}
  >
    <span>📊</span>  Candidates
  </li>
)}
        </ul>

        <div className="p-4 text-xs text-gray-400 border-t border-gray-700">
          <div className="mb-2">
            <p className="font-medium text-gray-300">Total Clients</p>
            <p className="text-xl text-yellow-400">{clients.length}</p>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <img src={logo} alt="" className="h-4 w-auto opacity-50" />
            <span>© 2026 All rights reserved</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* HEADER - Responsive */}
        <div className={`${themeStyles.header} text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4`}>
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-8 w-auto bg-white p-1 rounded" />
            <h1 className="text-lg sm:text-xl font-semibold">
              
              {activePage === "onboarding" && (selectedClient ? "✏️ Edit Client" : "New Client Onboarding")}
              {activePage === "clients" && "👥 All Clients"}
              {activePage === "requirements" && "📝 Requirement Form"}
              {activePage === "all-requirements" && "📋 All Requirements"}
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs sm:text-sm hidden md:block">
              <span>Welcome, {currentUser?.firstName} {currentUser?.lastName}</span>
              <span className="text-xs text-yellow-300 ml-2">({currentUser?.email})</span>
            </div>
            
            {!isAdminView && (
              <button
                onClick={logout}
                className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
              >
                <span>🚪</span>
                <span className="hidden md:inline">Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activePage === "home" && <Home />}
          {activePage === "admin" && <Admin />}
         {activePage === "candidate" && isPageAllowed("candidate") && <CandidateDetail />}

{activePage === "all-candidates" && isPageAllowed("all-candidates") && <AllCandidates />}
          {/* Requirements Form Page */}
          {(activePage === "requirements") && (isAdmin || (currentUser?.isApproved && userPermissions.newRequirement)) && (
            <div className={`${themeStyles.card} p-4 sm:p-6 rounded-lg shadow-lg`}>
              <RequirementForm />
            </div>
          )}

          {/* All Requirements Page */}
          {(activePage === "all-requirements") && (isAdmin || (currentUser?.isApproved && userPermissions.allRequirement)) && (
            <div className={`${themeStyles.card} p-4 sm:p-6 rounded-lg shadow-lg`}>
              <AllRequirements />
            </div>
          )}

          {/* Onboarding Form Page */}
          {(activePage === "onboarding") && (isAdmin || (currentUser?.isApproved && userPermissions.newClient)) && (
            <div className="max-w-4xl mx-auto">
              <div className={`${themeStyles.card} p-4 sm:p-6 rounded-lg shadow-lg mb-6`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">
                      {selectedClient ? "Edit Client" : "Onboard New Client"}
                    </h2>
                    <p className={`text-xs sm:text-sm ${themeStyles.secondaryText} mt-1`}>
                      Fill in the client details below
                    </p>
                    <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                      Logged in as: <span className="text-blue-500">{currentUser?.email}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setShowFormManager(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
                      >
                        <span>⚙️</span> Form Management
                      </button>
                    )}
                    {selectedClient && (
                      <button
                        onClick={resetForm}
                        className={`px-4 py-2 rounded text-white ${themeStyles.buttonSecondary} transition-colors text-sm w-full sm:w-auto`}
                      >
                        New Client
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Client Name */}
                  <div>
                    <label className="block mb-2 font-medium text-sm sm:text-base">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="clientName"
                      value={clientForm.clientName}
                      onChange={handleInputChange}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                      placeholder="Enter client company name"
                      autoComplete="off"
                    />
                  </div>

                  {/* Client POC Name & Email - Responsive Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">
                        Client POC Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="clientPocName"
                        value={clientForm.clientPocName}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                        placeholder="Enter client point of contact name"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">
                        Client POC Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="clientPocEmail"
                        value={clientForm.clientPocEmail}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                        placeholder="Enter client POC email"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {/* Mobile & Vendor Email - Responsive Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">
                        Client POC Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="clientPocMobile"
                        value={clientForm.clientPocMobile}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                        placeholder="Enter 10-digit mobile number"
                        maxLength="10"
                        autoComplete="off"
                      />
                      <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                        Enter 10-digit mobile number
                      </p>
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">Client Vendor Email</label>
                      <input
                        type="email"
                        name="clientVendorEmail"
                        value={clientForm.clientVendorEmail}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                        placeholder="Enter client vendor email"
                        autoComplete="off"
                      />
                      <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                        Optional: vendor email for billing
                      </p>
                    </div>
                  </div>

                  {/* Our POC Name & Start Date - Responsive Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">
                        Our POC Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="ourPocName"
                        value={clientForm.ourPocName}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                        placeholder="Enter our point of contact name"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={clientForm.startDate}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                      />
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <label className="block mb-2 font-medium text-sm sm:text-base">
                      Payment Terms <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="paymentTerms"
                      value={clientForm.paymentTerms}
                      onChange={handleInputChange}
                      className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                    >
                      <option value="15">15 Days</option>
                      <option value="30">30 Days</option>
                      <option value="45">45 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {/* DYNAMIC FIELDS - RENDER HERE */}
                  {dynamicFields.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-4">📋 Additional Fields</h3>
                      {dynamicFields.map(field => (
                        <div key={field.id} className="mb-4">
                          <label className="block mb-2 font-medium text-sm sm:text-base">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type={field.type === "number" ? "number" : "text"}
                            value={field.value || ""}
                            onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                            required={field.required}
                            className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="border-t pt-6">
                    <label className="block mb-4 font-medium text-base sm:text-lg">📎 Attachments (Max 3MB per file, 10MB total)</label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                    />
                    <div
                      className={`border-2 border-dashed ${themeStyles.border} rounded-lg p-4 sm:p-6 text-center hover:border-blue-500 transition-colors cursor-pointer`}
                      onClick={() => document.getElementById("file-upload").click()}
                    >
                      <div className="space-y-2">
                        <span className="text-3xl sm:text-4xl block">📁</span>
                        <p className="font-medium text-sm sm:text-base">Click to upload or drag and drop</p>
                        <p className={`text-xs sm:text-sm ${themeStyles.secondaryText}`}>
                          Supported: PDF, DOC, DOCX, XLS, XLSX, Images (JPG, PNG, GIF, BMP), TXT (max 3 MB each)
                        </p>
                      </div>
                    </div>

                    {Object.keys(uploadProgress).length > 0 && (
                      <div className="mt-4 space-y-2">
                        {Object.entries(uploadProgress).map(([fileId, progress]) => (
                          <div key={fileId} className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs">{progress}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium mb-2 text-sm sm:text-base">Uploaded Files:</h4>
                        {attachments.map((file) => (
                          <div
                            key={file.id}
                            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 ${themeStyles.border} border rounded-lg gap-3`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-2xl">{getFileIcon(file.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-sm">{file.name}</p>
                                <p className={`text-xs ${themeStyles.secondaryText}`}>
                                  {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 self-end sm:self-center">
                              <button
                                onClick={() => downloadFile(file)}
                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Download"
                              >
                                📥
                              </button>
                              <button
                                onClick={() => removeAttachment(file.id)}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                title="Remove"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Responsive */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <button
                      onClick={saveClient}
                      disabled={isLoading}
                      className={`px-6 py-3 rounded-lg text-white ${themeStyles.buttonSuccess} transition-colors flex items-center gap-2 justify-center font-medium disabled:opacity-60 text-sm sm:text-base`}
                    >
                      <span>💾</span>
                      {isLoading ? "Saving…" : selectedClient ? "Update Client" : "Save Client"}
                    </button>
                    {selectedClient && (
                      <button
                        onClick={resetForm}
                        disabled={isLoading}
                        className={`px-6 py-3 rounded-lg text-white ${themeStyles.buttonSecondary} transition-colors flex items-center gap-2 justify-center font-medium disabled:opacity-60 text-sm sm:text-base`}
                      >
                        <span>🔄</span> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLIENT LIST - Responsive with Dynamic Fields */}
          {(activePage === "clients") && (isAdmin || (currentUser?.isApproved && userPermissions.allClients)) && (
            <div className={`${themeStyles.card} p-4 sm:p-6 rounded-lg shadow-lg`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <h2 className="text-xl font-semibold">All Clients</h2>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                    {filteredClients.length} total
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${themeStyles.input} border p-2 rounded-lg w-full md:w-64 text-sm`}
                  />
                  {(isAdmin || (currentUser?.isApproved && userPermissions.newClient)) && (
                    <button
                      onClick={() => { 
                        resetForm(); 
                        setShowClientPopup(true);
                      }}
                      className={`px-4 py-2 rounded-lg text-white ${themeStyles.button} flex items-center gap-2 justify-center whitespace-nowrap text-sm`}
                    >
                      <span>➕</span> Add New
                    </button>
                  )}
                </div>
              </div>
              
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
                  <p className={`mt-4 ${themeStyles.secondaryText}`}>Loading clients...</p>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl mb-4 block opacity-50">👥</span>
                  <p className={`text-lg ${themeStyles.secondaryText} mb-2`}>No clients found</p>
                  <p className={`text-sm ${themeStyles.secondaryText} mb-4`}>
                    {searchTerm ? "Try a different search term" : "Add your first client to get started"}
                  </p>
                  {!searchTerm && (isAdmin || (currentUser?.isApproved && userPermissions.newClient)) && (
                    <button
                      onClick={() => {
                        resetForm();
                        setShowClientPopup(true);
                      }}
                      className={`px-6 py-2 rounded-lg text-white ${themeStyles.button} inline-flex items-center gap-2 text-sm`}
                    >
                      <span>➕</span> Add New Client
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-[1200px] w-full text-xs sm:text-sm">
                    <thead>
                      <tr className={themeStyles.tableHeader}>
                        <th className="p-3 text-left">S.No</th>
                        <th className="p-3 text-left">Client Name</th>
                        <th className="p-3 text-left">Client POC Name</th>
                        <th className="p-3 text-left">Client POC Email</th>
                        <th className="p-3 text-left">Client POC Mobile</th>
                        <th className="p-3 text-left">Client Vendor Email</th>
                        <th className="p-3 text-left">Our POC Name</th>
                        <th className="p-3 text-left">Start Date</th>
                        <th className="p-3 text-left">Payment Terms</th>
                        <th className="p-3 text-left">Attachments</th>
                        {/* DYNAMIC FIELDS HEADERS */}
                        {dynamicFields.map(field => (
                          <th key={field.id} className="p-3 text-left">{field.label}</th>
                        ))}
                        <th className="p-3 text-left">Added On</th>
                        <th className="p-3 text-left">Created By</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client, index) => {
                        const isEditing = editingClientId === (client._id || client.id);
                        const clientId = client._id || client.id;
                        
                        return (
                          <tr
                            key={clientId}
                            className={`border-b ${themeStyles.border} ${themeStyles.tableRow}`}
                          >
                            <td className="p-3">{index + 1} </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.clientName || ""}
                                  onChange={(e) => handleEditInputChange(e, "clientName")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                />
                              ) : (
                                <span className="font-medium text-sm">{client.clientName}</span>
                              )}
                             </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.clientPocName || ""}
                                  onChange={(e) => handleEditInputChange(e, "clientPocName")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                />
                              ) : (
                                <span className="text-sm">{client.clientPocName}</span>
                              )}
                             </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="email"
                                  value={editFormData?.clientPocEmail || ""}
                                  onChange={(e) => handleEditInputChange(e, "clientPocEmail")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                />
                              ) : (
                                <a href={`mailto:${client.clientPocEmail}`} className="text-blue-500 hover:underline text-sm break-all">
                                  {client.clientPocEmail}
                                </a>
                              )}
                             </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="tel"
                                  value={editFormData?.clientPocMobile || ""}
                                  onChange={(e) => handleEditInputChange(e, "clientPocMobile")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                  maxLength="10"
                                />
                              ) : (
                                <a href={`tel:${client.clientPocMobile}`} className="text-blue-500 hover:underline text-sm">
                                  {client.clientPocMobile}
                                </a>
                              )}
                             </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="email"
                                  value={editFormData?.clientVendorEmail || ""}
                                  onChange={(e) => handleEditInputChange(e, "clientVendorEmail")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                  placeholder="Optional"
                                />
                              ) : (
                                (client.clientVendorEmail || client.clientVanderEmail) ? (
                                  <a
                                    href={`mailto:${client.clientVendorEmail || client.clientVanderEmail}`}
                                    className="text-blue-500 hover:underline text-sm break-all"
                                  >
                                    {client.clientVendorEmail || client.clientVanderEmail}
                                  </a>
                                ) : "-"
                              )}
                             </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="text"
                                  value={editFormData?.ourPocName || ""}
                                  onChange={(e) => handleEditInputChange(e, "ourPocName")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                />
                              ) : (
                                <span className="text-sm">{client.ourPocName}</span>
                              )}
                             </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <input
                                  type="date"
                                  value={editFormData?.startDate || ""}
                                  onChange={(e) => handleEditInputChange(e, "startDate")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                />
                              ) : (
                                <span className="text-sm">{client.startDate ? new Date(client.startDate).toLocaleDateString("en-IN") : "-"}</span>
                              )}
                             </td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <select
                                  value={editFormData?.paymentTerms || "30"}
                                  onChange={(e) => handleEditInputChange(e, "paymentTerms")}
                                  className={`${themeStyles.input} border p-2 w-full rounded text-sm`}
                                >
                                  <option value="15">15 Days</option>
                                  <option value="30">30 Days</option>
                                  <option value="45">45 Days</option>
                                  <option value="60">60 Days</option>
                                  <option value="90">90 Days</option>
                                </select>
                              ) : (
                                <span className="text-sm">{client.paymentTerms || "30"} Days</span>
                              )}
                             </td>
                            <td className="p-3">
                              {client.attachments?.length > 0 ? (
                                <button
                                  onClick={() => viewAttachments(client)}
                                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline transition-colors text-sm"
                                  title="View and download attachments"
                                >
                                  📎 {client.attachments.length} file(s)
                                </button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                             </td>
                            {/* DYNAMIC FIELDS VALUES */}
                            {dynamicFields.map(field => (
                              <td key={field.id} className="p-3">
                                {getDynamicFieldValue(client, field)}
                              </td>
                            ))}
                            <td className="p-3">
                              {client.updatedDate ? (
                                <div>
                                  <div className="text-yellow-400 font-medium text-xs">
                                    {client.updatedDate}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {client.updatedTime}
                                  </div>
                                  <div className="text-xs text-green-400 mt-1">
                                    Created: {client.createdDate || ""}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-green-400 font-medium text-xs">
                                    {client.createdDate || formatDate(client.createdAt)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {client.createdTime || ""}
                                  </div>
                                </div>
                              )}
                             </td>
                            <td className="p-3 text-xs">{client.createdByName || client.createdByEmail || "Unknown"}</td>
                            <td className="p-3">
                              {isEditing && canEditDelete ? (
                                <div className="space-y-2 min-w-[200px]">
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Replace File:</label>
                                    <input
                                      type="file"
                                      onChange={handleEditFileUpload}
                                      className={`${themeStyles.input} border p-1 rounded text-xs w-full`}
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                                      disabled={isLoading}
                                    />
                                  </div>
                                  
                                  {editAttachments.length > 0 && (
                                    <div className="text-xs">
                                      <p className="font-medium text-green-400">New File:</p>
                                      {editAttachments.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between gap-2 mt-1 p-2 bg-gray-700 rounded">
                                          <span className="truncate flex-1 text-xs">{file.name}</span>
                                          <button
                                            onClick={() => removeEditAttachment(file.id)}
                                            className="text-red-400 hover:text-red-300"
                                            title="Remove"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={() => saveEditedClient(clientId)}
                                      className="flex-1 p-2 text-green-600 hover:bg-green-100 rounded transition-colors text-xs"
                                      title="Save"
                                      disabled={isLoading}
                                    >
                                      {isLoading ? "⏳" : "💾"} Save
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="flex-1 p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors text-xs"
                                      title="Cancel"
                                      disabled={isLoading}
                                    >
                                      ❌ Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                canEditDelete && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => startEditClient(client)}
                                      className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                      title="Edit Client"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => confirmDelete(client)}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                                      title="Delete Client"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )
                              )}
                              </td>
                            </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD NEW CLIENT FULL FORM POPUP - FIXED VERSION */}
      {showClientPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden relative">
            {/* Close Button - Moved higher and to the right */}
            <button
              onClick={() => {
                setShowClientPopup(false);
                resetForm();
              }}
              className="absolute top-2 right-2 z-50 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-lg flex items-center gap-1 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>

            {/* Full Client Form */}
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-5xl mx-auto">
                <div className={`${themeStyles.card} p-4 sm:p-6 rounded-lg shadow-lg`}>
                  {/* Header with proper spacing to avoid close button overlap */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pr-28 pt-2">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold">
                        Add New Client
                      </h2>
                      <p className={`text-xs sm:text-sm ${themeStyles.secondaryText} mt-1`}>
                        Fill in the client details below
                      </p>
                      <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                        Logged in as: <span className="text-blue-500">{currentUser?.email}</span>
                      </p>
                    </div>
                    {/* Form Management Button - Only for Admin */}
                    {isAdmin && (
                      <button
                        onClick={() => setShowFormManager(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <span>⚙️</span> Form Management
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Client Name */}
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">
                        Client Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="clientName"
                        value={clientForm.clientName}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                        placeholder="Enter client company name"
                        autoComplete="off"
                      />
                    </div>

                    {/* Client POC Name & Email - Responsive Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 font-medium text-sm sm:text-base">
                          Client POC Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="clientPocName"
                          value={clientForm.clientPocName}
                          onChange={handleInputChange}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                          placeholder="Enter client point of contact name"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm sm:text-base">
                          Client POC Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="clientPocEmail"
                          value={clientForm.clientPocEmail}
                          onChange={handleInputChange}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                          placeholder="Enter client POC email"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* Mobile & Vendor Email - Responsive Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 font-medium text-sm sm:text-base">
                          Client POC Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="clientPocMobile"
                          value={clientForm.clientPocMobile}
                          onChange={handleInputChange}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                          placeholder="Enter 10-digit mobile number"
                          maxLength="10"
                          autoComplete="off"
                        />
                        <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                          Enter 10-digit mobile number
                        </p>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm sm:text-base">Client Vendor Email</label>
                        <input
                          type="email"
                          name="clientVendorEmail"
                          value={clientForm.clientVendorEmail}
                          onChange={handleInputChange}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                          placeholder="Enter client vendor email"
                          autoComplete="off"
                        />
                        <p className={`text-xs ${themeStyles.secondaryText} mt-1`}>
                          Optional: vendor email for billing
                        </p>
                      </div>
                    </div>

                    {/* Our POC Name & Start Date - Responsive Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 font-medium text-sm sm:text-base">
                          Our POC Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="ourPocName"
                          value={clientForm.ourPocName}
                          onChange={handleInputChange}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                          placeholder="Enter our point of contact name"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 font-medium text-sm sm:text-base">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={clientForm.startDate}
                          onChange={handleInputChange}
                          className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                        />
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div>
                      <label className="block mb-2 font-medium text-sm sm:text-base">
                        Payment Terms <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="paymentTerms"
                        value={clientForm.paymentTerms}
                        onChange={handleInputChange}
                        className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                      >
                        <option value="15">15 Days</option>
                        <option value="30">30 Days</option>
                        <option value="45">45 Days</option>
                        <option value="60">60 Days</option>
                        <option value="90">90 Days</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {/* DYNAMIC FIELDS - RENDER HERE */}
                    {dynamicFields.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-4">📋 Additional Fields</h3>
                        {dynamicFields.map(field => (
                          <div key={field.id} className="mb-4">
                            <label className="block mb-2 font-medium text-sm sm:text-base">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                              type={field.type === "number" ? "number" : "text"}
                              value={field.value || ""}
                              onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                              required={field.required}
                              className={`${themeStyles.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base`}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Attachments */}
                    <div className="border-t pt-6">
                      <label className="block mb-4 font-medium text-base sm:text-lg">📎 Attachments (Max 3MB per file, 10MB total)</label>
                      <input
                        id="file-upload-popup"
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.txt"
                      />
                      <div
                        className={`border-2 border-dashed ${themeStyles.border} rounded-lg p-4 sm:p-6 text-center hover:border-blue-500 transition-colors cursor-pointer`}
                        onClick={() => document.getElementById("file-upload-popup").click()}
                      >
                        <div className="space-y-2">
                          <span className="text-3xl sm:text-4xl block">📁</span>
                          <p className="font-medium text-sm sm:text-base">Click to upload or drag and drop</p>
                          <p className={`text-xs sm:text-sm ${themeStyles.secondaryText}`}>
                            Supported: PDF, DOC, DOCX, XLS, XLSX, Images (JPG, PNG, GIF, BMP), TXT (max 3 MB each)
                          </p>
                        </div>
                      </div>

                      {Object.keys(uploadProgress).length > 0 && (
                        <div className="mt-4 space-y-2">
                          {Object.entries(uploadProgress).map(([fileId, progress]) => (
                            <div key={fileId} className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs">{progress}%</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="font-medium mb-2 text-sm sm:text-base">Uploaded Files:</h4>
                          {attachments.map((file) => (
                            <div
                              key={file.id}
                              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 ${themeStyles.border} border rounded-lg gap-3`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-2xl">{getFileIcon(file.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate text-sm">{file.name}</p>
                                  <p className={`text-xs ${themeStyles.secondaryText}`}>
                                    {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 self-end sm:self-center">
                                <button
                                  onClick={() => downloadFile(file)}
                                  className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Download"
                                >
                                  📥
                                </button>
                                <button
                                  onClick={() => removeAttachment(file.id)}
                                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Remove"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Responsive */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                      <button
                        onClick={saveClient}
                        disabled={isLoading}
                        className={`px-6 py-3 rounded-lg text-white ${themeStyles.buttonSuccess} transition-colors flex items-center gap-2 justify-center font-medium disabled:opacity-60 text-sm sm:text-base`}
                      >
                        <span>💾</span>
                        {isLoading ? "Saving…" : "Save Client"}
                      </button>
                      <button
                        onClick={() => {
                          resetForm();
                          setShowClientPopup(false);
                        }}
                        disabled={isLoading}
                        className={`px-6 py-3 rounded-lg text-white ${themeStyles.buttonSecondary} transition-colors flex items-center gap-2 justify-center font-medium disabled:opacity-60 text-sm sm:text-base`}
                      >
                        <span>❌</span> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div key={field.id} className={`p-4 rounded-lg ${themeStyles.border} border`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-1">
                      {field.type === "text" && "🔤"}
                      {field.type === "longtext" && "📝"}
                      {field.type === "number" && "🔢"}
                      {field.type === "phone" && "📞"}
                      {field.type === "email" && "📧"}
                      {field.type === "date" && "📅"}
                      {field.type === "file" && "📎"}
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1 opacity-70">
                        Field Label
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateFieldLabel(field.id, e.target.value)}
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
                          checked={field.required}
                          onChange={() => toggleRequired(field.id)}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`required_${field.id}`} className="text-xs cursor-pointer">
                          Required Field
                        </label>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeDynamicField(field.id)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete field"
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

      {/* Delete Confirmation Modal - Responsive */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} p-6 rounded-lg shadow-xl max-w-md w-full mx-4`}>
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6 text-sm">
              Are you sure you want to delete client "{clientToDelete?.clientName}"?
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setClientToDelete(null); }}
                className={`px-4 py-2 rounded ${themeStyles.buttonSecondary} text-white text-sm`}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={deleteClient}
                className={`px-4 py-2 rounded ${themeStyles.buttonDanger} text-white text-sm`}
                disabled={isLoading}
              >
                {isLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal - Responsive */}
      {showAttachmentsModal && selectedClientForAttachments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${themeStyles.card} p-4 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sticky top-0 bg-inherit z-10 pb-2">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold">
                  Attachments - {selectedClientForAttachments.clientName}
                </h3>
                <p className={`text-xs sm:text-sm ${themeStyles.secondaryText} mt-1`}>
                  {selectedClientForAttachments.attachments?.length || 0} file(s) attached
                </p>
              </div>
              <button
                onClick={() => setShowAttachmentsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl mt-2 sm:mt-0"
              >
                ×
              </button>
            </div>
            
            {selectedClientForAttachments.attachments?.length > 0 ? (
              <div className="space-y-3">
                {selectedClientForAttachments.attachments.map((file, index) => (
                  <div
                    key={file.id || index}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 ${themeStyles.border} border rounded-lg hover:shadow-md transition-all gap-3`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-3xl">
                        {getFileIcon(file.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{file.name}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          <p className={`text-xs ${themeStyles.secondaryText}`}>
                            {formatFileSize(file.size)}
                          </p>
                          <p className={`text-xs ${themeStyles.secondaryText}`}>
                            Uploaded {formatDate(file.uploadedAt)}
                          </p>
                          {file.type && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <button
                        onClick={() => downloadFile(file)}
                        className={`px-3 py-2 rounded-lg text-white ${themeStyles.button} flex items-center gap-2 transition-colors hover:scale-105 text-sm`}
                        title="Download"
                      >
                        <span>📥</span>
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      {file.type?.includes('image') && (
                        <button
                          onClick={() => {
                            const imageWindow = window.open();
                            if (imageWindow && file.data) {
                              imageWindow.document.write(`
                                <html>
                                  <head>
                                    <title>${file.name}</title>
                                    <style>
                                      body {
                                        margin: 0;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        min-height: 100vh;
                                        background: #1a1a1a;
                                      }
                                      img {
                                        max-width: 100%;
                                        max-height: 100vh;
                                        object-fit: contain;
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <img src="${file.data}" alt="${file.name}" />
                                  </body>
                                </html>
                              `);
                              imageWindow.document.close();
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-white ${themeStyles.buttonSecondary} flex items-center gap-2 transition-colors hover:scale-105 text-sm`}
                          title="Preview"
                        >
                          <span>👁️</span>
                          <span className="hidden sm:inline">Preview</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-5xl mb-4 block opacity-50">📂</span>
                <p className={`text-lg ${themeStyles.secondaryText}`}>No attachments found</p>
                <p className={`text-sm ${themeStyles.secondaryText} mt-2`}>
                  This client has no uploaded files
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientOnboardingForm;