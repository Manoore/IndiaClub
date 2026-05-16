import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "./client";

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("icgd_admin_token"));
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      apiClient.get("/admin/me").then((r) => setUsername(r.data.username)).catch(() => logout());
    }
    // eslint-disable-next-line
  }, [token]);

  const login = async (u, p) => {
    setLoading(true);
    try {
      const r = await apiClient.post("/admin/login", { username: u, password: p });
      localStorage.setItem("icgd_admin_token", r.data.token);
      setToken(r.data.token);
      setUsername(r.data.username);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("icgd_admin_token");
    setToken(null);
    setUsername(null);
  };

  return (
    <AdminAuthContext.Provider value={{ token, username, loading, login, logout, isAuthed: !!token }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
