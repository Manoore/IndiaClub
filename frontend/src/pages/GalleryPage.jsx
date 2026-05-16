import React, { useState } from "react";
import PageHeader from "../components/PageHeader";
import { GALLERY } from "../data/mock";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function GalleryPage() {
  const [active, setActive] = useState(null);
  const next = () => setActive((i) => (i + 1) % GALLERY.length);
  const prev = () => setActive((i) => (i - 1 + GALLERY.length) % GALLERY.length);
  return (
    <>
      <PageHeader eyebrow="OUR MEMORIES" title="Gallery" subtitle="Moments from our cultural celebrations, festivals and community gatherings." image="https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920" />
      <section className="py-16 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {GALLERY.map((g, i) => (
              <button key={g.id} onClick={() => setActive(i)} className="relative aspect-square overflow-hidden rounded-lg group">
                <img src={g.src} alt={g.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-2 left-2 right-2 text-left text-white text-xs font-display opacity-0 group-hover:opacity-100 transition">{g.title}</div>
              </button>
            ))}
          </div>
        </div>
      </section>
      {active !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setActive(null)}>
          <button className="absolute top-6 right-6 text-white p-2"><X className="w-7 h-7" /></button>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-6 top-1/2 -translate-y-1/2 text-white p-3 bg-white/10 rounded-full hover:bg-white/20"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-6 top-1/2 -translate-y-1/2 text-white p-3 bg-white/10 rounded-full hover:bg-white/20"><ChevronRight className="w-6 h-6" /></button>
          <div className="max-w-5xl max-h-[85vh] mx-6" onClick={(e) => e.stopPropagation()}>
            <img src={GALLERY[active].src} alt={GALLERY[active].title} className="max-h-[80vh] mx-auto object-contain rounded-lg" />
            <div className="text-center text-amber-100 mt-4 font-display text-xl">{GALLERY[active].title}</div>
          </div>
        </div>
      )}
    </>
  );
}
