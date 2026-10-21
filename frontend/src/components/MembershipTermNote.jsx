import React from "react";

export const fmtLongDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

// Shows the expiration a member will get before they pay (from GET /membership/quote)
export default function MembershipTermNote({ quote, testid = "sub-valid-through" }) {
  if (quote?.rule === "free") {
    return <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-md text-sm text-emerald-900" data-testid={testid}>Free membership — no payment and no expiry.</div>;
  }
  if (!quote || (!quote.valid_through && !quote.lifetime)) return null;
  if (quote.lifetime) {
    return <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-md text-sm text-emerald-900" data-testid={testid}>Lifetime membership — never expires.</div>;
  }
  const until = fmtLongDate(quote.valid_through);
  return (
    <div className="border border-emerald-200 bg-emerald-50 p-3 rounded-md text-sm text-emerald-900" data-testid={testid}>
      {quote.rule === "promotion" && quote.promotion && (
        <div className="font-medium mb-0.5" data-testid="sub-promo">
          🎉 {quote.promotion.name}: valid through {until}
          {quote.standard_end && <> instead of {fmtLongDate(quote.standard_end)}</>}
          {quote.promotion_ends && <span className="font-normal"> · offer ends {fmtLongDate(`${quote.promotion_ends}T00:00:00`)}</span>}
        </div>
      )}
      {quote.rule === "kept_current" ? (
        <>Your membership already runs to <strong>{until}</strong> — renewing never shortens it.</>
      ) : (
        <>Membership valid through <strong>{until}</strong></>
      )}
      <span className="block text-xs text-emerald-800/80 mt-0.5">
        {quote.rule === "promotion"
          ? "Promotion dates are locked in when you submit."
          : "Memberships last 12 months from the day your payment is confirmed, so the final date may move slightly later."}
      </span>
    </div>
  );
}
