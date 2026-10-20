import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Mandala from "./Mandala";
import { apiClient } from "../api/client";
import { useSiteSettings } from "../api/SiteSettingsContext";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

// Single, static hero (no rotating slider): image comes from Site Content → Home Hero,
// or the first active Hero Slide as a fallback.
export default function HomeHero() {
  const s = useSiteSettings();
  const [slide, setSlide] = useState(null);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    apiClient.get("/hero-slides").then((r) => setSlide(Array.isArray(r.data) && r.data.length ? r.data[0] : null)).catch(() => {});
    apiClient.get("/site-stats").then((r) => setStats(Array.isArray(r.data) ? r.data : [])).catch(() => setStats([]));
  }, []);

  const image = s.home_hero_image || slide?.image_url || FALLBACK_IMAGE;
  const title = slide?.headline || s.home_hero_title;
  const subtitle = slide?.subhead || s.home_hero_subtitle;

  return (
    <section className="relative overflow-hidden" data-testid="home-hero">
      <div className="relative h-[64vh] min-h-[480px] max-h-[680px]">
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
        <Mandala className="absolute -right-40 -top-20 w-[600px] h-[600px] hidden md:block" color="#FFD89B" opacity={0.16} />

        <div className="relative max-w-7xl mx-auto h-full px-6 flex items-center">
          <div className="max-w-2xl text-amber-50 animate-fadeUp">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-10 bg-[#E07A1F]" />
              <Sparkles className="w-4 h-4 text-[#E07A1F]" />
              <span className="font-cinzel text-xs tracking-[0.25em] text-amber-200">{s.home_hero_eyebrow || "SINCE 1967"}</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-5" data-testid="hero-headline">
              {title || "India Club of Greater Dayton"}
            </h1>
            <p className="text-lg md:text-xl text-amber-50/90 font-serif leading-relaxed mb-8 max-w-xl">{subtitle}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/membership/regular" className="px-6 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition" data-testid="hero-primary-cta">
                {s.home_hero_cta_primary || "Become a Member"}
              </Link>
              <Link to="/events/upcoming" className="px-6 py-3.5 bg-white/10 backdrop-blur border border-amber-100/30 hover:bg-white/20 text-amber-50 rounded-md font-medium transition" data-testid="hero-events-cta">
                Upcoming Events
              </Link>
              <Link to="/sponsorship/donate" className="px-6 py-3.5 bg-white/10 backdrop-blur border border-amber-100/30 hover:bg-white/20 text-amber-50 rounded-md font-medium transition" data-testid="hero-donate-cta">
                Donate
              </Link>
            </div>
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="relative -mt-14 z-10 max-w-6xl mx-auto px-6" data-testid="hero-stats">
          <div className={`bg-white rounded-2xl shadow-2xl border border-amber-100 grid grid-cols-2 ${stats.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-" + stats.length} overflow-hidden`}>
            {stats.map((st, i) => (
              <div key={st.id || st.label} className={`p-6 text-center ${i < stats.length - 1 ? "md:border-r border-amber-100" : ""}`}>
                <div className="font-display text-4xl md:text-5xl text-[#8B1A1A]">{st.value}</div>
                <div className="font-cinzel text-[10px] tracking-[0.22em] text-stone-500 mt-1">{(st.label || "").toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
