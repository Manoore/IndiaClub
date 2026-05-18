import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../api/AdminAuthContext";
import {
  LogOut, LayoutDashboard, Calendar, Newspaper, Users, Image, Building2, Heart, FileText,
  Award, Trophy, Inbox, ClipboardList, DollarSign, Tag, GraduationCap, Settings, Menu, X, Gift, Edit3, Ticket,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Members",
    items: [
      { to: "/admin/members", label: "Members", icon: Users },
      { to: "/admin/perks", label: "Member Perks", icon: Gift },
    ],
  },
  {
    label: "Site",
    items: [
      { to: "/admin/site-content", label: "Site Content", icon: Edit3 },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/events", label: "Events", icon: Calendar },
      { to: "/admin/ticket-orders", label: "Ticket Orders", icon: Ticket },
      { to: "/admin/news", label: "News", icon: Newspaper },
      { to: "/admin/exec-team", label: "Executive Team", icon: Users },
      { to: "/admin/gallery", label: "Gallery", icon: Image },
      { to: "/admin/programs", label: "Programs", icon: GraduationCap },
      { to: "/admin/past-presidents", label: "Past Presidents", icon: Award },
      { to: "/admin/awardees", label: "Awardees", icon: Trophy },
      { to: "/admin/tax-returns", label: "Tax Returns", icon: FileText },
    ],
  },
  {
    label: "Partners",
    items: [
      { to: "/admin/sponsors", label: "Sponsors", icon: Building2 },
      { to: "/admin/donors", label: "Donors", icon: Heart },
      { to: "/admin/membership-plans", label: "Membership Plans", icon: ClipboardList },
    ],
  },
  {
    label: "Submissions",
    items: [
      { to: "/admin/classifieds", label: "Classifieds", icon: Tag },
      { to: "/admin/membership-applications", label: "Applications", icon: ClipboardList },
      { to: "/admin/sponsorship-inquiries", label: "Sponsor Inquiries", icon: Building2 },
      { to: "/admin/donations", label: "Donations", icon: DollarSign },
      { to: "/admin/event-registrations", label: "Registrations", icon: Calendar },
      { to: "/admin/contact-messages", label: "Contact Inbox", icon: Inbox },
      { to: "/admin/subscribers", label: "Subscribers", icon: Users },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export default function AdminLayout({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { username, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    nav("/admin/login");
  };

  // Auto-close drawer on route change
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [loc.pathname]);

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
          data-testid="admin-sidebar-backdrop"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 w-64 bg-[#1a0e0a] text-amber-50 flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="admin-sidebar"
      >
        <div className="p-5 border-b border-amber-100/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#8B1A1A] flex items-center justify-center text-amber-100 font-cinzel font-bold text-sm">
              IC
            </div>
            <div className="leading-tight">
              <div className="font-display text-amber-100">India Club</div>
              <div className="font-cinzel text-[9px] tracking-[0.18em] text-amber-200/60">ADMIN</div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-amber-200/70 hover:text-amber-100"
            data-testid="admin-sidebar-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          {NAV_GROUPS.map((g) => (
            <div key={g.label} className="px-3 py-2">
              <div className="px-3 mb-1 font-cinzel text-[10px] tracking-[0.22em] text-amber-200/40">
                {g.label.toUpperCase()}
              </div>
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = loc.pathname === it.to;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                      active
                        ? "bg-[#8B1A1A] text-amber-100"
                        : "text-amber-50/70 hover:bg-white/5 hover:text-amber-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {it.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-amber-100/10">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <div className="text-amber-100/70">Logged in as</div>
              <div className="font-medium text-amber-100">{username || "..."}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-amber-50/70 hover:text-[#E07A1F] transition"
              title="Logout"
              data-testid="admin-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-stone-200 flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-stone-700 hover:bg-stone-100 rounded-md"
            data-testid="admin-sidebar-open"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-display text-lg text-[#8B1A1A]">India Club Admin</div>
          <button
            onClick={handleLogout}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-md"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
