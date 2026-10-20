import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, X, Gift } from "lucide-react";

const STATE = {
  active: { label: "Active", cls: "bg-green-100 text-green-800" },
  scheduled: { label: "Scheduled", cls: "bg-sky-100 text-sky-800" },
  ended: { label: "Ended", cls: "bg-stone-200 text-stone-700" },
  off: { label: "Off", cls: "bg-stone-100 text-stone-500" },
};
const APPLIES = { both: "New & renewing members", new: "New members only", renewal: "Renewing members only" };
const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

const nextYearEnd = () => `${new Date().getFullYear() + 1}-12-31`;
const EMPTY = { name: "", start_date: "", end_date: "", expiration_date: nextYearEnd(), applies_to: "both", active: true, notes: "" };

export default function MembershipPromotionsAdmin() {
  const { toast } = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => setRows((await apiClient.get("/admin/membership-promotions")).data);
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: editing.name, start_date: editing.start_date, end_date: editing.end_date, expiration_date: editing.expiration_date,
        applies_to: editing.applies_to, active: editing.active, notes: editing.notes || "" };
      if (editing.id) await apiClient.put(`/admin/membership-promotions/${editing.id}`, body);
      else await apiClient.post("/admin/membership-promotions", body);
      toast({ title: editing.id ? "Promotion updated" : "Promotion created" });
      setEditing(null);
      load();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast({ title: "Save failed", description: Array.isArray(d) ? "Please fill in every field." : d || err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p) => {
    const body = { name: p.name, start_date: p.start_date, end_date: p.end_date, expiration_date: p.expiration_date, applies_to: p.applies_to, active: !p.active, notes: p.notes || "" };
    await apiClient.put(`/admin/membership-promotions/${p.id}`, body);
    toast({ title: p.active ? "Promotion switched off" : "Promotion switched on" });
    load();
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await apiClient.delete(`/admin/membership-promotions/${p.id}`);
      load();
    } catch (err) {
      toast({ title: "Can't delete", description: err.response?.data?.detail || err.message });
    }
  };

  const field = "mt-1 w-full px-3 py-2 border border-stone-200 rounded-md text-sm";
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Membership Promotions</h1>
          <p className="text-stone-500 mt-1 text-sm max-w-2xl">
            Memberships normally last <strong>12 months from payment</strong>. While a promotion is active, eligible signups and
            renewals get its fixed expiration date instead — never earlier than a member's current expiration. Ending or switching
            off a promotion doesn't change memberships already granted.
          </p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm" data-testid="add-promotion">
          <Plus className="w-4 h-4" /> New promotion
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        {!rows ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            <Gift className="w-8 h-8 mx-auto mb-2 text-[#E07A1F]" />
            No promotions yet. Create one for Diwali (for example Oct 1 – Nov 15, memberships valid through Dec 31 next year).
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="promotions-table">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="px-4 py-3">Promotion</th><th className="px-4 py-3">Window</th><th className="px-4 py-3">Members get</th><th className="px-4 py-3">Applies to</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Used</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-stone-100" data-testid={`promotion-${p.id}`}>
                  <td className="px-4 py-3 font-medium text-stone-900">{p.name}{p.notes && <div className="text-xs text-stone-500 font-normal">{p.notes}</div>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(p.start_date)} – {fmt(p.end_date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">Valid through <strong>{fmt(p.expiration_date)}</strong></td>
                  <td className="px-4 py-3">{APPLIES[p.applies_to] || p.applies_to}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATE[p.state]?.cls}`}>{STATE[p.state]?.label}</span></td>
                  <td className="px-4 py-3 text-right">{p.usage_count || 0}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => toggle(p)} className="px-2 py-1 text-xs border border-stone-200 rounded hover:border-[#8B1A1A] mr-1" data-testid={`promotion-toggle-${p.id}`}>{p.active ? "Switch off" : "Switch on"}</button>
                    <button onClick={() => setEditing({ ...EMPTY, ...p })} className="p-1.5 text-stone-500 hover:text-[#8B1A1A]" title="Edit"><Pencil className="w-4 h-4" /></button>
                    {!p.usage_count && <button onClick={() => remove(p)} className="p-1.5 text-stone-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto" data-testid="promotion-form">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{editing.id ? "Edit promotion" : "New promotion"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-stone-500"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm"><span className="text-xs uppercase tracking-wider text-stone-500">Promotion name</span>
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Diwali 2026 Special" className={field} data-testid="promo-name" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm"><span className="text-xs uppercase tracking-wider text-stone-500">Promotion starts</span>
                <input required type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} className={field} data-testid="promo-start" />
              </label>
              <label className="block text-sm"><span className="text-xs uppercase tracking-wider text-stone-500">Promotion ends</span>
                <input required type="date" value={editing.end_date} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} className={field} data-testid="promo-end" />
              </label>
            </div>
            <label className="block text-sm"><span className="text-xs uppercase tracking-wider text-stone-500">Memberships valid through (fixed expiration)</span>
              <input required type="date" value={editing.expiration_date} onChange={(e) => setEditing({ ...editing, expiration_date: e.target.value })} className={field} data-testid="promo-expiration" />
              <span className="block text-xs text-stone-500 mt-1">If a member would get a later date anyway (12 months from payment, or their current expiration), they keep the later date.</span>
            </label>
            <label className="block text-sm"><span className="text-xs uppercase tracking-wider text-stone-500">Applies to</span>
              <select value={editing.applies_to} onChange={(e) => setEditing({ ...editing, applies_to: e.target.value })} className={`${field} bg-white`} data-testid="promo-applies">
                {Object.entries(APPLIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block text-sm"><span className="text-xs uppercase tracking-wider text-stone-500">Notes (optional)</span>
              <input value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className={field} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="accent-[#8B1A1A]" />
              Apply automatically during the promotion window
            </label>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-stone-200 rounded-md text-sm">Cancel</button>
              <button disabled={saving} className="px-4 py-2 bg-[#8B1A1A] text-amber-50 rounded-md text-sm disabled:opacity-60" data-testid="promo-save">{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
