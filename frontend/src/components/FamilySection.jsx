import React, { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, Edit3, ShieldCheck, Clock, XCircle, Loader2, Check, X } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { useMemberAuth } from "../api/MemberAuthContext";

const STATUS = {
  approved: { l: "Verified", c: "bg-emerald-50 text-emerald-800 border-emerald-200", I: ShieldCheck },
  pending: { l: "Awaiting verification", c: "bg-amber-50 text-amber-800 border-amber-200", I: Clock },
  rejected: { l: "Not verified", c: "bg-rose-50 text-rose-800 border-rose-200", I: XCircle },
};
const RELATIONS = ["spouse", "child", "parent", "sibling", "other"];
const empty = { name: "", relation: "child", date_of_birth: "" };
const cls = "px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm bg-white";

const FamilyForm = ({ initial, onSubmit, onCancel, busy, testPrefix }) => {
  const [f, setF] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="grid sm:grid-cols-[1fr_8rem_10rem_auto] gap-2 items-center" data-testid={`${testPrefix}-form`}>
      <input required placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={cls} data-testid={`${testPrefix}-name`} />
      <select value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} className={`${cls} capitalize`} data-testid={`${testPrefix}-relation`}>
        {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <input required type="date" max={new Date().toISOString().slice(0, 10)} value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} className={cls} data-testid={`${testPrefix}-dob`} />
      <div className="flex gap-1.5">
        <button type="submit" disabled={busy} className="px-3 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm flex items-center gap-1 disabled:opacity-60" data-testid={`${testPrefix}-save`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="p-2 text-stone-500 hover:text-stone-800" data-testid={`${testPrefix}-cancel`}><X className="w-4 h-4" /></button>}
      </div>
    </form>
  );
};

// Shown in place of My Family for memberships that don't cover a household
const FamilyLocked = ({ onUpgrade }) => (
  <div id="family" className="bg-white rounded-2xl p-6 border border-amber-100 scroll-mt-24" data-testid="family-locked">
    <div className="flex items-center gap-2 mb-1">
      <Users className="w-5 h-5 text-[#8B1A1A]" />
      <h2 className="font-display text-2xl text-[#8B1A1A]">My Family</h2>
    </div>
    <p className="text-sm text-stone-600 mb-4">
      Family features are part of <strong>Family</strong> and <strong>Business</strong> memberships: add your spouse, kids and parents,
      book named tickets for everyone in one checkout, and get child pricing for kids aged 3–11 (under-3s free).
    </p>
    {onUpgrade ? (
      <button onClick={onUpgrade} className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium" data-testid="family-upgrade-btn">
        Upgrade to Family
      </button>
    ) : (
      <a href="/membership" className="inline-flex px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium">See membership options</a>
    )}
  </div>
);

export default function FamilySection({ enabled = true, onUpgrade }) {
  if (!enabled) return <FamilyLocked onUpgrade={onUpgrade} />;
  return <FamilyManager />;
}

function FamilyManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { member } = useMemberAuth();
  // The membership covers family_size people, the member included
  const size = Number(member?.family_size || 6);
  const used = items.filter((f) => f.status !== "rejected").length;
  const full = used >= size - 1;

  const load = useCallback(async () => {
    try { setItems((await apiClient.get("/members/me/family")).data); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (f, id) => {
    setBusy(true);
    try {
      if (id) await apiClient.put(`/members/me/family/${id}`, f);
      else await apiClient.post("/members/me/family", f);
      toast({ title: id ? "Family member updated" : "Family member added", description: "An admin will verify them shortly." });
      setAdding(false); setEditing(null);
      await load();
    } catch (err) {
      toast({ title: "Couldn't save", description: err.response?.data?.detail?.toString() || "Check the details and try again." });
    } finally { setBusy(false); }
  };
  const remove = async (f) => {
    if (!window.confirm(`Remove ${f.name} from your family group?`)) return;
    await apiClient.delete(`/members/me/family/${f.id}`);
    toast({ title: "Removed" });
    load();
  };

  return (
    <div id="family" className="bg-white rounded-2xl p-6 border border-amber-100 scroll-mt-24" data-testid="family-section">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#8B1A1A]" />
          <h2 className="font-display text-2xl text-[#8B1A1A]">My Family</h2>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} disabled={full} title={full ? `Your membership covers up to ${size} people` : undefined}
            className="px-3 py-1.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm flex items-center gap-1.5 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed" data-testid="family-add-btn">
            <Plus className="w-4 h-4" /> Add family member
          </button>
        )}
      </div>
      <div className="text-xs text-stone-500 mb-2" data-testid="family-count">
        {used + 1} of {size} people covered (you + {used} family member{used === 1 ? "" : "s"})
        {full && <span className="text-amber-800"> · Your membership covers up to {size} people. Remove someone to add another.</span>}
      </div>
      <p className="text-sm text-stone-500 mb-4">Add your spouse, kids and parents once — then book named tickets for everyone in one checkout. Admins verify each person; verified kids aged 3–11 get child pricing and under‑3s go free.</p>

      {adding && <div className="mb-4 p-3 bg-amber-50/50 rounded-lg border border-amber-100"><FamilyForm initial={empty} onSubmit={(f) => save(f)} onCancel={() => setAdding(false)} busy={busy} testPrefix="family-new" /></div>}

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#8B1A1A]" />
      ) : items.length === 0 && !adding ? (
        <div className="text-sm text-stone-500 py-6 text-center border border-dashed border-stone-200 rounded-lg" data-testid="family-empty">No family members yet.</div>
      ) : (
        <div className="divide-y divide-stone-100">
          {items.map((f) => {
            const s = STATUS[f.status] || STATUS.pending;
            if (editing === f.id) return <div key={f.id} className="py-3"><FamilyForm initial={{ name: f.name, relation: f.relation, date_of_birth: f.date_of_birth }} onSubmit={(v) => save(v, f.id)} onCancel={() => setEditing(null)} busy={busy} testPrefix={`family-edit-${f.id}`} /></div>;
            return (
              <div key={f.id} className="py-3 flex items-center gap-3 flex-wrap" data-testid={`family-row-${f.id}`}>
                <div className="w-9 h-9 rounded-full bg-amber-100 text-[#8B1A1A] flex items-center justify-center font-display">{f.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-[10rem]">
                  <div className="font-medium text-stone-900">{f.name}</div>
                  <div className="text-xs text-stone-500 capitalize">{f.relation} · age {f.age ?? "—"}{f.age_band !== "adult" ? ` · ${f.age_band === "infant" ? "under 3" : "child"}` : ""}</div>
                  {f.status === "rejected" && f.admin_note && <div className="text-xs text-rose-700 mt-0.5">Admin note: {f.admin_note}</div>}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border ${s.c}`} data-testid={`family-status-${f.id}`}><s.I className="w-3 h-3" /> {s.l}</span>
                <button onClick={() => setEditing(f.id)} className="p-1.5 text-stone-500 hover:text-[#8B1A1A]" data-testid={`family-edit-btn-${f.id}`}><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => remove(f)} className="p-1.5 text-stone-500 hover:text-rose-600" data-testid={`family-delete-btn-${f.id}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
