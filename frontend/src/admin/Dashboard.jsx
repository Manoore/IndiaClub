import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { Users, Inbox, DollarSign, Calendar, ClipboardList, Building2, Newspaper, Image, Tag, Award } from "lucide-react";

const CARDS = [
  { key: "members", label: "Membership Apps", icon: ClipboardList, color: "#8B1A1A" },
  { key: "subscribers", label: "Newsletter Subs", icon: Users, color: "#E07A1F" },
  { key: "donations", label: "Donations", icon: DollarSign, color: "#2E5E3E" },
  { key: "contact", label: "Contact Inbox", icon: Inbox, color: "#C9A961" },
  { key: "events", label: "Events", icon: Calendar, color: "#8B1A1A" },
  { key: "news", label: "News", icon: Newspaper, color: "#E07A1F" },
  { key: "gallery", label: "Gallery", icon: Image, color: "#C9A961" },
  { key: "sponsors", label: "Sponsors", icon: Building2, color: "#2E5E3E" },
  { key: "classifieds_pending", label: "Pending Ads", icon: Tag, color: "#8B1A1A" },
  { key: "registrations", label: "Event Registrations", icon: Award, color: "#E07A1F" },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get("/admin/stats").then((r) => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-4xl text-stone-900">Dashboard</h1>
        <p className="text-stone-500 mt-1">Quick snapshot of everything happening at India Club.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="p-5 bg-white border border-stone-200 rounded-xl card-hover">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${c.color}1A` }}>
                <Icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <div className="font-display text-3xl text-stone-900">{loading ? "—" : (stats[c.key] ?? 0)}</div>
              <div className="text-xs text-stone-500 mt-1">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 grid lg:grid-cols-2 gap-5">
        <div className="p-6 bg-gradient-to-br from-[#8B1A1A] to-[#6f1414] text-amber-50 rounded-2xl">
          <h3 className="font-display text-2xl mb-2">Welcome back!</h3>
          <p className="text-amber-50/80">You're managing India Club of Greater Dayton. Browse the sidebar to manage content, partners, and review submissions.</p>
          <div className="mt-5 flex gap-2 flex-wrap">
            <a href="/admin/events" className="px-4 py-2 bg-[#E07A1F] hover:bg-[#c66c1a] rounded text-sm font-medium transition">Manage Events</a>
            <a href="/admin/classifieds" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm font-medium transition">Review Pending Ads</a>
          </div>
        </div>
        <div className="p-6 bg-white border border-stone-200 rounded-2xl">
          <h3 className="font-display text-xl text-[#8B1A1A] mb-3">Quick Tips</h3>
          <ul className="space-y-2 text-sm text-stone-700">
            <li>• Upload images directly from edit screens — they're stored in MongoDB.</li>
            <li>• Use the Search box on every page to quickly filter records.</li>
            <li>• Change your password under <strong>Settings</strong>.</li>
            <li>• Submissions are saved permanently — delete only when sure.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
