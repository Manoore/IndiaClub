import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { apiClient } from "../api/client";
import { useMemberAuth } from "../api/MemberAuthContext";
import { startCardPayment } from "../components/PaymentMethodPicker";
import { DownloadTicketsButton } from "../components/MyTicketsSection";

const WHAT = {
  order: "event tickets", membership: "membership", upgrade: "membership upgrade",
  sponsorship: "sponsorship", donation: "donation",
};

// Where Stripe sends buyers back: confirms the payment with the server and says what happens next
export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const cancelled = params.get("cancelled") === "1";
  const kind = params.get("kind");
  const ref = params.get("ref");
  const { refresh, isAuthed } = useMemberAuth();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (cancelled || !sessionId) return;
    let tries = 0;
    let stop = false;
    const check = async () => {
      try {
        const r = await apiClient.get("/payments/stripe/confirm", { params: { session_id: sessionId } });
        if (stop) return;
        setResult(r.data);
        if (r.data.status === "paid" && isAuthed && refresh) refresh();
        // Card payments usually settle at once; give slower ones a few more seconds
        if (r.data.status !== "paid" && tries++ < 4) setTimeout(check, 2500);
      } catch (e) {
        if (!stop) setError(e.response?.data?.detail || "We couldn't confirm the payment yet.");
      }
    };
    check();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, cancelled]);

  const retry = async () => {
    setRetrying(true);
    try {
      await startCardPayment(kind, ref);
    } catch (e) {
      setError(e.response?.data?.detail || "Couldn't restart the payment.");
      setRetrying(false);
    }
  };

  const nextLink = (k) => (k === "membership" || k === "upgrade" || (k === "order" && isAuthed)
    ? { to: "/member/dashboard", label: "Go to my dashboard" }
    : k === "sponsorship" ? { to: "/sponsorship/sponsor-directory", label: "See our sponsors" }
    : k === "donation" ? { to: "/sponsorship/donors-directory", label: "See our donors" }
    : { to: "/events/upcoming", label: "Back to events" });

  let body;
  if (cancelled) {
    body = (
      <>
        <XCircle className="w-14 h-14 text-stone-400 mx-auto mb-4" />
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-2">Payment not completed</h1>
        <p className="text-stone-600 mb-6">You left the payment page before paying, so nothing was charged. Your {WHAT[kind] || "purchase"} is saved; you can pay now or choose another method later.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {kind && ref && (
            <button onClick={retry} disabled={retrying} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2" data-testid="payment-retry">
              {retrying && <Loader2 className="w-4 h-4 animate-spin" />} Try paying again
            </button>
          )}
          <Link to={nextLink(kind).to} className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] rounded-md text-sm font-medium">{nextLink(kind).label}</Link>
        </div>
      </>
    );
  } else if (error) {
    body = (
      <>
        <Clock className="w-14 h-14 text-amber-600 mx-auto mb-4" />
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-2">Checking your payment</h1>
        <p className="text-stone-600 mb-6">{error} If you were charged, it will show as paid within a few minutes; no need to pay again.</p>
        <Link to="/" className="px-5 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium">Home</Link>
      </>
    );
  } else if (!result || (result.status !== "paid" && result.status !== "cancelled" && !error)) {
    body = (
      <>
        <Loader2 className="w-12 h-12 animate-spin text-[#8B1A1A] mx-auto mb-4" />
        <h1 className="font-display text-2xl text-[#8B1A1A] mb-2">Confirming your payment…</h1>
        <p className="text-stone-600">{result ? "Your bank is still processing it. This page updates by itself; you can also close it, as you'll be marked paid automatically." : "One moment."}</p>
      </>
    );
  } else if (result.status === "cancelled") {
    body = (
      <>
        <XCircle className="w-14 h-14 text-stone-400 mx-auto mb-4" />
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-2">This payment page expired</h1>
        <p className="text-stone-600 mb-6">Nothing was charged and the tickets were released. Please start a new order.</p>
        <Link to="/events/upcoming" className="px-5 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium">Back to events</Link>
      </>
    );
  } else {
    const n = nextLink(result.kind);
    body = (
      <>
        <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-2">Payment received. Thank you!</h1>
        <p className="text-stone-600 mb-1" data-testid="payment-paid">
          ${Number(result.amount).toFixed(2)} paid for your {WHAT[result.kind]}
          {result.kind === "order" && result.event_title ? <> to <strong>{result.event_title}</strong></> : null}.
        </p>
        <p className="text-stone-500 text-sm mb-6">
          {result.kind === "order" ? "Your tickets are confirmed. Download your QR tickets below; bring them on your phone or printed." :
            result.kind === "membership" || result.kind === "upgrade" ? "Your membership is up to date." :
              result.kind === "sponsorship" ? "Your sponsorship is active and your sponsor code is ready." : "Your donation is recorded."}
          {" "}Stripe emails you a receipt.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {result.kind === "order" && result.tickets > 0 && (
            <DownloadTicketsButton order={{ id: result.order_id, buyer_email: result.buyer_email }} label="Download QR tickets (PDF)"
              className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium" testid="payment-download-tickets" />
          )}
          <Link to={n.to} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium" data-testid="payment-next">{n.label}</Link>
        </div>
      </>
    );
  }
  return (
    <section className="py-24 bg-cream min-h-[60vh]">
      <div className="max-w-lg mx-auto px-6 text-center" data-testid="payment-return">{body}</div>
    </section>
  );
}
