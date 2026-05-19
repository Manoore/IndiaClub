import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, Ticket, Lock, Plus, Minus, CheckCircle2, Calendar, Video, MapPin, Tag } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { useMemberAuth } from "../api/MemberAuthContext";

// Returns true if a ticket type is currently purchasable
const fmtWhen = (d) => {
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
const isTypeAvailable = (t) => {
  const now = new Date();
  if (t.sale_start) {
    const start = new Date(t.sale_start);
    if (!isNaN(start) && now < start) return { available: false, reason: `On sale ${fmtWhen(start)}` };
  }
  if (t.sale_end) {
    const end = new Date(t.sale_end);
    if (!isNaN(end) && now > end) return { available: false, reason: `Sales ended ${fmtWhen(end)}` };
  }
  const total = Number(t.quantity_total || 0);
  const sold = Number(t.quantity_sold || 0);
  if (total > 0 && sold >= total) return { available: false, reason: "Sold out" };
  return { available: true, remaining: total > 0 ? total - sold : null };
};

export default function TicketPurchaseModal({ event, onClose, onSuccess }) {
  const { isAuthed, member } = useMemberAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [quantities, setQuantities] = useState({}); // { ticket_type_id: number }
  const [buyer, setBuyer] = useState({
    buyer_name: member ? `${member.first_name} ${member.last_name}`.trim() : "",
    buyer_email: member?.email || "",
    buyer_phone: member?.phone || "",
    payment_method: "paypal",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  // Phase 5: promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoErr, setPromoErr] = useState("");

  const types = event.ticket_types || [];
  const isActiveMember = isAuthed && member?.membership?.status === "active";

  // Filter types — hide member-only for non-members; hide expired/sold out (or show with notice)
  const visibleTypes = useMemo(() => {
    return types
      .filter((t) => {
        if (t.members_only && !isActiveMember) return false;
        return true;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [types, isActiveMember]);

  const setQty = (id, q) => {
    if (q < 0) q = 0;
    setQuantities((prev) => ({ ...prev, [id]: q }));
  };

  // Mirror of backend _effective_ticket_price()
  const now = new Date();
  const priceOf = (t) => {
    const eb = t.early_bird_end_date ? new Date(t.early_bird_end_date) : null;
    if (t.early_bird_price != null && eb && now <= eb) return Number(t.early_bird_price);
    if (isActiveMember && t.member_price != null) return Number(t.member_price);
    return Number(t.price || 0);
  };
  const priceLabel = (t) => {
    const eb = t.early_bird_end_date ? new Date(t.early_bird_end_date) : null;
    const ebActive = t.early_bird_price != null && eb && now <= eb;
    const memberActive = !ebActive && isActiveMember && t.member_price != null;
    const eff = priceOf(t);
    const regular = Number(t.price || 0);
    return { eff, regular, ebActive, memberActive, eb };
  };

  const items = visibleTypes
    .map((t) => ({
      type: t,
      qty: quantities[t.id] || 0,
    }))
    .filter((i) => i.qty > 0);

  const subtotal = items.reduce((s, i) => s + i.qty * priceOf(i.type), 0);
  const totalTickets = items.reduce((s, i) => s + i.qty, 0);

  const computedDiscount = promo
    ? (promo.kind === "percent" ? subtotal * (Number(promo.value) / 100) : Math.min(Number(promo.value), subtotal))
    : 0;
  const total = Math.max(0, subtotal - computedDiscount);

  const applyPromo = async () => {
    const code = (promoInput || "").trim();
    if (!code) return;
    setPromoBusy(true);
    setPromoErr("");
    try {
      const r = await apiClient.post(`/events/${event.id}/validate-promo`, { code });
      setPromo(r.data);
      toast({ title: `Promo applied: ${r.data.code}`, description: `${r.data.kind === "percent" ? r.data.value + "% off" : "$" + r.data.value + " off"}` });
    } catch (err) {
      setPromo(null);
      setPromoErr(err?.response?.data?.detail || "Invalid promo code");
    } finally {
      setPromoBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (totalTickets === 0) {
      toast({ title: "Select at least one ticket" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        event_id: event.id,
        items: items.map((i) => ({ ticket_type_id: i.type.id, quantity: i.qty })),
        buyer_name: buyer.buyer_name.trim(),
        buyer_email: buyer.buyer_email.trim(),
        buyer_phone: buyer.buyer_phone?.trim() || undefined,
        payment_method: buyer.payment_method,
        promo_code: promo?.code || undefined,
        notes: buyer.notes || "",
      };
      const r = await apiClient.post(`/events/${event.id}/purchase-tickets`, payload);
      setSuccess(r.data);
      if (onSuccess) onSuccess(r.data);
    } catch (err) {
      toast({
        title: "Purchase failed",
        description: err.response?.data?.detail || "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl max-w-md w-full p-7"
          onClick={(e) => e.stopPropagation()}
          data-testid="ticket-success-modal"
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-700" />
            </div>
            <h3 className="font-display text-2xl text-[#8B1A1A] mb-2">Tickets Reserved! 🎉</h3>
            <p className="text-stone-600 mb-5">
              We've reserved {totalTickets} ticket{totalTickets > 1 ? "s" : ""} for{" "}
              <span className="font-medium">{event.title}</span>. Confirmation sent to{" "}
              <span className="font-medium">{success.buyer_email}</span>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm mb-5">
              <div className="font-medium text-amber-900 mb-1.5">Order Summary</div>
              {success.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-stone-700">
                  <span>{it.quantity}× {it.ticket_type_name}</span>
                  <span>${(it.unit_price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-medium text-[#8B1A1A] mt-2 pt-2 border-t border-amber-200">
                <span>Total</span>
                <span>${Number(success.total).toFixed(2)}</span>
              </div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-600 mb-5">
              <strong>Payment:</strong>{" "}
              {buyer.payment_method === "paypal" && "Send payment via PayPal to contact@indiaclubdayton.org. Include your email in the memo."}
              {buyer.payment_method === "check" && "Mail your check payable to 'India Club of Greater Dayton'. Tickets will be confirmed upon receipt."}
              {buyer.payment_method === "cash" && "Bring exact cash to the event entrance. Show this confirmation."}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition"
              data-testid="ticket-success-close"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="ticket-purchase-modal"
      >
        <div className="sticky top-0 bg-white border-b border-stone-200 p-5 flex items-start justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#8B1A1A]">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">BUY TICKETS</div>
              <h3 className="font-display text-xl text-[#8B1A1A]">{event.title}</h3>
              <div className="text-xs text-stone-500 flex items-center gap-2 flex-wrap mt-0.5" data-testid="ticket-event-meta">
                {(event.start_date || event.date) && (
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{event.start_date ? new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : event.date}{event.end_date && event.end_date !== event.start_date ? ` → ${new Date(event.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</span>
                )}
                {event.event_format === "online" || event.event_format === "hybrid" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700"><Video className="w-3 h-3" />{event.event_format === "hybrid" ? "Hybrid" : "Online"}</span>
                ) : null}
                {(event.event_format !== "online") && event.venue && (
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue.split(",")[0]}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          {/* Member-only / activation hint — only show if EVERY ticket is members-only.
             If at least one ticket is open to non-members, don't gate them with this banner. */}
          {!isActiveMember && types.length > 0 && types.every((t) => t.members_only) && (() => {
            const status = isAuthed ? (member?.membership?.status || "none") : null;
            // Logged-in but no membership / pending / expired → different CTA
            let title, body, primaryLabel, primaryAction;
            if (!isAuthed) {
              title = "These tickets are members-only.";
              body = "Sign in if you're already a member, or become one to unlock these tickets.";
              primaryLabel = "Sign in";
              primaryAction = () => { onClose(); nav("/login?next=/events"); };
            } else if (status === "pending") {
              title = "Your membership is pending review.";
              body = "An admin will activate it shortly. Member-only tickets unlock once your membership is active.";
              primaryLabel = "View status";
              primaryAction = () => { onClose(); nav("/member/dashboard"); };
            } else if (status === "expired") {
              title = "Your membership has expired.";
              body = "Renew now to unlock these member-only tickets.";
              primaryLabel = "Renew (+1 year)";
              primaryAction = () => { onClose(); nav("/member/dashboard"); };
            } else {
              title = "These tickets are members-only.";
              body = "Become a member to unlock them — and enjoy discounted pricing on most events.";
              primaryLabel = "Become a member";
              primaryAction = () => { onClose(); nav("/membership"); };
            }
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2" data-testid="ticket-membership-prompt">
                <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-amber-900">{title}</div>
                  <div className="text-amber-900/90 mt-0.5">{body}</div>
                  <button
                    type="button"
                    onClick={primaryAction}
                    className="mt-2 text-amber-900 underline hover:text-amber-700 font-medium"
                    data-testid="ticket-membership-cta"
                  >
                    {primaryLabel} →
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Soft hint when SOME tickets are members-only (mixed case). Tiny, non-blocking. */}
          {!isActiveMember && types.some((t) => t.members_only) && !types.every((t) => t.members_only) && (
            <div className="text-xs text-stone-500 flex items-center gap-1.5" data-testid="ticket-member-hint">
              <Lock className="w-3 h-3" />
              <span>
                {isAuthed
                  ? <>Some ticket types are members-only. <button type="button" onClick={() => { onClose(); nav("/member/dashboard"); }} className="underline text-[#8B1A1A] hover:text-[#E07A1F]">Activate your membership</button> to unlock them.</>
                  : <>Members get extra ticket types & discounts. <button type="button" onClick={() => { onClose(); nav("/login?next=/events"); }} className="underline text-[#8B1A1A] hover:text-[#E07A1F]">Sign in</button> or <button type="button" onClick={() => { onClose(); nav("/membership"); }} className="underline text-[#8B1A1A] hover:text-[#E07A1F]">become a member</button>.</>}
              </span>
            </div>
          )}

          {/* Ticket types */}
          <div>
            <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2">SELECT TICKETS</div>
            {visibleTypes.length === 0 ? (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-5 text-center text-stone-500 text-sm">
                No tickets available for this event yet.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleTypes.map((t) => {
                  const avail = isTypeAvailable(t);
                  const qty = quantities[t.id] || 0;
                  const maxQty = avail.remaining != null ? avail.remaining : 20;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        avail.available
                          ? "border-stone-200 bg-white"
                          : "border-stone-200 bg-stone-50 opacity-60"
                      }`}
                      data-testid={`ticket-type-${t.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium text-stone-900">{t.name}</div>
                          {t.members_only && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-cinzel tracking-wider">
                              MEMBER
                            </span>
                          )}
                          {!avail.available && (
                            <span className="text-xs text-rose-600">{avail.reason}</span>
                          )}
                          {avail.available && avail.remaining != null && avail.remaining <= 10 && (
                            <span className="text-xs text-amber-700">
                              Only {avail.remaining} left
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <div className="text-xs text-stone-500 mt-0.5">{t.description}</div>
                        )}
                        <div className="mt-1 flex items-baseline gap-2 flex-wrap" data-testid={`ticket-price-${t.id}`}>
                          {(() => {
                            const p = priceLabel(t);
                            return (
                              <>
                                <span className="text-base text-[#8B1A1A] font-display">${p.eff.toFixed(2)}</span>
                                {(p.ebActive || p.memberActive) && p.regular > p.eff && (
                                  <span className="text-xs text-stone-400 line-through">${p.regular.toFixed(2)}</span>
                                )}
                                {p.ebActive && (
                                  <span className="px-1.5 py-0.5 bg-[#E07A1F]/15 text-[#E07A1F] rounded text-[10px] font-cinzel tracking-wider">EARLY BIRD</span>
                                )}
                                {p.memberActive && (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-cinzel tracking-wider">MEMBER PRICE</span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!avail.available || qty === 0}
                          onClick={() => setQty(t.id, qty - 1)}
                          className="w-8 h-8 rounded border border-stone-200 hover:border-[#8B1A1A] disabled:opacity-40 flex items-center justify-center"
                          data-testid={`qty-minus-${t.id}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium" data-testid={`qty-${t.id}`}>
                          {qty}
                        </span>
                        <button
                          type="button"
                          disabled={!avail.available || qty >= maxQty}
                          onClick={() => setQty(t.id, qty + 1)}
                          className="w-8 h-8 rounded border border-stone-200 hover:border-[#8B1A1A] disabled:opacity-40 flex items-center justify-center"
                          data-testid={`qty-plus-${t.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Buyer info */}
          {totalTickets > 0 && (
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="text-xs font-cinzel tracking-wider text-stone-500">YOUR DETAILS</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Full name"
                  value={buyer.buyer_name}
                  onChange={(e) => setBuyer({ ...buyer, buyer_name: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
                  data-testid="buyer-name"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={buyer.buyer_email}
                  onChange={(e) => setBuyer({ ...buyer, buyer_email: e.target.value })}
                  className="px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
                  data-testid="buyer-email"
                />
              </div>
              <input
                placeholder="Phone (optional)"
                value={buyer.buyer_phone}
                onChange={(e) => setBuyer({ ...buyer, buyer_phone: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
                data-testid="buyer-phone"
              />
              <div>
                <div className="text-xs text-stone-500 mb-1">Payment method</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "paypal", l: "PayPal" },
                    { v: "check", l: "Check" },
                    { v: "cash", l: "Cash at door" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setBuyer({ ...buyer, payment_method: opt.v })}
                      className={`py-2 rounded-md text-sm border transition ${
                        buyer.payment_method === opt.v
                          ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]"
                          : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"
                      }`}
                      data-testid={`pay-${opt.v}`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Promo code */}
          {totalTickets > 0 && (
            <div className="pt-3 border-t border-stone-100" data-testid="promo-section">
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2 flex items-center gap-1.5"><Tag className="w-3 h-3" /> PROMO CODE</div>
              {promo ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-sm" data-testid="promo-applied">
                  <span><strong>{promo.code}</strong> applied — {promo.kind === "percent" ? `${promo.value}% off` : `$${promo.value} off`}</span>
                  <button type="button" onClick={() => { setPromo(null); setPromoInput(""); }} className="text-emerald-700 hover:text-emerald-900 text-xs underline" data-testid="promo-remove">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoErr(""); }}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm uppercase"
                    data-testid="promo-input"
                  />
                  <button type="button" onClick={applyPromo} disabled={promoBusy || !promoInput.trim()} className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] disabled:opacity-50 text-amber-50 rounded-md text-sm font-medium flex items-center gap-1.5" data-testid="promo-apply">
                    {promoBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Apply
                  </button>
                </div>
              )}
              {promoErr && <div className="text-xs text-rose-600 mt-1.5" data-testid="promo-error">{promoErr}</div>}
            </div>
          )}

          {/* Summary + Submit */}
          {totalTickets > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-md p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm text-stone-700">
                <span>Subtotal · {totalTickets} ticket{totalTickets > 1 ? "s" : ""}</span>
                <span data-testid="ticket-subtotal">${subtotal.toFixed(2)}</span>
              </div>
              {promo && (
                <div className="flex items-center justify-between text-sm text-emerald-700" data-testid="ticket-discount-line">
                  <span>Discount ({promo.code})</span>
                  <span>−${computedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200">
                <span className="text-stone-700 text-sm">Total</span>
                <span className="font-display text-xl text-[#8B1A1A]" data-testid="ticket-total">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || totalTickets === 0}
            className="w-full py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="ticket-submit"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {totalTickets === 0 ? "Select tickets to continue" : `Reserve ${totalTickets} ticket${totalTickets > 1 ? "s" : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}
