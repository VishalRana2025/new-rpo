import React from 'react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const role = currentUser?.role?.toLowerCase();

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('role');
    localStorage.removeItem('activePage');
    navigate('/login');
  };

  // ✅ FINAL FIX (NO NAVIGATION)
  const goToHome = () => {
    localStorage.setItem("activePage", "home");

    // reload current page only (same panel)
    window.location.reload();
  };

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        
        <div className="flex items-center space-x-4 ml-[-90px]">
  {currentUser && (
    <>
      <button 
        onClick={goToHome}
        className="hover:text-gray-200 transition font-semibold"
      >
        🏠 Home
      </button>

      <span className="text-xs bg-blue-500 px-2 py-1 rounded">
        {role === 'admin' 
          ? 'Admin' 
          : role === 'manager'
          ? 'Manager'
          : 'Employee'}
      </span>
    </>
  )}
</div>

        {currentUser && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition"
          >
            Logout
          </button>
        )}

      </div>
    </nav>
  );
};

export default Navbar;