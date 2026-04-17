import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";
import Register from "./pages/Register";
import "leaflet/dist/leaflet.css";

// 🔒 Protected Route (Employee + Manager + Admin)
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  return user && (
    user.role === "employee" ||
    user.role === "manager" ||   // ✅ FIX: added manager
    user.role === "admin"
  )
    ? children
    : <Navigate to="/login" />;
};

// 🔒 Admin Only Route
const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  if (!user || user.role !== "admin") {
    return <Navigate to="/employee" />;
  }

  return children;
};

function App() {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          {/* Default */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Employee + Manager + Admin */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute>
                <EmployeeDashboard isAdminView={user?.role === "admin"} />
              </ProtectedRoute>
            }
          />

          {/* Admin Only */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;