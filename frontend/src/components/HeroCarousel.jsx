import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HERO_IMAGES, STATS } from "../data/mock";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Mandala from "./Mandala";

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_IMAGES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const prev = () => setIdx((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
  const next = () => setIdx((i) => (i + 1) % HERO_IMAGES.length);

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[78vh] min-h-[560px] max-h-[820px]">
        {HERO_IMAGES.map((src, i) => (
          <div key={src} className={`absolute inset-0 transition-opacity duration-[1400ms] ${i === idx ? "opacity-100" : "opacity-0"}`}>
            <img src={src} alt="India Club Dayton" className="w-full h-full object-cover" />
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
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-5">
              India Club of <span className="text-[#E07A1F]">Greater Dayton</span>
            </h1>
            <p className="text-lg md:text-xl text-amber-50/90 font-serif leading-relaxed mb-8 max-w-xl">
              A vibrant home for 1000+ Indian-American families — celebrating heritage, culture and community for 58 years and counting.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/membership/regular" className="px-7 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition">Become a Member</Link>
              <Link to="/events/upcoming" className="px-7 py-3.5 bg-white/10 backdrop-blur border border-amber-100/30 hover:bg-white/20 text-amber-50 rounded-md font-medium transition">Explore Events</Link>
            </div>
          </div>
        </div>

        {/* Controls */}
        <button onClick={prev} aria-label="prev" className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-[#8B1A1A] text-white flex items-center justify-center backdrop-blur transition"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={next} aria-label="next" className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-[#8B1A1A] text-white flex items-center justify-center backdrop-blur transition"><ChevronRight className="w-5 h-5" /></button>

        {/* Pagination dots */}
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "bg-[#E07A1F] w-8" : "bg-white/40 w-3"}`} />
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative -mt-16 z-10 max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-2xl border border-amber-100 grid grid-cols-2 md:grid-cols-4 overflow-hidden">
          {STATS.map((s, i) => (
            <div key={s.label} className={`p-7 text-center ${i < STATS.length - 1 ? "md:border-r border-amber-100" : ""}`}>
              <div className="font-display text-4xl md:text-5xl text-[#8B1A1A]">{s.value}</div>
              <div className="font-cinzel text-[10px] tracking-[0.22em] text-stone-500 mt-1">{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
