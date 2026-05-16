import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAdminAuth } from "../api/AdminAuthContext";
import { Lock, LogIn } from "lucide-react";
import Mandala from "../components/Mandala";

export default function AdminLogin() {
  const { login, isAuthed, loading } = useAdminAuth();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  if (isAuthed) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const r = await login(u, p);
    if (r.ok) nav("/admin");
    else setErr(r.error);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#1a0e0a] overflow-hidden">
      <Mandala className="absolute -left-32 -top-20 w-[500px] h-[500px]" color="#E07A1F" opacity={0.2} />
      <Mandala className="absolute -right-32 -bottom-20 w-[500px] h-[500px]" color="#C9A961" opacity={0.15} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#8B1A1A] mb-3 diya-glow">
            <Lock className="w-6 h-6 text-amber-100" />
          </div>
          <h1 className="font-display text-3xl text-[#8B1A1A]">Admin Login</h1>
          <p className="text-stone-500 text-sm mt-1">India Club of Greater Dayton</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input required value={u} onChange={(e) => setU(e.target.value)} placeholder="Username" className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          <input required type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="Password" className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-md">{err}</div>}
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium flex items-center justify-center gap-2 transition">
            <LogIn className="w-4 h-4" /> {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-xs text-stone-400 text-center mt-3">Default: <code>admin</code> / <code>admin123</code></p>
        </form>
      </div>
    </div>
  );
}
