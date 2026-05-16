import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BASE}/api`;

export const apiClient = axios.create({ baseURL: API });

// Attach admin token if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("icgd_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401 && window.location.pathname.startsWith("/admin")) {
      localStorage.removeItem("icgd_admin_token");
      if (window.location.pathname !== "/admin/login") window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export const fileUrl = (id) => id ? `${API}/files/${id}` : null;
