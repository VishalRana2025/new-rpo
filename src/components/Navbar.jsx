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

  const goToHome = () => {
    localStorage.setItem("activePage", "home");
    navigate("/");
  };
return (
  <nav className="bg-blue-600 text-white p-3 shadow-lg sticky top-0 z-50">
   <div className="w-full flex items-center justify-between px-4">
      {/* Left Side */}
      <div className="flex items-center">
        <button
          onClick={goToHome}
         className="
  font-semibold
  text-sm sm:text-base md:text-lg
  whitespace-nowrap
  absolute left-1/2 -translate-x-1/2
  md:static md:translate-x-0 md:ml-16
"
        >
          Recruiter App
        </button>
      </div>

      {/* Logout Button */}
      <div className="ml-auto">
        {currentUser && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-3 sm:px-4 py-2 rounded transition text-sm whitespace-nowrap"
          >
            Logout
          </button>
        )}
      </div>

    </div>
  </nav>
);
};

export default Navbar;