import React, { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Eye } from "lucide-react";
import { apiClient } from "../api/client";

// Editors used by the Events admin form for registration periods, sponsor perks, promo codes and the price preview.
// Dates are entered in Eastern time (America/New_York), which is how the server enforces them.

const cls = "px-2 py-1.5 border border-stone-200 rounded text-sm outline-none focus:border-[#8B1A1A] w-full bg-white";
const genId = () => Math.random().toString(36).slice(2, 10);
const money = (n) => (n == null ? "—" : `$${Number(n).toFixed(2)}`);

const PERIOD_PRESETS = ["Early Bird", "Regular", "Late Registration", "At the Door"];

export function PricePeriodsEditor({ value, onChange }) {
  const periods = value || [];
  const add = () => {
    const used = new Set(periods.map((p) => p.name));
    const name = PERIOD_PRESETS.find((n) => !used.has(n)) || `Period ${periods.length + 1}`;
    const last = periods[periods.length - 1];
    onChange([...periods, { id: genId(), name, start: last?.end || "", end: "" }]);
  };
  const update = (i, key, v) => onChange(periods.map((p, idx) => (idx === i ? { ...p, [key]: v } : p)));
  const remove = (i) => onChange(periods.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2" data-testid="price-periods-editor">
      {periods.length === 0 && (
        <p className="text-xs text-stone-500">No periods: one set of prices applies until the event. Add periods for Early Bird, Regular, At the Door and so on.</p>
      )}
      {periods.map((p, i) => (
        <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2 bg-stone-50 border border-stone-200 rounded">
          <label className="text-[11px] text-stone-500">Name
            <input value={p.name || ""} onChange={(e) => update(i, "name", e.target.value)} className={cls} data-testid={`period-${i}-name`} />
          </label>
          <label className="text-[11px] text-stone-500">Starts
            <input type="datetime-local" value={(p.start || "").slice(0, 16)} onChange={(e) => update(i, "start", e.target.value)} className={cls} data-testid={`period-${i}-start`} />
          </label>
          <label className="text-[11px] text-stone-500">Ends
            <input type="datetime-local" value={(p.end || "").slice(0, 16)} onChange={(e) => update(i, "end", e.target.value)} className={cls} data-testid={`period-${i}-end`} />
          </label>
          <button type="button" onClick={() => remove(i)} className="p-2 text-red-600 hover:bg-red-50 rounded justify-self-end" aria-label="Remove period"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8B1A1A] rounded text-xs font-medium" data-testid="period-add">
        <Plus className="w-3.5 h-3.5" /> Add period
      </button>
      <p className="text-[11px] text-stone-400">Times are Eastern (Dayton). Each period must end before the next starts. Sales close when the last period ends.</p>
    </div>
  );
}

// Non-member / member prices for each registration period, inside one ticket type
export function PeriodPriceGrid({ ticket, periods, onChange }) {
  const pp = ticket.period_prices || {};
  const set = (pid, key, raw) => {
    const v = raw === "" ? null : Number(raw);
    onChange({ ...pp, [pid]: { ...(pp[pid] || {}), [key]: v } });
  };
  return (
    <div className="mt-2 p-2 bg-white border border-stone-200 rounded overflow-x-auto">
      <div className="text-[10px] font-cinzel tracking-wider text-stone-500 mb-1.5">PRICE BY REGISTRATION PERIOD (USD)</div>
      <table className="w-full text-sm min-w-[360px]">
        <thead>
          <tr className="text-[11px] text-stone-500 text-left">
            <th className="font-normal pb-1">Period</th>
            <th className="font-normal pb-1">Non-member</th>
            <th className="font-normal pb-1">Member</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p, i) => (
            <tr key={p.id}>
              <td className="pr-2 py-1 text-stone-700 whitespace-nowrap">{p.name || `Period ${i + 1}`}</td>
              <td className="pr-2 py-1">
                <input type="number" min="0" step="0.01" value={pp[p.id]?.non_member ?? ""} placeholder={String(ticket.price ?? 0)}
                  onChange={(e) => set(p.id, "non_member", e.target.value)} className={cls} data-testid={`pp-${ticket.id}-${i}-non_member`} />
              </td>
              <td className="py-1">
                <input type="number" min="0" step="0.01" value={pp[p.id]?.member ?? ""} placeholder="Same as non-member"
                  onChange={(e) => set(p.id, "member", e.target.value)} className={cls} data-testid={`pp-${ticket.id}-${i}-member`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-stone-400 mt-1">Enter 0 to make a category free. Member prices apply to the signed-in member and family members their membership covers; guests pay the non-member price.</p>
    </div>
  );
}

const PERK_TEXT = {
  none: "no perk", free: "free entry", member: "member price",
  percent: (v) => `${v}% off`, fixed: (v) => `$${v}`,
};
const perkText = (p) => {
  const t = PERK_TEXT[p.perk_kind || "none"];
  return typeof t === "function" ? t(p.perk_value) : t;
};

export function SponsorPerksEditor({ value, onChange }) {
  const [plans, setPlans] = useState(null);
  useEffect(() => {
    apiClient.get("/admin/sponsorship-plans").then((r) => setPlans((r.data || []).filter((p) => p.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0)))).catch(() => setPlans([]));
  }, []);
  const perks = value || {};
  const set = (slug, patch) => onChange({ ...perks, [slug]: { ...(perks[slug] || { mode: "default" }), ...patch } });
  if (!plans) return <Loader2 className="w-4 h-4 animate-spin text-[#8B1A1A]" />;
  if (plans.length === 0) return <p className="text-xs text-stone-500">No sponsorship levels yet.</p>;
  return (
    <div className="space-y-2" data-testid="sponsor-perks-editor">
      {plans.map((p) => {
        const o = perks[p.slug] || { mode: "default" };
        return (
          <div key={p.slug} className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_7rem] gap-2 items-center">
            <div className="text-sm font-medium text-stone-800">{p.name}</div>
            <select value={o.mode || "default"} onChange={(e) => set(p.slug, { mode: e.target.value })} className={cls} data-testid={`perk-${p.slug}-mode`}>
              <option value="default">Use level default ({perkText(p)})</option>
              <option value="off">No sponsor perk at this event</option>
              <option value="price">Set a price for this event</option>
            </select>
            {o.mode === "price" ? (
              <input type="number" min="0" step="0.01" value={o.price ?? 0} onChange={(e) => set(p.slug, { price: Number(e.target.value) })} className={cls} data-testid={`perk-${p.slug}-price`} />
            ) : <span />}
          </div>
        );
      })}
      <p className="text-[11px] text-stone-400">Perks apply only to people named on an active sponsorship, one ticket each. Their guests pay the normal rate.</p>
    </div>
  );
}

export function PromoCodesEditor({ value, onChange }) {
  const codes = value || [];
  const add = () => onChange([...codes, { code: "", kind: "percent", value: 10, max_uses: 0, used: 0, per_customer: 0, min_purchase: 0, categories: [], enabled: true, starts: "", ends: "" }]);
  const update = (i, key, v) => onChange(codes.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const remove = (i) => onChange(codes.filter((_, idx) => idx !== i));
  const toggleCat = (i, cat) => {
    const cur = codes[i].categories || [];
    update(i, "categories", cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]);
  };
  return (
    <div className="space-y-2" data-testid="promo-codes-editor">
      {codes.map((p, i) => (
        <div key={i} className={`p-3 rounded border space-y-2 ${p.enabled === false ? "bg-stone-100 border-stone-200 opacity-75" : "bg-stone-50 border-stone-200"}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input placeholder="CODE (e.g. DIWALI20)" value={p.code || ""} onChange={(e) => update(i, "code", e.target.value.toUpperCase().replace(/\s/g, ""))} className={cls} data-testid={`promo-${i}-code`} />
              <select value={p.kind || "percent"} onChange={(e) => update(i, "kind", e.target.value)} className={cls}>
                <option value="percent">% off</option>
                <option value="amount">$ off</option>
              </select>
              <input type="number" min="0" step="0.01" placeholder="Value" value={p.value ?? 0} onChange={(e) => update(i, "value", Number(e.target.value))} className={cls} data-testid={`promo-${i}-value`} />
              <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={p.enabled !== false} onChange={(e) => update(i, "enabled", e.target.checked)} className="w-4 h-4 accent-[#8B1A1A]" data-testid={`promo-${i}-enabled`} /> Active
              </label>
            </div>
            <button type="button" onClick={() => remove(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" aria-label="Remove code"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="text-[11px] text-stone-500">Valid from
              <input type="date" value={(p.starts || "").slice(0, 10)} onChange={(e) => update(i, "starts", e.target.value)} className={cls} />
            </label>
            <label className="text-[11px] text-stone-500">Expires (end of day)
              <input type="date" value={(p.ends || "").slice(0, 10)} onChange={(e) => update(i, "ends", e.target.value)} className={cls} />
            </label>
            <label className="text-[11px] text-stone-500">Total uses (0 = no limit)
              <input type="number" min="0" value={p.max_uses ?? 0} onChange={(e) => update(i, "max_uses", Number(e.target.value))} className={cls} />
            </label>
            <label className="text-[11px] text-stone-500">Per customer (0 = no limit)
              <input type="number" min="0" value={p.per_customer ?? 0} onChange={(e) => update(i, "per_customer", Number(e.target.value))} className={cls} />
            </label>
            <label className="text-[11px] text-stone-500">Minimum ticket total ($)
              <input type="number" min="0" step="0.01" value={p.min_purchase ?? 0} onChange={(e) => update(i, "min_purchase", Number(e.target.value))} className={cls} />
            </label>
            <div className="col-span-2 sm:col-span-3 text-[11px] text-stone-500">
              Who can use it
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {[["member", "Members"], ["non_member", "Non-members"]].map(([k, l]) => (
                  <label key={k} className="inline-flex items-center gap-1.5 text-sm text-stone-700">
                    <input type="checkbox" checked={(p.categories || []).includes(k)} onChange={() => toggleCat(i, k)} className="w-4 h-4 accent-[#8B1A1A]" /> {l}
                  </label>
                ))}
                <span className="text-stone-400">{(p.categories || []).length === 0 ? "Everyone (none ticked)" : ""}</span>
              </div>
            </div>
          </div>
          {p.max_uses > 0 && <div className="text-[11px] text-stone-500">Used {p.used || 0} of {p.max_uses}</div>}
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8B1A1A] rounded text-xs font-medium" data-testid="promo-add"><Plus className="w-3.5 h-3.5" /> Add promo code</button>
      <p className="text-[11px] text-stone-400">Codes discount ticket charges only, never donations, membership dues or fees. One code per order.</p>
    </div>
  );
}

export function PricingPreview({ data }) {
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await apiClient.post("/admin/events/pricing-preview", data);
      setRes(r.data);
    } catch (e) {
      setRes(null);
      setErr(e.response?.data?.detail || "Couldn't build the preview");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2" data-testid="pricing-preview">
      <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded text-xs font-medium disabled:opacity-50" data-testid="pricing-preview-run">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Preview prices
      </button>
      {err && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2" role="alert">{err}</div>}
      {res && (
        <div className="overflow-x-auto border border-stone-200 rounded">
          <table className="w-full text-xs min-w-[520px]" data-testid="pricing-preview-table">
            <thead className="bg-stone-50 text-stone-500 text-left">
              <tr>
                <th className="px-2 py-1.5 font-medium">Period</th>
                <th className="px-2 py-1.5 font-medium">Ticket</th>
                <th className="px-2 py-1.5 font-medium">Non-member</th>
                <th className="px-2 py-1.5 font-medium">Member</th>
                <th className="px-2 py-1.5 font-medium">Child</th>
                {res.sponsor_levels.map((l) => <th key={l} className="px-2 py-1.5 font-medium">{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {res.rows.map((r, i) => (
                <tr key={i} className={`border-t border-stone-100 ${r.current ? "bg-emerald-50" : ""}`}>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.period}{r.current && <span className="ml-1 text-[10px] text-emerald-700 font-medium">NOW</span>}</td>
                  <td className="px-2 py-1.5">{r.ticket_type}</td>
                  <td className="px-2 py-1.5 tabular-nums">{money(r.non_member)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{money(r.member)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{money(r.child)}</td>
                  {res.sponsor_levels.map((l) => <td key={l} className="px-2 py-1.5 tabular-nums">{r.sponsors[l] == null ? "Normal rate" : money(r.sponsors[l])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-2 py-1.5 text-[11px] text-stone-500 border-t border-stone-100">
            Card fees: {res.fee_mode === "voluntary" ? "buyers can add a contribution" : "ICGD covers them"} · Donation prompt: {res.donations_enabled ? "on" : "off"}
          </div>
        </div>
      )}
    </div>
  );
}
