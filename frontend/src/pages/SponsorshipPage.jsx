import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Heart, DollarSign, Building2, Users, ArrowRight, Check, Loader2, CheckCircle2, Upload } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import PaymentMethodPicker, { startCardPayment } from "../components/PaymentMethodPicker";
import { apiClient, absoluteUrl } from "../api/client";
import Honeypot, { HONEYPOT_FIELD } from "../components/Honeypot";

const TIER_COLORS = { Platinum: "#6B7280", Gold: "#C9A961", Silver: "#9CA3AF", Bronze: "#A16207" };
const TIER_ORDER = ["Platinum", "Diamond", "Gold", "Silver", "Bronze"];

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

const EMPTY_SPONSOR = { company: "", contact_name: "", email: "", phone: "", website: "", message: "", logo_url: "", payment_method: "stripe", renewal: false };

const BecomeSponsor = () => {
  const [plans, setPlans] = useState(null);
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_SPONSOR);
  const [hp, setHp] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const { toast } = useToast();
  const cls = "w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]";

  useEffect(() => {
    apiClient.get("/sponsorship-plans").then((r) => setPlans(r.data)).catch(() => setPlans([]));
  }, []);

  const uploadLogo = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "Logo too large", description: "Please use an image under 2 MB." }); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await apiClient.post("/sponsorships/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, logo_url: absoluteUrl(r.data.url) }));
    } catch (err) {
      toast({ title: "Upload failed", description: err?.response?.data?.detail || "Try a PNG or JPG file.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!plan) { toast({ title: "Pick a sponsorship level first" }); return; }
    setSubmitting(true);
    try {
      const r = await apiClient.post("/sponsorships", { ...form, plan: plan.slug, [HONEYPOT_FIELD]: hp });
      if (form.payment_method === "stripe") {
        await startCardPayment("sponsorship", r.data.id);
        return;
      }
      setSubmitted(r.data);
    } catch (err) {
      toast({ title: "Couldn't submit", description: err?.response?.data?.detail || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="py-24 bg-cream">
        <div className="max-w-xl mx-auto px-6 text-center" data-testid="sponsor-success">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-display text-3xl text-[#8B1A1A] mb-2">Thank you, {submitted.company}!</h2>
          <p className="text-stone-600 mb-4">
            We've received your <strong>{submitted.tier}</strong> sponsorship{submitted.is_renewal ? " renewal" : ""} (${Number(submitted.amount).toLocaleString()}).
          </p>
          <div className="text-left bg-white border border-amber-100 rounded-xl p-5 text-sm text-stone-700 space-y-2 mb-6">
            {submitted.payment_method === "check" ? (
              <p><strong>Pay by check:</strong> make it payable to <em>India Club of Greater Dayton</em> and mention your company name. Our Treasurer will confirm when it arrives.</p>
            ) : (
              <p><strong>Payment:</strong> our Treasurer will contact you at {submitted.email} to arrange payment.</p>
            )}
            <p>Your logo goes live on our sponsor page as soon as payment is recorded, and your sponsorship runs through <strong>December 31</strong>.</p>
            <p>You'll also get a sponsor code for sponsor ticket pricing at our events.</p>
          </div>
          <Link to="/sponsorship/sponsor-directory" className="inline-flex px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition">See our sponsors</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        {!plans ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12" data-testid="sponsor-tiers">
            {plans.map((t) => (
              <button type="button" key={t.id} onClick={() => setPlan(t)}
                className={`text-left p-7 rounded-2xl border-2 transition ${plan?.slug === t.slug ? "border-[#E07A1F] bg-amber-50" : "border-amber-100 bg-white"} card-hover`}
                aria-pressed={plan?.slug === t.slug} data-testid={`sponsor-tier-${t.slug}`}>
                <div className="w-12 h-12 rounded-full mb-4" style={{ background: TIER_COLORS[t.name] || "#8B1A1A" }} />
                <div className="font-cinzel text-xs tracking-[0.22em] text-stone-500">{t.name.toUpperCase()} · ANNUAL</div>
                <div className="font-display text-4xl text-[#8B1A1A] mt-1 mb-4">${Number(t.price).toLocaleString()}</div>
                <ul className="space-y-2">
                  {(t.benefits || []).map((p) => <li key={p} className="flex items-start gap-2 text-sm text-stone-700"><Check className="w-4 h-4 text-[#8B1A1A] mt-0.5 flex-shrink-0" /><span>{p}</span></li>)}
                </ul>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="relative max-w-xl mx-auto bg-white p-7 rounded-2xl border border-amber-100" data-testid="sponsor-form">
          <Honeypot value={hp} onChange={setHp} />
          <h3 className="font-display text-2xl text-[#8B1A1A] mb-1">{plan ? `Sponsor as ${plan.name} — $${Number(plan.price).toLocaleString()}` : "Choose a level above"}</h3>
          <p className="text-stone-600 mb-5">Annual sponsorships run through December 31.</p>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={form.renewal} onChange={(e) => setForm({ ...form, renewal: e.target.checked })} className="accent-[#8B1A1A]" data-testid="sponsor-renewal" />
              We're renewing an existing sponsorship
            </label>
            <input data-testid="sponsor-input-company" required placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={cls} />
            <input data-testid="sponsor-input-contact" required placeholder="Contact person" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={cls} />
            <div className="grid sm:grid-cols-2 gap-3">
              <input data-testid="sponsor-input-email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={cls} />
              <input data-testid="sponsor-input-phone" required minLength={7} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={cls} />
            </div>
            <input placeholder="Website (optional)" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={cls} data-testid="sponsor-input-website" />
            <div className="flex items-center gap-3 p-3 border border-dashed border-stone-300 rounded-md">
              {form.logo_url ? <img src={form.logo_url} alt="Your logo" className="w-14 h-14 object-contain rounded bg-white border" /> : <div className="w-14 h-14 rounded bg-stone-100" />}
              <div className="text-sm">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#8B1A1A] font-medium">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {form.logo_url ? "Replace logo" : "Upload your logo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} data-testid="sponsor-logo" />
                </label>
                <div className="text-xs text-stone-500">PNG, JPG, WebP or GIF, up to 2 MB. Shown on our sponsor page.</div>
              </div>
            </div>
            <textarea rows={3} placeholder="Anything we should know? (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={cls} data-testid="sponsor-input-message" />
            <div>
              <div className="text-xs text-stone-500 mb-1.5">How will you pay?</div>
              <PaymentMethodPicker value={form.payment_method} onChange={(v) => setForm({ ...form, payment_method: v })} options={["stripe", "check", "other"]} testidPrefix="sponsor-pay" />
            </div>
            <button disabled={submitting || uploading} type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] disabled:opacity-70 text-amber-50 rounded-md font-medium flex items-center justify-center gap-2" data-testid="sponsor-submit">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Submitting..." : "Submit Sponsorship"}
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
    const order = TIER_ORDER;
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
  const [form, setForm] = useState({ name: "", email: "", message: "", payment_method: "stripe", anonymous: false });
  const [hp, setHp] = useState("");
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
      const r = await apiClient.post("/donations", {
        name: form.name,
        email: form.email,
        amount: finalAmt,
        message: form.message || null,
        payment_method: form.payment_method,
        anonymous: form.anonymous,
        [HONEYPOT_FIELD]: hp,
      });
      if (form.payment_method === "stripe") {
        await startCardPayment("donation", r.data.id);
        return;
      }
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
        <form onSubmit={submit} className="relative lg:col-span-3 bg-white p-7 rounded-2xl border border-amber-100" data-testid="donate-form">
          <Honeypot value={hp} onChange={setHp} />
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
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} className="w-4 h-4 accent-[#8B1A1A]" data-testid="donate-anonymous" /> Don't list my name publicly as a donor
            </label>
            <PaymentMethodPicker value={form.payment_method} onChange={(v) => setForm({ ...form, payment_method: v })} options={["stripe", "check"]} testidPrefix="donate-pay" />
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
