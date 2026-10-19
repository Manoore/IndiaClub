import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, XCircle, Loader2, Baby } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";

const TABS = ["pending", "approved", "rejected", "all"];
const STATUS_C = { pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-rose-100 text-rose-800" };

export default function FamilyApprovalsAdmin() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await apiClient.get(`/admin/family-members?status=${tab}`)).data); } finally { setLoading(false); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const review = async (f, action) => {
    let note = "";
    if (action === "reject") {
      note = window.prompt(`Reason for not verifying ${f.name}? (shown to the member)`, "");
      if (note === null) return;
    }
    setBusy(f.id);
    try {
      await apiClient.post(`/admin/family-members/${f.id}/${action}`, { note });
      toast({ title: action === "approve" ? `${f.name} verified` : `${f.name} rejected` });
      await load();
    } catch (e) { toast({ title: "Failed", description: e.response?.data?.detail }); } finally { setBusy(null); }
  };

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Family Approvals</h1>
      <p className="text-stone-500 mt-1 text-sm mb-5">Verify family members added by members. Check the name & date of birth against the member's household (e.g. membership form, ID, or school record) — verified kids get child / under‑3 pricing at checkout.</p>
      <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${tab === t ? "bg-white shadow-sm text-[#8B1A1A] font-medium" : "text-stone-600 hover:text-stone-900"}`} data-testid={`family-tab-${t}`}>{t}</button>
        ))}
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-stone-500" data-testid="family-approvals-empty">Nothing here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="px-4 py-3">Family member</th><th className="px-4 py-3">DOB / Age</th><th className="px-4 py-3">Primary member</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-50" data-testid={`family-approval-row-${f.id}`}>
                    <td className="px-4 py-3"><div className="font-medium">{f.name}</div><div className="text-xs text-stone-500 capitalize">{f.relation}</div></td>
                    <td className="px-4 py-3">
                      <div>{f.date_of_birth}</div>
                      <div className="text-xs text-stone-500 flex items-center gap-1">age {f.age}{f.age_band !== "adult" && <span className="px-1.5 rounded bg-violet-100 text-violet-800 text-[10px] uppercase flex items-center gap-0.5">{f.age_band === "infant" && <Baby className="w-3 h-3" />}{f.age_band}</span>}</div>
                    </td>
                    <td className="px-4 py-3"><div>{f.member_name || "—"}</div><div className="text-xs text-stone-500">{f.member_email} · <span className="capitalize">{f.member_status}</span></div></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${STATUS_C[f.status]}`}>{f.status}</span>
                      {f.admin_note && <div className="text-xs text-stone-500 mt-1 max-w-[14rem]">{f.admin_note}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {f.status !== "approved" && <button onClick={() => review(f, "approve")} disabled={busy === f.id} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-xs hover:bg-emerald-200 flex items-center gap-1 disabled:opacity-50" data-testid={`family-approve-${f.id}`}><ShieldCheck className="w-3.5 h-3.5" /> Verify</button>}
                        {f.status !== "rejected" && <button onClick={() => review(f, "reject")} disabled={busy === f.id} className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded text-xs hover:bg-rose-100 flex items-center gap-1 disabled:opacity-50" data-testid={`family-reject-${f.id}`}><XCircle className="w-3.5 h-3.5" /> Reject</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
