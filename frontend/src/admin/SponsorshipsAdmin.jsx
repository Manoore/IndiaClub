import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient, downloadFile } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { Loader2, FileText, Trash2, RefreshCw, Users } from "lucide-react";
import { PaymentBadge, PaymentSelect } from "./PaymentStatus";
import StripeActions from "./StripeActions";

const STATUS_FILTERS = ["all", "pending", "active", "expired", "renewed", "cancelled"];
const STATUS_CLS = {
  pending: "text-amber-700", active: "text-green-700", expired: "text-red-600", renewed: "text-stone-500", cancelled: "text-stone-400",
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

// People named on a sponsorship get the level's event ticket perk (one ticket each per event)
function NamedPeople({ row, limit, onSaved }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const people = row.named_people || [];
  const start = () => { setText(people.map((p) => p.name).join("\n")); setErr(""); setOpen(true); };
  const save = async () => {
    try {
      await apiClient.put(`/admin/sponsorships/${row.id}/named-people`, { people: text.split("\n").map((s) => s.trim()).filter(Boolean) });
      setOpen(false);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  };
  if (open) {
    return (
      <div className="space-y-1.5 min-w-[12rem]">
        <textarea rows={Math.max(2, limit)} value={text} onChange={(e) => setText(e.target.value)} placeholder="One name per line"
          className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm outline-none focus:border-[#8B1A1A]" data-testid={`sp-people-input-${row.id}`} />
        <div className="text-[11px] text-stone-500">Up to {limit} {limit === 1 ? "person" : "people"}</div>
        {err && <div className="text-xs text-rose-700" role="alert">{err}</div>}
        <div className="flex gap-1.5">
          <button onClick={save} className="px-2.5 py-1 bg-[#8B1A1A] text-amber-50 rounded text-xs" data-testid={`sp-people-save-${row.id}`}>Save</button>
          <button onClick={() => setOpen(false)} className="px-2.5 py-1 border border-stone-200 rounded text-xs">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      {people.length === 0 ? <div className="text-xs text-stone-400">None named</div> : (
        <ul className="text-xs text-stone-700 space-y-0.5">{people.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
      )}
      {limit > 0 && (
        <button onClick={start} className="mt-1 inline-flex items-center gap-1 text-xs text-[#8B1A1A] hover:underline" data-testid={`sp-people-edit-${row.id}`}>
          <Users className="w-3.5 h-3.5" /> {people.length ? "Edit" : "Add names"} ({people.length}/{limit})
        </button>
      )}
    </div>
  );
}

export default function SponsorshipsAdmin() {
  const [rows, setRows] = useState(null);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(STATUS_FILTERS.includes(searchParams.get("status")) ? searchParams.get("status") : "all");
  const [limits, setLimits] = useState({});
  const { toast } = useToast();
  useEffect(() => {
    apiClient.get("/admin/sponsorship-plans").then((r) => setLimits(Object.fromEntries((r.data || []).map((p) => [p.slug, Number(p.named_people || 0)])))).catch(() => setLimits({}));
  }, []);

  const load = async () => {
    setRows(null);
    const r = await apiClient.get("/admin/sponsorships", { params: { status: filter } });
    setRows(r.data);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const setPayment = async (row, status) => {
    if (status === "refunded" || status === "failed") {
      if (!window.confirm(`Mark as ${status}? This cancels the sponsorship and hides the sponsor listing.`)) return;
    }
    try {
      const r = await apiClient.post(`/admin/sponsorships/${row.id}/payment`, { status });
      toast({ title: status === "paid" && r.data.status === "active" ? "Payment recorded — sponsorship active" : "Payment status updated" });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e.response?.data?.detail || e.message });
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the sponsorship record for ${row.company}? The sponsor listing is kept.`)) return;
    await apiClient.delete(`/admin/sponsorships/${row.id}`);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Sponsorships</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sponsor signups from the website. Mark <strong>Paid</strong> when the check arrives — the sponsor goes live on the
            website through Dec 31 and gets a sponsor code. People named on the sponsorship get its event ticket perk.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 rounded-md text-sm hover:border-[#8B1A1A]">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm border capitalize ${filter === f ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"}`}
            data-testid={`sp-filter-${f}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        {!rows ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">No sponsorships yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">Sponsor</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Valid through</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Named people</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-stone-100 align-top" data-testid={`sp-row-${r.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.logo_url ? <img src={r.logo_url} alt="" className="w-10 h-10 rounded object-contain border bg-white" /> : <div className="w-10 h-10 rounded bg-stone-100" />}
                      <div>
                        <div className="font-medium text-stone-900">{r.company}{r.is_renewal && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded">RENEWAL</span>}</div>
                        <div className="text-xs text-stone-500">{r.contact_name} · {r.email} · {r.phone}</div>
                        {r.message && <div className="text-xs text-stone-500 mt-1 italic line-clamp-2">“{r.message}”</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.tier}<div className="text-xs text-stone-500">${Number(r.amount || 0).toLocaleString()}</div></td>
                  <td className={`px-4 py-3 text-xs font-cinzel tracking-wider ${STATUS_CLS[r.status] || ""}`}>{(r.status || "").toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <div className="mb-1"><PaymentBadge status={r.payment_status} /></div>
                    <div className="text-[11px] text-stone-500 capitalize">{r.payment_method === "check" ? "By check" : r.payment_method === "stripe" ? "" : "Other"}</div>
                    <StripeActions kind="sponsorship" refId={r.id} stripe={r.stripe} status={r.payment_status} amount={r.amount} onChanged={load} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.end_date)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.sponsor_code || "—"}</td>
                  <td className="px-4 py-3"><NamedPeople row={r} limit={limits[r.plan] || 0} onSaved={load} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <PaymentSelect value={r.payment_status} onChange={(v) => setPayment(r, v)} testid={`sp-pay-${r.id}`} />
                    <button onClick={() => downloadFile(`/admin/sponsorships/${r.id}/invoice`, `invoice-${r.company}.pdf`)}
                      className="p-1.5 text-stone-500 hover:text-[#8B1A1A] ml-1" title="Download invoice (PDF)" data-testid={`sp-invoice-${r.id}`}>
                      <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(r)} className="p-1.5 text-stone-500 hover:text-red-600 ml-1" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
