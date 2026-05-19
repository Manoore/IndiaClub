import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Mandala from "./Mandala";
import { apiClient } from "../api/client";

// Fallback slides used while the API is loading or when admin hasn't created any.
const FALLBACK_SLIDES = [
  {
    id: "fallback-1",
    image_url: "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    headline: null, subhead: null, cta_label: null, cta_link: null,
  },
];

export default function HeroCarousel() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [stats, setStats] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    apiClient.get("/hero-slides")
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length > 0) setSlides(r.data);
      })
      .catch(() => {});
    apiClient.get("/site-stats")
      .then((r) => setStats(Array.isArray(r.data) ? r.data : []))
      .catch(() => setStats([]));
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIdx((i) => (i + 1) % slides.length);

  const current = slides[idx] || slides[0];

  return (
    <section className="relative overflow-hidden" data-testid="hero-carousel">
      <div className="relative h-[78vh] min-h-[560px] max-h-[820px]">
        {slides.map((sl, i) => (
          <div key={sl.id || i} className={`absolute inset-0 transition-opacity duration-[1400ms] ${i === idx ? "opacity-100" : "opacity-0"}`}>
            <img src={sl.image_url} alt={sl.headline || "India Club Dayton"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ))}

        <Mandala className="absolute -right-40 -top-20 w-[600px] h-[600px] hidden md:block" color="#FFD89B" opacity={0.18} />

        <div className="relative max-w-7xl mx-auto h-full px-6 flex items-center">
          <div className="max-w-2xl text-amber-50 animate-fadeUp">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-10 bg-[#E07A1F]" />
              <Sparkles className="w-4 h-4 text-[#E07A1F]" />
              <span className="font-cinzel text-xs tracking-[0.25em] text-amber-200">SINCE 1967</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-5" data-testid="hero-headline">
              {current?.headline || (<>India Club of <span className="text-[#E07A1F]">Greater Dayton</span></>)}
            </h1>
            <p className="text-lg md:text-xl text-amber-50/90 font-serif leading-relaxed mb-8 max-w-xl">
              {current?.subhead || "A vibrant home for 1000+ Indian-American families — celebrating heritage, culture and community for 58 years and counting."}
            </p>
            <div className="flex flex-wrap gap-3">
              {current?.cta_label && current?.cta_link ? (
                <Link to={current.cta_link} className="px-7 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition" data-testid="hero-primary-cta">{current.cta_label}</Link>
              ) : (
                <Link to="/membership/regular" className="px-7 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition" data-testid="hero-primary-cta">Become a Member</Link>
              )}
              <Link to="/events/upcoming" className="px-7 py-3.5 bg-white/10 backdrop-blur border border-amber-100/30 hover:bg-white/20 text-amber-50 rounded-md font-medium transition">Explore Events</Link>
            </div>
          </div>
        </div>

        {/* Controls */}
        {slides.length > 1 && (
          <>
            <button onClick={prev} aria-label="prev" className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-[#8B1A1A] text-white flex items-center justify-center backdrop-blur transition" data-testid="hero-prev"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={next} aria-label="next" className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-[#8B1A1A] text-white flex items-center justify-center backdrop-blur transition" data-testid="hero-next"><ChevronRight className="w-5 h-5" /></button>
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} aria-label={`slide-${i}`} className={`h-1.5 rounded-full transition-all ${i === idx ? "bg-[#E07A1F] w-8" : "bg-white/40 w-3"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Stats bar */}
      {stats.length > 0 && (
        <div className="relative -mt-16 z-10 max-w-6xl mx-auto px-6" data-testid="hero-stats">
          <div className={`bg-white rounded-2xl shadow-2xl border border-amber-100 grid grid-cols-2 ${stats.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-" + stats.length} overflow-hidden`}>
            {stats.map((s, i) => (
              <div key={s.id || s.label} className={`p-7 text-center ${i < stats.length - 1 ? "md:border-r border-amber-100" : ""}`}>
                <div className="font-display text-4xl md:text-5xl text-[#8B1A1A]">{s.value}</div>
                <div className="font-cinzel text-[10px] tracking-[0.22em] text-stone-500 mt-1">{(s.label || "").toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
