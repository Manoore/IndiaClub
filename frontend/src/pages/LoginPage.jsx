import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/use-toast";
import { LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", confirm: "", email: "", name: "" });
  const { toast } = useToast();
  const nav = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    if (tab === "login") {
      localStorage.setItem("icgd_user", JSON.stringify({ username: form.username, loggedIn: true }));
      toast({ title: "Welcome back!", description: "You're now logged in." });
      nav("/");
    } else {
      if (form.password !== form.confirm) { toast({ title: "Passwords don't match", description: "Please check and try again." }); return; }
      const users = JSON.parse(localStorage.getItem("icgd_users") || "[]");
      users.push({ username: form.username, email: form.email, name: form.name });
      localStorage.setItem("icgd_users", JSON.stringify(users));
      toast({ title: "Registration complete", description: "You can now log in with your credentials." });
      setTab("login");
    }
  };
  return (
    <>
      <PageHeader eyebrow="MEMBERS" title={tab === "login" ? "Member Login" : "Register"} image="https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" />
      <section className="py-20 bg-cream">
        <div className="max-w-md mx-auto px-6">
          <div className="bg-white p-7 rounded-2xl border border-amber-100">
            <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-md mb-6">
              <button onClick={() => setTab("login")} className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition ${tab === "login" ? "bg-white text-[#8B1A1A] shadow" : "text-stone-500"}`}><LogIn className="w-4 h-4" /> Sign In</button>
              <button onClick={() => setTab("register")} className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition ${tab === "register" ? "bg-white text-[#8B1A1A] shadow" : "text-stone-500"}`}><UserPlus className="w-4 h-4" /> Register</button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              {tab === "register" && <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />}
              {tab === "register" && <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />}
              <input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              {tab === "register" && <input required type="password" placeholder="Confirm password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />}
              <button type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium">{tab === "login" ? "Sign In" : "Create Account"}</button>
            </form>
            {tab === "login" && (
              <div className="mt-5 text-center text-sm text-stone-600">Don't have an account? <button onClick={() => setTab("register")} className="text-[#8B1A1A] hover:text-[#E07A1F] font-medium">Register Now</button></div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
