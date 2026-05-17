import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/use-toast";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useMemberAuth } from "../api/MemberAuthContext";

export default function LoginPage() {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const auth = useMemberAuth();

  const nextPath = new URLSearchParams(loc.search).get("next") || "/member/dashboard";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (tab === "login") {
      const r = await auth.login(form.email.trim().toLowerCase(), form.password);
      setBusy(false);
      if (r.ok) {
        toast({ title: "Welcome back!", description: "You're now signed in." });
        nav(nextPath);
      } else {
        toast({ title: "Login failed", description: r.error });
      }
    } else {
      if (form.password !== form.confirm) {
        setBusy(false);
        toast({ title: "Passwords don't match", description: "Please check and try again." });
        return;
      }
      if (form.password.length < 6) {
        setBusy(false);
        toast({ title: "Password too short", description: "Use at least 6 characters." });
        return;
      }
      const r = await auth.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || undefined,
      });
      setBusy(false);
      if (r.ok) {
        toast({ title: "Account created", description: "Welcome to India Club!" });
        nav(nextPath);
      } else {
        toast({ title: "Registration failed", description: r.error });
      }
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="MEMBERS"
        title={tab === "login" ? "Member Login" : "Create Account"}
        image="https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
      />
      <section className="py-20 bg-cream">
        <div className="max-w-md mx-auto px-6">
          <div className="bg-white p-7 rounded-2xl border border-amber-100 shadow-sm">
            <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-md mb-6">
              <button
                onClick={() => setTab("login")}
                className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                  tab === "login" ? "bg-white text-[#8B1A1A] shadow" : "text-stone-500"
                }`}
                data-testid="member-tab-login"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
              <button
                onClick={() => setTab("register")}
                className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                  tab === "register" ? "bg-white text-[#8B1A1A] shadow" : "text-stone-500"
                }`}
                data-testid="member-tab-register"
              >
                <UserPlus className="w-4 h-4" /> Register
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              {tab === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="First name"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]"
                    data-testid="member-register-first-name"
                  />
                  <input
                    required
                    placeholder="Last name"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]"
                    data-testid="member-register-last-name"
                  />
                </div>
              )}
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]"
                data-testid="member-email"
              />
              {tab === "register" && (
                <input
                  placeholder="Phone (optional)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]"
                  data-testid="member-register-phone"
                />
              )}
              <input
                required
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]"
                data-testid="member-password"
              />
              {tab === "register" && (
                <input
                  required
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]"
                  data-testid="member-register-confirm"
                />
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                data-testid="member-submit"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {tab === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
            <div className="mt-5 text-center text-sm text-stone-600">
              {tab === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setTab("register")}
                    className="text-[#8B1A1A] hover:text-[#E07A1F] font-medium"
                    data-testid="switch-to-register"
                  >
                    Register Now
                  </button>
                </>
              ) : (
                <>
                  Already a member?{" "}
                  <button
                    onClick={() => setTab("login")}
                    className="text-[#8B1A1A] hover:text-[#E07A1F] font-medium"
                    data-testid="switch-to-login"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
