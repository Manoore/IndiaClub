import React from "react";
import Mandala from "../components/Mandala";

export default function PageHeader({ eyebrow, title, subtitle, image }) {
  return (
    <section className="relative h-[44vh] min-h-[320px] overflow-hidden">
      <img src={image || "https://images.unsplash.com/photo-1645264090488-a019de493023?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/70" />
      <Mandala className="absolute -right-40 -bottom-32 w-[500px] h-[500px]" color="#FFD89B" opacity={0.18} />
      <div className="relative max-w-7xl mx-auto h-full px-6 flex flex-col justify-center text-amber-50">
        {eyebrow && (
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-10 bg-[#E07A1F]" />
            <span className="font-cinzel text-xs tracking-[0.28em] text-amber-200">{eyebrow.toUpperCase()}</span>
          </div>
        )}
        <h1 className="font-display text-4xl md:text-6xl leading-tight">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl font-serif text-lg md:text-xl text-amber-50/80">{subtitle}</p>}
      </div>
    </section>
  );
}
