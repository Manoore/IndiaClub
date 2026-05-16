import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { SPONSORS } from "../data/mock";
import { Heart, DollarSign, Building2, Users, ArrowRight, Check } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const Hub = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-6">
      {[
        { to: "/sponsorship/become-sponsor", icon: Building2, title: "Become a Sponsor", text: "Partner with ICGD and reach 1000+ Indian families in Greater Dayton." },
        { to: "/sponsorship/sponsor-directory", icon: Users, title: "Sponsor Directory", text: "Browse our valued sponsor partners." },
        { to: "/sponsorship/donate", icon: Heart, title: "Donate to India Club", text: "Help us own a permanent home & continue our community programs." },
        { to: "/sponsorship/donors-directory", icon: DollarSign, title: "Donors Directory", text: "With deep gratitude, we list our generous donors." },
      ].map((c) => {
        const Icon = c.icon;
        return (
          <Link key={c.to} to={c.to} className="card-hover p-8 bg-white rounded-2xl border border-amber-100 group flex gap-5">
            <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#8B1A1A] transition"><Icon className="w-6 h-6 text-[#8B1A1A] group-hover:text-amber-100 transition" /></div>
            <div>
              <h3 className="font-display text-2xl text-stone-900 mb-1">{c.title}</h3>
              <p className="text-stone-600 mb-3">{c.text}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#8B1A1A] group-hover:text-[#E07A1F]">Explore <ArrowRight className="w-4 h-4" /></span>
            </div>
          </Link>
        );
      })}
    </div>
  </section>
);

const SPONSOR_TIERS = [
  { name: "Diamond", price: 5000, color: "#8B1A1A", perks: ["Headline logo at all events", "Full-page newsletter ad", "VIP table at Diwali Mela", "Featured banner on website"] },
  { name: "Gold", price: 2500, color: "#C9A961", perks: ["Logo at major events", "Half-page newsletter ad", "Reserved seating at Diwali", "Logo on website"] },
  { name: "Silver", price: 1000, color: "#9CA3AF", perks: ["Logo at select events", "Quarter-page newsletter", "Logo on website"] },
  { name: "Bronze", price: 500, color: "#A16207", perks: ["Mention at events", "Logo on website"] },
];

