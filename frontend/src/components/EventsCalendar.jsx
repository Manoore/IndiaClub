import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Best-effort event date: structured start_date first, then the free-text display date ("May 17, 2026")
export const eventDate = (e) => {
  const raw = e.start_date || e.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d) ? null : d;
};

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function EventsCalendar({ events, onSelect }) {
  const firstDated = useMemo(() => {
    const now = new Date();
    const upcoming = events.map(eventDate).filter((d) => d && d >= new Date(now.getFullYear(), now.getMonth(), 1)).sort((a, b) => a - b);
    return upcoming[0] || now;
  }, [events]);
  const [cursor, setCursor] = useState(new Date(firstDated.getFullYear(), firstDated.getMonth(), 1));

  const days = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - cursor.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);

  const byDay = (day) => events.filter((e) => {
    const d = eventDate(e);
    if (!d) return false;
    const end = e.end_date ? new Date(e.end_date) : null;
    if (end && !isNaN(end) && end > d) {
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      return dayStart >= new Date(d.getFullYear(), d.getMonth(), d.getDate()) && dayStart <= end;
    }
    return sameDay(d, day);
  });

  const today = new Date();
  const label = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden" data-testid="events-calendar">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-md hover:bg-stone-100" aria-label="Previous month" data-testid="cal-prev">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-display text-xl text-[#8B1A1A]" data-testid="cal-month">{label}</div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-md hover:bg-stone-100" aria-label="Next month" data-testid="cal-next">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-cinzel tracking-wider text-stone-500 border-b border-stone-100">
        {WEEKDAYS.map((w) => <div key={w} className="py-2">{w.toUpperCase()}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const evs = byDay(d);
          return (
            <div key={d.toISOString()} className={`min-h-[64px] sm:min-h-[92px] border-b border-r border-stone-100 p-1 sm:p-1.5 ${inMonth ? "bg-white" : "bg-stone-50"}`}>
              <div className={`text-xs mb-1 ${sameDay(d, today) ? "inline-flex w-5 h-5 items-center justify-center rounded-full bg-[#8B1A1A] text-white" : inMonth ? "text-stone-700" : "text-stone-300"}`}>
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {evs.slice(0, 2).map((e) => (
                  <button key={e.id} onClick={() => onSelect(e)} title={e.title}
                    className="block w-full text-left truncate rounded px-1 py-0.5 text-[10px] sm:text-[11px] text-white"
                    style={{ background: e.color || "#8B1A1A" }} data-testid={`cal-event-${e.slug || e.id}`}>
                    {e.title}
                  </button>
                ))}
                {evs.length > 2 && <div className="text-[10px] text-stone-500">+{evs.length - 2} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
