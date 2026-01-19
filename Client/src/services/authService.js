// services/authService.js
import api from '../utils/api';

class AuthService {
  // Login user
  async login(email, password) {
    try {
      const response = await api.post('/auth/login/', {
        email,
        password
      });
      
      if (response.data.token) {
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }
      
      throw new Error('Login failed');
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  }

  // Register user
  async register(name, email, password, year = null, department = null) {
    try {
      const response = await api.post('/auth/signup/', {
        name,
        email,
        password,
        year,
        department
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Registration failed';
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Get current user
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  // Get token
  getToken() {
    return localStorage.getItem('token');
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.getToken();
  }
}

export default new AuthService();