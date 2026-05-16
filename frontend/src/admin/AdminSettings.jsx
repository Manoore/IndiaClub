import React, { useState } from "react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { Lock } from "lucide-react";
import { useAdminAuth } from "../api/AdminAuthContext";

export default function AdminSettings() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const { username } = useAdminAuth();
  const { toast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast({ title: "Passwords don't match" });
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/admin/change-password", { current_password: form.current_password, new_password: form.new_password });
      toast({ title: "Password updated", description: "Use your new password next time." });
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (e) {
      toast({ title: "Failed", description: e.response?.data?.detail || "Try again" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-xl">
      <div className="mb-7">
        <h1 className="font-display text-3xl text-stone-900">Settings</h1>
        <p className="text-stone-500 mt-1">Account: <span className="font-semibold">{username || "—"}</span></p>
      </div>
      <form onSubmit={submit} className="bg-white p-7 rounded-2xl border border-stone-200 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-[#8B1A1A]" />
          <h2 className="font-display text-xl text-[#8B1A1A]">Change Password</h2>
        </div>
        <input required type="password" placeholder="Current password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
        <input required type="password" placeholder="New password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
        <input required type="password" placeholder="Confirm new password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition">{loading ? "Updating..." : "Update Password"}</button>
      </form>
    </div>
  );
}
