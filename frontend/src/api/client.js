import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BASE}/api`;

export const apiClient = axios.create({ baseURL: API });

// Attach the right token based on the URL
apiClient.interceptors.request.use((config) => {
  const url = config.url || "";
  if (url.startsWith("/admin/") || url === "/admin") {
    const t = localStorage.getItem("icgd_admin_token");
    if (t) config.headers.Authorization = `Bearer ${t}`;
  } else if (url.startsWith("/members/me") || url === "/members/me") {
    const t = localStorage.getItem("icgd_member_token");
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// Auto-logout admin on 401 from admin endpoints; clear member token on 401 from member endpoints
apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response && err.response.status;
    const url = (err.config && err.config.url) || "";
    if (status === 401) {
      if (url.startsWith("/admin/")) {
        localStorage.removeItem("icgd_admin_token");
        if (
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/admin") &&
          window.location.pathname !== "/admin/login"
        ) {
          window.location.href = "/admin/login";
        }
      } else if (url.startsWith("/members/me")) {
        localStorage.removeItem("icgd_member_token");
      }
    }
    return Promise.reject(err);
  }
);

export const fileUrl = (id) => (id ? `${API}/files/${id}` : null);
