import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, X, ShieldCheck, Clock, Baby, Users } from "lucide-react";

export const ageAt = (dob, on) => {
  if (!dob) return null;
  const b = new Date(dob + "T00:00:00");
  const d = on && !isNaN(new Date(on)) ? new Date(on) : new Date();
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a -= 1;
  return a;
};
export const bandOf = (age) => (age == null ? "adult" : age <= 2 ? "infant" : age <= 11 ? "child" : "adult");

const BAND_BADGE = {
  infant: { l: "UNDER 3 · FREE", c: "bg-sky-100 text-sky-800" },
  child: { l: "CHILD", c: "bg-violet-100 text-violet-800" },
};

let keySeq = 0;
const newKey = () => `a${++keySeq}`;

export default function AttendeePicker({ types, family, attendees, setAttendees, priceFor, reasonFor, selfName, isAuthed, eventDate, sponsorPeople = [], sponsorLabel = "Sponsor" }) {
  const [guest, setGuest] = useState("");
  const defaultType = types[0]?.id;
  const has = (pred) => attendees.some(pred);

  const toggleSelf = () => {
    if (has((a) => a.self)) setAttendees(attendees.filter((a) => !a.self));
    else setAttendees([{ key: newKey(), self: true, kind: "self", name: selfName, ticket_type_id: defaultType, band: "adult" }, ...attendees]);
  };
  const toggleFamily = (f) => {
    if (has((a) => a.family_member_id === f.id)) setAttendees(attendees.filter((a) => a.family_member_id !== f.id));
    else setAttendees([...attendees, { key: newKey(), kind: "family", family_member_id: f.id, name: f.name, ticket_type_id: defaultType, band: bandOf(ageAt(f.date_of_birth, eventDate)) }]);
  };
  const toggleSponsor = (p) => {
    if (has((a) => a.sponsor_person_id === p.id)) setAttendees(attendees.filter((a) => a.sponsor_person_id !== p.id));
    else setAttendees([...attendees, { key: newKey(), kind: "sponsor", sponsor_person_id: p.id, name: p.name, ticket_type_id: defaultType, band: "adult" }]);
  };
  const addGuest = () => {
    const n = guest.trim();
    if (!n) return;
    setAttendees([...attendees, { key: newKey(), kind: "guest", name: n, ticket_type_id: defaultType, band: "adult" }]);
    setGuest("");
  };
  const setType = (key, tid) => setAttendees(attendees.map((a) => (a.key === key ? { ...a, ticket_type_id: tid } : a)));
  const remove = (key) => setAttendees(attendees.filter((a) => a.key !== key));

  return (
    <div className="space-y-3" data-testid="attendee-picker">
      {isAuthed && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-stone-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Your family group</div>
            <Link to="/member/dashboard#family" className="text-xs text-[#8B1A1A] hover:text-[#E07A1F] underline" data-testid="manage-family-link">Manage family</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip on={has((a) => a.self)} onClick={toggleSelf} testid="attendee-chip-self">Me ({selfName || "you"})</Chip>
            {family.filter((f) => f.status !== "rejected").map((f) => (
              f.status === "approved" ? (
                <Chip key={f.id} on={has((a) => a.family_member_id === f.id)} onClick={() => toggleFamily(f)} testid={`attendee-chip-${f.id}`}>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {f.name}
                </Chip>
              ) : (
                <span key={f.id} className="px-3 py-1.5 rounded-full text-xs border border-dashed border-stone-300 text-stone-400 flex items-center gap-1" title="An admin must verify this family member before tickets can be booked" data-testid={`attendee-chip-pending-${f.id}`}>
                  <Clock className="w-3 h-3" /> {f.name} · awaiting verification
                </span>
              )
            ))}
          </div>
          {family.length === 0 && (
            <div className="text-xs text-stone-500 mt-1.5">Add your spouse & kids under <Link to="/member/dashboard#family" className="underline text-[#8B1A1A]">My Family</Link> — once verified, kids get child pricing automatically.</div>
          )}
        </div>
      )}

      {sponsorPeople.length > 0 && (
        <div data-testid="sponsor-people">
          <div className="text-xs text-stone-500 mb-1.5">Named on the {sponsorLabel} sponsorship</div>
          <div className="flex flex-wrap gap-2">
            {sponsorPeople.map((p) => (
              <Chip key={p.id} on={has((a) => a.sponsor_person_id === p.id)} onClick={() => toggleSponsor(p)} testid={`attendee-chip-sponsor-${p.id}`}>{p.name}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input value={guest} onChange={(e) => setGuest(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGuest(); } }} placeholder="Guest full name" className="flex-1 px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm" data-testid="guest-name-input" />
        <button type="button" onClick={addGuest} disabled={!guest.trim()} className="px-3 py-2 border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 disabled:opacity-40 rounded-md text-sm flex items-center gap-1.5 transition-colors" data-testid="add-guest-btn">
          <UserPlus className="w-4 h-4" /> Add guest
        </button>
      </div>

      {attendees.length > 0 && (
        <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg" data-testid="attendee-list">
          {attendees.map((a, idx) => (
            <div key={a.key} className="flex items-center gap-2 p-2.5" data-testid={`attendee-row-${idx}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-900 truncate flex items-center gap-1.5">
                  {a.band === "infant" && <Baby className="w-3.5 h-3.5 text-sky-600" />}{a.name}
                  {BAND_BADGE[a.band] && <span className={`px-1.5 py-0.5 rounded text-[9px] font-cinzel tracking-wider ${BAND_BADGE[a.band].c}`}>{BAND_BADGE[a.band].l}</span>}
                </div>
                {reasonFor && reasonFor(a) && <div className="text-[11px] text-stone-500 truncate" data-testid={`attendee-reason-${idx}`}>{reasonFor(a)}</div>}
              </div>
              {types.length > 1 && (
                <select value={a.ticket_type_id} onChange={(e) => setType(a.key, e.target.value)} className="px-2 py-1 border border-stone-200 rounded text-xs bg-white max-w-[9rem]" data-testid={`attendee-type-${idx}`}>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <div className="w-16 text-right text-sm text-[#8B1A1A] font-display" data-testid={`attendee-price-${idx}`}>{priceFor(a) == null ? "…" : `$${priceFor(a).toFixed(2)}`}</div>
              <button type="button" onClick={() => remove(a.key)} className="p-1 text-stone-400 hover:text-rose-600" data-testid={`attendee-remove-${idx}`}><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Chip = ({ on, onClick, children, testid }) => (
  <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs border flex items-center gap-1 transition-colors ${on ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-700 border-stone-300 hover:border-[#8B1A1A]"}`} data-testid={testid} aria-pressed={on}>
    {children}
  </button>
);
