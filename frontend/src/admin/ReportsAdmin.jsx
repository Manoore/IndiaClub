import React, { useEffect, useState } from "react";
import { apiClient, downloadFile } from "../api/client";
import { useAdminAuth } from "../api/AdminAuthContext";
import { useToast } from "../hooks/use-toast";
import { Download, Loader2, BellRing } from "lucide-react";

const EXPORTS = [
  { kind: "members", label: "Members", areas: ["members"], text: "Contact details, plan, status, valid-through and payment." },
  { kind: "sponsors", label: "Sponsors", areas: ["sponsors"], text: "Every sponsorship signup with level, payment and expiry." },
  { kind: "registrations", label: "Event registrations", areas: ["events", "tickets"], text: "One row per attendee ticket, with check-in time." },
  { kind: "revenue", label: "Revenue", areas: ["finance"], text: "Tickets, memberships, sponsorships and donations for the year." },
  { kind: "donations", label: "Donations", areas: ["finance"], text: "Donor, amount and payment status." },
];

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

const ReminderList = ({ title, rows, kind }) => (
  <div className="bg-white border border-stone-200 rounded-xl p-5">
    <h3 className="font-medium text-stone-900 mb-3">{title} <span className="text-stone-400 font-normal">({rows.length})</span></h3>
    {rows.length === 0 ? (
      <p className="text-sm text-stone-400">Nobody right now.</p>
    ) : (
      <ul className="divide-y divide-stone-100 text-sm max-h-72 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="py-2 flex justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-stone-800 truncate">{r.name}</div>
              <div className="text-xs text-stone-500 truncate">
                {kind === "sponsor" ? `${r.tier} · ${r.contact || ""}` : `${r.plan || ""}${r.tier ? ` / ${r.tier}` : ""}`} ·{" "}
                {r.email ? <a href={`mailto:${r.email}`} className="text-[#8B1A1A] hover:underline">{r.email}</a> : null}
                {r.phone ? ` · ${r.phone}` : ""}
              </div>
            </div>
            <div className="text-xs text-stone-600 whitespace-nowrap">{fmtDate(r.end_date)}</div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default function ReportsAdmin() {
  const { can, profile } = useAdminAuth();
  const canFinance = can("finance");
  const { toast } = useToast();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [summary, setSummary] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!canFinance) return;
    setSummary(null);
    apiClient.get("/admin/reports/summary", { params: { year } }).then((r) => setSummary(r.data)).catch(() => setSummary({ sources: [] }));
  }, [year, canFinance]);

  useEffect(() => {
    if (!profile) return;
    apiClient.get("/admin/reminders").then((r) => setReminders(r.data)).catch(() => setReminders(null));
  }, [profile]);

  const exportCsv = async (kind) => {
    setBusy(kind);
    try {
      const q = kind === "revenue" ? `?year=${year}` : "";
      await downloadFile(`/admin/exports/${kind}${q}`, `${kind}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      toast({ title: "Export failed", description: e.response?.status === 403 ? "Your role can't export this data." : e.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Reports & Exports</h1>
        <p className="text-stone-500 mt-1 text-sm">Download spreadsheets (CSV, opens in Excel or Google Sheets) and see who needs a renewal nudge.</p>
      </div>

      {can("finance") && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-[#8B1A1A]">Revenue {year}</h2>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-1.5 border border-stone-200 rounded-md text-sm bg-white" data-testid="report-year">
              {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {!summary ? (
            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8B1A1A]" /></div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm" data-testid="revenue-table">
                <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
                  <tr><th className="px-4 py-3">Source</th><th className="px-4 py-3 text-right">Records</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3 text-right">Refunded</th></tr>
                </thead>
                <tbody>
                  {summary.sources.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-stone-400">No transactions in {year}.</td></tr>}
                  {summary.sources.map((s) => (
                    <tr key={s.source} className="border-t border-stone-100">
                      <td className="px-4 py-2.5">{s.source}</td>
                      <td className="px-4 py-2.5 text-right">{s.count}</td>
                      <td className="px-4 py-2.5 text-right text-green-700 font-medium">{money(s.paid)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700">{money(s.outstanding)}</td>
                      <td className="px-4 py-2.5 text-right text-stone-500">{money(s.refunded)}</td>
                    </tr>
                  ))}
                  {summary.sources.length > 0 && (
                    <tr className="border-t-2 border-stone-200 font-medium">
                      <td className="px-4 py-2.5">Total</td><td />
                      <td className="px-4 py-2.5 text-right text-green-700">{money(summary.total_paid)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700">{money(summary.total_outstanding)}</td><td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="mb-8">
        <h2 className="font-display text-xl text-[#8B1A1A] mb-3">Exports</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPORTS.filter((e) => can(...e.areas)).map((e) => (
            <div key={e.kind} className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col">
              <div className="font-medium text-stone-900">{e.label}</div>
              <p className="text-xs text-stone-500 mt-1 flex-1">{e.text}</p>
              <button onClick={() => exportCsv(e.kind)} disabled={busy === e.kind}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm disabled:opacity-60"
                data-testid={`export-${e.kind}`}>
                {busy === e.kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download CSV
              </button>
            </div>
          ))}
        </div>
      </section>

      {reminders && (
        <section>
          <h2 className="font-display text-xl text-[#8B1A1A] mb-1 flex items-center gap-2"><BellRing className="w-5 h-5" /> Renewal reminders</h2>
          <p className="text-sm text-stone-500 mb-3">Expiring in the next {reminders.days} days, or lapsed in the last {reminders.days}. Automatic emails come later — until then, reach out from here.</p>
          <div className="grid lg:grid-cols-2 gap-4">
            {can("members") && <ReminderList title="Members expiring soon" rows={reminders.members_expiring} />}
            {can("members") && <ReminderList title="Members recently lapsed" rows={reminders.members_expired} />}
            {can("sponsors") && <ReminderList title="Sponsors expiring soon" rows={reminders.sponsors_expiring} kind="sponsor" />}
            {can("sponsors") && <ReminderList title="Sponsors recently lapsed" rows={reminders.sponsors_expired} kind="sponsor" />}
          </div>
        </section>
      )}
    </div>
  );
}
