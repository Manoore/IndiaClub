import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Loader2, Ticket, Lock, Plus, Minus, CheckCircle2, Calendar, Video, MapPin, Tag, Users, Hash, Heart, BadgeCheck, AlertCircle } from "lucide-react";
import AttendeePicker from "./AttendeePicker";
import { DownloadTicketsButton } from "./MyTicketsSection";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { useMemberAuth } from "../api/MemberAuthContext";

// Every price shown here comes from the server's quote (POST /events/:id/quote), which uses the same
// engine as the purchase — registration periods, member eligibility, sponsor perks, promo codes,
// membership renewal, donations and the optional fee contribution.

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
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

// Non-member / member price of a ticket type in the current registration period (display only)
const typePrices = (t, period) => {
  if (period) {
    const pp = (t.period_prices || {})[period.id] || {};
    const nm = pp.non_member ?? t.price ?? 0;
    return { nm: Number(nm), mem: Number(pp.member ?? nm) };
  }
  const eb = t.early_bird_end_date ? new Date(t.early_bird_end_date) : null;
  if (t.early_bird_price != null && eb && new Date() <= eb) return { nm: Number(t.early_bird_price), mem: Number(t.early_bird_price), eb };
  return { nm: Number(t.price || 0), mem: Number(t.member_price ?? t.price ?? 0) };
};

