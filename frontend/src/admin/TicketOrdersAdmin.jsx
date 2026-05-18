import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { CheckCircle2, Trash2, Loader2, RefreshCw, Search } from "lucide-react";

const STATUS_COLOR = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-rose-100 text-rose-800",
};

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtDate = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

export default function TicketOrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = [];
      if (eventFilter) params.push(`event_id=${eventFilter}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      const qs = params.length ? "?" + params.join("&") : "";
      const r = await apiClient.get(`/admin/ticket-orders${qs}`);
      setOrders(r.data);
    } finally {
      setLoading(false);
    }
  }, [eventFilter, statusFilter]);

  useEffect(() => { apiClient.get("/admin/events").then((r) => setEvents(r.data)); }, []);
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
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
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
                  <tr key={o.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.buyer_name}</div>
                      <div className="text-xs text-stone-500">{o.buyer_email}</div>
                    </td>
                    <td className="px-4 py-3">{o.event_title}</td>
                    <td className="px-4 py-3">
                      {(o.items || []).map((i, idx) => (
                        <div key={idx} className="text-xs">{i.quantity}× {i.ticket_type_name}</div>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-medium">{fmtMoney(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${STATUS_COLOR[o.payment_status] || "bg-stone-100 text-stone-700"}`}>{o.payment_status}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.payment_status !== "paid" && (
                          <button onClick={() => markStatus(o.id, "paid")} disabled={busy === o.id} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-xs hover:bg-emerald-200 disabled:opacity-50 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                        )}
                        {o.payment_status === "paid" && (
                          <button onClick={() => markStatus(o.id, "refunded")} disabled={busy === o.id} className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded text-xs hover:bg-stone-200 disabled:opacity-50">Refund</button>
                        )}
                        <button onClick={() => remove(o.id)} disabled={busy === o.id} className="p-1.5 hover:bg-rose-50 rounded text-rose-600 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
