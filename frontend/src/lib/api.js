// frontend/src/lib/api.js
import axios from "axios";

// Normalize base URL (remove trailing slashes)
const RAW = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ROOT = RAW.replace(/\/+$/, "");

// Main axios instance (KEEP SAME baseURL so NO BREAKS)
const api = axios.create({
  baseURL: ROOT,  
  withCredentials: false,
});

// Attach user token automatically
api.interceptors.request.use((config) => {
  if (!config) return config;
  const token = localStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (err) => Promise.reject(err));

// Log 401 but DO NOT auto logout (prevents random logout)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      console.warn("API responded 401:", err.config?.url, err.response?.data);
      // IMPORTANT: do NOT call logout() here — let UI handle it or implement refresh-token flow
    }
    return Promise.reject(err);
  }
);

// Safe OCR root (unchanged)
export const API_ROOT = `${ROOT}/api`;

export default api;
