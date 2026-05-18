import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, Ticket, Lock, Plus, Minus, CheckCircle2 } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { useMemberAuth } from "../api/MemberAuthContext";

// Returns true if a ticket type is currently purchasable
const isTypeAvailable = (t) => {
  const now = new Date();
  if (t.sale_start) {
    const start = new Date(t.sale_start);
    if (!isNaN(start) && now < start) return { available: false, reason: "Not on sale yet" };
  }
  if (t.sale_end) {
    const end = new Date(t.sale_end);
    if (!isNaN(end) && now > end) return { available: false, reason: "Sales ended" };
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

  const items = visibleTypes
    .map((t) => ({
      type: t,
      qty: quantities[t.id] || 0,
    }))
    .filter((i) => i.qty > 0);

  const subtotal = items.reduce((s, i) => s + i.qty * Number(i.type.price || 0), 0);
  const totalTickets = items.reduce((s, i) => s + i.qty, 0);

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
              <div className="text-xs text-stone-500">{event.date} · {event.venue}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          {/* Member-only hint */}
          {!isActiveMember && types.some((t) => t.members_only) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-amber-900">Members get special pricing.</span>{" "}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    nav("/login?next=/events");
                  }}
                  className="text-amber-900 underline hover:text-amber-700"
                >
                  Sign in
                </button>{" "}
                or{" "}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    nav("/membership");
                  }}
                  className="text-amber-900 underline hover:text-amber-700"
                >
                  become a member
                </button>{" "}
                to unlock member-only ticket types.
              </div>
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
                        <div className="text-sm text-[#8B1A1A] font-display mt-1">
                          ${Number(t.price).toFixed(2)}
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

          {/* Summary + Submit */}
          {totalTickets > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-md p-3 flex items-center justify-between">
              <div className="text-sm text-stone-700">
                {totalTickets} ticket{totalTickets > 1 ? "s" : ""}
              </div>
              <div>
                <span className="text-stone-500 text-sm">Total: </span>
                <span className="font-display text-xl text-[#8B1A1A]" data-testid="ticket-total">
                  ${subtotal.toFixed(2)}
                </span>
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
