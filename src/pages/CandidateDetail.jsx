import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// ✅ CORRECTED: PDF.js imports for newer versions
import * as pdfjsLib from "pdfjs-dist";

// ✅ Set worker source correctly
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";// ✅ MOVED OUTSIDE - Good practice, reusable, not recreated on every call
const detectSource = (text) => {
  if (!text) return "Resume Upload";

  if (/linkedin/i.test(text)) return "LinkedIn";
  if (/naukri/i.test(text)) return "Naukri";
  if (/indeed/i.test(text)) return "Indeed";
  if (/monster/i.test(text)) return "Monster";

  return "Resume Upload";
};

const CandidateFormPage = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });

  // Candidate form state
  const [candidateForm, setCandidateForm] = useState({
    recruiter: "",
    sourcedFrom: "",
    sourceDate: "",
    firstName: "",
    lastName: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    gender: "",
    city: "",
    state: "",
    country: "",
    customSource: "",
  });

  const [candidateAttachments, setCandidateAttachments] = useState([]);
  const [candidateUploadProgress, setCandidateUploadProgress] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  
  // New state for auto-fill loading
  const [isParsingPDF, setIsParsingPDF] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) { 
      navigate("/login"); 
      return; 
    }

    try {
      const user = JSON.parse(userStr);
      setCurrentUser(user);

      // ✅ AUTO FILL RECRUITER NAME
      setCandidateForm((prev) => ({
        ...prev,
        recruiter: `${user.firstName} ${user.lastName}`
      }));

    } catch {
      localStorage.removeItem("currentUser");
      navigate("/login");
    }
  }, [navigate]);
  
  // Load edit data from localStorage
  useEffect(() => {
    const editData = localStorage.getItem("editCandidate");
    if (editData) {
      const candidate = JSON.parse(editData);
      console.log("Loading candidate for edit:", candidate);
      loadCandidateForEdit(candidate);
      localStorage.removeItem("editCandidate");
    }
  }, []);

  const loadCandidateForEdit = (data) => {
    setEditingCandidate(data);
    setCandidateForm({
      recruiter: data.recruiter || "",
      sourcedFrom: sourceOptions.includes(data.sourcedFrom)
        ? data.sourcedFrom
        : data.sourcedFrom ? "Other" : "",
      customSource: sourceOptions.includes(data.sourcedFrom)
        ? ""
        : data.sourcedFrom || "",
      sourceDate: data.sourceDate || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || "",
      secondaryPhone: data.secondaryPhone || "",
      email: data.email || "",
      gender: data.gender || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
    });
    if (data.attachments && Array.isArray(data.attachments)) {
      setCandidateAttachments(data.attachments);
    } else if (data.fileUploads && Array.isArray(data.fileUploads)) {
      setCandidateAttachments(data.fileUploads);
    } else {
      setCandidateAttachments([]);
    }
  };

  // Extract text from PDF
  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(" ") + " ";
      }
      
      return fullText;
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      return "";
    }
  };

  // ✅ STEP 2 & 3: IMPROVED extractCandidateData with better parsing
  const extractCandidateData = (text) => {
    // Email extraction
    const emailMatch = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    
    // ✅ IMPROVED: Phone extraction - clean to 10 digits
    const phoneMatch = text.match(/(?:\+?91[-.\s]?)?(?:(?:\d{3}[-.\s]?){2}\d{4}|\d{5}[-.\s]?\d{5}|\d{10})/);
    const cleanPhone = phoneMatch ? phoneMatch[0].replace(/\D/g, "").slice(-10) : "";
    
    // ✅ STEP 2: NEW NAME LOGIC - improved detection
    let firstName = "";
    let lastName = "";
    
    // Strong name detection (first line with two capital words)
    const nameMatch = text.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/m);
    if (nameMatch) {
      firstName = nameMatch[1];
      lastName = nameMatch[2];
    } else {
      // Fallback to original logic
      const jobTitles = /(?:director|manager|engineer|developer|lead|architect|analyst|consultant|specialist|coordinator|supervisor|head|officer|executive|associate|senior|junior|trainee|intern)/i;
      
      const namePatterns = [
        /(?:Name|Candidate|Applicant)[:\s]+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
        /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s*(?:resume|cv|curriculum vitae)/i,
      ];
      
      let nameMatch2 = null;
      for (const pattern of namePatterns) {
        nameMatch2 = text.match(pattern);
        if (nameMatch2) break;
      }
      
      if (nameMatch2 && nameMatch2[1] && nameMatch2[2]) {
        if (!jobTitles.test(nameMatch2[1]) && !jobTitles.test(nameMatch2[2])) {
          firstName = nameMatch2[1];
          lastName = nameMatch2[2];
        }
      }
      
      // If still not found, try top 5 lines
      if (!firstName) {
        const lines = text.split("\n").slice(0, 5);
        for (let line of lines) {
          const words = line.trim().split(" ");
          if (words.length >= 2) {
            const word1 = words[0];
            const word2 = words[1];
            if (
              /^[A-Z][a-z]{2,}$/.test(word1) &&
              /^[A-Z][a-z]{2,}$/.test(word2) &&
              !jobTitles.test(word1) &&
              !jobTitles.test(word2)
            ) {
              firstName = word1;
              lastName = word2;
              break;
            }
          }
        }
      }
    }
    
    // ✅ STEP 3: Gender detection
    const genderMatch = text.match(/\b(male|female)\b/i);
    const gender = genderMatch ? genderMatch[1].toLowerCase() : "";
    
    // ✅ STEP 3: Country detection
    const country = text.match(/India/i) ? "India" : "";
    
    // ✅ IMPROVED: City detection - Indian cities list
    const indianCities = [
      "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", 
      "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Nagpur", "Indore", 
      "Bhopal", "Visakhapatnam", "Vadodara", "Patna", "Ludhiana", 
      "Agra", "Nashik", "Ranchi", "Gurgaon", "Noida", "Ghaziabad", 
      "Faridabad", "Thane", "Coimbatore", "Kochi", "Chandigarh"
    ];
    
    let city = "";
    for (const indianCity of indianCities) {
      if (text.match(new RegExp(`\\b${indianCity}\\b`, "i"))) {
        city = indianCity;
        break;
      }
    }
    
    // Also try pattern-based city extraction
    if (!city) {
      const cityPatterns = [
        /(?:City|Location|Based)[:\s]+([A-Za-z\s]{2,30})(?:\n|,|\.)/i,
        /([A-Z][a-z]+)\s*(?:,|-)\s*([A-Z]{2})/
      ];
      for (const pattern of cityPatterns) {
        const cityMatch = text.match(pattern);
        if (cityMatch && cityMatch[1]) {
          city = cityMatch[1].trim();
          break;
        }
      }
    }
    
    // ✅ IMPROVED: State detection
    const indianStates = [
      "Maharashtra", "Delhi", "Karnataka", "Telangana", "Tamil Nadu", 
      "West Bengal", "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh",
      "Bihar", "Punjab", "Haryana", "Kerala", "Andhra Pradesh", "Odisha"
    ];
    
    let state = "";
    for (const indianState of indianStates) {
      if (text.match(new RegExp(`\\b${indianState}\\b`, "i"))) {
        state = indianState;
        break;
      }
    }
    
    // Map city to state if city found but state not
    const cityToState = {
      "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Nagpur": "Maharashtra",
      "Delhi": "Delhi", "Noida": "Uttar Pradesh", "Gurgaon": "Haryana",
      "Bangalore": "Karnataka", "Chennai": "Tamil Nadu", "Hyderabad": "Telangana",
      "Kolkata": "West Bengal", "Ahmedabad": "Gujarat", "Jaipur": "Rajasthan",
      "Lucknow": "Uttar Pradesh", "Indore": "Madhya Pradesh", "Bhopal": "Madhya Pradesh"
    };
    
    if (city && !state && cityToState[city]) {
      state = cityToState[city];
    }
    
    // ✅ STEP 3: Return object with gender and country
    return {
      email: emailMatch ? emailMatch[0] : "",
      phone: cleanPhone,
      firstName: firstName,
      lastName: lastName,
      city: city,
      state: state,
      gender: gender,
      country: country,
    };
  };

  // ✅ STEP 1 & 4: FIXED parseResumeFromAPI with PROPER merge logic
  const parseResumeFromAPI = async (file) => {
    try {
      setIsParsingPDF(true);

      const formData = new FormData();
      formData.append("file", file);
let apiData = {}; // ✅ use let

try {
  const response = await fetch("https://bdats.eclipticinsight.com/api/parse-resume", {
    method: "POST",
    body: formData,
  });

  if (response.ok) {
    apiData = await response.json(); // ✅ assign once
    console.log("✅ API DATA:", apiData);
  } else {
    console.warn("⚠️ API failed:", response.status);
  }

} catch (err) {
  console.error("❌ API ERROR:", err);
}

      // ✅ Step 2: Extract text from PDF for local parsing
     const text = await extractTextFromPDF(file);

// 🔥 fallback from backend
const finalText = text || apiData.rawText || "";

const localData = extractCandidateData(finalText);
      
      // ✅ STEP 5: DEBUG LOGS
      console.log("📄 PDF TEXT SAMPLE:", text.substring(0, 500));
      console.log("🧠 LOCAL DATA:", localData);
      console.log("🌐 API DATA:", apiData);

      const today = new Date().toISOString().split("T")[0];

      // ✅ STEP 1 & 4: PROPER MERGE LOGIC with correct priority
      setCandidateForm((prev) => ({
        ...prev,
        // ✅ priority: LOCAL → USER EXISTING → API (prevents API empty values from overriding)
        firstName: localData.firstName || apiData.firstName || prev.firstName,
lastName: localData.lastName || apiData.lastName || prev.lastName,
email: localData.email || apiData.email || prev.email,
phone: localData.phone || apiData.phone || prev.phone,
        city: localData.city || prev.city || apiData.city,
        state: localData.state || prev.state || apiData.state,
        country: localData.country || prev.country || apiData.country || "India",
        gender: localData.gender || prev.gender || apiData.gender,
        recruiter: prev.recruiter || (currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ""),
        sourcedFrom: prev.sourcedFrom || detectSource(finalText),
        sourceDate: prev.sourceDate || apiData.sourceDate || today,
      }));

    } catch (error) {
      console.error("❌ Resume parsing error:", error);
      alert("Parsing failed: " + error.message);
    } finally {
      setIsParsingPDF(false);
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

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) { resolve(file); return; }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const MAX_W = 1200, MAX_H = 800;
          if (width > height) { if (width > MAX_W) { height *= MAX_W / width; width = MAX_W; } }
          else { if (height > MAX_H) { width *= MAX_H / height; height = MAX_H; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() })), "image/jpeg", 0.6);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });

  // ✅ CLEANED: Handle file upload - ONLY PDF files, NO Word/Image extraction
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsLoading(true);
    
    for (const file of files) {
      try {
        // ✅ ONLY PDF files allowed for auto-fill
        if (!editingCandidate) {
          if (file.type === "application/pdf") {
            await parseResumeFromAPI(file);
          } else {
            alert("Only PDF files are supported for auto-fill. The file will still be uploaded.");
          }
        }
        
        let processedFile = file.type.startsWith("image/") ? await compressImage(file) : file;
        if (processedFile.size > 10 * 1024 * 1024) { 
          alert(`"${file.name}" exceeds 10 MB.`); 
          continue; 
        }
        
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${processedFile.name}`;
        setCandidateUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));
        
        const base64Data = await fileToBase64(processedFile);
        
        const fileData = {
          id: fileId,
          name: processedFile.name,
          type: processedFile.type,
          size: processedFile.size,
          uploadedAt: new Date().toISOString(),
          data: base64Data
        };
        
        // Replace existing attachment (only one file at a time)
       setCandidateAttachments((prev) => [...prev, fileData]);
        setCandidateUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
        
      } catch (error) {
        console.error("Error processing file:", error);
        alert(`Failed to process "${file.name}".`);
      }
    }
    setIsLoading(false);
    e.target.value = "";
  };

 const removeAttachment = (fileId) => {
  setCandidateAttachments((prev) =>
    prev.filter((file) => file.id !== fileId)
  );

  setCandidateUploadProgress((prev) => {
    const updated = { ...prev };
    delete updated[fileId];
    return updated;
  });
};

  const downloadFile = (file) => {
    if (file.data) {
      const link = document.createElement("a");
      link.href = file.data;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("File data not available.");
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024, sizes = ["B","KB","MB","GB"], i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (t) => {
    if (t?.includes("pdf")) return "📕";
    if (t?.includes("image")) return "🖼️";
    if (t?.includes("word") || t?.includes("document")) return "📝";
    if (t?.includes("excel") || t?.includes("spreadsheet")) return "📊";
    if (t?.includes("text")) return "📄";
    return "📎";
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    // ✅ PHONE VALIDATION (only digits + max 10)
    if (name === "phone" || name === "secondaryPhone") {
      value = value.replace(/\D/g, ""); // remove non-digits

      if (value.length > 10) {
        alert("Phone number must be only 10 digits ❌");
        return;
      }
    }

    setCandidateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    // ✅ Required fields check
    if (!candidateForm.recruiter?.trim()) {
      alert("Recruiter is required ❌");
      return false;
    }

    if (!candidateForm.sourcedFrom?.trim()) {
      alert("Source is required ❌");
      return false;
    }

    if (candidateForm.sourcedFrom === "Other" && !candidateForm.customSource?.trim()) {
      alert("Custom Source is required ❌");
      return false;
    }

    if (!candidateForm.sourceDate) {
      alert("Source Date is required ❌");
      return false;
    }

    if (!candidateForm.firstName?.trim()) {
      alert("First Name is required ❌");
      return false;
    }

    if (!candidateForm.lastName?.trim()) {
      alert("Last Name is required ❌");
      return false;
    }

    if (!candidateForm.phone?.trim()) {
      alert("Phone is required ❌");
      return false;
    }

    if (candidateForm.phone.length !== 10) {
      alert("Phone must be 10 digits ❌");
      return false;
    }

    if (!candidateForm.email?.trim()) {
      alert("Email is required ❌");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(candidateForm.email)) {
      alert("Invalid email ❌");
      return false;
    }

    if (!candidateForm.gender) {
      alert("Gender is required ❌");
      return false;
    }

    if (!candidateForm.city?.trim()) {
      alert("City is required ❌");
      return false;
    }

    if (!candidateForm.state?.trim()) {
      alert("State is required ❌");
      return false;
    }

    if (!candidateForm.country?.trim()) {
      alert("Country is required ❌");
      return false;
    }

    return true;
  };

  const saveCandidate = async () => {
    if (!validateForm()) return;
    if (!currentUser) {
      alert("User not authenticated.");
      return;
    }
    // ✅ FETCH FROM BACKEND
    const res = await api.get("/candidates");
    const existingCandidates = res.data;

    // ✅ CHECK EMAIL
    const duplicateEmail = existingCandidates.find(
      (c) =>
        c.email === candidateForm.email &&
        c._id !== editingCandidate?._id
    );

    // ✅ CHECK PHONE
    const duplicatePhone = existingCandidates.find(
      (c) =>
        c.phone === candidateForm.phone &&
        c._id !== editingCandidate?._id
    );

    // ✅ SHOW ALERT
    if (duplicateEmail) {
      alert("This email already exists ❌");
      return;
    }

    if (duplicatePhone) {
      alert("This phone number already exists ❌");
      return;
    }

    setIsLoading(true);

    try {
      const attachmentsData = candidateAttachments.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: file.uploadedAt,
        data: file.data
      }));

      const payload = {
        recruiter: candidateForm.recruiter,
        sourcedFrom: candidateForm.sourcedFrom === "Other"
          ? candidateForm.customSource
          : candidateForm.sourcedFrom,
        sourceDate: candidateForm.sourceDate,
        firstName: candidateForm.firstName,
        lastName: candidateForm.lastName,
        phone: candidateForm.phone,
        secondaryPhone: candidateForm.secondaryPhone,
        email: candidateForm.email.toLowerCase(),
        gender: candidateForm.gender,
        city: candidateForm.city,
        state: candidateForm.state,
        country: candidateForm.country,
        attachments: attachmentsData,
        createdBy: currentUser.id,
        createdByEmail: currentUser.email,
        createdByName: `${currentUser.firstName} ${currentUser.lastName}`,
        createdByEmployeeId: currentUser.employeeId,
        createdAt: editingCandidate ? editingCandidate.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("🔥 Sending payload with attachments:", attachmentsData.length);

      if (editingCandidate) {
        await api.put(`/update-candidate/${editingCandidate._id}`, {
          ...payload,
          updatedByName: `${currentUser.firstName} ${currentUser.lastName}`
        });
        alert("✅ Candidate updated successfully!");
        navigate("/candidates");
      } else {
        await api.post("/add-candidate", {
          ...payload,
          createdByName: `${currentUser.firstName} ${currentUser.lastName}`
        });
        alert("✅ Candidate added successfully!");
        
        // 🔥 CALL PARENT FUNCTION
        if (onSuccess) {
          await onSuccess();
        }
      }

    } catch (err) {
      console.error("Error saving candidate:", err);
      alert("Failed to save candidate: " + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCandidateForm({
      recruiter: "",
      sourcedFrom: "",
      sourceDate: "",
      firstName: "",
      lastName: "",
      phone: "",
      secondaryPhone: "",
      email: "",
      gender: "",
      city: "",
      state: "",
      country: "",
      customSource: "", 
    });
    setCandidateAttachments([]); 
    setEditingCandidate(null);
  };

  const genderOptions = [
    { value: "", label: "Select gender..." },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
  ];
  
  const sourceOptions = [
    "LinkedIn",
    "Naukri",
    "Naukri-Nvites",
    "Indeed",
    "Monster",
    "Referral",
    "Company Website",
    "Walk-in",
    "Consultancy",
    "Campus Placement",
    "Other"
  ];

  const th = {
    background: isDarkMode ? "bg-gray-900" : "bg-gray-100",
    text: isDarkMode ? "text-white" : "text-gray-900",
    secondaryText: isDarkMode ? "text-gray-300" : "text-gray-600",
    card: isDarkMode ? "bg-gray-800" : "bg-white",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
    input: isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900",
    button: isDarkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600",
    buttonSecondary: isDarkMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600",
    buttonSuccess: isDarkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600",
    buttonDanger: isDarkMode ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600",
  };

  if (!currentUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${th.background} ${th.text} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className={`${th.card} p-6 rounded-lg shadow-lg`}>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{editingCandidate ? "Edit Candidate" : "Add New Candidate"}</h2>
                <p className={`text-sm ${th.secondaryText} mt-1`}>Fill in the candidate information below</p>
              </div>
              {editingCandidate && (
                <button onClick={() => navigate("/candidates")} className={`px-4 py-2 rounded text-white ${th.buttonSecondary}`}>Cancel</button>
              )}
            </div>

            {/* File Upload Section with Auto-fill Indicator */}
            <div className="mb-6 p-5 rounded-xl border border-blue-700 bg-gradient-to-r from-blue-900 to-blue-800 shadow-lg">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-60">
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2 text-white">
                    <span>📄</span> Upload Resume / Documents
                    <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full">✨ Auto-fill from PDF</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isParsingPDF}
                    className="block w-full text-sm text-gray-200 
                    file:mr-4 file:py-2 file:px-4 
                    file:rounded-lg file:border-0 
                    file:text-sm file:font-semibold 
                    file:bg-white file:text-blue-700 
                    hover:file:bg-gray-200 
                    cursor-pointer disabled:opacity-50"
                  />
                  <p className="text-xs text-blue-200 mt-2">
                    {isParsingPDF ? "🤖 Parsing PDF and auto-filling form..." : "Upload PDF to auto-fill Name, Email, Phone, City, State, Gender, Country · Max 10 MB · PDF only"}
                  </p>
                </div>
              </div>

              {/* Parsing indicator */}
              {isParsingPDF && (
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500" />
                    <p className="text-sm text-yellow-300">Reading PDF and extracting candidate information...</p>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {Object.keys(candidateUploadProgress).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(candidateUploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Attachments List */}
              {candidateAttachments.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Uploaded File ({candidateAttachments.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {candidateAttachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xl">{getFileIcon(file.type)}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-white truncate">{file.name}</p>
                            <p className="text-xs text-blue-200">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => downloadFile(file)} 
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                            title="Download"
                          >
                            📥 Download
                          </button>
                          <button 
                            onClick={() => removeAttachment(file.id)} 
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                            title="Remove"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">

              {/* Recruiter Information */}
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">📋 Recruiter Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block mb-2 font-medium">
                    Recruiter <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="recruiter" value={candidateForm.recruiter} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="Recruiter name" />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Sourced From <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="sourcedFrom"
                    value={candidateForm.sourcedFrom}
                    onChange={handleInputChange}
                    className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  >
                    <option value="">Select Source</option>
                    {sourceOptions.map((src, index) => (
                      <option key={index} value={src}>{src}</option>
                    ))}
                  </select>

                  {candidateForm.sourcedFrom === "Other" && (
                    <input
                      type="text"
                      name="customSource"
                      placeholder="Enter custom source"
                      value={candidateForm.customSource}
                      onChange={handleInputChange}
                      className={`${th.input} border p-3 w-full rounded-lg mt-2`}
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Source Date <span className="text-red-500">*</span>
                  </label>
                  <input type="date" name="sourceDate" value={candidateForm.sourceDate} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} />
                </div>

              </div>

              {/* Personal Information */}
              <div className="border-b pb-2 mt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">👤 Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block mb-2 font-medium">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="firstName" value={candidateForm.firstName} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="Enter first name" />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="lastName" value={candidateForm.lastName} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="Enter last name" />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={candidateForm.phone}
                    maxLength="10"
                    onChange={handleInputChange}
                    className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter 10 digit phone number"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Secondary Phone
                  </label>
                  <input
                    type="tel"
                    name="secondaryPhone"
                    value={candidateForm.secondaryPhone}
                    maxLength="10"
                    onChange={handleInputChange}
                    className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    placeholder="Enter 10 digit alternate number"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" name="email" value={candidateForm.email} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="john.doe@example.com" />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select name="gender" value={candidateForm.gender} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}>
                    {genderOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Location Information */}
              <div className="border-b pb-2 mt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">📍 Location Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block mb-2 font-medium">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="city" value={candidateForm.city} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="Enter city" />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="state" value={candidateForm.state} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="Enter state" />
                </div>

                <div>
                  <label className="block mb-2 font-medium">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input type="text" name="country" value={candidateForm.country} onChange={handleInputChange} className={`${th.input} border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`} placeholder="Enter country" />
                </div>

              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button onClick={saveCandidate} disabled={isLoading || isParsingPDF} className={`px-6 py-3 rounded-lg text-white ${th.buttonSuccess} flex-1 font-medium disabled:opacity-60`}>
                  {isLoading ? "Saving…" : editingCandidate ? "Update Candidate" : "Save Candidate"}
                </button>

                <button onClick={resetForm} disabled={isLoading || isParsingPDF} className={`px-6 py-3 rounded-lg text-white ${th.buttonSecondary} font-medium disabled:opacity-60`}>
                  Reset Form
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateFormPage;