import React, { useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { MEMBERSHIP_PLANS, REGULAR_TIERS, EXTENDED_TIERS } from "../data/mock";
import { Check, Sparkles, X } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const PlanCard = ({ p, onJoin }) => (
  <div className={`relative p-8 rounded-2xl border ${p.featured ? "bg-[#1a0e0a] text-amber-50 border-[#E07A1F]" : "bg-white border-amber-100"} card-hover`}>
    {p.featured && <div className="absolute -top-3 left-8 px-3 py-1 bg-[#E07A1F] text-white text-xs font-cinzel tracking-wider rounded">MOST POPULAR</div>}
    <div className="font-cinzel text-xs tracking-[0.22em] mb-2 opacity-70">MEMBERSHIP</div>
    <h3 className={`font-display text-3xl mb-1 ${p.featured ? "text-amber-50" : "text-[#8B1A1A]"}`}>{p.name}</h3>
    <p className={`text-sm mb-6 ${p.featured ? "text-amber-50/70" : "text-stone-600"}`}>{p.description}</p>
    <div className="flex items-baseline gap-2 mb-6">
      {p.price > 0 ? (<><span className="font-display text-5xl">${p.price}</span><span className={`text-sm ${p.featured ? "text-amber-200" : "text-stone-500"}`}>{p.period}</span></>) : (<span className={`font-display text-2xl ${p.featured ? "text-amber-200" : "text-stone-500"}`}>{p.period}</span>)}
    </div>
    <ul className="space-y-3 mb-7">
      {p.benefits.map((b) => (
        <li key={b} className="flex items-start gap-2 text-sm">
          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.featured ? "text-[#E07A1F]" : "text-[#8B1A1A]"}`} />
          <span className={p.featured ? "text-amber-50/90" : "text-stone-700"}>{b}</span>
        </li>
      ))}
    </ul>
    <button onClick={() => onJoin(p)} className={`w-full py-3 rounded-md font-medium transition ${p.featured ? "bg-[#E07A1F] hover:bg-[#c66c1a] text-white" : "bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50"}`}>{p.price > 0 ? "Join Now" : "Learn More"}</button>
  </div>
);

const JoinModal = ({ plan, onClose }) => {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", address: "", family: 1 });
  const { toast } = useToast();
  const submit = (e) => {
    e.preventDefault();
    const apps = JSON.parse(localStorage.getItem("icgd_apps") || "[]");
    apps.push({ ...form, plan: plan.slug, date: new Date().toISOString() });
    localStorage.setItem("icgd_apps", JSON.stringify(apps));
    toast({ title: "Application submitted!", description: `Welcome to ICGD. We'll contact you within 48 hours.` });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-7 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">JOIN ICGD</div>
            <h3 className="font-display text-2xl text-[#8B1A1A]">{plan.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-md"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          </div>
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          <input placeholder="Mailing address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          <input type="number" min="1" max="10" placeholder="Family members" value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-md text-sm text-stone-700">
            <span className="font-medium">Total: </span><span className="font-display text-xl text-[#8B1A1A]">${plan.price}</span>
          </div>
          <button type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition">Submit Application</button>
        </form>
      </div>
    </div>
  );
};

const TierGrid = ({ tiers, onJoin, focusedPlan }) => (
  <section className="py-20 bg-cream">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-12">
        <div className="font-cinzel text-xs tracking-[0.28em] text-[#E07A1F]">CHOOSE YOUR TIER</div>
        <h2 className="font-display text-4xl text-[#8B1A1A] mt-2">{focusedPlan.name}</h2>
        <p className="text-stone-600 mt-3 max-w-2xl mx-auto font-serif">{focusedPlan.description}</p>
      </div>
      <div className={`grid md:grid-cols-2 ${tiers.length === 4 ? "lg:grid-cols-4" : ""} gap-5`}>
        {tiers.map((t) => (
          <div key={t.slug} className={`relative p-7 rounded-2xl border-2 ${t.recommended ? "border-[#E07A1F] bg-amber-50/40" : "border-amber-100 bg-white"} card-hover`}>
            {t.recommended && <div className="absolute -top-3 left-7 px-3 py-1 bg-[#E07A1F] text-white text-xs font-cinzel tracking-wider rounded">RECOMMENDED</div>}
            <div className="font-cinzel text-xs tracking-[0.22em] text-stone-500 mb-1">MEMBERSHIP</div>
            <div className="font-display text-2xl text-[#8B1A1A] mb-3">{t.name}</div>
            {t.tagline && <div className="text-xs font-cinzel tracking-wider text-[#E07A1F] mb-2">{t.tagline}</div>}
            <div className="font-display text-4xl text-stone-900 mb-5">${t.price}<span className="text-base text-stone-500">.00</span></div>
            <ul className="space-y-2 mb-6">
              {t.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-stone-700">
                  <Check className="w-4 h-4 mt-0.5 text-[#8B1A1A] flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => onJoin({ ...focusedPlan, name: `${focusedPlan.name} — ${t.name}`, price: t.price })} className="w-full py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition">Sign Up</button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default function MembershipPage() {
  const { sub } = useParams();
  const [active, setActive] = useState(null);
  const focused = MEMBERSHIP_PLANS.find((p) => p.slug === sub);
  const header = focused
    ? { eyebrow: "MEMBERSHIP PLAN", title: focused.name, subtitle: focused.description, image: "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" }
    : { eyebrow: "JOIN US", title: "Membership Plans", subtitle: "Choose the plan that suits your family. Every membership funds our community programs.", image: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" };

  if (sub === "regular") {
    return (<><PageHeader {...header} /><TierGrid tiers={REGULAR_TIERS} onJoin={setActive} focusedPlan={focused} />{active && <JoinModal plan={active} onClose={() => setActive(null)} />}</>);
  }
  if (sub === "extended") {
    return (<><PageHeader {...header} /><TierGrid tiers={EXTENDED_TIERS} onJoin={setActive} focusedPlan={focused} />{active && <JoinModal plan={active} onClose={() => setActive(null)} />}</>);
  }
  if (sub === "honorary") {
    return (
      <>
        <PageHeader {...header} />
        <section className="py-20 bg-cream">
          <div className="max-w-3xl mx-auto px-6 bg-white p-10 rounded-2xl border border-amber-100">
            <p className="text-stone-700 leading-relaxed font-serif text-lg mb-5">India Club recognizes Individuals with "Honorary Members" who have contributed to the cause and well-being of the Asian Indian Community.</p>
            <ul className="space-y-3 mb-6">
              {focused.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-stone-700"><Check className="w-5 h-5 text-[#8B1A1A] mt-0.5 flex-shrink-0" /><span>{b}</span></li>
              ))}
            </ul>
            <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">HOW TO BE NOMINATED</div>
              <p className="text-stone-700 mt-2 text-sm">Please email the President of India Club at <a href="mailto:president@indiaclubdayton.org" className="text-[#8B1A1A] hover:text-[#E07A1F] font-medium">president@indiaclubdayton.org</a> to discuss in the executive team meeting.</p>
            </div>
          </div>
        </section>
      </>
    );
  }
  if (sub === "business") {
    return (
      <>
        <PageHeader {...header} />
        <section className="py-20 bg-cream">
          <div className="max-w-3xl mx-auto px-6">
            <div className="bg-[#1a0e0a] text-amber-50 p-10 rounded-2xl">
              <div className="font-cinzel text-xs tracking-[0.28em] text-[#E07A1F] mb-2">PREMIUM TIER</div>
              <h3 className="font-display text-3xl mb-2">Business Membership</h3>
              <div className="font-display text-5xl text-[#E07A1F] mt-4">$250.00</div>
              <ul className="space-y-3 mt-7">
                {focused.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2"><Check className="w-5 h-5 text-[#E07A1F] mt-0.5 flex-shrink-0" /><span className="text-amber-50/90">{b}</span></li>
                ))}
              </ul>
              <button onClick={() => setActive(focused)} className="w-full mt-7 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition">Sign Up Now</button>
            </div>
          </div>
        </section>
        {active && <JoinModal plan={active} onClose={() => setActive(null)} />}
      </>
    );
  }

  return (
    <>
      <PageHeader {...header} />
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MEMBERSHIP_PLANS.map((p) => <PlanCard key={p.slug} p={p} onJoin={setActive} />)}
        </div>
      </section>
      {active && <JoinModal plan={active} onClose={() => setActive(null)} />}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Sparkles className="w-8 h-8 text-[#E07A1F] mx-auto mb-3" />
          <h3 className="font-display text-3xl text-[#8B1A1A] mb-3">Why join India Club?</h3>
          <p className="text-stone-600 leading-relaxed max-w-2xl mx-auto">Members enjoy discounted tickets to all our cultural events, voting rights at the AGM, a quarterly newsletter, and the unmatched joy of belonging to a 1000+ family Indian community in the heart of Ohio.</p>
        </div>
      </section>
    </>
  );
}
