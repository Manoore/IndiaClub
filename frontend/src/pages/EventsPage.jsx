import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { EVENT_CATEGORIES, UPCOMING_EVENTS, EVENT_DETAILS } from "../data/mock";
import { Calendar, Clock, MapPin, ArrowRight, Sparkles, Users, Star } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import Mandala from "../components/Mandala";

const EventsHub = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
      {EVENT_CATEGORIES.map((e) => (
        <Link to={`/events/${e.slug}`} key={e.slug} className="group relative h-72 rounded-xl overflow-hidden card-hover">
          <img src={e.image} alt={e.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: e.color }}><Sparkles className="w-5 h-5 text-white" /></div>
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <div className="font-cinzel text-[10px] tracking-[0.22em] text-amber-200 mb-1">{e.tagline.toUpperCase()}</div>
            <h3 className="font-display text-2xl mb-1">{e.name}</h3>
            <p className="text-xs text-amber-50/80 line-clamp-2">{e.description}</p>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

const EventCard = ({ e, onRegister }) => (
  <div className="card-hover bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
    <div className="relative h-52 overflow-hidden">
      <img src={e.image} alt={e.title} className="w-full h-full object-cover hover:scale-105 transition duration-700" />
      <div className="absolute top-3 left-3 bg-white rounded-md px-2.5 py-1 text-[#8B1A1A] text-xs font-semibold">{e.category}</div>
      <div className="absolute top-3 right-3 bg-[#1a0e0a]/85 backdrop-blur text-amber-100 rounded-md px-2.5 py-1.5 text-center"><div className="font-display text-lg leading-none">{e.date.split(" ")[1].replace(",","")}</div><div className="font-cinzel text-[9px] tracking-[0.2em]">{e.date.split(" ")[0].toUpperCase()}</div></div>
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <h3 className="font-display text-xl text-stone-900 mb-2">{e.title}</h3>
      <div className="flex items-center gap-3 text-xs text-stone-500 mb-3 flex-wrap">
        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {e.date}</span>
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {e.time}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.venue.split(",")[0]}</span>
      </div>
      <p className="text-sm text-stone-600 leading-relaxed mb-5 flex-1">{e.description}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-cinzel tracking-wider ${e.registrationOpen ? "text-green-700" : "text-stone-400"}`}>{e.registrationOpen ? "REGISTRATION OPEN" : "COMING SOON"}</span>
        {e.registrationOpen ? (
          <button onClick={() => onRegister(e)} className="px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 text-sm rounded-md font-medium transition">Register</button>
        ) : (
          <button disabled className="px-4 py-2 bg-stone-200 text-stone-500 text-sm rounded-md cursor-not-allowed">Notify Me</button>
        )}
      </div>
    </div>
  </div>
);

const UpcomingList = ({ filterSlug }) => {
  const [registered, setRegistered] = useState(JSON.parse(localStorage.getItem("icgd_regs") || "[]"));
  const { toast } = useToast();
  const list = filterSlug && filterSlug !== "upcoming" ? UPCOMING_EVENTS.filter((e) => e.category.toLowerCase().replace("'", "").replace("'", "").replace(" ", "-").includes(filterSlug)) : UPCOMING_EVENTS;
  const handleRegister = (e) => {
    if (registered.includes(e.id)) return;
    const next = [...registered, e.id];
    setRegistered(next);
    localStorage.setItem("icgd_regs", JSON.stringify(next));
    toast({ title: "You're registered!", description: `See you at ${e.title} on ${e.date}.` });
  };
  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        {list.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-12 h-12 text-[#E07A1F] mx-auto mb-4" />
            <h3 className="font-display text-2xl text-stone-700">More events coming soon</h3>
            <p className="text-stone-500 mt-2">Check our calendar or subscribe to the newsletter to be the first to know.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((e) => <EventCard key={e.id} e={e} onRegister={handleRegister} />)}
          </div>
        )}
      </div>
    </section>
  );
};

const CategoryHero = ({ cat }) => {
  const d = EVENT_DETAILS[cat.slug];
  return (
    <section className="py-16 bg-deepcream relative overflow-hidden">
      <Mandala className="absolute -right-32 top-0 w-[420px] h-[420px]" color={cat.color} opacity={0.08} />
      <div className="max-w-5xl mx-auto px-6 relative">
        <p className="text-stone-700 leading-relaxed font-serif text-lg mb-6">{d?.longDescription || cat.description}</p>
        {d && (
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="bg-white p-6 rounded-2xl border border-amber-100">
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-3">WHAT TO EXPECT</div>
              <ul className="space-y-2">
                {d.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-stone-700 text-sm"><Star className="w-4 h-4 text-[#E07A1F] mt-0.5 flex-shrink-0 fill-current" /><span>{h}</span></li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-amber-100 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#8B1A1A] mt-0.5" />
                <div>
                  <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">USUAL VENUE</div>
                  <div className="font-medium text-stone-800 mt-0.5">{d.venue}</div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-amber-100 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#8B1A1A] mt-0.5" />
                <div>
                  <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">TIMING</div>
                  <div className="font-medium text-stone-800 mt-0.5">{d.typical}</div>
                </div>
              </div>
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
  const cat = EVENT_CATEGORIES.find((c) => c.slug === sub);
  const header = !sub
    ? { eyebrow: "OUR PROGRAMS", title: "Events & Festivals", subtitle: "Cultural events, festivals, sports and youth programs throughout the year.", image: "https://images.unsplash.com/photo-1592843997881-cab3860b1067?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" }
    : { eyebrow: cat?.tagline || "EVENTS", title: cat?.name || "Events", subtitle: cat?.description, image: cat?.image };
  return (
    <>
      <PageHeader {...header} />
      {sub && cat && <CategoryHero cat={cat} />}
      {!sub ? <EventsHub /> : <UpcomingList filterSlug={sub} />}
    </>
  );
}
