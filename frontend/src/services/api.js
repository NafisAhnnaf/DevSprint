import axios from "axios";

export const API_BASE_URL = import.meta.env.DEV 
  ? (import.meta.env.VITE_API_URL || "http://localhost:5001") 
  : window.location.origin;

console.log("Using API_BASE_URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL, // Points to Order Gateway dynamically
});

// Automatically add JWT to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
