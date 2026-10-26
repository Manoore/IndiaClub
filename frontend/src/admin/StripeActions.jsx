import React, { useState } from "react";
import { RefreshCw, Undo2, Loader2 } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";

/**
 * Card-payment tools for one purchase: "Check with Stripe" while it's unpaid, and refunds once paid.
 * kind: order | membership | upgrade | sponsorship | donation
 * stripe: the record's stripe info ({session_id, payment_intent, refunded_cents, refunds[]})
 */
export default function StripeActions({ kind, refId, stripe, status, amount, hasDonation = false, onChanged, compact = false }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [part, setPart] = useState("full");
  const [custom, setCustom] = useState("");
  const [reason, setReason] = useState("");
  if (!stripe || !stripe.session_id) return null;
  const refundedCents = Number(stripe.refunded_cents || 0);
  const totalCents = amount != null ? Math.round(Number(amount) * 100) : Number(stripe.amount_cents || 0);
  const left = Math.max(0, totalCents - refundedCents) / 100;

  const check = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post("/admin/payments/sync", { kind, ref: refId });
      toast({ title: `Stripe says: ${r.data.status}` });
      onChanged && onChanged();
    } catch (e) {
      toast({ title: "Couldn't check with Stripe", description: e.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };
  const refund = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post("/admin/payments/refund", { kind, ref: refId, part, amount: part === "custom" ? Number(custom) : undefined, reason });
      toast({ title: `Refunded $${r.data.refunded.toFixed(2)}`, description: r.data.remaining > 0 ? `$${r.data.remaining.toFixed(2)} still paid.` : "Fully refunded." });
      setRefunding(false);
      setReason("");
      onChanged && onChanged();
    } catch (e) {
      toast({ title: "Refund failed", description: e.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
    }
  };

  const btn = "inline-flex items-center gap-1 px-2.5 py-1 border border-stone-300 hover:border-[#8B1A1A] rounded text-xs disabled:opacity-50";
  return (
    <div className={`flex flex-col gap-1.5 ${compact ? "items-end" : ""}`} data-testid={`stripe-actions-${kind}`}>
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] text-stone-500">Card (Stripe){refundedCents > 0 ? ` · $${(refundedCents / 100).toFixed(2)} refunded` : ""}</span>
        {status !== "paid" && status !== "refunded" && (
          <button type="button" onClick={check} disabled={busy} className={btn} data-testid={`stripe-check-${kind}`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check with Stripe
          </button>
        )}
        {status === "paid" && stripe.payment_intent && left > 0 && !refunding && (
          <button type="button" onClick={() => setRefunding(true)} className={btn} data-testid={`stripe-refund-${kind}`}>
            <Undo2 className="w-3.5 h-3.5" /> Refund
          </button>
        )}
      </div>
      {refunding && (
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-50 border border-stone-200 rounded p-2 text-xs">
          <select value={part} onChange={(e) => setPart(e.target.value)} className="px-2 py-1 border border-stone-200 rounded bg-white" data-testid={`stripe-refund-part-${kind}`}>
            <option value="full">Everything left (${left.toFixed(2)})</option>
            {kind === "order" && <option value="tickets">Tickets only</option>}
            {kind === "order" && hasDonation && <option value="donation">Donation only</option>}
            <option value="custom">Custom amount</option>
          </select>
          {part === "custom" && <input type="number" min="0.5" step="0.01" max={left} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="$" className="w-20 px-2 py-1 border border-stone-200 rounded" />}
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className="flex-1 min-w-[8rem] px-2 py-1 border border-stone-200 rounded" data-testid={`stripe-refund-reason-${kind}`} />
          <button type="button" onClick={refund} disabled={busy || reason.trim().length < 3} className="px-2.5 py-1 bg-[#8B1A1A] text-amber-50 rounded disabled:opacity-50" data-testid={`stripe-refund-go-${kind}`}>Refund</button>
          <button type="button" onClick={() => setRefunding(false)} className="px-2.5 py-1 border border-stone-200 rounded">Cancel</button>
        </div>
      )}
    </div>
  );
}
