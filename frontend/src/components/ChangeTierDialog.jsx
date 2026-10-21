import React, { useEffect, useState } from "react";
import { Loader2, X, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { fmtLongDate } from "./MembershipTermNote";

// Switch membership type within the current plan: upgrades now for the price difference
// (expiration unchanged); downgrades take effect at the next renewal.
export default function ChangeTierDialog({ membership, plan, initialTier, onClose, onDone }) {
  const { toast } = useToast();
  const tiers = plan?.tiers || [];
  const others = tiers.filter((t) => t.slug !== membership.tier);
  const [tier, setTier] = useState(
    initialTier && initialTier !== membership.tier ? initialTier : (others.find((t) => t.slug === "family") || others[0] || {}).slug
  );
  const [quote, setQuote] = useState(null);
  const [method, setMethod] = useState("check");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tier) return;
    setQuote(null);
    apiClient.get("/members/me/change-tier/quote", { params: { tier } }).then((r) => setQuote(r.data)).catch(() => setQuote(null));
  }, [tier]);

  const confirm = async () => {
    setBusy(true);
    try {
      await apiClient.post("/members/me/change-tier", { tier, payment_method: method });
      const name = tiers.find((t) => t.slug === tier)?.name || tier;
      toast({
        title: quote?.kind === "downgrade" ? `Switch to ${name} scheduled` : `You're now a ${name} member`,
        description: quote?.kind === "upgrade" ? `Please pay the $${quote.amount} difference — the Treasurer will confirm it.` : undefined,
      });
      await onDone();
      onClose();
    } catch (err) {
      toast({ title: "Couldn't change membership", description: err.response?.data?.detail || "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const until = fmtLongDate(membership.end_date);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="change-tier-dialog">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">CHANGE MEMBERSHIP TYPE</div>
            <h3 className="font-display text-2xl text-[#8B1A1A]">{plan?.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-500" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {tiers.map((t) => {
            const current = t.slug === membership.tier;
            return (
              <button key={t.slug} type="button" role="radio" aria-checked={tier === t.slug} disabled={current}
                onClick={() => setTier(t.slug)}
                className={`p-3 rounded-md border text-left ${current ? "border-stone-200 bg-stone-50 text-stone-400 cursor-default" : tier === t.slug ? "border-[#8B1A1A] bg-[#8B1A1A] text-amber-50" : "border-stone-200 hover:border-[#8B1A1A]"}`}
                data-testid={`change-tier-${t.slug}`}>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs opacity-80">${t.price}{current ? " · current" : ""}{membership.scheduled_tier === t.slug ? " · scheduled" : ""}</div>
              </button>
            );
          })}
        </div>

        {!quote ? (
          <div className="py-3"><Loader2 className="w-5 h-5 animate-spin text-[#8B1A1A]" /></div>
        ) : quote.kind === "upgrade" || quote.kind === "switch" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" data-testid="change-tier-summary">
            <div className="flex items-center gap-1.5 font-medium"><ArrowUpCircle className="w-4 h-4" /> Takes effect now</div>
            {quote.amount > 0 ? <>You pay the difference: <strong>${quote.amount}</strong>. </> : "No extra charge. "}
            Your membership stays valid through <strong>{until}</strong>.
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="change-tier-summary">
            <div className="flex items-center gap-1.5 font-medium"><ArrowDownCircle className="w-4 h-4" /> Takes effect at your next renewal</div>
            You keep your current benefits until <strong>{until}</strong>; your renewal will be at the new price. No refunds for the current term.
          </div>
        )}

        {quote?.kind === "upgrade" && quote.amount > 0 && (
          <div>
            <div className="text-xs text-stone-500 mb-1.5">How will you pay the difference?</div>
            <div className="grid grid-cols-3 gap-2">
              {["check", "paypal", "other"].map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`py-2 rounded-md text-sm border capitalize ${method === m ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "border-stone-200 hover:border-[#8B1A1A]"}`}
                  data-testid={`change-tier-pay-${m}`}>{m}</button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 border border-stone-200 rounded-md text-sm">Cancel</button>
          <button onClick={confirm} disabled={busy || !quote || !tier} className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm disabled:opacity-60" data-testid="change-tier-confirm">
            {busy ? "Saving…" : quote?.kind === "downgrade" ? "Schedule change" : quote?.amount > 0 ? `Upgrade for $${quote.amount}` : "Switch now"}
          </button>
        </div>
      </div>
    </div>
  );
}
