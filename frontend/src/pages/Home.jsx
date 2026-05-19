import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel";
import { Calendar, MapPin, ArrowRight, Quote, Sparkles, Star, Ticket } from "lucide-react";
import Mandala from "../components/Mandala";
import { useSiteSettings } from "../api/SiteSettingsContext";
import { apiClient } from "../api/client";
import TicketPurchaseModal from "../components/TicketPurchaseModal";

const SectionHeader = ({ eyebrow, title, subtitle, center = false }) => (
  <div className={`mb-10 ${center ? "text-center mx-auto max-w-3xl" : ""}`}>
    <div className={`flex items-center gap-2 mb-3 ${center ? "justify-center" : ""}`}>
      <span className="h-px w-8 bg-[#E07A1F]" />
      <span className="font-cinzel text-xs tracking-[0.28em] text-[#8B1A1A]">{eyebrow}</span>
      <span className="h-px w-8 bg-[#E07A1F]" />
    </div>
    <h2 className="font-display text-4xl md:text-5xl text-stone-900 leading-tight">{title}</h2>
    {subtitle && <p className="mt-3 text-stone-600 font-serif text-lg leading-relaxed">{subtitle}</p>}
  </div>
);

export default function Home() {
  const s = useSiteSettings();
  const [events, setEvents] = useState([]);
  const [execTeam, setExecTeam] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [classifieds, setClassifieds] = useState([]);
  const [features, setFeatures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [activeTicketEvent, setActiveTicketEvent] = useState(null);

  useEffect(() => {
    // Featured events for the home page (admin-controlled via "featured" flag on Event)
    apiClient.get("/events?featured=true&limit=6")
      .then((r) => setEvents(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEvents([]));
    apiClient.get("/exec-team")
      .then((r) => setExecTeam(Array.isArray(r.data) ? r.data : []))
      .catch(() => setExecTeam([]));
    apiClient.get("/sponsors")
      .then((r) => setSponsors(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSponsors([]));
    apiClient.get("/classifieds")
      .then((r) => setClassifieds(Array.isArray(r.data) ? r.data : []))
      .catch(() => setClassifieds([]));
    apiClient.get("/feature-highlights")
      .then((r) => setFeatures(Array.isArray(r.data) ? r.data : []))
      .catch(() => setFeatures([]));
    apiClient.get("/testimonials")
      .then((r) => setTestimonials(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTestimonials([]));
    apiClient.get("/event-categories")
      .then((r) => setEventCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEventCategories([]));
  }, []);

  // Compute "years of service" from Stat 1 if it looks like a year, else default to 58
  const founded = parseInt(s.home_stat_1_value, 10);
  const yearsOfService = !isNaN(founded) && founded > 1900 && founded < 2100
    ? new Date().getFullYear() - founded
    : 58;
  return (
    <>
      <HeroCarousel />

      {/* Welcome */}
      <section className="relative pt-32 pb-20 bg-cream">
        <Mandala className="absolute -left-32 top-10 w-[400px] h-[400px]" color="#8B1A1A" opacity={0.06} />
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <SectionHeader eyebrow="WELCOME" title="A Home Away From Home" />
            <p className="text-stone-700 leading-relaxed mb-5" data-testid="home-about-intro">
              {s.about_mission}
            </p>
            <p className="text-stone-700 leading-relaxed mb-5">
              {s.about_history}
            </p>
            <p className="text-stone-700 leading-relaxed mb-7">
              ICGD is a membership-based and member-run organization. As a member you will network with hundreds of families who share Asian Indian heritage, and attend all our cultural events and concerts at member pricing.
            </p>
            <div className="flex gap-3">
              <Link to="/about/mission" className="px-6 py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition">Our Mission</Link>
              <Link to="/about/executive-committee" className="px-6 py-3 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md font-medium transition">Meet The Team</Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 bg-[#E07A1F]/15 rounded-2xl -rotate-2" />
            <img src="https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" alt="Cultural performance" className="relative rounded-2xl shadow-2xl w-full object-cover h-[520px]" />
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl px-5 py-4 border border-amber-100">
              <div className="font-display text-3xl text-[#8B1A1A]" data-testid="home-years-badge">{yearsOfService}<span className="text-[#E07A1F]">+</span></div>
              <div className="font-cinzel text-[10px] tracking-[0.2em] text-stone-500">YEARS OF SERVICE</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader center eyebrow="GET INVOLVED" title="Be Part of the Community" subtitle="Become a member, sponsor, or donor — every contribution helps us celebrate our heritage and serve the community." />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="home-features">
            {features.map((f) => (
              <Link to={f.link || "/"} key={f.id} className="group card-hover bg-white rounded-2xl overflow-hidden border border-stone-200 block">
                <div className="relative h-44 overflow-hidden">
                  {f.image_url && <img src={f.image_url} alt={f.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-cinzel tracking-[0.2em] rounded" style={{ background: f.accent || "#8B1A1A", color: "#fff" }}>FEATURED</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl text-stone-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-4">{f.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[#8B1A1A] group-hover:text-[#E07A1F] transition">
                    {f.cta || "Learn More"} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </span>
                </div>
              </Link>
            ))}
            {features.length === 0 && (
              <div className="col-span-full text-center text-stone-500 py-6 border border-dashed border-stone-300 rounded-xl" data-testid="home-features-empty">
                No featured tiles yet. Add them in Admin → Feature Tiles.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Event Categories */}
      <section className="py-20 bg-deepcream relative overflow-hidden">
        <Mandala className="absolute -right-40 top-10 w-[500px] h-[500px]" color="#8B1A1A" opacity={0.07} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <SectionHeader eyebrow="OUR PROGRAMS" title="Signature Cultural Events" subtitle="From Diwali to DIFI, sports leagues to Golden Jewels gatherings — there is something for every family member, year-round." />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="home-event-categories">
            {eventCategories.slice(0, 8).map((e) => (
              <Link to={`/events/${e.slug}`} key={e.slug} className="group relative h-72 rounded-xl overflow-hidden card-hover">
                {e.image_url && <img src={e.image_url} alt={e.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: e.color || "#8B1A1A" }}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="font-cinzel text-[10px] tracking-[0.22em] text-amber-200 mb-1">{(e.tagline || "").toUpperCase()}</div>
                  <h3 className="font-display text-2xl mb-1">{e.name}</h3>
                  <p className="text-xs text-amber-50/80 line-clamp-2">{e.description}</p>
                </div>
              </Link>
            ))}
            {eventCategories.length === 0 && (
              <div className="col-span-full text-center text-stone-500 py-6 border border-dashed border-stone-300 rounded-xl" data-testid="home-event-categories-empty">
                No event categories yet. Add them in Admin → Event Categories.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="py-20 bg-white" data-testid="home-upcoming-events">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-px w-8 bg-[#E07A1F]" />
                <span className="font-cinzel text-xs tracking-[0.28em] text-[#8B1A1A]">SAVE THE DATE</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl text-stone-900">Upcoming Events</h2>
            </div>
            <Link to="/events/upcoming" className="inline-flex items-center gap-1 text-[#8B1A1A] hover:text-[#E07A1F] font-medium" data-testid="home-view-all-events">View all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-10 text-stone-500 border border-dashed border-stone-300 rounded-xl" data-testid="home-events-empty">
              No featured events yet. Mark an event as <strong>Featured</strong> in the admin panel to showcase it here.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((e) => {
                const hasTickets = Array.isArray(e.ticket_types) && e.ticket_types.length > 0;
                const minPrice = hasTickets ? Math.min(...e.ticket_types.map((t) => Number(t.price || 0))) : null;
                return (
                  <div key={e.id} className="card-hover bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col" data-testid={`home-event-${e.slug || e.id}`}>
                    <div className="relative h-48 overflow-hidden">
                      <img src={e.image_url || "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"} alt={e.title} className="w-full h-full object-cover hover:scale-105 transition duration-700" />
                      {e.category && <div className="absolute top-3 left-3 bg-white rounded-md px-2.5 py-1 text-[#8B1A1A] text-xs font-semibold">{e.category}</div>}
                      {hasTickets && (
                        <div className="absolute bottom-3 left-3 bg-[#E07A1F] text-white rounded-md px-2.5 py-1 text-xs font-medium flex items-center gap-1">
                          <Ticket className="w-3.5 h-3.5" /> From ${Number.isFinite(minPrice) ? minPrice.toFixed(0) : "0"}
                        </div>
                      )}
                      {e.registration_open && !hasTickets && (
                        <div className="absolute top-3 right-3 bg-[#E07A1F] text-white rounded-md px-2 py-1 text-[10px] font-cinzel tracking-wider">OPEN</div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-display text-xl text-stone-900 mb-2">{e.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-stone-500 mb-3 flex-wrap">
                        {e.date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {e.date}</span>}
                        {e.venue && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.venue.split(",")[0]}</span>}
                      </div>
                      <p className="text-sm text-stone-600 line-clamp-2 mb-4 flex-1">{e.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <Link to="/events/upcoming" className="text-sm font-medium text-[#8B1A1A] inline-flex items-center gap-1 hover:text-[#E07A1F]" data-testid={`home-event-details-${e.slug || e.id}`}>Details <ArrowRight className="w-3.5 h-3.5" /></Link>
                        {hasTickets && e.registration_open && (
                          <button
                            onClick={() => setActiveTicketEvent(e)}
                            className="px-3.5 py-2 bg-[#E07A1F] hover:bg-[#c66c1a] text-white text-xs rounded-md font-medium transition inline-flex items-center gap-1.5"
                            data-testid={`home-buy-tickets-${e.slug || e.id}`}
                          >
                            <Ticket className="w-3.5 h-3.5" /> Buy Tickets
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Executive Team teaser */}
      <section className="py-20 bg-[#1a0e0a] text-amber-50 relative overflow-hidden">
        <Mandala className="absolute -left-40 -bottom-20 w-[500px] h-[500px]" color="#E07A1F" opacity={0.12} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-px w-8 bg-[#E07A1F]" />
                <span className="font-cinzel text-xs tracking-[0.28em] text-[#E07A1F]">LEADERSHIP</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl">Our Executive Team</h2>
              <p className="text-amber-50/70 mt-2 font-serif text-lg max-w-2xl">The volunteers who give their time and passion to build community.</p>
            </div>
            <Link to="/about/executive-committee" className="inline-flex items-center gap-1 text-amber-100 hover:text-[#E07A1F]">All members <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5" data-testid="home-exec-team">
            {execTeam.slice(0, 6).map((m) => (
              <div key={m.id} className="text-center group">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-amber-100/20 group-hover:border-[#E07A1F] transition">
                  <img src={m.image_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(m.name || "ICGD") + "&size=400&background=8B1A1A&color=FFF9F0&bold=true"} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                </div>
                <div className="mt-3 font-display text-lg text-amber-100">{m.name}</div>
                <div className="font-cinzel text-[10px] tracking-[0.18em] text-amber-200/70">{(m.role || "").toUpperCase()}</div>
              </div>
            ))}
            {execTeam.length === 0 && (
              <div className="col-span-full text-center text-amber-100/60 py-6" data-testid="home-exec-empty">
                No executive team members published yet. Add them in the admin panel.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Latest Classifieds */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <SectionHeader eyebrow="COMMUNITY" title="Latest Classifieds" />
            <Link to="/classified/all-ads" className="inline-flex items-center gap-1 text-[#8B1A1A] hover:text-[#E07A1F] font-medium">Browse all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="home-classifieds">
            {classifieds.slice(0, 6).map((c) => (
              <div key={c.id} className="flex gap-4 p-3 bg-white rounded-xl border border-stone-200 card-hover">
                <img src={c.image_url || "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"} alt={c.title} className="w-28 h-28 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8B1A1A] font-medium">{c.category}</span>
                    <span className="text-stone-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</span>
                  </div>
                  <h4 className="font-display text-lg text-stone-900 mt-1 line-clamp-2">{c.title}</h4>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-stone-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.location}</span>
                    {c.price && <span className="font-semibold text-[#E07A1F]">{c.price}</span>}
                  </div>
                </div>
              </div>
            ))}
            {classifieds.length === 0 && (
              <div className="col-span-full text-center text-stone-500 py-6 border border-dashed border-stone-300 rounded-xl" data-testid="home-classifieds-empty">
                No classifieds yet. Members can post ads once approved by admin.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sponsors marquee */}
      <section className="py-16 bg-white border-y border-amber-100">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader center eyebrow="PROUD PARTNERS" title="Our Sponsors & Well Wishers" />
          <div className="relative overflow-hidden" data-testid="home-sponsors">
            {sponsors.length === 0 ? (
              <div className="text-center text-stone-500 py-6" data-testid="home-sponsors-empty">
                No sponsors yet. Add them in the admin panel to feature their logos here.
              </div>
            ) : (
              <div className="flex gap-12 animate-marquee" style={{ width: "max-content" }}>
                {[...sponsors, ...sponsors].map((sp, i) => (
                  <div key={i} className="h-20 w-36 flex items-center justify-center bg-stone-50 rounded-lg border border-stone-100 grayscale hover:grayscale-0 transition">
                    {sp.logo_url ? (
                      <img src={sp.logo_url} alt={sp.name} className="max-h-14 max-w-[120px] object-contain" onError={(e) => (e.target.style.display = "none")} />
                    ) : (
                      <span className="text-xs font-medium text-stone-700 px-2 text-center">{sp.name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-center mt-10">
            <Link to="/sponsorship/become-sponsor" className="inline-block px-7 py-3 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition">Become a Sponsor</Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-deepcream">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader center eyebrow="VOICES OF OUR COMMUNITY" title="What Our Patrons Say" />
          <div className="grid md:grid-cols-3 gap-6" data-testid="home-testimonials">
            {testimonials.slice(0, 3).map((t) => (
              <div key={t.id} className="bg-white p-7 rounded-xl border border-amber-100 relative card-hover">
                <Quote className="absolute top-5 right-5 w-7 h-7 text-[#E07A1F]/30" />
                <div className="flex gap-0.5 text-[#E07A1F] mb-3">
                  {Array.from({ length: Math.max(1, Math.min(5, t.rating || 5)) }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-stone-700 leading-relaxed mb-5 font-serif text-base italic">&ldquo;{t.body}&rdquo;</p>
                <div className="font-display text-lg text-[#8B1A1A]">{t.name}</div>
                {t.date && <div className="text-xs text-stone-500">{t.date}</div>}
              </div>
            ))}
            {testimonials.length === 0 && (
              <div className="col-span-full text-center text-stone-500 py-6 border border-dashed border-stone-300 rounded-xl" data-testid="home-testimonials-empty">
                No testimonials yet. Add them in Admin → Testimonials.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#8B1A1A] relative overflow-hidden">
        <Mandala className="absolute -right-32 -top-20 w-[500px] h-[500px]" color="#FFD89B" opacity={0.18} />
        <div className="max-w-4xl mx-auto px-6 text-center text-amber-50 relative">
          <div className="font-cinzel text-xs tracking-[0.3em] text-[#E07A1F] mb-4">JOIN OUR FAMILY</div>
          <h2 className="font-display text-4xl md:text-5xl mb-5" data-testid="home-cta-title">{s.home_why_join_title}</h2>
          <p className="text-amber-50/80 font-serif text-lg leading-relaxed mb-8" data-testid="home-cta-text">{s.home_why_join_text}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/membership/regular" className="px-7 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition">{s.home_hero_cta_primary}</Link>
            <Link to="/sponsorship/donate" className="px-7 py-3.5 bg-white/10 backdrop-blur border border-amber-100/30 hover:bg-white/20 text-amber-50 rounded-md font-medium transition">Donate</Link>
          </div>
        </div>
      </section>

      {activeTicketEvent && (
        <TicketPurchaseModal
          event={activeTicketEvent}
          onClose={() => setActiveTicketEvent(null)}
          onSuccess={() => setActiveTicketEvent(null)}
        />
      )}
    </>
  );
}
