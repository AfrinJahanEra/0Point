// services/authService.js
import api from '../utils/api';

// Generate a simple device fingerprint from browser characteristics
const generateDeviceFingerprint = () => {
  const { userAgent, language, platform } = navigator;
  const { width, height, colorDepth } = screen;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  const renderer = gl ? gl.getParameter(gl.RENDERER) : 'unknown';
  
  const raw = `${userAgent}|${language}|${platform}|${width}x${height}|${colorDepth}|${timezone}|${renderer}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

class AuthService {
  // Login user
  async login(email, password) {
    try {
      const response = await api.post('/account/login/', {
        email,
        password,
        device_fingerprint: generateDeviceFingerprint()
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
  async register(name, email, password, role = "user", year = null, department = null, secretPassword = null) {
    try {
      const requestData = {
        name,
        email,
        password,
        role,
        year,
        department,
        device_fingerprint: generateDeviceFingerprint()
      };
      
      // Add secret password if role is admin
      if (role === "admin" && secretPassword) {
        requestData.secret_password = secretPassword;
      }
      
      const response = await api.post('/account/signup/', requestData);
      
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