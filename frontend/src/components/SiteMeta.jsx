import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "../api/SiteSettingsContext";

const SITE = "India Club of Greater Dayton";
const HOME_TITLE = `${SITE} — Celebrating Heritage Since 1967`;

const SECTIONS = {
  about: { title: "About Us", description: "Mission, history, leadership and constitution of the India Club of Greater Dayton, serving the community since 1967." },
  membership: { title: "Membership", description: "Join India Club of Greater Dayton — Individual, Youth, Family and Business memberships with member pricing on every event." },
  events: { title: "Events", description: "Diwali, DIFI, picnics, Golden Jewels, Rising Stars and more — the India Club of Greater Dayton events calendar." },
  programs: { title: "Programs", description: "Scholarships, youth and community programs run by the India Club of Greater Dayton." },
  sponsorship: { title: "Sponsorship", description: "Become an annual Platinum, Gold, Silver or Bronze sponsor, or donate to the India Club of Greater Dayton." },
  classified: { title: "Classifieds", description: "Community classifieds and business directory for the Indian-American community in Greater Dayton." },
  gallery: { title: "Gallery", description: "Photos from India Club of Greater Dayton festivals and events." },
  contact: { title: "Contact", description: "Get in touch with the India Club of Greater Dayton." },
  login: { title: "Member Login", description: "Sign in to your India Club of Greater Dayton account." },
  member: { title: "My Dashboard", description: "Your India Club membership, family and tickets." },
  admin: { title: "Admin", description: "" },
};
const DEFAULT_DESCRIPTION = "India Club of Greater Dayton — celebrating Indian heritage, culture and community in Dayton, Ohio since 1967.";

const humanize = (slug) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const setMeta = (name, content) => {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

// Per-page <title>/<meta description>, plus Google Analytics when a measurement ID is set in Site Content.
export default function SiteMeta() {
  const { pathname } = useLocation();
  const { google_analytics_id: gaId } = useSiteSettings();

  useEffect(() => {
    const [section, sub] = pathname.split("/").filter(Boolean);
    const meta = SECTIONS[section];
    if (!section) {
      document.title = HOME_TITLE;
    } else {
      const page = meta ? meta.title : humanize(section);
      document.title = sub && section !== "admin" && section !== "member" ? `${humanize(sub)} · ${page} | ${SITE}` : `${page} | ${SITE}`;
    }
    setMeta("description", meta?.description || DEFAULT_DESCRIPTION);
  }, [pathname]);

  // Load gtag once; skip the admin area so staff activity isn't counted
  useEffect(() => {
    const id = (gaId || "").trim();
    if (!/^G-[A-Z0-9]+$/i.test(id) || window.__icgdGaLoaded) return;
    window.__icgdGaLoaded = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
    window.gtag("js", new Date());
    window.gtag("config", id, { send_page_view: false });
    window.__icgdGaId = id;
  }, [gaId]);

  useEffect(() => {
    if (!window.gtag || !window.__icgdGaId || pathname.startsWith("/admin")) return;
    window.gtag("event", "page_view", { page_path: pathname, page_title: document.title, send_to: window.__icgdGaId });
  }, [pathname, gaId]);

  return null;
}