export default function TicketPurchaseModal({ event, onClose, onSuccess }) {
  const { isAuthed, member, refresh } = useMemberAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [quantities, setQuantities] = useState({});
  const [buyer, setBuyer] = useState({
    buyer_name: member ? `${member.first_name} ${member.last_name}`.trim() : "",
    buyer_email: member?.email || "",
    buyer_phone: member?.phone || "",
    payment_method: "paypal",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [options, setOptions] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [quoting, setQuoting] = useState(false);
  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  // Sponsor code → people named on the sponsorship
  const [sponsorInput, setSponsorInput] = useState("");
  const [sponsor, setSponsor] = useState(null);
  const [sponsorErr, setSponsorErr] = useState("");
  // Membership renewal / join in the same order
  const [plans, setPlans] = useState([]);
  const [membership, setMembership] = useState(null); // {plan, tier}
  // Donation and fee contribution
  const [donation, setDonation] = useState(0);
  const [donationOther, setDonationOther] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [coverFees, setCoverFees] = useState(false);

  const types = useMemo(() => event.ticket_types || [], [event.ticket_types]);
  const mem = member?.membership || {};
  const isActiveMember = isAuthed && mem.status === "active" && mem.plan !== "free";
  const [mode, setMode] = useState(isAuthed ? "named" : "quantity");
  const [attendees, setAttendees] = useState([]);
  const [family, setFamily] = useState([]);

  useEffect(() => {
    apiClient.get(`/events/${event.id}/checkout-options`).then((r) => setOptions(r.data)).catch(() => setOptions(null));
    apiClient.get("/membership-plans").then((r) => setPlans(r.data || [])).catch(() => setPlans([]));
  }, [event.id]);
  useEffect(() => {
    if (isAuthed && member?.family_enabled) apiClient.get("/members/me/family").then((r) => setFamily(r.data || [])).catch(() => setFamily([]));
    else setFamily([]);
  }, [isAuthed, member?.family_enabled]);

  const period = options?.period_state === "open" ? options.period : null;
  const salesClosed = options && (options.period_state === "closed" || options.period_state === "not_started");

  const visibleTypes = useMemo(() => types.filter((t) => !t.members_only || isActiveMember).sort((a, b) => (a.order || 0) - (b.order || 0)), [types, isActiveMember]);
  const availableTypes = visibleTypes.filter((t) => isTypeAvailable(t).available);
  const named = mode === "named";
  const items = visibleTypes.map((t) => ({ type: t, qty: quantities[t.id] || 0 })).filter((i) => i.qty > 0);
  const totalTickets = named ? attendees.length : items.reduce((s, i) => s + i.qty, 0);
  const setQty = (id, q) => setQuantities((prev) => ({ ...prev, [id]: Math.max(0, q) }));

  // Membership choices offered in checkout (Youth needs school details, so it's joined from the Membership page)
  const membershipOptions = useMemo(() => plans.flatMap((p) => {
    if (["free", "lifetime", "honorary"].includes(p.slug)) return [];
    if ((p.tiers || []).length) return p.tiers.filter((t) => t.slug !== "student").map((t) => ({ plan: p.slug, tier: t.slug, label: `${t.name}`, price: t.price, years: t.term_years }));
    return Number(p.price) > 0 ? [{ plan: p.slug, tier: null, label: p.name, price: p.price, years: p.term_years }] : [];
  }), [plans]);

  const donationAmount = donation === "other" ? Number(donationOther) || 0 : Number(donation) || 0;

  const payload = () => ({
    event_id: event.id,
    items: named ? [] : items.map((i) => ({ ticket_type_id: i.type.id, quantity: i.qty })),
    attendees: named ? attendees.map((a) => ({ ticket_type_id: a.ticket_type_id, kind: a.kind || (a.family_member_id ? "family" : "guest"), name: a.name, family_member_id: a.family_member_id, sponsor_person_id: a.sponsor_person_id })) : undefined,
    buyer_name: buyer.buyer_name.trim(),
    buyer_email: buyer.buyer_email.trim() || undefined,
    buyer_phone: buyer.buyer_phone?.trim() || undefined,
    payment_method: buyer.payment_method,
    promo_code: promoCode || undefined,
    sponsor_code: sponsor?.code || undefined,
    membership: membership || undefined,
    donation: donationAmount > 0 ? { amount: donationAmount, anonymous } : undefined,
    cover_fees: coverFees,
    notes: buyer.notes || "",
  });

  // Live, debounced quote whenever the selection changes
  const seq = useRef(0);
  const key = JSON.stringify({ attendees: named ? attendees.map((a) => [a.ticket_type_id, a.kind, a.family_member_id, a.sponsor_person_id, a.name]) : null, items: named ? null : quantities, promoCode, sponsor: sponsor?.code, membership, donationAmount, anonymous, coverFees, email: buyer.buyer_email, name: buyer.buyer_name, mode });
  useEffect(() => {
    if (totalTickets === 0) { setQuote(null); setQuoteErr(""); return; }
    const my = ++seq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const r = await apiClient.post(`/events/${event.id}/quote`, payload());
        if (my === seq.current) { setQuote(r.data); setQuoteErr(""); }
      } catch (e) {
        if (my === seq.current) { setQuote(null); setQuoteErr(e.response?.data?.detail || "Couldn't price this order"); }
      } finally {
        if (my === seq.current) setQuoting(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, totalTickets]);

  const lineFor = (a) => (quote && named ? quote.lines[attendees.findIndex((x) => x.key === a.key)] : null);

  const applySponsor = async () => {
    const code = sponsorInput.trim();
    if (!code) return;
    setSponsorErr("");
    try {
      const r = await apiClient.get("/sponsorships/validate-code", { params: { code } });
      setSponsor(r.data);
      if (!named) setMode("named");
    } catch (err) {
      setSponsor(null);
      setSponsorErr(err?.response?.data?.detail || "Sponsor code not recognised");
    }
  };
  const removeSponsor = () => {
    setSponsor(null);
    setSponsorInput("");
    setAttendees(attendees.filter((a) => a.kind !== "sponsor"));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (totalTickets === 0) { toast({ title: "Select at least one ticket" }); return; }
    if (!quote) { toast({ title: "Please fix the order first", description: quoteErr }); return; }
    setBusy(true);
    try {
      const r = await apiClient.post(`/events/${event.id}/purchase-tickets`, payload());
      setSuccess(r.data);
      if (r.data.membership_purchase && refresh) refresh();
      if (onSuccess) onSuccess(r.data);
    } catch (err) {
      toast({ title: "Purchase failed", description: err.response?.data?.detail || "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  if (success) return <SuccessView event={event} order={success} onClose={onClose} />;

  const offer = quote?.membership_offer;
  const showMembership = isAuthed && membershipOptions.length > 0 && (offer || membership);
  const donationsOn = options?.donations_enabled !== false;
  const presets = options?.donation_presets || [10, 25, 50, 100];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="ticket-purchase-modal">
        <div className="sticky top-0 bg-white border-b border-stone-200 p-5 flex items-start justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#8B1A1A]"><Ticket className="w-5 h-5" /></div>
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
                {event.event_format !== "online" && event.venue && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue.split(",")[0]}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-md" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          {period && (
            <div className="flex items-center gap-2 text-sm bg-[#E07A1F]/10 text-[#9a4f0c] rounded-md px-3 py-2" data-testid="checkout-period">
              <span className="font-cinzel text-[11px] tracking-wider">{period.name.toUpperCase()}</span>
              {period.end && <span>pricing until {new Date(period.end).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} (Eastern)</span>}
            </div>
          )}
          {salesClosed && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-700" data-testid="checkout-closed">
              {options.period_state === "not_started"
                ? <>Registration opens {new Date(options.period.start).toLocaleString("en-US", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })} (Eastern).</>
                : <>Online registration for this event has closed.</>}
            </div>
          )}

          <MembersOnlyNotice types={types} isActiveMember={isActiveMember} isAuthed={isAuthed} member={member} onClose={onClose} nav={nav} />

          {!salesClosed && availableTypes.length > 0 && (
            <div className="flex gap-1 bg-stone-100 p-1 rounded-lg" data-testid="ticket-mode-toggle">
              {[{ v: "named", l: "Name each attendee", I: Users }, { v: "quantity", l: "Just pick quantities", I: Ticket }].map((o) => (
                <button key={o.v} type="button" onClick={() => setMode(o.v)} className={`flex-1 py-1.5 rounded-md text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors ${mode === o.v ? "bg-white shadow-sm text-[#8B1A1A] font-medium" : "text-stone-600 hover:text-stone-900"}`} data-testid={`ticket-mode-${o.v}`}>
                  <o.I className="w-3.5 h-3.5" /> {o.l}
                </button>
              ))}
            </div>
          )}

          {!salesClosed && named && availableTypes.length > 0 && (
            <div>
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2">WHO'S ATTENDING?</div>
              <AttendeePicker
                types={availableTypes}
                family={family}
                attendees={attendees}
                setAttendees={setAttendees}
                priceFor={(a) => { const l = lineFor(a); return l ? l.price : null; }}
                reasonFor={(a) => lineFor(a)?.reason}
                selfName={member ? `${member.first_name || ""} ${member.last_name || ""}`.trim() : ""}
                isAuthed={isAuthed}
                eventDate={event.start_date}
                sponsorPeople={sponsor?.people || []}
                sponsorLabel={sponsor?.tier || "sponsor"}
              />
              <div className="text-[11px] text-stone-400 mt-2">Members and the family members their membership covers get member prices; guests pay the non-member price. Verified kids aged 3–11 pay the child price; under 3 enter free.</div>
            </div>
          )}

          {/* Ticket types and current prices */}
          {!salesClosed && (
            <div>
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2">{named ? "TICKET PRICES" : "SELECT TICKETS"}</div>
              {visibleTypes.length === 0 ? (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-5 text-center text-stone-500 text-sm">No tickets available for this event yet.</div>
              ) : (
                <div className="space-y-2">
                  {visibleTypes.map((t) => {
                    const avail = isTypeAvailable(t);
                    const qty = quantities[t.id] || 0;
                    const maxQty = avail.remaining != null ? avail.remaining : 20;
                    const p = typePrices(t, period);
                    return (
                      <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${avail.available ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50 opacity-60"}`} data-testid={`ticket-type-${t.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-stone-900">{t.name}</div>
                            {t.members_only && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-cinzel tracking-wider">MEMBER</span>}
                            {!avail.available && <span className="text-xs text-rose-600">{avail.reason}</span>}
                            {avail.available && avail.remaining != null && avail.remaining <= 10 && <span className="text-xs text-amber-700">Only {avail.remaining} left</span>}
                          </div>
                          {t.description && <div className="text-xs text-stone-500 mt-0.5">{t.description}</div>}
                          <div className="mt-1 flex items-baseline gap-3 flex-wrap text-sm" data-testid={`ticket-price-${t.id}`}>
                            <span><span className="text-xs text-stone-500">Non-member </span><span className="font-display text-[#8B1A1A]">{money(p.nm)}</span></span>
                            {p.mem !== p.nm && <span><span className="text-xs text-stone-500">Member </span><span className="font-display text-emerald-800">{money(p.mem)}</span></span>}
                            {t.child_price != null && <span className="text-[11px] text-violet-700">Child {money(t.child_price)}</span>}
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 ${named ? "hidden" : ""}`}>
                          <button type="button" disabled={!avail.available || qty === 0} onClick={() => setQty(t.id, qty - 1)} className="w-8 h-8 rounded border border-stone-200 hover:border-[#8B1A1A] disabled:opacity-40 flex items-center justify-center" data-testid={`qty-minus-${t.id}`} aria-label={`Fewer ${t.name}`}><Minus className="w-4 h-4" /></button>
                          <span className="w-8 text-center font-medium" data-testid={`qty-${t.id}`}>{qty}</span>
                          <button type="button" disabled={!avail.available || qty >= maxQty} onClick={() => setQty(t.id, qty + 1)} className="w-8 h-8 rounded border border-stone-200 hover:border-[#8B1A1A] disabled:opacity-40 flex items-center justify-center" data-testid={`qty-plus-${t.id}`} aria-label={`More ${t.name}`}><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!named && totalTickets > 1 && <div className="text-[11px] text-stone-400 mt-2">The first ticket is yours{isActiveMember ? " (member price)" : ""}; the rest are for guests at the non-member price. Use "Name each attendee" for family members.</div>}
            </div>
          )}

          {/* Membership renewal or join */}
          {totalTickets > 0 && showMembership && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2" data-testid="checkout-membership">
              <div className="flex items-start gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-emerald-900">
                    {offer?.reason === "expired" ? "Renew your membership" : offer?.reason === "expires_before_event" ? "Renew before this event" : "Become a member"}
                  </div>
                  <div className="text-emerald-900/80">
                    {offer?.member_savings > 0 ? <>Member prices save you {money(offer.member_savings)} on this order. </> : null}
                    Paid together with your tickets in one payment.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setMembership(null)} className={`px-3 py-1.5 rounded-md text-sm border ${!membership ? "bg-white border-stone-400 text-stone-800" : "bg-white border-stone-200 text-stone-600"}`} data-testid="membership-none">Not now</button>
                {membershipOptions.map((o) => {
                  const on = membership && membership.plan === o.plan && membership.tier === o.tier;
                  const current = offer && offer.plan === o.plan && (offer.tier || null) === o.tier;
                  return (
                    <button key={`${o.plan}-${o.tier}`} type="button" onClick={() => setMembership({ plan: o.plan, tier: o.tier })}
                      className={`px-3 py-1.5 rounded-md text-sm border ${on ? "bg-emerald-700 text-white border-emerald-700" : "bg-white border-stone-200 text-stone-800 hover:border-emerald-700"}`}
                      data-testid={`membership-opt-${o.plan}-${o.tier || "plan"}`}>
                      {o.label} {money(o.price)}{Number(o.years) > 1 ? ` · ${o.years} yrs` : ""}{current ? " (current)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {totalTickets > 0 && !isAuthed && offer?.reason === "join" && (
            <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-md px-3 py-2" data-testid="checkout-join-hint">
              Members pay less ({money(offer.member_savings)} less on this order). <button type="button" onClick={() => { onClose(); nav("/login?next=/events"); }} className="underline text-[#8B1A1A]">Sign in</button> or <button type="button" onClick={() => { onClose(); nav("/membership"); }} className="underline text-[#8B1A1A]">become a member</button> to get member prices.
            </div>
          )}

          {/* Buyer info */}
          {totalTickets > 0 && (
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="text-xs font-cinzel tracking-wider text-stone-500">YOUR DETAILS</div>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="Full name *" value={buyer.buyer_name} onChange={(e) => setBuyer({ ...buyer, buyer_name: e.target.value })} className="px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm" data-testid="buyer-name" />
                <input required type="email" placeholder="Email *" value={buyer.buyer_email} onChange={(e) => setBuyer({ ...buyer, buyer_email: e.target.value })} className="px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm" data-testid="buyer-email" />
              </div>
              <input placeholder="Phone (optional)" value={buyer.buyer_phone} onChange={(e) => setBuyer({ ...buyer, buyer_phone: e.target.value })} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm" data-testid="buyer-phone" />
            </div>
          )}

          {/* Promo code */}
          {totalTickets > 0 && (
            <div className="pt-3 border-t border-stone-100" data-testid="promo-section">
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2 flex items-center gap-1.5"><Tag className="w-3 h-3" /> PROMO CODE</div>
              {promoCode && !quote?.promo_error && quote?.promo_code ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-sm" data-testid="promo-applied">
                  <span><strong>{quote.promo_code}</strong> applied — {money(quote.discount)} off tickets</span>
                  <button type="button" onClick={() => { setPromoCode(""); setPromoInput(""); }} className="text-emerald-700 hover:text-emerald-900 text-xs underline" data-testid="promo-remove">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm uppercase" data-testid="promo-input" />
                  <button type="button" onClick={() => setPromoCode(promoInput.trim())} disabled={!promoInput.trim()} className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] disabled:opacity-50 text-amber-50 rounded-md text-sm font-medium" data-testid="promo-apply">Apply</button>
                </div>
              )}
              {promoCode && quote?.promo_error && <div className="text-xs text-rose-600 mt-1.5" data-testid="promo-error">{quote.promo_error}</div>}
            </div>
          )}

          {/* Sponsor code */}
          {!salesClosed && (totalTickets > 0 || sponsor) && (
            <div className="pt-3 border-t border-stone-100" data-testid="sponsor-code-section">
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2">SPONSOR CODE</div>
              {sponsor ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-sm" data-testid="sponsor-code-applied">
                  <span><strong>{sponsor.company}</strong> ({sponsor.tier}) — {(sponsor.people || []).length ? "choose the named people attending above" : "no people are named on this sponsorship yet"}</span>
                  <button type="button" onClick={removeSponsor} className="text-emerald-700 text-xs underline">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={sponsorInput} onChange={(e) => { setSponsorInput(e.target.value.toUpperCase()); setSponsorErr(""); }} placeholder="SPN-XXXXXX" className="flex-1 px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm uppercase font-mono" data-testid="sponsor-code-input" />
                  <button type="button" onClick={applySponsor} disabled={!sponsorInput.trim()} className="px-4 py-2 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white rounded-md text-sm font-medium" data-testid="sponsor-code-apply">Apply</button>
                </div>
              )}
              {sponsorErr && <div className="text-xs text-rose-600 mt-1.5" data-testid="sponsor-code-error">{sponsorErr}</div>}
              {!sponsor && <div className="text-[11px] text-stone-500 mt-1">Annual sponsors: use the code from your sponsorship invoice.</div>}
            </div>
          )}

          {/* Donation */}
          {totalTickets > 0 && donationsOn && (
            <div className="pt-3 border-t border-stone-100" data-testid="donation-section">
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-1 flex items-center gap-1.5"><Heart className="w-3 h-3" /> {(options?.donation_title || "Support India Club").toUpperCase()}</div>
              <p className="text-sm text-stone-600 mb-2">{options?.donation_text}</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((amt) => (
                  <button key={amt} type="button" onClick={() => setDonation(amt)} className={`px-3 py-1.5 rounded-md text-sm border ${donation === amt ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"}`} data-testid={`donation-${amt}`}>{money(amt).replace(".00", "")}</button>
                ))}
                <button type="button" onClick={() => setDonation("other")} className={`px-3 py-1.5 rounded-md text-sm border ${donation === "other" ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"}`} data-testid="donation-other">Other amount</button>
                <button type="button" onClick={() => setDonation(0)} className={`px-3 py-1.5 rounded-md text-sm border ${!donation ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-700 border-stone-200 hover:border-stone-800"}`} data-testid="donation-none">No donation</button>
              </div>
              {donation === "other" && (
                <input type="number" min="1" step="1" value={donationOther} onChange={(e) => setDonationOther(e.target.value)} placeholder="Amount ($)" className="mt-2 w-40 px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm" data-testid="donation-other-amount" />
              )}
              {donationAmount > 0 && (
                <label className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                  <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="w-4 h-4 accent-[#8B1A1A]" data-testid="donation-anonymous" /> Don't list my name publicly as a donor
                </label>
              )}
            </div>
          )}

          {/* Payment */}
          {totalTickets > 0 && (!quote || quote.total > 0) && (
            <div className="pt-3 border-t border-stone-100">
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2">PAYMENT</div>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: "paypal", l: "PayPal" }, { v: "check", l: "Check" }, { v: "cash", l: "Cash at door" }].map((opt) => (
                  <button key={opt.v} type="button" onClick={() => setBuyer({ ...buyer, payment_method: opt.v })} className={`py-2 rounded-md text-sm border transition ${buyer.payment_method === opt.v ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"}`} data-testid={`pay-${opt.v}`}>{opt.l}</button>
                ))}
              </div>
              {options?.fee_mode === "voluntary" && quote?.suggested_fee > 0 && (
                <label className="mt-3 flex items-start gap-2 text-sm text-stone-700">
                  <input type="checkbox" checked={coverFees} onChange={(e) => setCoverFees(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#8B1A1A]" data-testid="cover-fees" />
                  <span>Add {money(quote.suggested_fee)} to help cover card processing costs <span className="text-stone-500">(optional)</span></span>
                </label>
              )}
            </div>
          )}

          {/* Itemized review */}
          {totalTickets > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-md p-3 space-y-1.5" data-testid="order-review">
              <div className="text-xs font-cinzel tracking-wider text-stone-500 flex items-center gap-2">ORDER SUMMARY {quoting && <Loader2 className="w-3 h-3 animate-spin" />}</div>
              {quoteErr ? (
                <div className="flex items-start gap-2 text-sm text-rose-700" role="alert" data-testid="quote-error"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{quoteErr}</div>
              ) : !quote ? (
                <div className="text-sm text-stone-500">Calculating…</div>
              ) : (
                <>
                  {quote.lines.map((l, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 text-sm text-stone-700" data-testid={`review-line-${i}`}>
                      <span className="min-w-0">{l.name} <span className="text-stone-500">· {l.label}</span><span className="block text-[11px] text-stone-500">{l.reason}</span></span>
                      <span className="tabular-nums">{money(l.price)}</span>
                    </div>
                  ))}
                  {quote.discount > 0 && <ReviewRow label={`Discount (${quote.promo_code})`} value={-quote.discount} testid="ticket-discount-line" green />}
                  {quote.membership && <ReviewRow label={`${quote.membership.name} — ${quote.membership.kind === "renewal" ? "renewal" : "new membership"}`} value={quote.membership.price} testid="review-membership" />}
                  {quote.donation && <ReviewRow label="Donation to India Club" value={quote.donation.amount} testid="review-donation" />}
                  {quote.fee_contribution > 0 && <ReviewRow label="Processing cost contribution" value={quote.fee_contribution} testid="review-fee" />}
                  {quote.notices.map((n, i) => <div key={i} className="text-xs text-amber-800 pt-1">{n}</div>)}
                  <div className="flex items-center justify-between pt-1.5 border-t border-amber-200">
                    <span className="text-stone-700 text-sm">Total</span>
                    <span className="font-display text-xl text-[#8B1A1A]" data-testid="ticket-total">{money(quote.total)}</span>
                  </div>
                  {quote.membership && <div className="text-[11px] text-stone-500">Your membership is activated when your payment is confirmed.</div>}
                </>
              )}
            </div>
          )}

          <button type="submit" disabled={busy || totalTickets === 0 || !quote || salesClosed} className="w-full py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition disabled:opacity-50 flex items-center justify-center gap-2" data-testid="ticket-submit">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {totalTickets === 0 ? "Select tickets to continue" : quote && quote.total === 0 ? `Confirm ${totalTickets} ticket${totalTickets > 1 ? "s" : ""}` : `Reserve ${totalTickets} ticket${totalTickets > 1 ? "s" : ""}${quote ? ` · ${money(quote.total)}` : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}

const ReviewRow = ({ label, value, testid, green }) => (
  <div className={`flex items-center justify-between text-sm ${green ? "text-emerald-700" : "text-stone-700"}`} data-testid={testid}>
    <span>{label}</span><span className="tabular-nums">{Number(value) < 0 ? `−${money(-value)}` : money(value)}</span>
  </div>
);

function MembersOnlyNotice({ types, isActiveMember, isAuthed, member, onClose, nav }) {
  if (isActiveMember || types.length === 0) return null;
  if (types.every((t) => t.members_only)) {
    const status = isAuthed ? member?.membership?.status || "none" : null;
    let title, body, label, action;
    if (!isAuthed) {
      title = "These tickets are members-only."; body = "Sign in if you're already a member, or become one to unlock these tickets.";
      label = "Sign in"; action = () => { onClose(); nav("/login?next=/events"); };
    } else if (status === "expired") {
      title = "Your membership has expired."; body = "Renew now to unlock these member-only tickets.";
      label = "Renew"; action = () => { onClose(); nav("/member/dashboard"); };
    } else {
      title = "These tickets are members-only."; body = "Become a member to unlock them — and enjoy discounted pricing on most events.";
      label = "Become a member"; action = () => { onClose(); nav("/membership"); };
    }
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2" data-testid="ticket-membership-prompt">
        <Lock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-amber-900">{title}</div>
          <div className="text-amber-900/90 mt-0.5">{body}</div>
          <button type="button" onClick={action} className="mt-2 text-amber-900 underline hover:text-amber-700 font-medium" data-testid="ticket-membership-cta">{label} →</button>
        </div>
      </div>
    );
  }
  if (types.some((t) => t.members_only)) {
    return (
      <div className="text-xs text-stone-500 flex items-center gap-1.5" data-testid="ticket-member-hint">
        <Lock className="w-3 h-3" /> <span>Some ticket types are members-only.</span>
      </div>
    );
  }
  return null;
}

function SuccessView({ event, order, onClose }) {
  const n = (order.tickets || []).length;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-7 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="ticket-success-modal">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7 text-emerald-700" /></div>
          <h3 className="font-display text-2xl text-[#8B1A1A] mb-2">{order.payment_status === "paid" ? "You're registered!" : "Tickets reserved!"}</h3>
          <p className="text-stone-600 mb-5">{n} ticket{n === 1 ? "" : "s"} for <span className="font-medium">{event.title}</span>. Confirmation for <span className="font-medium">{order.buyer_email}</span>.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm mb-5 space-y-1">
            <div className="font-medium text-amber-900 mb-1">Order summary</div>
            {(order.items || []).map((it, idx) => (
              <div key={idx} className="flex justify-between text-stone-700"><span>{it.quantity}× {it.ticket_type_name}</span><span>{money(it.unit_price * it.quantity)}</span></div>
            ))}
            {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-700"><span>Discount ({order.promo_code})</span><span>−{money(order.discount)}</span></div>}
            {order.membership_purchase && <div className="flex justify-between text-stone-700"><span>{order.membership_purchase.name}</span><span>{money(order.membership_purchase.price)}</span></div>}
            {order.donation && <div className="flex justify-between text-stone-700"><span>Donation — thank you!</span><span>{money(order.donation.amount)}</span></div>}
            {Number(order.fee_contribution) > 0 && <div className="flex justify-between text-stone-700"><span>Processing cost contribution</span><span>{money(order.fee_contribution)}</span></div>}
            <div className="flex justify-between font-medium text-[#8B1A1A] pt-2 border-t border-amber-200"><span>Total</span><span>{money(order.total)}</span></div>
          </div>
          {n > 0 && (
            <div className="text-left mb-5" data-testid="ticket-success-tickets">
              <div className="text-xs font-cinzel tracking-wider text-stone-500 mb-2">YOUR {n} TICKET{n > 1 ? "S" : ""}</div>
              <div className="space-y-1 max-h-36 overflow-y-auto mb-3">
                {order.tickets.map((t) => (
                  <div key={t.code} className="flex justify-between text-sm bg-stone-50 rounded px-2.5 py-1.5">
                    <span className="truncate">{t.attendee_name}</span>
                    <span className="font-mono text-xs text-stone-500 flex items-center gap-0.5"><Hash className="w-3 h-3" />{t.code}</span>
                  </div>
                ))}
              </div>
              <DownloadTicketsButton order={order} className="w-full py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md font-medium transition-colors" label="Download QR tickets (PDF)" testid="ticket-success-download" />
            </div>
          )}
          {order.payment_status !== "paid" && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-600 mb-5 text-left">
              <strong>Payment:</strong>{" "}
              {order.payment_method === "paypal" && "Send payment via PayPal to contact@indiaclubdayton.org. Include your email in the memo."}
              {order.payment_method === "check" && "Mail your check payable to 'India Club of Greater Dayton'. Tickets are confirmed when it arrives."}
              {order.payment_method === "cash" && "Bring exact cash to the event entrance and show this confirmation."}
              {order.membership_purchase && " Your membership is activated as soon as your payment is confirmed."}
            </div>
          )}
          <button onClick={onClose} className="w-full py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition" data-testid="ticket-success-close">Done</button>
        </div>
      </div>
    </div>
  );
}
