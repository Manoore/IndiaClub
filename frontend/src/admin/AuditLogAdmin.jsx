import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { apiClient } from "../api/client";

// Who changed prices, discounts, fee settings, sponsor perks or orders, and when
const ENTITIES = [
  { v: "", l: "Everything" },
  { v: "event", l: "Events & pricing" },
  { v: "ticket_order", l: "Ticket orders" },
  { v: "membership_plan", l: "Membership plans" },
  { v: "sponsorship_plan", l: "Sponsorship levels" },
  { v: "sponsorship", l: "Sponsorships" },
];
const ACTION_LABEL = {
  create: "Created", update: "Changed", delete: "Deleted", duplicate: "Duplicated", comp: "Complimentary tickets",
  price_adjustment: "Price adjusted", payment_status: "Payment status", named_people: "Named people",
};
const FIELD_LABEL = {
  ticket_types: "Ticket prices", price_periods: "Registration periods", promo_codes: "Promo codes", sponsor_perks: "Sponsor perks",
  donations_enabled: "Donation prompt", fee_mode: "Card fee option", fee_percent: "Fee percent", fee_fixed: "Fixed fee",
  capacity: "Capacity", registration_open: "Registration open", tiers: "Tiers", price: "Price", benefits: "Benefits",
  perk_kind: "Ticket perk", perk_value: "Perk amount", named_people: "Named people", payment_status: "Payment status",
};

const short = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v) && v.every((x) => typeof x !== "object")) return v.join(", ") || "—";
  if (typeof v === "object") return Array.isArray(v) ? `${v.length} item${v.length === 1 ? "" : "s"}` : "updated";
  return String(v);
};

export default function AuditLogAdmin() {
  const [rows, setRows] = useState(null);
  const [entity, setEntity] = useState("");
  const load = async () => {
    setRows(null);
    try {
      const r = await apiClient.get("/admin/audit-log", { params: entity ? { entity } : {} });
      setRows(r.data || []);
    } catch {
      setRows([]);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Change History</h1>
          <p className="text-stone-500 mt-1 text-sm">Every change to prices, discounts, fee settings, sponsor perks and orders, with who made it.</p>
        </div>
        <div className="flex gap-2">
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-md text-sm bg-white" data-testid="audit-filter">
            {ENTITIES.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
          </select>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 rounded-md text-sm hover:border-[#8B1A1A]"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        {!rows ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">No changes recorded yet.</div>
        ) : (
          <table className="w-full text-sm min-w-[640px]" data-testid="audit-table">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">What</th><th className="px-4 py-3">Details</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">{new Date(r.at).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.actor}</td>
                  <td className="px-4 py-3">
                    <div>{ACTION_LABEL[r.action] || r.action}</div>
                    <div className="text-xs text-stone-500">{(ENTITIES.find((e) => e.v === r.entity) || {}).l || r.entity}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-700 space-y-0.5">
                    {r.note && <div>{r.note}</div>}
                    {Object.entries(r.changes || {}).map(([k, c]) => (
                      <div key={k}><span className="text-stone-500">{FIELD_LABEL[k] || k}:</span> {short(c.from)} → {short(c.to)}</div>
                    ))}
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
