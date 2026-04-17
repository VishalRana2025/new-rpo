import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api";
import logo from "../assets/logo.webp"; 

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const ADMIN_EMAIL = "ecliptic@company.com";
  const ADMIN_PASSWORD = "admin123";

  const COMPANY_LOCATION = {
    name: "Nxone Tech Tower, Sector 62, Noida",
    address: "Sector 62, Noida, Uttar Pradesh 201309"
  };

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔥 FIXED: Admin login with full permissions
      if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const adminUser = {
          _id: "admin_001",
          email: ADMIN_EMAIL,
          name: "Super Admin",
          firstName: "Super",
          lastName: "Admin",
          employeeId: "ADMIN001",
          department: "Administration",
          role: "admin",
          isApproved: true,
          isActive: true,
          permissions: {
            newClient: true,
            allClients: true,
            newRequirement: true,
            allRequirement: true,
            newCandidate: true,
            allCandidates: true
          },
          companyLocation: COMPANY_LOCATION
        };

        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        localStorage.setItem("role", "admin");
        localStorage.setItem("activePage", "admin-dashboard");
        
        // Save remember me
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        alert("✅ Admin login successful!");
        setLoading(false);
        navigate("/employee");
        return;
      }

      // Employee/Manager login from database
      const res = await api.post("/login", {
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (res.data.success && res.data.user) {
        const user = res.data.user;

        // Save login history
        try {
          await api.post("/login-history", {
            userId: user._id,
            firstName: user.name?.split(" ")[0] || "",
            lastName: user.name?.split(" ")[1] || "",
            email: user.email,
            employeeId: user.employeeId,
            department: user.department,
            role: user.role,
            loginTime: new Date().toLocaleString(),
            ip: "client-side"
          });
        } catch (historyErr) {
          console.error("Failed to save login history:", historyErr);
        }

        // Ensure permissions exist
        const userPermissions = user.permissions || {
          newClient: false,
          allClients: false,
          newRequirement: false,
          allRequirement: false,
          newCandidate: false,
          allCandidates: false
        };

        // Store user data
        localStorage.setItem("currentUser", JSON.stringify({
          _id: user._id,
          email: user.email,
          name: user.name,
          firstName: user.name?.split(" ")[0] || "",
          lastName: user.name?.split(" ")[1] || "",
          employeeId: user.employeeId,
          department: user.department,
          role: user.role,
          permissions: userPermissions,
          companyLocation: COMPANY_LOCATION,
          isApproved: user.isApproved,
          isActive: user.isActive
        }));

        localStorage.setItem("role", user.role);

        // Save remember me
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        // Set default page based on permissions
        if (user.role === "admin") {
          localStorage.setItem("activePage", "admin-dashboard");
        } else if (userPermissions?.newCandidate) {
          localStorage.setItem("activePage", "candidate-detail");
        } else if (userPermissions?.allCandidates) {
          localStorage.setItem("activePage", "all-candidates");
        } else if (userPermissions?.newClient) {
          localStorage.setItem("activePage", "onboarding");
        } else if (userPermissions?.allClients) {
          localStorage.setItem("activePage", "clients");
        } else if (userPermissions?.newRequirement) {
          localStorage.setItem("activePage", "requirements");
        } else if (userPermissions?.allRequirement) {
          localStorage.setItem("activePage", "all-requirements");
        } else {
          localStorage.setItem("activePage", "dashboard");
        }

        alert(`Welcome back ${user.name || user.email}!`);
        setLoading(false);
        navigate("/employee");
      } else {
        alert("Invalid email or password ❌");
        setLoading(false);
      }

    } catch (err) {
      console.error("Login error:", err);
      
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message;
        
        if (status === 401) {
          alert("Invalid email or password ❌");
        } else if (status === 403) {
          alert(message || "⏳ Waiting for admin approval ❌");
        } else if (status === 404) {
          alert("User not found. Please register first.");
        } else {
          alert(message || "Login failed. Please try again.");
        }
      } else if (err.request) {
        alert("Network error. Please check if server is running.");
      } else {
        alert(`Error: ${err.message}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#7b3fe4] to-[#23c4c4] p-4 sm:p-6 md:p-8">
      
      <div className="bg-[#2c2966] rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-[90%] sm:max-w-[400px] md:max-w-[420px] relative overflow-hidden transition-all duration-300">
        
        <div className="flex justify-center mb-4 sm:mb-6">
          <img 
            src={logo} 
            alt="Company Logo" 
            className="h-14 w-auto sm:h-16 object-contain bg-white p-2 rounded-full shadow-lg"
          />
        </div>

        <h2 className="text-white text-center text-xl sm:text-2xl font-medium mb-1 sm:mb-2">
          Welcome Back
        </h2>
        <p className="text-gray-300 text-center text-xs sm:text-sm mb-4 sm:mb-6">
          Sign in to your account
        </p>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div>
            <label className="text-gray-300 text-xs sm:text-sm block mb-1 sm:mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base transition-all"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-gray-300 text-xs sm:text-sm block mb-1 sm:mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-sm sm:text-base pr-10 transition-all"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm sm:text-base"
                disabled={loading}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 xs:gap-0">
            <label className="flex items-center text-gray-300 text-xs sm:text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer"
                disabled={loading}
              />
              Remember me
            </label>
            <button 
              type="button"
              onClick={() => alert("Please contact admin for password reset")}
              className="text-blue-300 text-xs sm:text-sm hover:underline transition"
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#4caf50] hover:bg-green-600 transition-all text-white py-2.5 sm:py-3 rounded-md font-semibold shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            <img src={logo} alt="" className="h-4 w-auto sm:h-5 opacity-80" />
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      <div className="flex items-center justify-center gap-2 text-white text-xs sm:text-sm mt-6 sm:mt-8 px-4 text-center">
        <img src={logo} alt="" className="h-4 w-auto sm:h-5 opacity-80" />
        <p>
          Don't have an account?
          <span
            onClick={() => !loading && navigate("/register")}
            className="ml-1 sm:ml-2 underline font-semibold cursor-pointer hover:text-yellow-300 transition-colors"
          >
            Register here
          </span>
        </p>
      </div>

      <div className="text-center text-white/50 text-[10px] sm:text-xs mt-4 sm:mt-6 px-4">
        <p>© 2026 All rights reserved</p>
      </div>
    </div>
  );
};

export default Login;