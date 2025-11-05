// src/api/apiClient.js
import axios from 'axios';

/**
 * API client for the Loyalty app.
 * Uses Vite environment variable VITE_API_URL (set in .env files).
 *
 * - Automatically attaches Authorization header via interceptor (reads from localStorage by default).
 * - Exposes helper to set current access token (useful if you store token in memory).
 * - Response interceptor returns response.data for convenience.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let accessToken = null; // in-memory token fallback

export const setAccessToken = (token) => {
  accessToken = token;
  try {
    localStorage.setItem('ACCESS_TOKEN', token);
  } catch (e) {
    // localStorage might be disabled in some contexts; still keep in-memory value
  }
};

export const clearAccessToken = () => {
  accessToken = null;
  try { localStorage.removeItem('ACCESS_TOKEN'); } catch (e) {}
};

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // allow cookies if backend uses cookies for refresh tokens
});

// Request interceptor - inject token
apiClient.interceptors.request.use(
  (config) => {
    // Priority order: direct in-memory token > localStorage token
    const token = accessToken || (typeof window !== 'undefined' && localStorage.getItem('ACCESS_TOKEN'));
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - unify responses and handle 401
apiClient.interceptors.response.use(
  (response) => response.data ?? response,
  async (error) => {
    const status = error?.response?.status;
    // You can implement token refresh logic here using a refresh token cookie or endpoint.
    if (status === 401) {
      // Optionally emit an event or call a refresh endpoint
      // For now, just clear token and reject so the app can redirect to login
      clearAccessToken();
    }
    // normalize error message
    const data = error?.response?.data;
    const message = data?.message || error.message || 'An unknown error occurred';
    error.normalized = { status, message, details: data };
    return Promise.reject(error);
  }
);

export default apiClient;
