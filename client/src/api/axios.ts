import axios from "axios";
import { useAuth } from "../context/AuthContext";

// Base API instance
const instance = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach token to every request
instance.interceptors.request.use(
  (config) => {
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");
    if (auth && auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default instance;