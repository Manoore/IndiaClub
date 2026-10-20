import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAdminAuth } from "../api/AdminAuthContext";
import { useToast } from "../hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";

const AREA_LABELS = {
  "*": "Everything", dashboard: "Dashboard", members: "Members", events: "Events", tickets: "Ticket orders",
  checkin: "Check-in", sponsors: "Sponsors", finance: "Donations & revenue", reports: "Reports", content: "Website content",
};
const EMPTY = { username: "", name: "", role: "volunteer", password: "", disabled: false };

export default function AdminUsersAdmin() {
  const { username: me } = useAdminAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState(null);
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => setUsers((await apiClient.get("/admin/users")).data);
  useEffect(() => {
    load();
    apiClient.get("/admin/users/roles").then((r) => setRoles(r.data));
  }, []);

  const roleLabel = (v) => roles.find((r) => r.value === v)?.label || v;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...editing, password: editing.password || null };
      if (editing.id) await apiClient.put(`/admin/users/${editing.id}`, body);
      else await apiClient.post("/admin/users", body);
      toast({ title: editing.id ? "User updated" : "User created" });
      setEditing(null);
      load();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast({ title: "Save failed", description: Array.isArray(d) ? "Password must be at least 8 characters." : d || err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete admin user "${u.username}"?`)) return;
    try {
      await apiClient.delete(`/admin/users/${u.id}`);
      load();
    } catch (err) {
      toast({ title: "Delete failed", description: err.response?.data?.detail || err.message });
    }
  };

  const selected = roles.find((r) => r.value === editing?.role);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Admin Users</h1>
          <p className="text-stone-500 mt-1 text-sm">Give each EC member and volunteer their own login. Their role decides what they can see.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm" data-testid="add-admin-user">
          <Plus className="w-4 h-4" /> Add user
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        {!users ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="px-4 py-3">Username</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-stone-100" data-testid={`admin-user-${u.username}`}>
                  <td className="px-4 py-3 font-medium">{u.username}{u.username === me && <span className="ml-2 text-[10px] text-stone-400">(you)</span>}</td>
                  <td className="px-4 py-3">{u.name || "—"}</td>
                  <td className="px-4 py-3">{roleLabel(u.role)}</td>
                  <td className="px-4 py-3">{u.disabled ? <span className="text-xs text-red-600">Disabled</span> : <span className="text-xs text-green-700">Active</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing({ ...EMPTY, ...u, password: "" })} className="p-1.5 text-stone-500 hover:text-[#8B1A1A]" title="Edit"><Pencil className="w-4 h-4" /></button>
                    {u.username !== me && (
                      <button onClick={() => remove(u)} className="p-1.5 text-stone-500 hover:text-red-600 ml-1" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{editing.id ? "Edit user" : "New admin user"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-stone-500"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-stone-500">Username</span>
              <input required disabled={!!editing.id} value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-md disabled:bg-stone-50" data-testid="au-username" />
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-stone-500">Full name</span>
              <input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-md" />
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-stone-500">Role</span>
              <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-md bg-white" data-testid="au-role">
                {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {selected && <span className="block text-xs text-stone-500 mt-1">Can access: {selected.areas.map((a) => AREA_LABELS[a] || a).join(", ")}</span>}
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-stone-500">{editing.id ? "New password (leave empty to keep)" : "Password (8+ characters)"}</span>
              <input type="password" required={!editing.id} minLength={8} value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-md" autoComplete="new-password" data-testid="au-password" />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.disabled} onChange={(e) => setEditing({ ...editing, disabled: e.target.checked })} className="accent-[#8B1A1A]" />
              Disable this login
            </label>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-stone-200 rounded-md text-sm">Cancel</button>
              <button disabled={saving} className="px-4 py-2 bg-[#8B1A1A] text-amber-50 rounded-md text-sm disabled:opacity-60" data-testid="au-save">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
