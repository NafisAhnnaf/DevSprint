import axios from "axios";
import { useAuth } from "../context/AuthContext";

// const { logout } = useAuth();
const api = axios.create({
  baseURL: "http://localhost:5001", // Points to Order Gateway
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
