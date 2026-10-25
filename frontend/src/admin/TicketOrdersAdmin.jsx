import React, { useEffect, useState, useCallback } from "react";
import { apiClient, downloadFile } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { CheckCircle2, Trash2, Loader2, RefreshCw, Search, Download, ChevronDown, ChevronRight, Gift, X } from "lucide-react";
import { PAYMENT_STATUSES, PaymentBadge, PaymentSelect } from "./PaymentStatus";

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

const CATEGORY_LABEL = { member: "Member", non_member: "Non-member", sponsor: "Sponsor", complimentary: "Complimentary" };

// Itemized order: each ticket with why it got its price, plus membership, donation and fee lines
function OrderDetails({ order, onChanged }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const save = async (code) => {
    try {
      await apiClient.post(`/admin/ticket-orders/${order.id}/adjust`, { ticket_code: code, price: Number(price), reason });
      toast({ title: "Price adjusted", description: "Recorded in the change history." });
      setEditing(null);
      onChanged();
    } catch (e) {
      toast({ title: "Adjustment failed", description: e.response?.data?.detail || e.message });
    }
  };
  const mp = order.membership_purchase;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_16rem] text-sm" data-testid={`order-details-${order.id}`}>
      <div className="space-y-1">
        <div className="text-xs font-cinzel tracking-wider text-stone-500">TICKETS{order.period ? ` · ${order.period.name}` : ""}</div>
        {(order.tickets || []).map((t) => (
          <div key={t.code} className="flex flex-wrap items-center gap-2 py-1 border-b border-stone-100 last:border-0">
            <span className="font-medium">{t.attendee_name}</span>
            <span className="text-xs text-stone-500">{t.ticket_type_name}</span>
            {t.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">{CATEGORY_LABEL[t.category] || t.category}</span>}
            {t.reason && <span className="text-xs text-stone-500">{t.reason}</span>}
            <span className="ml-auto tabular-nums">{fmtMoney(t.price)}{t.adjusted_from != null && <span className="text-xs text-stone-400 line-through ml-1">{fmtMoney(t.adjusted_from)}</span>}</span>
            {editing === t.code ? (
              <span className="flex flex-wrap items-center gap-1.5 w-full">
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 px-2 py-1 border border-stone-200 rounded text-sm" placeholder="New price" data-testid={`adjust-price-${t.code}`} />
                <input value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1 min-w-[10rem] px-2 py-1 border border-stone-200 rounded text-sm" placeholder="Reason (required)" data-testid={`adjust-reason-${t.code}`} />
                <button onClick={() => save(t.code)} disabled={price === "" || reason.trim().length < 3} className="px-2.5 py-1 bg-[#8B1A1A] text-amber-50 rounded text-xs disabled:opacity-50" data-testid={`adjust-save-${t.code}`}>Save</button>
                <button onClick={() => setEditing(null)} className="px-2.5 py-1 border border-stone-200 rounded text-xs">Cancel</button>
              </span>
            ) : (
              <button onClick={() => { setEditing(t.code); setPrice(String(t.price ?? "")); setReason(""); }} className="text-xs text-[#8B1A1A] hover:underline" data-testid={`adjust-${t.code}`}>Adjust</button>
            )}
          </div>
        ))}
      </div>
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-1 self-start">
        <Row label="Tickets" value={order.subtotal} />
        {Number(order.discount) > 0 && <Row label={`Discount${order.promo_code ? ` (${order.promo_code})` : ""}`} value={-order.discount} />}
        {mp && <Row label={`${mp.name} (${mp.kind === "renewal" ? "renewal" : "new"})${mp.applied ? " ✓" : ""}`} value={mp.price} />}
        {order.donation && <Row label={`Donation${order.donation.anonymous ? " (anonymous)" : ""}`} value={order.donation.amount} />}
        {Number(order.fee_contribution) > 0 && <Row label="Fee contribution" value={order.fee_contribution} />}
        <div className="border-t border-stone-200 pt-1"><Row label="Total" value={order.total} bold /></div>
        {order.complimentary && <div className="text-xs text-stone-500 pt-1">Complimentary: {order.comp_reason} ({order.comp_by})</div>}
        {mp && !mp.applied && <div className="text-xs text-amber-700 pt-1">Membership activates when this order is marked Paid.</div>}
      </div>
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between gap-3 ${bold ? "font-medium text-[#8B1A1A]" : "text-stone-700"}`}>
    <span>{label}</span><span className="tabular-nums">{Number(value) < 0 ? `−${fmtMoney(-value)}` : fmtMoney(value)}</span>
  </div>
);

function CompDialog({ events, onClose, onDone }) {
  const { toast } = useToast();
  const [f, setF] = useState({ event_id: events[0]?.id || "", ticket_type_id: "", names: "", buyer_name: "", buyer_email: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const ev = events.find((e) => e.id === f.event_id);
  const types = ev?.ticket_types || [];
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const tid = f.ticket_type_id || types[0]?.id;
      const attendees = f.names.split("\n").map((n) => n.trim()).filter(Boolean).map((name) => ({ ticket_type_id: tid, name }));
      await apiClient.post(`/admin/events/${f.event_id}/comp-tickets`, { attendees, buyer_name: f.buyer_name, buyer_email: f.buyer_email, reason: f.reason });
      toast({ title: `${attendees.length} complimentary ticket${attendees.length > 1 ? "s" : ""} issued` });
      onDone();
    } catch (err) {
      toast({ title: "Couldn't issue tickets", description: err.response?.data?.detail || err.message });
    } finally {
      setBusy(false);
    }
  };
  const inp = "w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm";
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full p-5 space-y-3" data-testid="comp-dialog">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-[#8B1A1A]">Complimentary tickets</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-stone-500">Issues real $0 tickets with QR codes. They count toward capacity, and the reason is kept on record.</p>
        <select required value={f.event_id} onChange={(e) => setF({ ...f, event_id: e.target.value, ticket_type_id: "" })} className={inp}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        {types.length > 1 && (
          <select value={f.ticket_type_id} onChange={(e) => setF({ ...f, ticket_type_id: e.target.value })} className={inp}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <textarea required rows={3} value={f.names} onChange={(e) => setF({ ...f, names: e.target.value })} placeholder="Attendee names, one per line" className={inp} data-testid="comp-names" />
        <div className="grid grid-cols-2 gap-2">
          <input required value={f.buyer_name} onChange={(e) => setF({ ...f, buyer_name: e.target.value })} placeholder="Contact name" className={inp} data-testid="comp-buyer-name" />
          <input required type="email" value={f.buyer_email} onChange={(e) => setF({ ...f, buyer_email: e.target.value })} placeholder="Contact email" className={inp} data-testid="comp-buyer-email" />
        </div>
        <input required minLength={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Reason (e.g. Chief guest, volunteer)" className={inp} data-testid="comp-reason" />
        <button type="submit" disabled={busy || !types.length} className="w-full py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md font-medium disabled:opacity-50 flex items-center justify-center gap-2" data-testid="comp-submit">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Issue tickets
        </button>
        {!types.length && <p className="text-xs text-rose-700">This event has no ticket types yet.</p>}
      </form>
    </div>
  );
}

export default function TicketOrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [open, setOpen] = useState(null);
  const [comp, setComp] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = [];
      if (eventFilter) params.push(`event_id=${eventFilter}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      const qs = params.length ? "?" + params.join("&") : "";
      const r = await apiClient.get(`/admin/ticket-orders${qs}`);
      setOrders(Array.isArray(r.data) ? r.data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [eventFilter, statusFilter]);

  useEffect(() => { apiClient.get("/admin/events").then((r) => setEvents(Array.isArray(r.data) ? r.data : [])).catch(() => setEvents([])); }, []);
  useEffect(() => { load(); }, [load]);

  const markStatus = async (id, status) => {
    setBusy(id);
    try {
      await apiClient.post(`/admin/ticket-orders/${id}/mark-paid?status=${status}`);
      toast({ title: `Marked ${status}` });
      await load();
    } catch (e) {
      toast({ title: "Failed", description: e.response?.data?.detail });
    } finally { setBusy(null); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this order and restore ticket inventory?")) return;
    setBusy(id);
    try {
      await apiClient.delete(`/admin/ticket-orders/${id}`);
      toast({ title: "Order deleted" });
      await load();
    } catch (e) { toast({ title: "Delete failed", description: e.response?.data?.detail }); }
    finally { setBusy(null); }
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${o.buyer_name} ${o.buyer_email} ${o.event_title}`.toLowerCase().includes(q);
  });

  const totalRevenue = filtered
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Ticket Orders</h1>
          <p className="text-stone-500 mt-1 text-sm">All event ticket purchases from the public site.</p>
        </div>
        <button onClick={() => setComp(true)} className="ml-auto self-center inline-flex items-center gap-1.5 px-3 py-2 border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm" data-testid="comp-open">
          <Gift className="w-4 h-4" /> Complimentary tickets
        </button>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
          <div className="text-stone-500 text-xs">Confirmed revenue</div>
          <div className="font-display text-xl text-emerald-800" data-testid="total-revenue">{fmtMoney(totalRevenue)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="px-3 py-1.5 rounded border border-stone-200 text-sm bg-white" data-testid="event-filter">
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded border border-stone-200 text-sm bg-white" data-testid="status-filter">
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={load} className="px-3 py-1.5 rounded border border-stone-200 text-sm bg-white hover:bg-stone-50 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        <div className="ml-auto relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 pr-3 py-1.5 rounded border border-stone-200 text-sm w-64 outline-none focus:border-[#8B1A1A]" />
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No ticket orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Tickets</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((o) => (
                  <React.Fragment key={o.id}>
                  <tr className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setOpen(open === o.id ? null : o.id)} className="font-medium flex items-center gap-1 text-left hover:text-[#8B1A1A]" aria-expanded={open === o.id} data-testid={`order-toggle-${o.id}`}>
                        {open === o.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}{o.buyer_name}
                      </button>
                      <div className="text-xs text-stone-500">{o.buyer_email}</div>
                    </td>
                    <td className="px-4 py-3">{o.event_title}</td>
                    <td className="px-4 py-3">
                      {(o.items || []).map((i, idx) => (
                        <div key={idx} className="text-xs">{i.quantity}× {i.ticket_type_name}</div>
                      ))}
                      {(o.tickets || []).length > 0 && (
                        <div className="text-[11px] text-stone-500 mt-1" title={o.tickets.map((t) => `${t.attendee_name} (${t.code})`).join("\n")} data-testid={`order-checkin-${o.id}`}>
                          {o.tickets.filter((t) => t.checked_in_at).length}/{o.tickets.length} checked in
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {fmtMoney(o.total)}
                      {(o.membership_purchase || o.donation || Number(o.fee_contribution) > 0) && (
                        <div className="text-[11px] text-stone-500 font-normal">
                          {[o.membership_purchase && "membership", o.donation && "donation", Number(o.fee_contribution) > 0 && "fee"].filter(Boolean).join(" + ")} included
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={o.payment_status} />
                      {o.sponsor_company && <div className="text-[11px] text-stone-500 mt-1">Sponsor: {o.sponsor_company}</div>}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.payment_status !== "paid" && (
                          <button onClick={() => markStatus(o.id, "paid")} disabled={busy === o.id} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-xs hover:bg-emerald-200 disabled:opacity-50 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                        )}
                        <PaymentSelect value={o.payment_status} onChange={(v) => markStatus(o.id, v)} testid={`order-status-${o.id}`} />
                        {(o.tickets || []).length > 0 && (
                          <button onClick={() => downloadFile(`/admin/ticket-orders/${o.id}/pdf`, `tickets-${o.id.slice(0, 8)}.pdf`)} className="p-1.5 hover:bg-stone-100 rounded text-stone-600" title="Download PDF tickets" data-testid={`order-pdf-${o.id}`}><Download className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => remove(o.id)} disabled={busy === o.id} className="p-1.5 hover:bg-rose-50 rounded text-rose-600 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                  {open === o.id && (
                    <tr className="bg-stone-50/60">
                      <td colSpan={7} className="px-4 py-4"><OrderDetails order={o} onChanged={load} /></td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {comp && <CompDialog events={events} onClose={() => setComp(false)} onDone={() => { setComp(false); load(); }} />}
    </div>
  );
}
