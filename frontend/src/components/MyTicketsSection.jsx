import React, { useEffect, useState } from "react";
import { Ticket, Download, Loader2, CheckCircle2 } from "lucide-react";
import { apiClient, downloadFile } from "../api/client";
import { useToast } from "../hooks/use-toast";

const STATUS_C = { pending: "bg-amber-100 text-amber-800", paid: "bg-emerald-100 text-emerald-800", refunded: "bg-rose-100 text-rose-800" };

export const DownloadTicketsButton = ({ order, className = "", label = "Download tickets (PDF)", testid }) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const click = async () => {
    setBusy(true);
    try {
      await downloadFile(`/tickets/${order.id}/pdf?email=${encodeURIComponent(order.buyer_email)}`, `ICGD-tickets-${order.id.slice(0, 8)}.pdf`);
    } catch {
      toast({ title: "Download failed", description: "Please try again." });
    } finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={click} disabled={busy} className={`inline-flex items-center justify-center gap-1.5 disabled:opacity-60 ${className}`} data-testid={testid || `download-tickets-${order.id}`}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {label}
    </button>
  );
};

export default function MyTicketsSection() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { apiClient.get("/members/me/tickets").then((r) => setOrders(r.data)).catch(() => setOrders([])); }, []);

  return (
    <div className="bg-white rounded-2xl p-6 border border-amber-100" data-testid="my-tickets-section">
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="w-5 h-5 text-[#8B1A1A]" />
        <h2 className="font-display text-2xl text-[#8B1A1A]">My Tickets</h2>
      </div>
      {orders === null ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#8B1A1A]" />
      ) : orders.length === 0 ? (
        <div className="text-sm text-stone-500 py-6 text-center border border-dashed border-stone-200 rounded-lg" data-testid="my-tickets-empty">You haven't booked any event tickets yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border border-stone-200 rounded-xl p-4" data-testid={`my-order-${o.id}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-stone-900">{o.event_title}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{new Date(o.created_at).toLocaleDateString()} · ${Number(o.total).toFixed(2)} · <span className={`px-1.5 py-0.5 rounded uppercase text-[10px] ${STATUS_C[o.payment_status] || ""}`}>{o.payment_status}</span></div>
                </div>
                {(o.tickets || []).length > 0 && o.payment_status !== "refunded" && (
                  <DownloadTicketsButton order={o} className="px-3 py-1.5 border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm transition-colors" label="PDF tickets" />
                )}
              </div>
              {(o.tickets || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.tickets.map((t) => (
                    <span key={t.code} className="px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-md text-xs flex items-center gap-1.5" data-testid={`my-ticket-${t.code}`}>
                      {t.checked_in_at && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      <span className="font-medium">{t.attendee_name}</span>
                      <span className="font-mono text-stone-500">{t.code}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
