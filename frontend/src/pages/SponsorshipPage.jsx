import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Heart, DollarSign, Building2, Users, ArrowRight, Check, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiClient } from "../api/client";

const SPONSOR_TIERS = [
  { name: "Diamond", price: 5000, color: "#8B1A1A", perks: ["Headline logo at all events", "Full-page newsletter ad", "VIP table at Diwali Mela", "Featured banner on website"] },
  { name: "Gold", price: 2500, color: "#C9A961", perks: ["Logo at major events", "Half-page newsletter ad", "Reserved seating at Diwali", "Logo on website"] },
  { name: "Silver", price: 1000, color: "#9CA3AF", perks: ["Logo at select events", "Quarter-page newsletter", "Logo on website"] },
  { name: "Bronze", price: 500, color: "#A16207", perks: ["Mention at events", "Logo on website"] },
];

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

const BecomeSponsor = () => {
  const [tier, setTier] = useState(null);
  const [form, setForm] = useState({ company: "", contact: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/sponsorship-inquiries", {
        company: form.company,
        contact: form.contact,
        email: form.email,
        phone: form.phone,
        tier: tier?.name || null,
        message: form.message || null,
      });
      setSubmitted(true);
      toast({ title: "Thank you!", description: "Our sponsorship team will contact you within 24 hours." });
    } catch (err) {
      toast({ title: "Couldn't send inquiry", description: err?.response?.data?.detail || "Please try again or email sponsorship@indiaclubdayton.org.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="py-24 bg-cream">
        <div className="max-w-xl mx-auto px-6 text-center" data-testid="sponsor-success">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-display text-3xl text-[#8B1A1A] mb-2">Inquiry Received!</h2>
          <p className="text-stone-600 mb-6">Our sponsorship team will reach out within 24 hours to {form.email}.</p>
          <Link to="/" className="inline-flex px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition">Back to Home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12" data-testid="sponsor-tiers">
          {SPONSOR_TIERS.map((t) => (
            <div key={t.name} onClick={() => setTier(t)} className={`p-7 rounded-2xl border-2 transition cursor-pointer ${tier?.name === t.name ? "border-[#E07A1F] bg-amber-50" : "border-amber-100 bg-white"} card-hover`} data-testid={`sponsor-tier-${t.name.toLowerCase()}`}>
              <div className="w-12 h-12 rounded-full mb-4" style={{ background: t.color }} />
              <div className="font-cinzel text-xs tracking-[0.22em] text-stone-500">{t.name.toUpperCase()} TIER</div>
              <div className="font-display text-4xl text-[#8B1A1A] mt-1 mb-4">${t.price.toLocaleString()}</div>
              <ul className="space-y-2">
                {t.perks.map((p) => <li key={p} className="flex items-start gap-2 text-sm text-stone-700"><Check className="w-4 h-4 text-[#8B1A1A] mt-0.5" /><span>{p}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="max-w-xl mx-auto bg-white p-7 rounded-2xl border border-amber-100" data-testid="sponsor-form">
          <h3 className="font-display text-2xl text-[#8B1A1A] mb-1">{tier ? `Sponsor as ${tier.name}` : "Sponsor India Club"}</h3>
          <p className="text-stone-600 mb-5">{tier ? "Tell us about your company and we'll be in touch." : "Pick a tier above (optional) and tell us about your company."}</p>
          <div className="space-y-3">
            <input data-testid="sponsor-input-company" required placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <input data-testid="sponsor-input-contact" required placeholder="Contact person" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <input data-testid="sponsor-input-email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <input data-testid="sponsor-input-phone" required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <textarea rows={3} placeholder="Tell us more (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="sponsor-input-message" />
            <button disabled={submitting} type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] disabled:opacity-70 text-amber-50 rounded-md font-medium flex items-center justify-center gap-2" data-testid="sponsor-submit">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Sending..." : "Submit Sponsorship Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

const SponsorDirectory = () => {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get("/sponsors")
      .then((r) => setSponsors(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSponsors([]))
      .finally(() => setLoading(false));
  }, []);

  // Group sponsors by tier for visual prominence
  const byTier = useMemo(() => {
    const order = ["Diamond", "Gold", "Silver", "Bronze"];
    const groups = {};
    sponsors.forEach((s) => {
      const t = s.tier || "Bronze";
      (groups[t] ||= []).push(s);
    });
    return order.filter((t) => groups[t]?.length > 0).map((t) => ({ tier: t, items: groups[t] }));
  }, [sponsors]);

  if (loading) {
    return <section className="py-20 bg-cream flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></section>;
  }
  if (sponsors.length === 0) {
    return (
      <section className="py-20 bg-cream">
        <div className="max-w-4xl mx-auto px-6 text-center text-stone-500 border border-dashed border-stone-300 rounded-xl py-12" data-testid="sponsor-directory-empty">
          We're proud to grow our sponsor family. Admin can add sponsors in Admin → Sponsors.
        </div>
      </section>
    );
  }
  return (
    <section className="py-20 bg-cream" data-testid="sponsor-directory">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {byTier.map((g) => (
          <div key={g.tier}>
            <div className="flex items-center gap-3 mb-5">
              <span className="font-cinzel text-xs tracking-[0.28em] text-[#E07A1F]">{g.tier.toUpperCase()} SPONSORS</span>
              <span className="h-px flex-1 bg-amber-100" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {g.items.map((s) => (
                <a key={s.id} href={s.website || "#"} target={s.website ? "_blank" : undefined} rel="noreferrer" className="bg-white border border-amber-100 rounded-xl p-5 h-36 flex flex-col items-center justify-center card-hover" data-testid={`sponsor-${s.id}`}>
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} className="max-h-16 max-w-full object-contain mb-2" onError={(e) => (e.target.style.display = "none")} />
                    : <Building2 className="w-8 h-8 text-stone-300 mb-2" />}
                  <div className="text-xs text-stone-700 text-center">{s.name}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Donate = () => {
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState("");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const presets = [25, 50, 100, 250, 500, 1000];

  const submit = async (e) => {
    e.preventDefault();
    const finalAmt = custom ? Number(custom) : amount;
    if (!finalAmt || finalAmt < 1) {
      toast({ title: "Invalid amount", description: "Please enter a donation amount.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/donations", {
        name: form.name,
        email: form.email,
        amount: finalAmt,
        message: form.message || null,
      });
      setSubmitted(true);
      toast({ title: "Thank you for your generosity!", description: `Your $${finalAmt} pledge is recorded. We'll email payment instructions to ${form.email}.` });
    } catch (err) {
      toast({ title: "Couldn't record donation", description: err?.response?.data?.detail || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const finalAmt = custom ? Number(custom) : amount;
    return (
      <section className="py-24 bg-cream">
        <div className="max-w-2xl mx-auto px-6" data-testid="donate-success">
          <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-display text-3xl text-[#8B1A1A] mb-2">Thank You, {form.name.split(" ")[0]}!</h2>
            <p className="text-stone-600 mb-1">Your generous pledge of <strong>${finalAmt}</strong> is recorded.</p>
            <p className="text-stone-500 text-sm mb-6">A confirmation and payment instructions (Zelle / Check / Venmo) will be emailed to <strong>{form.email}</strong> within 24 hours.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left text-sm text-stone-700 mb-6">
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-2">QUICK PAYMENT</div>
              <p>You can also pay immediately via Zelle to <strong>treasurer@indiaclubdayton.org</strong> with your name in the memo.</p>
              <p className="mt-1 text-xs text-stone-500">India Club of Greater Dayton is a 501(c)(3) — EIN 31-1184659. Your donation is tax-deductible.</p>
            </div>
            <Link to="/sponsorship/donors-directory" className="inline-flex px-5 py-2.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md text-sm font-medium transition">See our Donor Honor Roll</Link>
          </div>
        </div>
      </section>
    );
  }

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
        <form onSubmit={submit} className="lg:col-span-3 bg-white p-7 rounded-2xl border border-amber-100" data-testid="donate-form">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-2">SELECT AMOUNT</div>
          <div className="grid grid-cols-3 gap-2 mb-3" data-testid="donate-presets">
            {presets.map((p) => (
              <button type="button" key={p} onClick={() => { setAmount(p); setCustom(""); }} className={`py-3 rounded-md border-2 font-display text-lg transition ${amount === p && !custom ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white border-stone-200 text-stone-700 hover:border-[#8B1A1A]"}`} data-testid={`donate-preset-${p}`}>${p}</button>
            ))}
          </div>
          <input type="number" placeholder="Or enter custom amount" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] mb-4" data-testid="donate-custom" />
          <div className="space-y-3">
            <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="donate-input-name" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="donate-input-email" />
            <textarea rows={3} placeholder="Optional message (dedication, in honor of, etc.)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="donate-input-message" />
          </div>
          <button disabled={submitting} type="submit" className="w-full mt-4 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] disabled:opacity-70 text-white rounded-md font-medium flex items-center justify-center gap-2" data-testid="donate-submit">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Recording..." : `Donate $${custom || amount}`}
          </button>
          <p className="text-[11px] text-stone-400 text-center mt-2">No card charged. We'll email payment instructions after submission.</p>
        </form>
      </div>
    </section>
  );
};

const DonorsDirectory = () => {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("All");

  useEffect(() => {
    apiClient.get("/donors")
      .then((r) => setDonors(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDonors([]))
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => {
    const set = new Set(donors.map((d) => d.year).filter(Boolean));
    return ["All", ...Array.from(set).sort((a, b) => b - a)];
  }, [donors]);

  const filtered = useMemo(() => {
    const list = year === "All" ? donors : donors.filter((d) => d.year === year);
    return [...list].sort((a, b) => (b.amount || 0) - (a.amount || 0));
  }, [donors, year]);

  const total = useMemo(() => filtered.reduce((s, d) => s + (d.amount || 0), 0), [filtered]);

  if (loading) {
    return <section className="py-20 bg-cream flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></section>;
  }

  return (
    <section className="py-20 bg-cream" data-testid="donors-directory">
      <div className="max-w-4xl mx-auto px-6">
        {/* Honor roll header with total pledged */}
        <div className="bg-gradient-to-r from-[#8B1A1A] to-[#6f1414] rounded-2xl p-6 text-amber-50 flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">HONOR ROLL</div>
            <div className="font-display text-2xl mt-1">With deep gratitude</div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl">${total.toLocaleString()}</div>
            <div className="text-xs text-amber-100/70 font-cinzel tracking-[0.18em]">PLEDGED {year !== "All" ? `IN ${year}` : "TO DATE"}</div>
          </div>
        </div>
        {years.length > 2 && (
          <div className="flex gap-2 flex-wrap mb-5" data-testid="donors-year-filter">
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition border ${year === y ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-600 border-stone-200 hover:border-[#8B1A1A]"}`}>{y}</button>
            ))}
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-500" data-testid="donors-empty">
            No donors listed yet. <Link to="/sponsorship/donate" className="text-[#8B1A1A] underline">Be the first to contribute</Link>.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-[#8B1A1A] via-[#E07A1F] to-[#C9A961]" />
            <ul className="divide-y divide-amber-100" data-testid="donors-list">
              {filtered.map((d) => (
                <li key={d.id} className="p-5 flex items-center justify-between hover:bg-amber-50/40 transition">
                  <div>
                    <div className="font-display text-lg text-stone-900">{d.anonymous ? "Anonymous Patron" : d.name}</div>
                    <div className="text-xs text-stone-500">{d.tier} • {d.year}</div>
                  </div>
                  <div className="font-display text-xl text-[#E07A1F]">${Number(d.amount || 0).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
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
