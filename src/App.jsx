import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import "leaflet/dist/leaflet.css";

// ✅ Lazy Loading Pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const EmployeeDashboard = lazy(() =>
  import("./pages/EmployeeDashboard")
);
const AdminDashboard = lazy(() =>
  import("./pages/AdminDashboard")
);

// 🔒 Protected Route (Employee + Manager + Admin)
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  return user &&
    (
      user.role === "employee" ||
      user.role === "manager" ||
      user.role === "admin"
    ) ? (
    children
  ) : (
    <Navigate to="/login" />
  );
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

        {/* ✅ Lazy Loading Wrapper */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-lg">
              Loading...
            </div>
          }
        >
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
                  <EmployeeDashboard
                    isAdminView={user?.role === "admin"}
                  />
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;