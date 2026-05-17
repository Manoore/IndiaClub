import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "./client";

const MemberAuthContext = createContext(null);

export const MemberAuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("icgd_member_token"));
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(!!localStorage.getItem("icgd_member_token"));

  useEffect(() => {
    let mounted = true;
    if (token) {
      apiClient
        .get("/members/me")
        .then((r) => {
          if (mounted) setMember(r.data);
        })
        .catch(() => logout())
        .finally(() => {
          if (mounted) setBootstrapping(false);
        });
    } else {
      setBootstrapping(false);
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const r = await apiClient.post("/members/login", { email, password });
      localStorage.setItem("icgd_member_token", r.data.token);
      setToken(r.data.token);
      setMember(r.data.member);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const r = await apiClient.post("/members/register", payload);
      localStorage.setItem("icgd_member_token", r.data.token);
      setToken(r.data.token);
      setMember(r.data.member);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.response?.data?.detail || "Registration failed" };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("icgd_member_token");
    setToken(null);
    setMember(null);
  };

  const refresh = async () => {
    try {
      const r = await apiClient.get("/members/me");
      setMember(r.data);
      return r.data;
    } catch {
      return null;
    }
  };

  return (
    <MemberAuthContext.Provider
      value={{
        token,
        member,
        loading,
        bootstrapping,
        login,
        register,
        logout,
        refresh,
        isAuthed: !!token && !!member,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
};

export const useMemberAuth = () => useContext(MemberAuthContext);
