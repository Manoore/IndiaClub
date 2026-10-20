import React from "react";

export const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending", cls: "bg-amber-100 text-amber-800" },
  { value: "awaiting_check", label: "Awaiting Check", cls: "bg-sky-100 text-sky-800" },
  { value: "paid", label: "Paid", cls: "bg-green-100 text-green-800" },
  { value: "failed", label: "Failed", cls: "bg-red-100 text-red-700" },
  { value: "refunded", label: "Refunded", cls: "bg-stone-200 text-stone-700" },
];

const byValue = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s.value, s]));

export const PaymentBadge = ({ status }) => {
  const s = byValue[status || "pending"] || byValue.pending;
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${s.cls}`}>{s.label}</span>;
};

export const PaymentSelect = ({ value, onChange, testid }) => (
  <select
    value={value || "pending"}
    onChange={(e) => onChange(e.target.value)}
    className="px-2 py-1 border border-stone-200 rounded text-xs bg-white"
    data-testid={testid}
  >
    {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
  </select>
);
