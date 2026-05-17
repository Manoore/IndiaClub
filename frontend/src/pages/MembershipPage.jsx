import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { MEMBERSHIP_PLANS, REGULAR_TIERS, EXTENDED_TIERS } from "../data/mock";
import { Check, Sparkles, X, Loader2, LogIn, UserPlus } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useMemberAuth } from "../api/MemberAuthContext";
import { apiClient } from "../api/client";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
  "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
  "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const PlanCard = ({ p, onJoin }) => (
  <div
    className={`relative p-8 rounded-2xl border ${
      p.featured ? "bg-[#1a0e0a] text-amber-50 border-[#E07A1F]" : "bg-white border-amber-100"
    } card-hover`}
    data-testid={`plan-card-${p.slug}`}
  >
    {p.featured && (
      <div className="absolute -top-3 left-8 px-3 py-1 bg-[#E07A1F] text-white text-xs font-cinzel tracking-wider rounded">
        MOST POPULAR
      </div>
    )}
    <div className="font-cinzel text-xs tracking-[0.22em] mb-2 opacity-70">MEMBERSHIP</div>
    <h3 className={`font-display text-3xl mb-1 ${p.featured ? "text-amber-50" : "text-[#8B1A1A]"}`}>{p.name}</h3>
    <p className={`text-sm mb-6 ${p.featured ? "text-amber-50/70" : "text-stone-600"}`}>{p.description}</p>
    <div className="flex items-baseline gap-2 mb-6">
      {p.price > 0 ? (
        <>
          <span className="font-display text-5xl">${p.price}</span>
          <span className={`text-sm ${p.featured ? "text-amber-200" : "text-stone-500"}`}>{p.period}</span>
        </>
      ) : (
        <span className={`font-display text-2xl ${p.featured ? "text-amber-200" : "text-stone-500"}`}>{p.period}</span>
      )}
    </div>
    <ul className="space-y-3 mb-7">
      {p.benefits.map((b) => (
        <li key={b} className="flex items-start gap-2 text-sm">
          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.featured ? "text-[#E07A1F]" : "text-[#8B1A1A]"}`} />
          <span className={p.featured ? "text-amber-50/90" : "text-stone-700"}>{b}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={() => onJoin(p)}
      className={`w-full py-3 rounded-md font-medium transition ${
        p.featured ? "bg-[#E07A1F] hover:bg-[#c66c1a] text-white" : "bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50"
      }`}
      data-testid={`join-${p.slug}`}
    >
      {p.price > 0 ? "Join Now" : "Learn More"}
    </button>
  </div>
);

const LoginPrompt = ({ onClose }) => {
  const nav = useNavigate();
  const goLogin = () => {
    onClose();
    nav("/login?next=/membership");
  };
  return (
    <div className="space-y-4">
      <p className="text-stone-700">
        You need an India Club account to subscribe to a membership plan. It takes less than a minute.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={goLogin}
          className="py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium flex items-center justify-center gap-2"
          data-testid="prompt-login"
        >
          <LogIn className="w-4 h-4" /> Sign In
        </button>
        <button
          onClick={goLogin}
          className="py-3 bg-white border border-[#8B1A1A] text-[#8B1A1A] hover:bg-amber-50 rounded-md font-medium flex items-center justify-center gap-2"
          data-testid="prompt-register"
        >
          <UserPlus className="w-4 h-4" /> Register
        </button>
      </div>
    </div>
  );
};

const SubscribeForm = ({ plan, onSuccess, onClose, member }) => {
  const isStudent = plan.tier === "student";
  const [f, setF] = useState({
    address: member.address || "",
    address2: member.address2 || "",
    city: member.city || "",
    state: member.state || "OH",
    zip: member.zip || "",
    country: member.country || "United States",
    phone: member.phone || "",
    gender: member.gender || "",
    school_name: "",
    degree_program: "",
    family_count: 1,
    donation_amount: 0,
    payment_method: "paypal",
  });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const cls =
    "w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm";

  const total = Number(plan.price || 0) + Number(f.donation_amount || 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        plan: plan.slug,
        tier: plan.tier || null,
        family_count: Number(f.family_count) || 1,
        donation_amount: Number(f.donation_amount) || 0,
        payment_method: f.payment_method,
        address: f.address,
        address2: f.address2,
        city: f.city,
        state: f.state,
        zip: f.zip,
        country: f.country,
        phone: f.phone,
        gender: f.gender || null,
      };
      if (isStudent) {
        body.school_name = f.school_name;
        body.degree_program = f.degree_program;
      }
      await apiClient.post("/members/me/subscribe", body);
      toast({
        title: "Application submitted!",
        description: "We've received your subscription. Check your dashboard for payment instructions.",
      });
      onSuccess();
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err.response?.data?.detail || "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <select
          value={f.gender}
          onChange={(e) => setF({ ...f, gender: e.target.value })}
          className={cls}
          data-testid="sub-gender"
        >
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <input
          required
          placeholder="Phone"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
          className={`col-span-2 ${cls}`}
          data-testid="sub-phone"
        />
      </div>
      <input
        required
        placeholder="Address"
        value={f.address}
        onChange={(e) => setF({ ...f, address: e.target.value })}
        className={cls}
        data-testid="sub-address"
      />
      <input
        placeholder="Apt / Suite (optional)"
        value={f.address2}
        onChange={(e) => setF({ ...f, address2: e.target.value })}
        className={cls}
      />
      <div className="grid grid-cols-3 gap-3">
        <input
          required
          placeholder="City"
          value={f.city}
          onChange={(e) => setF({ ...f, city: e.target.value })}
          className={cls}
          data-testid="sub-city"
        />
        <select
          required
          value={f.state}
          onChange={(e) => setF({ ...f, state: e.target.value })}
          className={cls}
          data-testid="sub-state"
        >
          <option value="">State</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          required
          placeholder="ZIP"
          value={f.zip}
          onChange={(e) => setF({ ...f, zip: e.target.value })}
          className={cls}
          data-testid="sub-zip"
        />
      </div>

      {isStudent && (
        <div className="space-y-3 bg-amber-50/60 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-cinzel tracking-wider text-[#E07A1F]">STUDENT DETAILS</div>
          <input
            required
            placeholder="School / College Name"
            value={f.school_name}
            onChange={(e) => setF({ ...f, school_name: e.target.value })}
            className={cls}
            data-testid="sub-school"
          />
          <input
            required
            placeholder="Degree Program"
            value={f.degree_program}
            onChange={(e) => setF({ ...f, degree_program: e.target.value })}
            className={cls}
            data-testid="sub-degree"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-stone-500 block mb-1">Family count</label>
          <input
            type="number"
            min="1"
            max="20"
            value={f.family_count}
            onChange={(e) => setF({ ...f, family_count: e.target.value })}
            className={cls}
            data-testid="sub-family-count"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 block mb-1">Add a donation (optional)</label>
          <select
            value={f.donation_amount}
            onChange={(e) => setF({ ...f, donation_amount: e.target.value })}
            className={cls}
            data-testid="sub-donation"
          >
            {[0, 5, 10, 15, 20, 25, 50, 75, 100].map((v) => (
              <option key={v} value={v}>
                ${v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-stone-500 block mb-1">Payment method</label>
        <div className="grid grid-cols-3 gap-2">
          {["paypal", "check", "other"].map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setF({ ...f, payment_method: m })}
              className={`py-2.5 rounded-md text-sm font-medium border transition ${
                f.payment_method === m
                  ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]"
                  : "bg-white text-stone-700 border-stone-200 hover:border-[#8B1A1A]"
              }`}
              data-testid={`sub-pay-${m}`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500 mt-1.5">
          You'll receive payment instructions after submitting.
        </p>
      </div>

      <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-md text-sm text-stone-700 flex items-center justify-between">
        <div>
          <span className="text-stone-500">Plan:</span>{" "}
          <span className="font-medium">${plan.price}</span>
          {Number(f.donation_amount) > 0 && (
            <>
              <span className="text-stone-500 ml-3">Donation:</span>{" "}
              <span className="font-medium">${f.donation_amount}</span>
            </>
          )}
        </div>
        <div>
          <span className="text-stone-500">Total:</span>{" "}
          <span className="font-display text-xl text-[#8B1A1A]" data-testid="sub-total">
            ${total}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
        data-testid="sub-submit"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Application
      </button>
    </form>
  );
};

const JoinModal = ({ plan, onClose }) => {
  const { isAuthed, member } = useMemberAuth();
  const nav = useNavigate();
  const onSuccess = () => {
    onClose();
    nav("/member/dashboard");
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-7 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="join-modal"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">JOIN ICGD</div>
            <h3 className="font-display text-2xl text-[#8B1A1A]">{plan.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-md" data-testid="close-modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        {!isAuthed ? (
          <LoginPrompt onClose={onClose} />
        ) : (
          <SubscribeForm plan={plan} onSuccess={onSuccess} onClose={onClose} member={member} />
        )}
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
          <div
            key={t.slug}
            className={`relative p-7 rounded-2xl border-2 ${
              t.recommended ? "border-[#E07A1F] bg-amber-50/40" : "border-amber-100 bg-white"
            } card-hover`}
            data-testid={`tier-${t.slug}`}
          >
            {t.recommended && (
              <div className="absolute -top-3 left-7 px-3 py-1 bg-[#E07A1F] text-white text-xs font-cinzel tracking-wider rounded">
                RECOMMENDED
              </div>
            )}
            <div className="font-cinzel text-xs tracking-[0.22em] text-stone-500 mb-1">MEMBERSHIP</div>
            <div className="font-display text-2xl text-[#8B1A1A] mb-3">{t.name}</div>
            {t.tagline && (
              <div className="text-xs font-cinzel tracking-wider text-[#E07A1F] mb-2">{t.tagline}</div>
            )}
            <div className="font-display text-4xl text-stone-900 mb-5">
              ${t.price}
              <span className="text-base text-stone-500">.00</span>
            </div>
            <ul className="space-y-2 mb-6">
              {t.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-stone-700">
                  <Check className="w-4 h-4 mt-0.5 text-[#8B1A1A] flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() =>
                onJoin({
                  ...focusedPlan,
                  name: `${focusedPlan.name} — ${t.name}`,
                  price: t.price,
                  tier: t.slug,
                })
              }
              className="w-full py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition"
              data-testid={`signup-${t.slug}`}
            >
              Sign Up
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default function MembershipPage() {
  const { sub } = useParams();
  const [active, setActive] = useState(null);
  const { isAuthed, member } = useMemberAuth();
  const focused = MEMBERSHIP_PLANS.find((p) => p.slug === sub);
  const header = focused
    ? {
        eyebrow: "MEMBERSHIP PLAN",
        title: focused.name,
        subtitle: focused.description,
        image:
          "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
      }
    : {
        eyebrow: "JOIN US",
        title: "Membership Plans",
        subtitle:
          "Choose the plan that suits your family. Every membership funds our community programs.",
        image:
          "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
      };

  const memberStatus = isAuthed && member?.membership?.status;
  const memberBanner =
    isAuthed && memberStatus && memberStatus !== "none" ? (
      <section className="bg-[#1a0e0a] text-amber-50 py-3">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="opacity-70">Signed in as</span>{" "}
            <span className="font-medium">{member.first_name}</span>
            {memberStatus !== "none" && (
              <>
                {" "}— current status:{" "}
                <span className="font-medium uppercase text-[#E07A1F]">{memberStatus}</span>
              </>
            )}
          </div>
          <Link
            to="/member/dashboard"
            className="text-sm text-amber-200 hover:text-white underline"
            data-testid="membership-page-dashboard-link"
          >
            View my dashboard →
          </Link>
        </div>
      </section>
    ) : null;

  if (sub === "regular") {
    return (
      <>
        <PageHeader {...header} />
        {memberBanner}
        <TierGrid tiers={REGULAR_TIERS} onJoin={setActive} focusedPlan={focused} />
        {active && <JoinModal plan={active} onClose={() => setActive(null)} />}
      </>
    );
  }
  if (sub === "extended") {
    return (
      <>
        <PageHeader {...header} />
        {memberBanner}
        <TierGrid tiers={EXTENDED_TIERS} onJoin={setActive} focusedPlan={focused} />
        {active && <JoinModal plan={active} onClose={() => setActive(null)} />}
      </>
    );
  }
  if (sub === "honorary") {
    return (
      <>
        <PageHeader {...header} />
        {memberBanner}
        <section className="py-20 bg-cream">
          <div className="max-w-3xl mx-auto px-6 bg-white p-10 rounded-2xl border border-amber-100">
            <p className="text-stone-700 leading-relaxed font-serif text-lg mb-5">
              India Club recognizes Individuals with "Honorary Members" who have contributed to the cause and
              well-being of the Asian Indian Community.
            </p>
            <ul className="space-y-3 mb-6">
              {focused.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-stone-700">
                  <Check className="w-5 h-5 text-[#8B1A1A] mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">HOW TO BE NOMINATED</div>
              <p className="text-stone-700 mt-2 text-sm">
                Please email the President of India Club at{" "}
                <a
                  href="mailto:president@indiaclubdayton.org"
                  className="text-[#8B1A1A] hover:text-[#E07A1F] font-medium"
                >
                  president@indiaclubdayton.org
                </a>{" "}
                to discuss in the executive team meeting.
              </p>
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
        {memberBanner}
        <section className="py-20 bg-cream">
          <div className="max-w-3xl mx-auto px-6">
            <div className="bg-[#1a0e0a] text-amber-50 p-10 rounded-2xl">
              <div className="font-cinzel text-xs tracking-[0.28em] text-[#E07A1F] mb-2">PREMIUM TIER</div>
              <h3 className="font-display text-3xl mb-2">Business Membership</h3>
              <div className="font-display text-5xl text-[#E07A1F] mt-4">$250.00</div>
              <ul className="space-y-3 mt-7">
                {focused.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[#E07A1F] mt-0.5 flex-shrink-0" />
                    <span className="text-amber-50/90">{b}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setActive({ ...focused, tier: "business" })}
                className="w-full mt-7 py-3.5 bg-[#E07A1F] hover:bg-[#c66c1a] text-white rounded-md font-medium transition"
                data-testid="signup-business"
              >
                Sign Up Now
              </button>
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
      {memberBanner}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MEMBERSHIP_PLANS.map((p) => (
            <PlanCard key={p.slug} p={p} onJoin={setActive} />
          ))}
        </div>
      </section>
      {active && <JoinModal plan={active} onClose={() => setActive(null)} />}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Sparkles className="w-8 h-8 text-[#E07A1F] mx-auto mb-3" />
          <h3 className="font-display text-3xl text-[#8B1A1A] mb-3">Why join India Club?</h3>
          <p className="text-stone-600 leading-relaxed max-w-2xl mx-auto">
            Members enjoy discounted tickets to all our cultural events, voting rights at the AGM, a quarterly
            newsletter, and the unmatched joy of belonging to a 1000+ family Indian community in the heart of Ohio.
          </p>
        </div>
      </section>
    </>
  );
}
