import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, Store, MapPin, Gift, Star, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { apiClient, absoluteUrl } from "../api/client";
import { useMemberAuth } from "../api/MemberAuthContext";

export const BusinessLogo = ({ b, size = "w-16 h-16", icon = "w-7 h-7" }) => (b.logo_url ? (
  <img src={absoluteUrl(b.logo_url)} alt="" loading="lazy" className={`${size} object-contain rounded-lg bg-white border border-stone-200`} />
) : (
  <div className={`${size} rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center`}><Store className={`${icon} text-[#8B1A1A]`} /></div>
));

const BusinessCard = ({ b }) => (
  <Link to={`/business/${b.slug}`} className="group bg-white rounded-xl border border-stone-200 overflow-hidden card-hover flex flex-col" data-testid={`biz-card-${b.slug}`}>
    <div className="relative h-32 bg-gradient-to-br from-[#8B1A1A] via-[#a8361f] to-[#E07A1F]">
      {b.cover_url && <img src={absoluteUrl(b.cover_url)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
      {b.featured && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 text-[#8B1A1A] text-[11px] font-semibold px-2 py-1 rounded-full">
          <Star className="w-3 h-3 fill-current" /> Featured
        </span>
      )}
      <div className="absolute -bottom-7 left-5"><BusinessLogo b={b} size="w-14 h-14" icon="w-6 h-6" /></div>
    </div>
    <div className="pt-9 px-5 pb-5 flex-1 flex flex-col">
      <div className="text-xs text-[#E07A1F] font-medium">{b.category}</div>
      <h3 className="font-display text-lg text-stone-900 group-hover:text-[#8B1A1A] transition">{b.name}</h3>
      {(b.tagline || b.description) && <p className="text-sm text-stone-600 line-clamp-2 mt-1">{b.tagline || b.description}</p>}
      {b.address && <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500"><MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{b.address}</span></div>}
      {b.member_offer && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5">
          <Gift className="w-3.5 h-3.5 shrink-0 mt-px" /> <span className="line-clamp-2">{b.member_offer}</span>
        </div>
      )}
      <div className="mt-auto pt-4 text-sm font-medium text-[#8B1A1A] inline-flex items-center gap-1">View business <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" /></div>
    </div>
  </Link>
);

export default function BusinessDirectoryPage() {
  const { isAuthed } = useMemberAuth();
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    apiClient.get("/businesses").then((r) => setItems(r.data || [])).catch(() => setItems([]));
    apiClient.get("/businesses/categories").then((r) => setCategories(r.data || [])).catch(() => setCategories([]));
  }, []);

  const used = useMemo(() => new Set((items || []).map((b) => b.category)), [items]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items || []).filter((b) => (cat === "All" || b.category === cat) &&
      (!t || `${b.name} ${b.tagline || ""} ${b.description || ""} ${b.category} ${(b.services || []).join(" ")} ${b.address || ""}`.toLowerCase().includes(t)));
  }, [items, cat, q]);

  return (
    <>
      <PageHeader eyebrow="COMMUNITY" title="Business Directory"
        subtitle="Businesses run by our Business members. Support local, and look out for special offers for ICGD members."
        image="https://images.unsplash.com/photo-1651512186979-737021ace442?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" />
      <section className="py-14 bg-cream">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, service or area"
                className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-md bg-white outline-none focus:border-[#8B1A1A]" data-testid="biz-search" />
            </div>
            <Link to={isAuthed ? "/member/dashboard#my-business" : "/membership/regular"}
              className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium text-center transition" data-testid="biz-list-yours">
              List your business
            </Link>
          </div>
          <div className="flex gap-2 flex-wrap mb-8" data-testid="biz-categories">
            {["All", ...categories.filter((c) => used.has(c))].map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${cat === c ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-600 border-stone-200 hover:border-[#8B1A1A]"}`}>
                {c}
              </button>
            ))}
          </div>

          {!items ? (
            <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-stone-500 border border-dashed border-stone-300 rounded-xl bg-white" data-testid="biz-empty">
              {items.length === 0 ? (
                <>No businesses listed yet. <Link to="/membership/regular" className="text-[#8B1A1A] underline">Business members</Link> can add theirs from their dashboard.</>
              ) : "No businesses match your search."}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="biz-list">
              {filtered.map((b) => <BusinessCard key={b.id} b={b} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
