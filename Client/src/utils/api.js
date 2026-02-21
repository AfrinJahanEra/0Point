// utils/api.js
import axios from 'axios';

// Backend URL configuration
// Auto-detect production environment (Vercel) or use environment variable or fallback to localhost
const isProduction = typeof window !== 'undefined' && (
  window.location.hostname === '0-point.vercel.app' ||
  window.location.hostname.includes('vercel.app')
);

const PRODUCTION_BACKEND_URL = 'https://zeropoint-01lh.onrender.com';
const LOCAL_BACKEND_URL = 'http://localhost:8000';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (isProduction ? PRODUCTION_BACKEND_URL : LOCAL_BACKEND_URL);
export const WS_URL = BACKEND_URL.replace(/^http/, 'ws');

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;