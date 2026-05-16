import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { EVENT_CATEGORIES, UPCOMING_EVENTS } from "../data/mock";
import { Calendar, Clock, MapPin, ArrowRight, Sparkles, Users } from "lucide-react";
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

const CategoryHero = ({ cat }) => (
  <section className="py-14 bg-deepcream relative overflow-hidden">
    <Mandala className="absolute -right-32 top-0 w-[420px] h-[420px]" color={cat.color} opacity={0.08} />
    <div className="max-w-5xl mx-auto px-6 relative">
      <p className="text-stone-700 leading-relaxed font-serif text-lg">{cat.description}</p>
      <div className="flex items-center gap-3 mt-6">
        <Link to="/membership/regular" className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition">Become a Member</Link>
        <Link to="/sponsorship/become-sponsor" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium transition">Sponsor This Event</Link>
      </div>
    </div>
  </section>
);

export default function EventsPage() {
  const { sub } = useParams();
  const cat = EVENT_CATEGORIES.find((c) => c.slug === sub);
  const header = !sub
    ? { eyebrow: "OUR PROGRAMS", title: "Events & Festivals", subtitle: "Cultural events, festivals, sports and youth programs throughout the year.", image: "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920" }
    : { eyebrow: cat?.tagline || "EVENTS", title: cat?.name || "Events", subtitle: cat?.description, image: cat?.image };
  return (
    <>
      <PageHeader {...header} />
      {sub && cat && <CategoryHero cat={cat} />}
      {!sub ? <EventsHub /> : <UpcomingList filterSlug={sub} />}
    </>
  );
}
