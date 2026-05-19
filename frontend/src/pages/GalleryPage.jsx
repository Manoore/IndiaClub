import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiClient } from "../api/client";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [album, setAlbum] = useState("All");

  useEffect(() => {
    apiClient.get("/gallery")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const albums = useMemo(() => {
    const set = new Set(items.map((g) => g.album || "General"));
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => album === "All" ? items : items.filter((g) => (g.album || "General") === album), [items, album]);
  const next = () => setActive((i) => (i + 1) % filtered.length);
  const prev = () => setActive((i) => (i - 1 + filtered.length) % filtered.length);

  return (
    <>
      <PageHeader eyebrow="OUR MEMORIES" title="Gallery" subtitle="Moments from our cultural celebrations, festivals and community gatherings." image="https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" />
      <section className="py-12 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          {/* Album filter chips */}
          {albums.length > 2 && (
            <div className="flex gap-2 flex-wrap mb-6" data-testid="gallery-albums">
              {albums.map((a) => (
                <button
                  key={a}
                  onClick={() => setAlbum(a)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition border ${album === a ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-600 border-stone-200 hover:border-[#8B1A1A]"}`}
                  data-testid={`gallery-album-${a}`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-stone-500 border border-dashed border-stone-300 rounded-xl" data-testid="gallery-empty">
              No photos in this album yet. Admin can add them in Admin → Gallery.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" data-testid="gallery-grid">
              {filtered.map((g, i) => (
                <button key={g.id || i} onClick={() => setActive(i)} className="relative aspect-square overflow-hidden rounded-lg group" data-testid={`gallery-item-${i}`}>
                  <img src={g.image_url} alt={g.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div className="absolute bottom-2 left-2 right-2 text-left text-white text-xs font-display opacity-0 group-hover:opacity-100 transition">{g.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      {active !== null && filtered[active] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setActive(null)} data-testid="gallery-lightbox">
          <button className="absolute top-6 right-6 text-white p-2" aria-label="close"><X className="w-7 h-7" /></button>
          {filtered.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-6 top-1/2 -translate-y-1/2 text-white p-3 bg-white/10 rounded-full hover:bg-white/20" aria-label="prev"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-6 top-1/2 -translate-y-1/2 text-white p-3 bg-white/10 rounded-full hover:bg-white/20" aria-label="next"><ChevronRight className="w-6 h-6" /></button>
            </>
          )}
          <div className="max-w-5xl max-h-[85vh] mx-6" onClick={(e) => e.stopPropagation()}>
            <img src={filtered[active].image_url} alt={filtered[active].title} className="max-h-[80vh] mx-auto object-contain rounded-lg" />
            <div className="text-center text-amber-100 mt-4 font-display text-xl">{filtered[active].title}</div>
            {filtered[active].album && <div className="text-center text-amber-200/70 text-xs font-cinzel tracking-[0.22em] mt-1">{filtered[active].album.toUpperCase()}</div>}
          </div>
        </div>
      )}
    </>
  );
}
