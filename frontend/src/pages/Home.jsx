import React from "react";
import { Link } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel";
import { FEATURE_HIGHLIGHTS, EVENT_CATEGORIES, UPCOMING_EVENTS, EXECUTIVE_TEAM, SPONSORS, TESTIMONIALS, CLASSIFIEDS } from "../data/mock";
import { Calendar, MapPin, ArrowRight, Quote, Sparkles, Star } from "lucide-react";
import Mandala from "../components/Mandala";

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
  return (
    <>
      <HeroCarousel />

      {/* Welcome */}
      <section className="relative pt-32 pb-20 bg-cream">
        <Mandala className="absolute -left-32 top-10 w-[400px] h-[400px]" color="#8B1A1A" opacity={0.06} />
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <SectionHeader eyebrow="WELCOME" title="A Home Away From Home" />
            <p className="text-stone-700 leading-relaxed mb-5">
              India Club of Greater Dayton is a non-profit organization representing and serving Asian Indians living in and around the Dayton metro area. Started in <strong>1967</strong>, the Club has a membership of over 1000 families and is growing every day.
            </p>
            <p className="text-stone-700 leading-relaxed mb-5">
              Asian Indians represent a growing community of professionals — doctors, engineers, educators and entrepreneurs — and the Dayton area is well-served by this community.
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
              <div className="font-display text-3xl text-[#8B1A1A]">58<span className="text-[#E07A1F]">+</span></div>
              <div className="font-cinzel text-[10px] tracking-[0.2em] text-stone-500">YEARS OF SERVICE</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader center eyebrow="GET INVOLVED" title="Be Part of the Community" subtitle="Become a member, sponsor, or donor — every contribution helps us celebrate our heritage and serve the community." />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURE_HIGHLIGHTS.map((f) => (
              <Link to={f.link} key={f.title} className="group card-hover bg-white rounded-2xl overflow-hidden border border-stone-200 block">
                <div className="relative h-44 overflow-hidden">
                  <img src={f.image} alt={f.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-cinzel tracking-[0.2em] rounded" style={{ background: f.accent, color: "#fff" }}>FEATURED</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl text-stone-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-4">{f.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[#8B1A1A] group-hover:text-[#E07A1F] transition">
                    {f.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Event Categories */}
      <section className="py-20 bg-deepcream relative overflow-hidden">
        <Mandala className="absolute -right-40 top-10 w-[500px] h-[500px]" color="#8B1A1A" opacity={0.07} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <SectionHeader eyebrow="OUR PROGRAMS" title="Signature Cultural Events" subtitle="From Diwali to DIFI, sports leagues to Golden Jewels gatherings — there is something for every family member, year-round." />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {EVENT_CATEGORIES.slice(0, 8).map((e) => (
              <Link to={`/events/${e.slug}`} key={e.slug} className="group relative h-72 rounded-xl overflow-hidden card-hover">
                <img src={e.image} alt={e.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: e.color }}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="font-cinzel text-[10px] tracking-[0.22em] text-amber-200 mb-1">{e.tagline.toUpperCase()}</div>
                  <h3 className="font-display text-2xl mb-1">{e.name}</h3>
                  <p className="text-xs text-amber-50/80 line-clamp-2">{e.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-px w-8 bg-[#E07A1F]" />
                <span className="font-cinzel text-xs tracking-[0.28em] text-[#8B1A1A]">SAVE THE DATE</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl text-stone-900">Upcoming Events</h2>
            </div>
            <Link to="/events/upcoming" className="inline-flex items-center gap-1 text-[#8B1A1A] hover:text-[#E07A1F] font-medium">View all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {UPCOMING_EVENTS.slice(0, 6).map((e) => (
              <div key={e.id} className="card-hover bg-white border border-stone-200 rounded-xl overflow-hidden">
                <div className="relative h-48 overflow-hidden">
                  <img src={e.image} alt={e.title} className="w-full h-full object-cover hover:scale-105 transition duration-700" />
                  <div className="absolute top-3 left-3 bg-white rounded-md px-2.5 py-1 text-[#8B1A1A] text-xs font-semibold">{e.category}</div>
                  {e.registrationOpen && (
                    <div className="absolute top-3 right-3 bg-[#E07A1F] text-white rounded-md px-2 py-1 text-[10px] font-cinzel tracking-wider">OPEN</div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl text-stone-900 mb-2">{e.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {e.date}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.venue.split(",")[0]}</span>
                  </div>
                  <p className="text-sm text-stone-600 line-clamp-2 mb-4">{e.description}</p>
                  <Link to="/events/upcoming" className="text-sm font-medium text-[#8B1A1A] inline-flex items-center gap-1 hover:text-[#E07A1F]">Details <ArrowRight className="w-3.5 h-3.5" /></Link>
                </div>
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {EXECUTIVE_TEAM.slice(0, 6).map((m) => (
              <div key={m.id} className="text-center group">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-amber-100/20 group-hover:border-[#E07A1F] transition">
                  <img src={m.image} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                </div>
                <div className="mt-3 font-display text-lg text-amber-100">{m.name}</div>
                <div className="font-cinzel text-[10px] tracking-[0.18em] text-amber-200/70">{m.role.toUpperCase()}</div>
              </div>
            ))}
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CLASSIFIEDS.slice(0, 6).map((c) => (
              <div key={c.id} className="flex gap-4 p-3 bg-white rounded-xl border border-stone-200 card-hover">
                <img src={c.image} alt={c.title} className="w-28 h-28 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8B1A1A] font-medium">{c.category}</span>
                    <span className="text-stone-400">{c.date}</span>
                  </div>
                  <h4 className="font-display text-lg text-stone-900 mt-1 line-clamp-2">{c.title}</h4>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-stone-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.location}</span>
                    <span className="font-semibold text-[#E07A1F]">{c.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors marquee */}
      <section className="py-16 bg-white border-y border-amber-100">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader center eyebrow="PROUD PARTNERS" title="Our Sponsors & Well Wishers" />
          <div className="relative overflow-hidden">
            <div className="flex gap-12 animate-marquee" style={{ width: "max-content" }}>
              {[...SPONSORS, ...SPONSORS].map((s, i) => (
                <div key={i} className="h-20 w-36 flex items-center justify-center bg-stone-50 rounded-lg border border-stone-100 grayscale hover:grayscale-0 transition">
                  <img src={s.logo} alt={s.name} className="max-h-14 max-w-[120px] object-contain" onError={(e) => (e.target.style.display = "none")} />
                </div>
              ))}
            </div>
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
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
              <div key={i} className="bg-white p-7 rounded-xl border border-amber-100 relative card-hover">
                <Quote className="absolute top-5 right-5 w-7 h-7 text-[#E07A1F]/30" />
                <div className="flex gap-0.5 text-[#E07A1F] mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-stone-700 leading-relaxed mb-5 font-serif text-base italic">“{t.body}”</p>
                <div className="font-display text-lg text-[#8B1A1A]">{t.name}</div>
                <div className="text-xs text-stone-500">{t.date}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#8B1A1A] relative overflow-hidden">
        <Mandala className="absolute -right-32 -top-20 w-[500px] h-[500px]" color="#FFD89B" opacity={0.18} />
        <div className="max-w-4xl mx-auto px-6 text-center text-amber-50 relative">
          <div className="font-cinzel text-xs tracking-[0.3em] text-[#E07A1F] mb-4">JOIN OUR FAMILY</div>
          <h2 className="font-display text-4xl md:text-5xl mb-5">Together, we keep our culture alive.</h2>
          <p className="text-amber-50/80 font-serif text-lg leading-relaxed mb-8">Be part of a 1000+ family community. Celebrate with us at every festival, every milestone, every chai gathering.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/membership/regular" className="px-7 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition">Become a Member</Link>
            <Link to="/sponsorship/donate" className="px-7 py-3.5 bg-white/10 backdrop-blur border border-amber-100/30 hover:bg-white/20 text-amber-50 rounded-md font-medium transition">Donate</Link>
          </div>
        </div>
      </section>
    </>
  );
}
