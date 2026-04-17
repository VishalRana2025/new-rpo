import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import logo from "../assets/logo.webp";

// Company location constant
const COMPANY_LOCATION = {
  name: "Nxone Tech Tower",
  address: "Sector 62, Noida",
  latitude: 28.6139,
  longitude: 77.2090,
  radius: 100 // meters
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    employeeId: "",
    department: "",
    phoneNumber: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password ||
      !formData.employeeId ||
      !formData.department ||
      !formData.phoneNumber 
    ) {
      alert("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/register", {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email.toLowerCase(),
        password: formData.password,
        employeeId: formData.employeeId,
        department: formData.department,
        phoneNumber: formData.phoneNumber,
        role: "employee",
        isApproved: true,
        isActive: true,
        companyLocation: COMPANY_LOCATION,
        officeLocation: {
          ...COMPANY_LOCATION,
          assignedAt: new Date().toISOString()
        }
      });

      if (res.data.success || res.status === 201) {
        alert("Registration Successful! ✅ You can login now.");
        navigate("/login");
      } else {
        alert(res.data?.message || "Registration failed");
      }

    } catch (err) {
      console.error("Registration error:", err);
      
      if (err.response) {
        const errorMessage = err.response.data?.message || 
                           err.response.data?.error || 
                           "Registration failed";
        
        if (err.response.status === 409) {
          alert("Email or Employee ID already exists ❌");
        } else if (err.response.status === 400) {
          alert(`Invalid data: ${errorMessage}`);
        } else {
          alert(`Error: ${errorMessage}`);
        }
      } else if (err.request) {
        alert("Network error. Please check if backend server is running on port 5000");
      } else {
        alert(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#7b3fe4] to-[#23c4c4] p-4 sm:p-6 md:p-8">
      <div className="bg-[#2c2966] rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-[95%] sm:max-w-[500px] md:max-w-[550px]">
        
        <div className="flex justify-center mb-4 sm:mb-6">
          <img 
            src={logo} 
            alt="Company Logo" 
            className="h-14 w-auto sm:h-16 md:h-20 object-contain bg-white p-2 rounded-lg shadow-lg"
          />
        </div>

        <h2 className="text-white text-center text-xl sm:text-2xl font-medium mb-1 sm:mb-2">
          Employee Registration
        </h2>
        
        <p className="text-yellow-300 text-center text-xs sm:text-sm mb-4 sm:mb-6">
          ⚠️ Fill all details to register
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="text"
              name="firstName"
              placeholder="First name *"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base"
              required
              disabled={loading}
            />

            <input
              type="text"
              name="lastName"
              placeholder="Last name *"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base"
              required
              disabled={loading}
            />
          </div>

          <input
            type="email"
            name="email"
            placeholder="Official Email *"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base"
            required
            disabled={loading}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="text"
              name="employeeId"
              placeholder="Employee ID *"
              value={formData.employeeId}
              onChange={handleChange}
              className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base"
              required
              disabled={loading}
            />

            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base"
              required
              disabled={loading}
            >
              <option value="">Select Department *</option>
              <option value="Accounting">Accounting</option>
              <option value="Business Development">Business Development</option>
              <option value="C-Suite">C-Suite</option>
              <option value="Finance">Finance</option>
              <option value="Founder's Office">Founder's Office</option>
              <option value="Growth Operations">Growth Operations</option>
              <option value="Polycheme">Polycheme</option>
              <option value="Marketing">Marketing</option>
              <option value="RPO">RPO</option>
              <option value="Talent & People">Talent & People</option>
              <option value="Technology & Infrastructure">Technology & Infrastructure</option>
              <option value="Virtual Operations">Virtual Operations</option>
              <option value="Workplace Operations">Workplace Operations</option>
              <option value="Blanks">(Blanks)</option>
            </select>
          </div>
          
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Phone Number *"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base"
            required
            disabled={loading}
          />

          <input
            type="password"
            name="password"
            placeholder="Password *"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base"
            required
            disabled={loading}
          />
         
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="h-8 w-auto opacity-50 hidden sm:block"></div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full sm:w-auto bg-[#4caf50] hover:bg-green-600 transition text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-md font-semibold shadow-lg text-sm sm:text-base ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {loading ? "Registering..." : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
      
      <div className="flex items-center justify-center gap-2 text-white text-xs sm:text-sm mt-6 sm:mt-8 px-4 text-center">
        <img src={logo} alt="Company Logo" className="h-4 w-auto sm:h-5" />
        <p>
          Already have an account?
          <span
            onClick={() => !loading && navigate("/login")}
            className="ml-1 sm:ml-2 underline font-semibold cursor-pointer hover:text-yellow-300 transition"
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;