import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient, downloadFile } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { Loader2, FileText, Trash2, RefreshCw } from "lucide-react";
import { PaymentBadge, PaymentSelect } from "./PaymentStatus";

const STATUS_FILTERS = ["all", "pending", "active", "expired", "renewed", "cancelled"];
const STATUS_CLS = {
  pending: "text-amber-700", active: "text-green-700", expired: "text-red-600", renewed: "text-stone-500", cancelled: "text-stone-400",
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function SponsorshipsAdmin() {
  const [rows, setRows] = useState(null);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(STATUS_FILTERS.includes(searchParams.get("status")) ? searchParams.get("status") : "all");
  const { toast } = useToast();

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
            website through Dec 31 and gets a sponsor code for sponsor ticket pricing.
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
                    <div className="text-[11px] text-stone-500 capitalize">{r.payment_method === "check" ? "By check" : "Other"}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.end_date)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.sponsor_code || "—"}</td>
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
