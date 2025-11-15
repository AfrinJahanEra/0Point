import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Code2, LogOut, LogIn, UserPlus, Home } from 'lucide-react';

const Header = () => {
  const { user, logout } = useApp();
  const location = useLocation();

  // Check if we're on a public page (landing, login, register)
  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
          {/* Logo */}
          <Link to={user ? "/home" : "/"} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center text-white text-lg shadow-lg shadow-blue-500/20">
              <Code2 className="w-6 h-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              0<span className="text-blue-600">Point</span>
            </div>
          </Link>

          {/* Navigation - only show when user is logged in or on home page */}
          {!isPublicPage && user && (
            <nav className="flex-1 flex justify-center">
              <ul className="flex flex-wrap justify-center gap-6 md:gap-8">
                {['Home', 'Contests', 'Practice', 'Visualizer', 'Leaderboard', 'Blog'].map((item) => (
                  <li key={item}>
                    <Link 
                      to={`/${item.toLowerCase()}`} 
                      className="text-gray-700 font-medium hover:text-blue-600 transition-colors duration-300 relative py-2"
                    >
                      {item}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 hover:w-full"></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Auth Buttons */}
          <div className="flex gap-3">
            {user ? (
              <button 
                onClick={logout}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <>
                {isPublicPage ? (
                  <>
                    <Link 
                      to="/login" 
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" />
                      Register
                    </Link>
                  </>
                ) : (
                  <Link 
                    to="/" 
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <Home className="w-4 h-4" />
                    Home
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;