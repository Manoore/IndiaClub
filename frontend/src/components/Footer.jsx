import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, Facebook, Instagram, Youtube, MapPin, ArrowRight } from "lucide-react";
import { VISITOR_COUNT } from "../data/mock";
import { useToast } from "../hooks/use-toast";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const subscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    const subs = JSON.parse(localStorage.getItem("icgd_subs") || "[]");
    subs.push({ email, date: new Date().toISOString() });
    localStorage.setItem("icgd_subs", JSON.stringify(subs));
    toast({ title: "You're subscribed!", description: "Watch your inbox for ICGD news, events and stories." });
    setEmail("");
  };

  return (
    <footer className="relative mt-24">
      {/* Decorative top divider */}
      <div className="h-1.5 bg-gradient-to-r from-[#8B1A1A] via-[#E07A1F] to-[#C9A961]" />
      <div className="bg-[#1a0e0a] text-amber-50/90">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-4 gap-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#8B1A1A] flex items-center justify-center diya-glow">
                <span className="text-amber-100 font-cinzel font-bold">IC</span>
              </div>
              <div className="leading-tight">
                <div className="font-display text-amber-100 text-lg">India Club</div>
                <div className="font-cinzel text-[9px] tracking-[0.18em] text-amber-200/60">OF GREATER DAYTON</div>
              </div>
            </div>
            <p className="text-sm text-amber-50/70 leading-relaxed">
              A Registered, Tax Exempt 501(c)(3) non-profit serving the Cultural, Charity, Educational and Welfare needs of the Asian Indian community in Greater Dayton since 1967.
            </p>
            <div className="mt-4 text-xs text-amber-100/60">Tax ID/EIN: 31-1184659</div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg text-amber-100 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/membership/regular" className="hover:text-[#E07A1F]">Become a Member</Link></li>
              <li><Link to="/membership/business" className="hover:text-[#E07A1F]">Business Membership</Link></li>
              <li><Link to="/events/upcoming" className="hover:text-[#E07A1F]">Upcoming Events</Link></li>
              <li><Link to="/sponsorship/become-sponsor" className="hover:text-[#E07A1F]">Sponsor Us</Link></li>
              <li><Link to="/sponsorship/donate" className="hover:text-[#E07A1F]">Donate</Link></li>
              <li><Link to="/about/past-presidents" className="hover:text-[#E07A1F]">Past Presidents</Link></li>
              <li><Link to="/about/constitution" className="hover:text-[#E07A1F]">Constitution &amp; Bylaws</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg text-amber-100 mb-4">Connect</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><Phone className="w-4 h-4 mt-0.5 text-[#E07A1F]" /> (937) 314-8870</li>
              <li className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 text-[#E07A1F]" /> contact@indiaclubdayton.org</li>
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-[#E07A1F]" /> Greater Dayton, OH</li>
            </ul>
            <div className="flex gap-3 mt-5">
              <a href="#" className="w-9 h-9 rounded-full border border-amber-100/20 flex items-center justify-center hover:bg-[#8B1A1A] hover:border-[#8B1A1A] transition"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-full border border-amber-100/20 flex items-center justify-center hover:bg-[#8B1A1A] hover:border-[#8B1A1A] transition"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-full border border-amber-100/20 flex items-center justify-center hover:bg-[#8B1A1A] hover:border-[#8B1A1A] transition"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display text-lg text-amber-100 mb-4">Newsletter</h4>
            <p className="text-sm text-amber-50/70 mb-3">Sign up for our News &amp; Events.</p>
            <form onSubmit={subscribe} className="flex bg-amber-50/5 rounded-md overflow-hidden border border-amber-100/20">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="bg-transparent flex-1 px-3 py-2 text-sm outline-none placeholder:text-amber-100/40" />
              <button type="submit" className="px-3 bg-[#E07A1F] text-white hover:bg-[#c66c1a]"><ArrowRight className="w-4 h-4" /></button>
            </form>
            <div className="mt-6 text-xs text-amber-100/50">
              <div className="font-medium text-amber-100/70 mb-1">Visitor Count</div>
              <div className="flex flex-wrap gap-3">
                <span>Today: {VISITOR_COUNT.today}</span>
                <span>Yesterday: {VISITOR_COUNT.yesterday}</span>
                <span>Week: {VISITOR_COUNT.thisWeek}</span>
                <span>Month: {VISITOR_COUNT.thisMonth}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-amber-100/10">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-amber-100/50">
            <span>© 1967 – {new Date().getFullYear()} India Club of Greater Dayton (ICGD). All Rights Reserved.</span>
            <div className="flex flex-wrap gap-4">
              <Link to="/about/privacy" className="hover:text-[#E07A1F]">Privacy Policy</Link>
              <Link to="/about/terms" className="hover:text-[#E07A1F]">Terms &amp; Conditions</Link>
              <Link to="/about/disclaimer" className="hover:text-[#E07A1F]">Disclaimer</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
