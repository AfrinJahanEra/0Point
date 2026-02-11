import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import api from '../utils/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [contests, setContests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const initializeUser = async () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser && authService.isLoggedIn()) {
        // If user doesn't have name, fetch it from profile API
        if (!currentUser.name) {
          try {
            const response = await api.get('/account/profile/');
            const updatedUser = {
              ...currentUser,
              name: response.data.name
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUser(currentUser);
          }
        } else {
          setUser(currentUser);
        }
      }
      setLoading(false);
    };
    
    initializeUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      return response.user; // Return user data instead of full response
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email, password, role = "user", year = null, department = null, secretPassword = null) => {
    try {
      const response = await authService.register(name, email, password, role, year, department, secretPassword);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    setUser: updateUser,
    login,
    register,
    logout,
    loading,
    contests,
    setContests,
    leaderboard,
    setLeaderboard,
    isAuthenticated: !!user
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};