import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Calendar, Clock, MapPin, Sparkles, Star, Ticket, Loader2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import Mandala from "../components/Mandala";
import TicketPurchaseModal from "../components/TicketPurchaseModal";
import { apiClient } from "../api/client";

const EventsHub = ({ categories }) => (
  <section className="py-20 bg-cream" data-testid="events-hub">
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {categories.map((e) => (
        <Link to={`/events/${e.slug}`} key={e.slug} className="group relative h-72 rounded-xl overflow-hidden card-hover" data-testid={`category-${e.slug}`}>
          {e.image_url && <img src={e.image_url} alt={e.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: e.color || "#8B1A1A" }}><Sparkles className="w-5 h-5 text-white" /></div>
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <div className="font-cinzel text-[10px] tracking-[0.22em] text-amber-200 mb-1">{(e.tagline || "").toUpperCase()}</div>
            <h3 className="font-display text-2xl mb-1">{e.name}</h3>
            <p className="text-xs text-amber-50/80 line-clamp-2">{e.description}</p>
          </div>
        </Link>
      ))}
      {categories.length === 0 && (
        <div className="col-span-full text-center text-stone-500 py-10 border border-dashed border-stone-300 rounded-xl" data-testid="events-hub-empty">
          No event categories yet. Add them in Admin → Event Categories.
        </div>
      )}
    </div>
  </section>
);

