import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ScanLine, Camera, CameraOff, CheckCircle2, AlertTriangle, XCircle, Loader2, Keyboard } from "lucide-react";
import { apiClient } from "../api/client";

const SCANNER_ID = "icgd-qr-reader";

const ResultCard = ({ r }) => {
  if (!r) return null;
  const meta = r.error
    ? { c: "bg-rose-50 border-rose-300 text-rose-900", I: XCircle, t: "Invalid ticket" }
    : r.result === "already_checked_in"
      ? { c: "bg-amber-50 border-amber-300 text-amber-900", I: AlertTriangle, t: "Already checked in" }
      : { c: "bg-emerald-50 border-emerald-300 text-emerald-900", I: CheckCircle2, t: "Welcome in!" };
  return (
    <div className={`border-2 rounded-xl p-5 ${meta.c}`} data-testid="checkin-result">
      <div className="flex items-center gap-2 font-display text-xl" data-testid="checkin-result-title"><meta.I className="w-6 h-6" /> {meta.t}</div>
      {r.error ? (
        <div className="mt-1 text-sm" data-testid="checkin-result-error">{r.error}</div>
      ) : (
        <div className="mt-2 text-sm space-y-0.5">
          <div className="text-2xl font-medium" data-testid="checkin-attendee-name">{r.attendee_name}</div>
          <div>{r.ticket_type_name}{r.age_band && r.age_band !== "adult" ? ` · ${r.age_band === "infant" ? "Under 3" : "Child"}` : ""} · <span className="font-mono">{r.code}</span></div>
          <div className="opacity-80">Booked by {r.buyer_name}</div>
          {r.result === "already_checked_in" && <div className="font-medium">First scanned at {new Date(r.checked_in_at + "Z").toLocaleTimeString()}</div>}
          {r.payment_status !== "paid" && <div className="mt-2 inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-xs font-medium uppercase" data-testid="checkin-payment-warning">Payment {r.payment_status} — collect at door</div>}
        </div>
      )}
    </div>
  );
};

export default function CheckInAdmin() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const lastScan = useRef({ code: "", at: 0 });

  useEffect(() => {
    apiClient.get("/admin/events").then((r) => {
      const ev = (r.data || []).filter((e) => (e.ticket_types || []).length);
      setEvents(ev);
      if (ev.length) setEventId(ev[0].id);
    });
  }, []);

  const loadStats = useCallback(async () => {
    if (!eventId) return;
    setStats((await apiClient.get(`/admin/events/${eventId}/attendance`)).data);
  }, [eventId]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const submitCode = useCallback(async (raw) => {
    const c = (raw || "").trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      const r = await apiClient.post("/admin/check-in", { code: c, event_id: eventId || undefined });
      setResult(r.data);
      loadStats();
    } catch (e) {
      setResult({ error: e.response?.data?.detail || "Ticket could not be verified" });
    } finally { setBusy(false); setCode(""); }
  }, [eventId, loadStats]);

  const stopScan = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) { try { await s.stop(); s.clear(); } catch { /* already stopped */ } }
  }, []);

  const startScan = async () => {
    setResult(null);
    const s = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = s;
    setScanning(true);
    try {
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => {
        const now = Date.now();
        if (text === lastScan.current.code && now - lastScan.current.at < 4000) return;
        lastScan.current = { code: text, at: now };
        submitCode(text);
      });
    } catch {
      setResult({ error: "Camera unavailable — allow camera access or type the code below." });
      stopScan();
    }
  };
  useEffect(() => () => { stopScan(); }, [stopScan]);

  const pct = stats && stats.total ? Math.round((stats.checked_in / stats.total) * 100) : 0;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl sm:text-3xl text-stone-900 flex items-center gap-2"><ScanLine className="w-7 h-7 text-[#8B1A1A]" /> Event Check-in</h1>
      <p className="text-stone-500 mt-1 text-sm mb-5">Scan attendee QR codes at the door. Each ticket can only be checked in once.</p>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Event</label>
          <select value={eventId} onChange={(e) => { setEventId(e.target.value); setResult(null); }} className="px-3 py-2 rounded-md border border-stone-200 text-sm bg-white min-w-[16rem]" data-testid="checkin-event-select">
            {events.length === 0 && <option value="">No ticketed events</option>}
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        {stats && (
          <div className="flex-1 min-w-[14rem]" data-testid="checkin-stats">
            <div className="flex justify-between text-sm mb-1"><span className="text-stone-600">Checked in</span><span className="font-medium" data-testid="checkin-count">{stats.checked_in} / {stats.total}</span></div>
            <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div id={SCANNER_ID} className={`rounded-lg overflow-hidden bg-stone-900 ${scanning ? "min-h-[260px]" : "hidden"}`} data-testid="checkin-scanner" />
          {!scanning && (
            <div className="h-[260px] rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-500 gap-3">
              <Camera className="w-10 h-10 text-stone-400" />
              <button onClick={startScan} className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm flex items-center gap-1.5" data-testid="checkin-start-camera"><Camera className="w-4 h-4" /> Start camera scanner</button>
            </div>
          )}
          {scanning && <button onClick={stopScan} className="mt-3 w-full py-2 border border-stone-300 rounded-md text-sm flex items-center justify-center gap-1.5 hover:bg-stone-50" data-testid="checkin-stop-camera"><CameraOff className="w-4 h-4" /> Stop camera</button>}
          <form onSubmit={(e) => { e.preventDefault(); submitCode(code); }} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ICGD-XXXXXXXX" className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-md text-sm font-mono outline-none focus:border-[#8B1A1A]" data-testid="checkin-code-input" />
            </div>
            <button type="submit" disabled={busy || !code.trim()} className="px-4 py-2 bg-stone-900 text-white rounded-md text-sm disabled:opacity-50 flex items-center gap-1.5" data-testid="checkin-code-submit">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Check in</button>
          </form>
        </div>

        <div className="space-y-4">
          {result ? <ResultCard r={result} /> : <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center text-stone-400 text-sm">Scan results appear here</div>}
          {stats?.recent?.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-4" data-testid="checkin-recent">
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">Recent check-ins</div>
              <div className="divide-y divide-stone-100 text-sm">
                {stats.recent.map((t) => (
                  <div key={t.code} className="py-1.5 flex justify-between"><span>{t.attendee_name}</span><span className="text-stone-500 text-xs">{new Date(t.checked_in_at + "Z").toLocaleTimeString()}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
