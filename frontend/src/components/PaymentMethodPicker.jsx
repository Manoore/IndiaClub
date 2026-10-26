import React, { useEffect, useState } from "react";
import { CreditCard, Lock } from "lucide-react";
import { apiClient } from "../api/client";

// Card payments go through Stripe's secure hosted page; the site never sees card numbers.

let cardReady = null; // cached /payments/config result
export const cardPaymentsAvailable = async () => {
  if (cardReady === null) {
    try {
      cardReady = !!(await apiClient.get("/payments/config")).data.card;
    } catch {
      cardReady = false;
    }
  }
  return cardReady;
};

// Send the buyer to Stripe to pay for something already reserved (order, membership, upgrade, sponsorship, donation)
export const startCardPayment = async (kind, ref) => {
  const r = await apiClient.post("/payments/stripe/checkout", { kind, ref });
  window.location.assign(r.data.url);
};

const LABELS = {
  stripe: { l: "Card", sub: "Credit/debit, Apple Pay, Google Pay" },
  check: { l: "Check", sub: "Mail or hand in a check" },
  cash: { l: "Cash at door", sub: "Pay at the event" },
  other: { l: "Other", sub: "We'll contact you" },
};

export default function PaymentMethodPicker({ value, onChange, options = ["stripe", "check"], testidPrefix = "pay" }) {
  const [card, setCard] = useState(cardReady);
  useEffect(() => {
    let live = true;
    cardPaymentsAvailable().then((ok) => {
      if (!live) return;
      setCard(ok);
      if (!ok && value === "stripe") onChange(options.find((o) => o !== "stripe") || "check");
      if (ok && !value) onChange("stripe");
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = options.filter((o) => o !== "stripe" || card);
  return (
    <div>
      <div className={`grid gap-2 ${shown.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {shown.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={value === o}
            className={`py-2 px-2 rounded-md text-sm border text-left transition ${value === o ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"}`}
            data-testid={`${testidPrefix}-${o}`}>
            <span className="font-medium flex items-center gap-1.5">{o === "stripe" && <CreditCard className="w-4 h-4" />}{LABELS[o].l}</span>
            <span className={`block text-[11px] ${value === o ? "text-amber-100" : "text-stone-500"}`}>{LABELS[o].sub}</span>
          </button>
        ))}
      </div>
      {value === "stripe" && (
        <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-1"><Lock className="w-3 h-3" /> You'll pay on Stripe's secure page, then come back here.</p>
      )}
    </div>
  );
}
