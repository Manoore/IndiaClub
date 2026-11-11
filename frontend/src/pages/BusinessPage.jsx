import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2, Globe, Phone, Mail, MapPin, Clock, Gift, BadgeCheck, ArrowLeft, ExternalLink, X, ChevronLeft, ChevronRight,
  Facebook, Instagram, Linkedin, Youtube, Check,
} from "lucide-react";
import { apiClient, absoluteUrl } from "../api/client";
import { BusinessLogo } from "./BusinessDirectoryPage";

const host = (u) => (u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const SOCIAL = [
  ["facebook", Facebook, "Facebook"], ["instagram", Instagram, "Instagram"],
  ["linkedin", Linkedin, "LinkedIn"], ["youtube", Youtube, "YouTube"],
];

export default function BusinessPage() {
  const { slug } = useParams();
  const [b, setB] = useState(undefined);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    setB(undefined);
    apiClient.get(`/businesses/by-slug/${encodeURIComponent(slug)}`).then((r) => setB(r.data)).catch(() => setB(null));
  }, [slug]);

  useEffect(() => {
    if (b) document.title = `${b.name} | India Club of Greater Dayton`;
  }, [b]);

  if (b === undefined) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>;
  if (b === null) {
    return (
      <section className="py-32 bg-cream text-center px-6">
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-3">Business not found</h1>
        <p className="text-stone-600 mb-6">This listing may have moved or is no longer active.</p>
        <Link to="/business-directory" className="px-5 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium">Back to the directory</Link>
      </section>
    );
  }

  const photos = b.photos || [];
  const mapUrl = b.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}` : null;
  const socials = SOCIAL.filter(([k]) => b[k]);
  const contact = [
    b.website && { I: Globe, label: host(b.website), href: b.website, ext: true },
    b.phone && { I: Phone, label: b.phone, href: `tel:${b.phone.replace(/[^\d+]/g, "")}` },
    b.email && { I: Mail, label: b.email, href: `mailto:${b.email}` },
    b.address && { I: MapPin, label: b.address, href: mapUrl, ext: true },
  ].filter(Boolean);

  return (
    <div className="bg-cream" data-testid="business-page">
      {/* Cover */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-[#8B1A1A] via-[#a8361f] to-[#E07A1F]">
        {b.cover_url && <img src={absoluteUrl(b.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-5 left-0 right-0 max-w-6xl mx-auto px-6">
          <Link to="/business-directory" className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white bg-black/25 backdrop-blur px-3 py-1.5 rounded-full">
            <ArrowLeft className="w-4 h-4" /> Business Directory
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="relative -mt-14 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row gap-5 md:items-end">
          <BusinessLogo b={b} size="w-24 h-24" icon="w-10 h-10" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#E07A1F] font-medium tracking-wide">{b.category}</div>
            <h1 className="font-display text-3xl md:text-4xl text-stone-900" data-testid="business-name">{b.name}</h1>
            {b.tagline && <p className="text-stone-600 mt-1">{b.tagline}</p>}
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#8B1A1A] bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
              <BadgeCheck className="w-3.5 h-3.5" /> ICGD Business Member{b.member_since ? ` since ${b.member_since}` : ""}
            </div>
          </div>
          {b.website && (
            <a href={b.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium whitespace-nowrap" data-testid="business-website">
              Visit website <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8 py-10">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {b.member_offer && (
              <div className="flex gap-3 items-start bg-emerald-50 border border-emerald-200 rounded-xl p-5" data-testid="business-offer">
                <Gift className="w-6 h-6 text-emerald-700 shrink-0" />
                <div>
                  <div className="font-cinzel text-[11px] tracking-[0.2em] text-emerald-800 mb-0.5">OFFER FOR ICGD MEMBERS</div>
                  <p className="text-emerald-900">{b.member_offer}</p>
                </div>
              </div>
            )}

            {(b.about || b.description) && (
              <section>
                <h2 className="font-display text-2xl text-[#8B1A1A] mb-3">About us</h2>
                <div className="text-stone-700 leading-relaxed whitespace-pre-line" data-testid="business-about">{b.about || b.description}</div>
              </section>
            )}

            {(b.services || []).length > 0 && (
              <section>
                <h2 className="font-display text-2xl text-[#8B1A1A] mb-3">What we offer</h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {b.services.map((s) => (
                    <li key={s} className="flex items-start gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700">
                      <Check className="w-4 h-4 text-[#E07A1F] shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {photos.length > 0 && (
              <section>
                <h2 className="font-display text-2xl text-[#8B1A1A] mb-3">Photos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((p, i) => (
                    <button key={p} onClick={() => setPhoto(i)} className="aspect-[4/3] rounded-lg overflow-hidden bg-stone-100">
                      <img src={absoluteUrl(p)} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Side column */}
          <aside className="space-y-5">
            {contact.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <h3 className="font-display text-lg text-stone-900 mb-3">Contact</h3>
                <ul className="space-y-2.5 text-sm">
                  {contact.map(({ I, label, href, ext }) => (
                    <li key={label} className="flex items-start gap-2.5">
                      <I className="w-4 h-4 text-[#8B1A1A] shrink-0 mt-0.5" />
                      <a href={href} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="text-stone-700 hover:text-[#8B1A1A] break-words min-w-0">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {b.hours && (
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <h3 className="font-display text-lg text-stone-900 mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-[#8B1A1A]" /> Hours</h3>
                <p className="text-sm text-stone-700 whitespace-pre-line">{b.hours}</p>
              </div>
            )}
            {socials.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <h3 className="font-display text-lg text-stone-900 mb-3">Follow us</h3>
                <div className="flex gap-2 flex-wrap">
                  {socials.map(([k, I, label]) => (
                    <a key={k} href={b[k]} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                      className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:text-[#8B1A1A] hover:border-[#8B1A1A] transition">
                      <I className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {photo !== null && photos[photo] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setPhoto(null)}>
          <button className="absolute top-6 right-6 text-white p-2" aria-label="Close"><X className="w-7 h-7" /></button>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setPhoto((photo - 1 + photos.length) % photos.length); }} className="absolute left-4 text-white p-3 bg-white/10 rounded-full" aria-label="Previous"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={(e) => { e.stopPropagation(); setPhoto((photo + 1) % photos.length); }} className="absolute right-4 text-white p-3 bg-white/10 rounded-full" aria-label="Next"><ChevronRight className="w-6 h-6" /></button>
            </>
          )}
          <img src={absoluteUrl(photos[photo])} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
