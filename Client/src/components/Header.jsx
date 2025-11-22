import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Code2, LogOut, LogIn, UserPlus, Home, User, BarChart2 } from 'lucide-react';

const Header = () => {
  const { user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    // Navigate to landing page after logout
    navigate('/');
  };

  const handleProfileClick = () => {
    console.log('Profile clicked');
    console.log('User:', user);
    console.log('Is profile open:', isProfileOpen);
    console.log('Is public page:', isPublicPage);
    setIsProfileOpen(!isProfileOpen);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
          {/* Logo on the left */}
          <Link to={user ? "/home" : "/"} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg flex items-center justify-center text-white text-lg shadow-lg shadow-blue-800/20 group-hover:shadow-xl group-hover:shadow-blue-800/30 transition-all duration-300 transform group-hover:-translate-y-1">
              <Code2 className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors duration-300">
              0<span className="text-blue-800 group-hover:text-blue-900 transition-colors duration-300">Point</span>
            </div>
          </Link>

          {/* Navigation - only show when user is logged in or on home page */}
          {(!isPublicPage || location.pathname === '/home') && (
            <nav className="flex-1 flex justify-center">
              <ul className="flex flex-wrap justify-center gap-6 md:gap-8">
                {['Home', 'Contests', 'Practice', 'Community', 'Leaderboard'].map((item) => (
                  <li key={item}>
                    <Link 
                      to={`/${item.toLowerCase()}`} 
                      className="text-gray-700 font-medium hover:text-blue-800 transition-all duration-300 relative py-2 group"
                    >
                      {item}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-800 transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </li>
                ))}
                {/* Visualizer link opens in new tab */}
                <li>
                  <a 
                    href="/visualizer" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-700 font-medium hover:text-blue-800 transition-all duration-300 relative py-2 group"
                  >
                    Visualizer
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-800 transition-all duration-300 group-hover:w-full"></span>
                  </a>
                </li>
              </ul>
            </nav>
          )}

          {/* Avatar and Era Text with Profile Dropdown */}
          <div className="flex gap-3 items-center">
            {/* Dashboard Link */}
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-900 hover:text-blue-800 transition-all duration-300 transform hover:scale-105">
              <BarChart2 className="w-5 h-5" />
              <span className="font-medium">{user ? user.name : 'era97'}</span>
            </Link>
            
            {/* Round Avatar with Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={handleProfileClick}
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center text-white text-sm shadow-lg shadow-blue-800/20 overflow-hidden hover:opacity-90 transition-all duration-300 transform hover:scale-110 hover:shadow-xl hover:shadow-blue-800/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isProfileOpen ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : ''
                }`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </button>
              
              {/* Always show logout button in the popup */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-md border border-gray-200 py-2 transform transition-all duration-300 ease-out origin-top-right z-50">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-200"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;