const BecomeSponsor = () => {
  const [tier, setTier] = useState(null);
  const [form, setForm] = useState({ company: "", contact: "", email: "", phone: "" });
  const { toast } = useToast();
  const submit = (e) => {
    e.preventDefault();
    const apps = JSON.parse(localStorage.getItem("icgd_sponsors") || "[]");
    apps.push({ ...form, tier: tier?.name, date: new Date().toISOString() });
    localStorage.setItem("icgd_sponsors", JSON.stringify(apps));
    toast({ title: "Thank you!", description: "Our sponsorship team will contact you within 24 hours." });
    setForm({ company: "", contact: "", email: "", phone: "" });
    setTier(null);
  };
  return (
    <section className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {SPONSOR_TIERS.map((t) => (
            <div key={t.name} className={`p-7 rounded-2xl border-2 transition cursor-pointer ${tier?.name === t.name ? "border-[#E07A1F] bg-amber-50" : "border-amber-100 bg-white"} card-hover`} onClick={() => setTier(t)}>
              <div className="w-12 h-12 rounded-full mb-4" style={{ background: t.color }} />
              <div className="font-cinzel text-xs tracking-[0.22em] text-stone-500">{t.name.toUpperCase()} TIER</div>
              <div className="font-display text-4xl text-[#8B1A1A] mt-1 mb-4">${t.price.toLocaleString()}</div>
              <ul className="space-y-2">
                {t.perks.map((p) => <li key={p} className="flex items-start gap-2 text-sm text-stone-700"><Check className="w-4 h-4 text-[#8B1A1A] mt-0.5" /><span>{p}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
        {tier && (
          <form onSubmit={submit} className="max-w-xl mx-auto bg-white p-7 rounded-2xl border border-amber-100">
            <h3 className="font-display text-2xl text-[#8B1A1A] mb-1">Sponsor as {tier.name}</h3>
            <p className="text-stone-600 mb-5">Tell us about your company and we'll be in touch.</p>
            <div className="space-y-3">
              <input required placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              <input required placeholder="Contact person" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              <button type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium">Submit Sponsorship Inquiry</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

const SponsorDirectory = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {SPONSORS.map((s) => (
          <div key={s.name} className="bg-white border border-amber-100 rounded-xl p-5 h-36 flex flex-col items-center justify-center card-hover">
            <img src={s.logo} alt={s.name} className="max-h-16 max-w-full object-contain mb-2" onError={(e) => (e.target.style.display = "none")} />
            <div className="text-xs text-stone-700 text-center">{s.name}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Donate = () => {
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState("");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const { toast } = useToast();
  const presets = [25, 50, 100, 250, 500, 1000];
  const submit = (e) => {
    e.preventDefault();
    const finalAmt = custom ? Number(custom) : amount;
    const donations = JSON.parse(localStorage.getItem("icgd_donations") || "[]");
    donations.push({ ...form, amount: finalAmt, date: new Date().toISOString() });
    localStorage.setItem("icgd_donations", JSON.stringify(donations));
    toast({ title: "Thank you for your generosity!", description: `Your contribution of $${finalAmt} helps us serve the community.` });
    setForm({ name: "", email: "", message: "" });
    setCustom("");
  };
  return (
    <section className="py-20 bg-cream">
      <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">DONATE TO OWN A PLACE</div>
          <h2 className="font-display text-3xl text-[#8B1A1A] mt-2 mb-4">Help us build a permanent home</h2>
          <p className="text-stone-700 leading-relaxed mb-4">For 58 years we've been running around venues to serve our community. With your generosity, we'll soon have a permanent home for events, classes and gatherings.</p>
          <ul className="space-y-2 text-sm text-stone-700">
            <li className="flex gap-2"><Check className="w-4 h-4 text-[#8B1A1A] mt-1" /> Tax-deductible. EIN 31-1184659.</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-[#8B1A1A] mt-1" /> 100% of contributions fund community programs.</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-[#8B1A1A] mt-1" /> Donors listed on our annual report and Honor Wall.</li>
          </ul>
        </div>
        <form onSubmit={submit} className="lg:col-span-3 bg-white p-7 rounded-2xl border border-amber-100">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-2">SELECT AMOUNT</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {presets.map((p) => (
              <button type="button" key={p} onClick={() => { setAmount(p); setCustom(""); }} className={`py-3 rounded-md border-2 font-display text-lg transition ${amount === p && !custom ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white border-stone-200 text-stone-700 hover:border-[#8B1A1A]"}`}>${p}</button>
            ))}
          </div>
          <input type="number" placeholder="Or enter custom amount" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] mb-4" />
          <div className="space-y-3">
            <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <textarea rows={3} placeholder="Optional message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          </div>
          <button type="submit" className="w-full mt-4 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium">Donate ${custom || amount}</button>
        </form>
      </div>
    </section>
  );
};

const DonorsDirectory = () => {
  const donors = [
    { name: "Anonymous Patron", amount: 25000, year: 2025, tier: "Founder" },
    { name: "Dr. Suresh & Rita Gupta", amount: 10000, year: 2025, tier: "Platinum" },
    { name: "Mehta Family Trust", amount: 7500, year: 2024, tier: "Diamond" },
    { name: "Rao Charitable Foundation", amount: 5000, year: 2024, tier: "Diamond" },
    { name: "Verma Family", amount: 2500, year: 2024, tier: "Gold" },
    { name: "Iyer Family", amount: 2500, year: 2023, tier: "Gold" },
    { name: "Patel Family", amount: 1500, year: 2023, tier: "Silver" },
    { name: "Sharma Family", amount: 1000, year: 2023, tier: "Silver" },
  ];
  return (
    <section className="py-20 bg-cream">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-[#8B1A1A] via-[#E07A1F] to-[#C9A961]" />
          <ul className="divide-y divide-amber-100">
            {donors.map((d, i) => (
              <li key={i} className="p-5 flex items-center justify-between hover:bg-amber-50/40 transition">
                <div>
                  <div className="font-display text-lg text-stone-900">{d.name}</div>
                  <div className="text-xs text-stone-500">{d.tier} • {d.year}</div>
                </div>
                <div className="font-display text-xl text-[#E07A1F]">${d.amount.toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default function SponsorshipPage() {
  const { sub } = useParams();
  const headers = {
    undefined: { eyebrow: "PARTNERSHIPS", title: "Sponsorship & Donations", subtitle: "Help us serve the Indian community of Greater Dayton.", image: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "become-sponsor": { eyebrow: "PARTNER WITH US", title: "Become a Sponsor", subtitle: "Reach 1000+ Indian-American families across Greater Dayton.", image: "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "sponsor-directory": { eyebrow: "OUR PARTNERS", title: "Sponsor Directory", image: "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    donate: { eyebrow: "DONATE", title: "Donate to India Club", subtitle: "Tax-deductible. 501(c)(3) charity.", image: "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "donors-directory": { eyebrow: "WITH GRATITUDE", title: "Our Donors", image: "https://images.unsplash.com/photo-1468234847176-28606331216a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
  };
  const h = headers[sub] || headers[undefined];
  const render = () => {
    switch (sub) {
      case "become-sponsor": return <BecomeSponsor />;
      case "sponsor-directory": return <SponsorDirectory />;
      case "donate": return <Donate />;
      case "donors-directory": return <DonorsDirectory />;
      default: return <Hub />;
    }
  };
  return (<><PageHeader {...h} />{render()}</>);
}
