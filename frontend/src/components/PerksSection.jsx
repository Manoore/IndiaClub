import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import * as Lucide from "lucide-react";
import { Sparkles, ChevronRight } from "lucide-react";

const ICON_FALLBACK = "Gift";

function PerkIcon({ name, className }) {
  const Icon = Lucide[name] || Lucide[ICON_FALLBACK];
  return <Icon className={className} />;
}

const PerkCard = ({ perk, locked, dimmed }) => {
  const inner = (
    <div
      className={`relative h-full p-5 rounded-2xl border transition ${
        dimmed
          ? "bg-stone-50 border-stone-200 opacity-70"
          : "bg-white border-amber-100 hover:border-[#E07A1F] hover:shadow-md"
      }`}
      data-testid={`perk-${perk.id}`}
    >
      {perk.badge && (
        <div className="absolute -top-2 right-4 px-2 py-0.5 bg-[#E07A1F] text-white text-[10px] font-cinzel tracking-wider rounded">
          {perk.badge}
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        {perk.image_url ? (
          <img src={perk.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-[#8B1A1A]">
            <PerkIcon name={perk.icon} className="w-6 h-6" />
          </div>
        )}
        <div className="flex-1">
          <div className="font-display text-lg text-stone-900 leading-tight">{perk.title}</div>
          {perk.category && (
            <div className="text-[10px] font-cinzel tracking-[0.18em] text-stone-500 mt-0.5 uppercase">
              {perk.category}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-stone-600 leading-relaxed">{perk.description}</p>
      {perk.link && perk.link_label && !locked && (
        <div className="mt-3 inline-flex items-center gap-1 text-sm text-[#8B1A1A] hover:text-[#E07A1F] font-medium">
          {perk.link_label} <ChevronRight className="w-4 h-4" />
        </div>
      )}
      {locked && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-stone-500">
          🔒 Available once your membership is active
        </div>
      )}
    </div>
  );
  if (perk.link && perk.link_label && !locked) {
    if (perk.link.startsWith("http")) {
      return (
        <a href={perk.link} target="_blank" rel="noreferrer" className="block">
          {inner}
        </a>
      );
    }
    return (
      <Link to={perk.link} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
};

export default function PerksSection({ memberStatus = "none", title = "Your Member Perks", subtitle, showLockedHint = true }) {
  const [perks, setPerks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/perks")
      .then((r) => setPerks(r.data || []))
      .catch(() => setPerks([]))
      .finally(() => setLoading(false));
  }, []);

  const isActive = memberStatus === "active";
  const locked = showLockedHint && !isActive;

  if (loading) return null;
  if (!perks.length) return null;

  return (
    <section className="bg-white rounded-2xl p-6 border border-amber-100" data-testid="perks-section">
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#E07A1F]" />
            <h2 className="font-display text-2xl text-[#8B1A1A]">{title}</h2>
          </div>
          {subtitle && <p className="text-sm text-stone-600">{subtitle}</p>}
          {locked && !subtitle && (
            <p className="text-sm text-stone-600">
              Unlock these benefits when your membership is approved.
            </p>
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {perks.map((p) => (
          <PerkCard key={p.id} perk={p} locked={locked} dimmed={locked} />
        ))}
      </div>
    </section>
  );
}