const EventCard = ({ e, onRegister, onBuyTickets }) => {
  const hasTickets = Array.isArray(e.ticket_types) && e.ticket_types.length > 0;
  // Cheapest price for "From $X" display
  const minPrice = hasTickets
    ? Math.min(...e.ticket_types.map((t) => Number(t.price || 0)))
    : null;
  // Date parsing
  const dateParts = (e.date || "").split(" ");
  const day = (dateParts[1] || "").replace(",", "");
  const month = (dateParts[0] || "").toUpperCase();
  return (
    <div className="card-hover bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
      <div className="relative h-52 overflow-hidden">
        <img src={e.image_url || e.image} alt={e.title} className="w-full h-full object-cover hover:scale-105 transition duration-700" />
        <div className="absolute top-3 left-3 bg-white rounded-md px-2.5 py-1 text-[#8B1A1A] text-xs font-semibold">{e.category}</div>
        <div className="absolute top-3 right-3 bg-[#1a0e0a]/85 backdrop-blur text-amber-100 rounded-md px-2.5 py-1.5 text-center">
          <div className="font-display text-lg leading-none">{day}</div>
          <div className="font-cinzel text-[9px] tracking-[0.2em]">{month}</div>
        </div>
        {hasTickets && (
          <div className="absolute bottom-3 left-3 bg-[#E07A1F] text-white rounded-md px-2.5 py-1 text-xs font-medium flex items-center gap-1">
            <Ticket className="w-3.5 h-3.5" /> From ${minPrice.toFixed(0)}
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-display text-xl text-stone-900 mb-2">{e.title}</h3>
        <div className="flex items-center gap-3 text-xs text-stone-500 mb-3 flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {e.date}</span>
          {e.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {e.time}</span>}
          {e.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.venue.split(",")[0]}</span>}
        </div>
        <p className="text-sm text-stone-600 leading-relaxed mb-5 flex-1 line-clamp-3">{e.description}</p>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-cinzel tracking-wider ${(e.registration_open ?? e.registrationOpen) ? "text-green-700" : "text-stone-400"}`}>
            {(e.registration_open ?? e.registrationOpen) ? (hasTickets ? "TICKETS ON SALE" : "REGISTRATION OPEN") : "COMING SOON"}
          </span>
          {(e.registration_open ?? e.registrationOpen) ? (
            hasTickets ? (
              <button onClick={() => onBuyTickets(e)} className="px-4 py-2 bg-[#E07A1F] hover:bg-[#c66c1a] text-white text-sm rounded-md font-medium transition flex items-center gap-1.5" data-testid={`buy-tickets-${e.slug || e.id}`}>
                <Ticket className="w-3.5 h-3.5" /> Buy Tickets
              </button>
            ) : (
              <button onClick={() => onRegister(e)} className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 text-sm rounded-md font-medium transition" data-testid={`register-${e.slug || e.id}`}>Register</button>
            )
          ) : (
            <button disabled className="px-4 py-2 bg-stone-200 text-stone-500 text-sm rounded-md cursor-not-allowed">Notify Me</button>
          )}
        </div>
      </div>
    </div>
  );
};

const UpcomingList = ({ filterSlug }) => {
  const [registered, setRegistered] = useState(JSON.parse(localStorage.getItem("icgd_regs") || "[]"));
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicketEvent, setActiveTicketEvent] = useState(null);
  const { toast } = useToast();

  // Fetch live events from backend (merges with mocked for richer display)
  useEffect(() => {
    apiClient
      .get("/events")
      .then((r) => setLiveEvents(r.data || []))
      .catch(() => setLiveEvents([]))
      .finally(() => setLoading(false));
  }, []);

  // All events come from the backend now (Phase 3 — no mock fallback)
  const merged = liveEvents.map((live) => ({ ...live, image: live.image_url }));

  const list = filterSlug && filterSlug !== "upcoming"
    ? merged.filter((e) => (e.category || "").toLowerCase().replace(/[^a-z]/g, "").includes(filterSlug.replace(/[^a-z]/g, "")))
    : merged;

  const handleRegister = (e) => {
    if (registered.includes(e.id)) return;
    const next = [...registered, e.id];
    setRegistered(next);
    localStorage.setItem("icgd_regs", JSON.stringify(next));
    toast({ title: "You're registered!", description: `See you at ${e.title} on ${e.date}.` });
  };

  const handleBuyTickets = (e) => {
    setActiveTicketEvent(e);
  };

  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#8B1A1A] mx-auto" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-12 h-12 text-[#E07A1F] mx-auto mb-4" />
            <h3 className="font-display text-2xl text-stone-700">More events coming soon</h3>
            <p className="text-stone-500 mt-2">Check our calendar or subscribe to the newsletter to be the first to know.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((e) => (
              <EventCard key={e.id || e.slug} e={e} onRegister={handleRegister} onBuyTickets={handleBuyTickets} />
            ))}
          </div>
        )}
      </div>
      {activeTicketEvent && (
        <TicketPurchaseModal
          event={activeTicketEvent}
          onClose={() => setActiveTicketEvent(null)}
          onSuccess={() => {
            // Refresh live counts after purchase
            apiClient.get("/events").then((r) => setLiveEvents(r.data || []));
          }}
        />
      )}
    </section>
  );
};

const CategoryHero = ({ cat }) => {
  return (
    <section className="py-16 bg-deepcream relative overflow-hidden">
      <Mandala className="absolute -right-32 top-0 w-[420px] h-[420px]" color={cat.color || "#8B1A1A"} opacity={0.08} />
      <div className="max-w-5xl mx-auto px-6 relative">
        <p className="text-stone-700 leading-relaxed font-serif text-lg mb-6">{cat.long_description || cat.description}</p>
        {(cat.highlights?.length > 0 || cat.venue || cat.typical_timing) && (
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="bg-white p-6 rounded-2xl border border-amber-100">
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-3">WHAT TO EXPECT</div>
              <ul className="space-y-2">
                {(cat.highlights || []).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-stone-700 text-sm"><Star className="w-4 h-4 text-[#E07A1F] mt-0.5 flex-shrink-0 fill-current" /><span>{h}</span></li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {cat.venue && (
                <div className="bg-white p-5 rounded-xl border border-amber-100 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#8B1A1A] mt-0.5" />
                  <div>
                    <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">USUAL VENUE</div>
                    <div className="font-medium text-stone-800 mt-0.5">{cat.venue}</div>
                  </div>
                </div>
              )}
              {cat.typical_timing && (
                <div className="bg-white p-5 rounded-xl border border-amber-100 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#8B1A1A] mt-0.5" />
                  <div>
                    <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">TIMING</div>
                    <div className="font-medium text-stone-800 mt-0.5">{cat.typical_timing}</div>
                  </div>
                </div>
              )}
              <div className="bg-[#8B1A1A] p-5 rounded-xl text-amber-50">
                <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">GET INVOLVED</div>
                <div className="font-display text-lg mt-1 mb-3">Volunteer or Sponsor</div>
                <div className="flex gap-2">
                  <Link to="/sponsorship/become-sponsor" className="px-4 py-2 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded text-xs font-medium transition">Sponsor This</Link>
                  <Link to="/contact" className="px-4 py-2 border border-amber-100/30 hover:bg-white/10 rounded text-xs font-medium transition">Volunteer</Link>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mt-8">
          <Link to="/membership/regular" className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition">Become a Member</Link>
          <Link to="/events/upcoming" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium transition">See Upcoming Events</Link>
        </div>
      </div>
    </section>
  );
};

export default function EventsPage() {
  const { sub } = useParams();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    apiClient.get("/event-categories")
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCategories([]));
  }, []);

  const cat = categories.find((c) => c.slug === sub);
  const header = !sub
    ? { eyebrow: "OUR PROGRAMS", title: "Events & Festivals", subtitle: "Cultural events, festivals, sports and youth programs throughout the year.", image: "https://images.unsplash.com/photo-1592843997881-cab3860b1067?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" }
    : { eyebrow: cat?.tagline || "EVENTS", title: cat?.name || "Events", subtitle: cat?.description, image: cat?.image_url };
  return (
    <>
      <PageHeader {...header} />
      {sub && cat && <CategoryHero cat={cat} />}
      {!sub ? <EventsHub categories={categories} /> : <UpcomingList filterSlug={sub} />}
    </>
  );
}
