import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Phone, Mail, LogIn } from "lucide-react";
import { NAV } from "../data/mock";
import { Button } from "./ui/button";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setOpenSubmenu(null);
  }, [location.pathname]);

  return (
    <div className="sticky top-0 z-50">
      {/* Top utility bar */}
      <div className="hidden md:block bg-[#8B1A1A] text-amber-50 text-xs">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> (937) 314-8870</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> contact@indiaclubdayton.org</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/classified/all-ads" className="hover:text-amber-200 transition">Classifieds</Link>
            <Link to="/sponsorship/donate" className="hover:text-amber-200 transition">Donate</Link>
            <Link to="/sponsorship/become-sponsor" className="hover:text-amber-200 transition">Advertise With Us</Link>
            <Link to="/login" className="flex items-center gap-1 hover:text-amber-200 transition"><LogIn className="w-3.5 h-3.5" /> Member Login</Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className={`transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-md" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 rounded-full bg-[#8B1A1A] flex items-center justify-center diya-glow">
                <span className="text-amber-100 font-cinzel font-bold text-lg">IC</span>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#E07A1F] border-2 border-white" />
              </div>
              <div className="leading-tight">
                <div className="font-display text-[#8B1A1A] text-xl tracking-wide">India Club</div>
                <div className="font-cinzel text-[10px] tracking-[0.18em] text-stone-600">OF GREATER DAYTON • EST. 1967</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <ul className="hidden lg:flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.label} className="relative group">
                  <Link to={item.to} className="flex items-center gap-1 px-3 py-2 rounded-md text-stone-800 hover:text-[#8B1A1A] font-medium text-sm transition-colors">
                    {item.label}
                    {item.children && <ChevronDown className="w-3.5 h-3.5" />}
                  </Link>
                  {item.children && (
                    <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="min-w-[240px] bg-white rounded-lg shadow-xl border border-stone-200 overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-[#8B1A1A] via-[#E07A1F] to-[#C9A961]" />
                        <ul className="py-2">
                          {item.children.map((c) => (
                            <li key={c.label}>
                              <Link to={c.to} className="block px-4 py-2 text-sm text-stone-700 hover:bg-amber-50 hover:text-[#8B1A1A] transition-colors">
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="hidden lg:flex items-center gap-2">
              <Link to="/membership/regular">
                <Button className="bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 font-medium">Join Us</Button>
              </Link>
            </div>

            {/* Mobile toggle */}
            <button onClick={() => setOpen(!open)} className="lg:hidden p-2 text-[#8B1A1A]">
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-stone-200 bg-white max-h-[80vh] overflow-y-auto">
            <ul className="px-6 py-4 space-y-1">
              {NAV.map((item) => (
                <li key={item.label}>
                  <div className="flex items-center justify-between">
                    <Link to={item.to} className="py-2 font-medium text-stone-800">{item.label}</Link>
                    {item.children && (
                      <button onClick={() => setOpenSubmenu(openSubmenu === item.label ? null : item.label)} className="p-2 text-stone-500">
                        <ChevronDown className={`w-4 h-4 transition ${openSubmenu === item.label ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                  {item.children && openSubmenu === item.label && (
                    <ul className="pl-4 mb-2 border-l-2 border-amber-200 space-y-1">
                      {item.children.map((c) => (
                        <li key={c.label}>
                          <Link to={c.to} className="block py-1.5 text-sm text-stone-600 hover:text-[#8B1A1A]">{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link to="/membership/regular" className="block mt-4 text-center bg-[#8B1A1A] text-amber-50 py-2 rounded-md">Join Us</Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}
