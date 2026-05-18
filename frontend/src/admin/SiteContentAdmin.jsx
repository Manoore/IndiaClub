import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { Loader2, Save, Home as HomeIcon, Info, Phone as PhoneIcon, Share2, Footprints } from "lucide-react";

const TABS = [
  { id: "general", label: "General", icon: Info },
  { id: "hero", label: "Home Hero", icon: HomeIcon },
  { id: "stats", label: "Stats", icon: Info },
  { id: "about", label: "About / Why Join", icon: Info },
  { id: "contact", label: "Contact", icon: PhoneIcon },
  { id: "social", label: "Social", icon: Share2 },
  { id: "footer", label: "Footer", icon: Footprints },
];

const FIELDS = {
  general: [
    { k: "site_name", label: "Site Name" },
    { k: "honorary_contact_email", label: "Honorary Nomination Email" },
  ],
  hero: [
    { k: "home_hero_eyebrow", label: "Eyebrow Text (e.g. SINCE 1967)" },
    { k: "home_hero_title", label: "Hero Title" },
    { k: "home_hero_subtitle", label: "Hero Subtitle", textarea: true, rows: 3 },
    { k: "home_hero_cta_primary", label: "Primary Button Text" },
    { k: "home_hero_cta_secondary", label: "Secondary Button Text" },
    { k: "home_hero_image", label: "Hero Background Image URL" },
  ],
  stats: [
    { k: "home_stat_1_value", label: "Stat 1 — Value (e.g. 1967)" },
    { k: "home_stat_1_label", label: "Stat 1 — Label" },
    { k: "home_stat_2_value", label: "Stat 2 — Value (e.g. 1000+)" },
    { k: "home_stat_2_label", label: "Stat 2 — Label" },
    { k: "home_stat_3_value", label: "Stat 3 — Value (e.g. 40+)" },
    { k: "home_stat_3_label", label: "Stat 3 — Label" },
  ],
  about: [
    { k: "home_why_join_title", label: 'Why Join Section — Title' },
    { k: "home_why_join_text", label: 'Why Join Section — Text', textarea: true, rows: 4 },
    { k: "about_mission", label: "About Page — Mission", textarea: true, rows: 4 },
    { k: "about_history", label: "About Page — History", textarea: true, rows: 4 },
  ],
  contact: [
    { k: "contact_email", label: "Contact Email" },
    { k: "contact_phone", label: "Contact Phone" },
    { k: "contact_address", label: "Contact Address" },
  ],
  social: [
    { k: "social_facebook", label: "Facebook URL", placeholder: "https://facebook.com/..." },
    { k: "social_twitter", label: "Twitter / X URL", placeholder: "https://twitter.com/..." },
    { k: "social_instagram", label: "Instagram URL", placeholder: "https://instagram.com/..." },
    { k: "social_youtube", label: "YouTube URL", placeholder: "https://youtube.com/..." },
  ],
  footer: [
    { k: "footer_tagline", label: "Footer Tagline", textarea: true, rows: 2 },
    { k: "footer_copyright", label: "Copyright Notice" },
  ],
};

export default function SiteContentAdmin() {
  const [tab, setTab] = useState("general");
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    apiClient.get("/admin/site-settings").then((r) => setSettings(r.data));
  }, []);

  if (!settings) {
    return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>;
  }

  const handleSave = async () => {
    setBusy(true);
    try {
      // Send only fields in current tab to keep payloads small (and avoid stomping unrelated edits)
      const payload = {};
      FIELDS[tab].forEach((f) => { payload[f.k] = settings[f.k] ?? ""; });
      const r = await apiClient.put("/admin/site-settings", payload);
      setSettings(r.data);
      toast({ title: "Saved", description: "Site content updated. Refresh public pages to see changes." });
    } catch (e) {
      toast({ title: "Save failed", description: e.response?.data?.detail || "Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Site Content</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Edit text and imagery shown across the public website. Changes save instantly; refresh the page to verify.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition border ${
              tab === t.id
                ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]"
                : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"
            }`}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        {FIELDS[tab].map((f) => (
          <div key={f.k}>
            <label className="block text-xs uppercase tracking-wider text-stone-500 font-medium mb-1.5">
              {f.label}
            </label>
            {f.textarea ? (
              <textarea
                value={settings[f.k] ?? ""}
                onChange={(e) => setSettings({ ...settings, [f.k]: e.target.value })}
                rows={f.rows || 3}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
                data-testid={`field-${f.k}`}
              />
            ) : (
              <input
                value={settings[f.k] ?? ""}
                onChange={(e) => setSettings({ ...settings, [f.k]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
                data-testid={`field-${f.k}`}
              />
            )}
          </div>
        ))}
        <div className="pt-3 border-t border-stone-100">
          <button
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium disabled:opacity-60"
            data-testid="save-settings"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
