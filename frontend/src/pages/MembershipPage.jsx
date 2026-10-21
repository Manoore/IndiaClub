import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Check, Sparkles, X, Loader2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useToast } from "../hooks/use-toast";
import { useMemberAuth } from "../api/MemberAuthContext";
import { apiClient } from "../api/client";
import MembershipTermNote, { fmtLongDate } from "../components/MembershipTermNote";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
  "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
  "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

// Returns { label, action, disabled } based on auth + membership state
const getPlanCta = (plan, { isAuthed, member }) => {
  if (plan.slug === "free") {
    const m = member?.membership || {};
    if (isAuthed && m.status === "active" && m.plan === "free") return { label: "Your Current Plan", action: "dashboard", disabled: true };
    if (isAuthed && m.status === "active") return { label: "Included in your membership", action: "dashboard", disabled: true };
    return { label: "Join Free", action: "join" };
  }
  if (plan.price <= 0) return { label: "Learn More", action: "join" };
  if (!isAuthed) return { label: "Sign Up to Join", action: "join" };

  const ms = member?.membership || {};
  const status = ms.status || "none";
  const samePlan = ms.plan === plan.slug;

  if (status === "active" && samePlan) {
    return { label: "Your Current Plan", action: "dashboard", disabled: true };
  }
  if (status === "active" && !samePlan) {
    return { label: "Upgrade / Switch", action: "join" };
  }
  if (status === "pending" && samePlan) {
    return { label: "Application Pending", action: "dashboard", disabled: true };
  }
  if (status === "pending" && !samePlan) {
    return { label: "Switch Plan", action: "join" };
  }
  if (status === "expired") return { label: "Renew Now", action: "join" };
  if (status === "rejected") return { label: "Re-apply", action: "join" };
  return { label: "Subscribe Now", action: "join" };
};

const PlanCard = ({ p, onJoin, authState, navigate }) => {
  const cta = getPlanCta(p, authState);
  const handleClick = () => {
    if (cta.action === "dashboard") navigate("/member/dashboard");
    else onJoin(p);
  };
  return (
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
      onClick={handleClick}
      disabled={cta.disabled}
      className={`w-full py-3 rounded-md font-medium transition ${
        cta.disabled
          ? "bg-stone-200 text-stone-500 cursor-not-allowed"
          : p.featured
          ? "bg-[#E07A1F] hover:bg-[#c66c1a] text-white"
          : "bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50"
      }`}
      data-testid={`join-${p.slug}`}
    >
      {cta.label}
    </button>
  </div>
  );
};

// Free tier: its own band above the paid plans
const FreeMemberSection = ({ plan, onJoin, authState, navigate }) => {
  const cta = getPlanCta(plan, authState);
  return (
    <section className="pt-16 bg-cream" data-testid="free-member-section">
      <div className="max-w-7xl mx-auto px-6">
        <div className="rounded-2xl border border-amber-200 bg-white p-6 md:p-8 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="lg:w-64 flex-shrink-0">
            <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">START HERE</div>
            <h3 className="font-display text-3xl text-[#8B1A1A]">{plan.name}</h3>
            <div className="font-display text-4xl text-stone-900 mt-1">Free <span className="text-sm font-sans text-stone-500">{plan.period}</span></div>
          </div>
          <ul className="flex-1 grid sm:grid-cols-3 gap-3">
            {plan.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-stone-700"><Check className="w-4 h-4 mt-0.5 text-[#8B1A1A] flex-shrink-0" />{b}</li>
            ))}
          </ul>
          <div className="lg:w-56 flex-shrink-0">
            <button
              onClick={() => (cta.action === "dashboard" ? navigate("/member/dashboard") : onJoin(plan))}
              disabled={cta.disabled}
              className={`w-full py-3 rounded-md font-medium transition ${cta.disabled ? "bg-stone-200 text-stone-500 cursor-not-allowed" : "bg-[#E07A1F] hover:bg-[#c66c1a] text-white"}`}
              data-testid="join-free"
            >
              {cta.label}
            </button>
            <p className="text-xs text-stone-500 mt-2 text-center">Want member pricing on events? Choose a paid plan below.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const FreeJoinForm = ({ plan, onSuccess, guest, ensureAccount, accountFields }) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (guest && !(await ensureAccount())) return;
      await apiClient.post("/members/me/subscribe", { plan: "free", payment_method: "none" });
      toast({ title: "Welcome to India Club! 🎉", description: "You're now a free member. Upgrade anytime for member pricing." });
      await onSuccess();
    } catch (err) {
      toast({ title: "Couldn't join", description: err.response?.data?.detail || "Please try again." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={join} className="space-y-4" data-testid="free-join-form">
      {accountFields}
      <ul className="space-y-2">
        {plan.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-stone-700"><Check className="w-4 h-4 mt-0.5 text-[#8B1A1A]" />{b}</li>
        ))}
      </ul>
      <p className="text-sm text-stone-600">No payment needed and it never expires. You can upgrade to a paid plan at any time for member pricing on events.</p>
      <button type="submit" disabled={busy} className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium disabled:opacity-60 flex items-center justify-center gap-2" data-testid="free-join-submit">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {guest ? "Create account & join free" : "Join for free"}
      </button>
    </form>
  );
};

// Account details collected inside the join form, so visitors sign up and subscribe in one go
const AccountFields = ({ acct, setAcct, error, onGoogle }) => {
  const cls = "w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm";
  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3" data-testid="account-fields">
      <div className="text-xs font-cinzel tracking-wider text-[#E07A1F]">YOUR ACCOUNT</div>
      <div className="flex justify-center">
        <GoogleLogin onSuccess={(resp) => onGoogle(resp.credential)} onError={() => onGoogle(null)} text="continue_with" width="300" shape="rectangular" />
      </div>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-stone-400">
        <span className="flex-1 border-t border-stone-200" /> or <span className="flex-1 border-t border-stone-200" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="First name" value={acct.first_name} onChange={(e) => setAcct({ ...acct, first_name: e.target.value })} className={cls} autoComplete="given-name" data-testid="acct-first" />
        <input required placeholder="Last name" value={acct.last_name} onChange={(e) => setAcct({ ...acct, last_name: e.target.value })} className={cls} autoComplete="family-name" data-testid="acct-last" />
      </div>
      <input required type="email" placeholder="Email" value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} className={cls} autoComplete="email" data-testid="acct-email" />
      <input required type="password" minLength={6} placeholder="Create a password (6+ characters)" value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} className={cls} autoComplete="new-password" data-testid="acct-password" />
      {error ? (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2" role="alert" data-testid="acct-error">{error}</div>
      ) : (
        <p className="text-xs text-stone-500">Already have an account? Enter your email and existing password and we'll sign you in.</p>
      )}
    </div>
  );
};

const SubscribeForm = ({ plan, onSuccess, onClose, member: memberProp, guest, ensureAccount, accountFields }) => {
  const member = memberProp || {};
  // Plans with tiers are chosen right here (recommended tier preselected) — no extra page
  const tiers = plan.tiers || [];
  const [tierSlug, setTierSlug] = useState(
    plan.tier || (tiers.find((t) => t.recommended) || tiers[0] || {}).slug || null
  );
  const tierObj = tiers.find((t) => t.slug === tierSlug);
  const price = tierObj ? tierObj.price : plan.price;
  const isStudent = tierSlug === "student";
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
  const [quote, setQuote] = useState(null);
  const { toast } = useToast();
  const cls =
    "w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm";

  useEffect(() => {
    apiClient
      .get("/membership/quote", { params: { plan: plan.slug, tier: tierSlug || undefined } })
      .then((r) => setQuote(r.data))
      .catch(() => setQuote(null));
  }, [plan.slug, tierSlug]);

  const total = Number(price || 0) + Number(f.donation_amount || 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Visitors: create (or sign in to) the account first, then subscribe in the same click
      if (guest && !(await ensureAccount({ phone: f.phone }))) return;
      const body = {
        plan: plan.slug,
        tier: tierSlug || null,
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
      const r = await apiClient.post("/members/me/subscribe", body);
      const end = r.data?.membership?.end_date;
      toast({
        title: "Welcome to India Club! 🎉",
        description: `Your membership is active${end ? ` through ${fmtLongDate(end)}` : ""}. Check your dashboard for payment instructions.`,
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
      {accountFields}
      {tiers.length > 0 && (
        <div>
          <label className="text-xs text-stone-500 block mb-1.5">Membership type</label>
          <div className={`grid gap-2 ${tiers.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`} role="radiogroup" data-testid="sub-tier-picker">
            {tiers.map((t) => (
              <button
                type="button"
                key={t.slug}
                role="radio"
                aria-checked={tierSlug === t.slug}
                onClick={() => setTierSlug(t.slug)}
                className={`relative p-2.5 rounded-md border text-left transition ${
                  tierSlug === t.slug
                    ? "border-[#8B1A1A] bg-[#8B1A1A] text-amber-50"
                    : "border-stone-200 bg-white text-stone-800 hover:border-[#8B1A1A]"
                }`}
                data-testid={`sub-tier-${t.slug}`}
              >
                <div className="text-sm font-medium leading-tight">{t.name}</div>
                <div className={`text-xs ${tierSlug === t.slug ? "text-amber-100" : "text-stone-500"}`}>${t.price}</div>
                {t.recommended && (
                  <span className={`absolute top-1 right-1.5 text-[9px] font-cinzel tracking-wider ${tierSlug === t.slug ? "text-amber-200" : "text-[#E07A1F]"}`}>POPULAR</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
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
          <div className="text-xs font-cinzel tracking-wider text-[#E07A1F]">YOUTH DETAILS</div>
          <input
            required
            placeholder="School / College name"
            value={f.school_name}
            onChange={(e) => setF({ ...f, school_name: e.target.value })}
            className={cls}
            data-testid="sub-school"
          />
          <input
            required
            placeholder="Grade or program (e.g. Grade 10, BS Biology)"
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

      <MembershipTermNote quote={quote} />

      <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-md text-sm text-stone-700 flex items-center justify-between">
        <div>
          <span className="text-stone-500">Plan:</span>{" "}
          <span className="font-medium">${price}</span>
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
        {guest ? "Create account & subscribe" : "Submit Application"}
      </button>
    </form>
  );
};

const JoinModal = ({ plan, onClose }) => {
  const { isAuthed, member, refresh, register, login, loginWithGoogle } = useMemberAuth();
  const nav = useNavigate();
  const [acct, setAcct] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [acctError, setAcctError] = useState("");

  // Create the account, or sign in if that email is already registered
  const ensureAccount = async (extra = {}) => {
    if (isAuthed) return true;
    setAcctError("");
    const payload = {
      email: acct.email.trim(), password: acct.password,
      first_name: acct.first_name.trim(), last_name: acct.last_name.trim(), phone: extra.phone || undefined,
    };
    const r = await register(payload);
    if (r.ok) return true;
    if (/already registered/i.test(r.error || "")) {
      const l = await login(payload.email, payload.password);
      if (l.ok) return true;
      setAcctError("This email already has an account and that password didn't match. Enter your existing password, or sign in from Member Login.");
      return false;
    }
    setAcctError(typeof r.error === "string" ? r.error : "Couldn't create your account — check the details.");
    return false;
  };

  const onGoogle = async (credential) => {
    if (!credential) { setAcctError("Google sign-in failed — use email and password instead."); return; }
    const r = await loginWithGoogle(credential);
    if (!r.ok) setAcctError(r.error || "Google sign-in failed — use email and password instead.");
  };
  const onSuccess = async () => {
    await refresh(); // pick up the new membership before showing the dashboard
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
        {(() => {
          const guestProps = {
            guest: !isAuthed,
            ensureAccount,
            accountFields: !isAuthed ? <AccountFields acct={acct} setAcct={setAcct} error={acctError} onGoogle={onGoogle} /> : null,
          };
          return plan.slug === "free"
            ? <FreeJoinForm plan={plan} onSuccess={onSuccess} {...guestProps} />
            : <SubscribeForm plan={plan} onSuccess={onSuccess} onClose={onClose} member={member} {...guestProps} />;
        })()}
      </div>
    </div>
  );
};

const TierGrid = ({ tiers, onJoin, focusedPlan, authState, navigate }) => (
  <section className="py-20 bg-cream">
    <div className="max-w-7xl mx-auto px-6">
      <div className="text-center mb-12">
        <div className="font-cinzel text-xs tracking-[0.28em] text-[#E07A1F]">CHOOSE YOUR TIER</div>
        <h2 className="font-display text-4xl text-[#8B1A1A] mt-2">{focusedPlan.name}</h2>
        <p className="text-stone-600 mt-3 max-w-2xl mx-auto font-serif">{focusedPlan.description}</p>
      </div>
      <div className={`grid md:grid-cols-2 ${tiers.length === 4 ? "lg:grid-cols-4" : ""} gap-5`}>
        {tiers.map((t) => {
          const planForCta = { ...focusedPlan, slug: focusedPlan.slug, tier: t.slug, price: t.price };
          const cta = getPlanCta(planForCta, authState);
          const sameSelection =
            authState.member?.membership?.plan === focusedPlan.slug &&
            authState.member?.membership?.tier === t.slug;
          // Override cta label for tier specificity
          let label = cta.label;
          if (cta.disabled && sameSelection) {
            label = authState.member?.membership?.status === "pending" ? "Application Pending" : "Your Current Tier";
          } else if (authState.member?.membership?.status === "active" && authState.member?.membership?.plan === focusedPlan.slug) {
            label = `Switch to ${t.name}`;
          }
          const handleClick = () => {
            if (cta.action === "dashboard") navigate("/member/dashboard");
            // Active members switching type on the same plan pay only the difference
            else if (authState.member?.membership?.status === "active" && authState.member?.membership?.plan === focusedPlan.slug)
              navigate(`/member/dashboard#change-type?tier=${t.slug}`);
            else
              onJoin({
                ...focusedPlan,
                price: t.price,
                tier: t.slug,
              });
          };
          return (
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
                onClick={handleClick}
                disabled={cta.disabled && sameSelection}
                className={`w-full py-3 rounded-md font-medium transition ${
                  cta.disabled && sameSelection
                    ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                    : "bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50"
                }`}
                data-testid={`signup-${t.slug}`}
              >
                {label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default function MembershipPage() {
  const { sub } = useParams();
  const [active, setActive] = useState(null);
  const [plans, setPlans] = useState([]);
  const { isAuthed, member } = useMemberAuth();
  const navigate = useNavigate();
  const authState = { isAuthed, member };

  useEffect(() => {
    apiClient.get("/membership-plans")
      .then((r) => setPlans(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPlans([]));
  }, []);

  const focused = plans.find((p) => p.slug === sub);
  const regularTiers = (plans.find((p) => p.slug === "regular")?.tiers) || [];
  const extendedTiers = (plans.find((p) => p.slug === "extended")?.tiers) || [];
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

  // Show a loading state until membership plans arrive from the API so that
  // the sub-page renderers below can safely access `focused.benefits`, etc.
  if (sub && plans.length === 0) {
    return (
      <section className="py-20 bg-cream min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1A1A] animate-spin" />
      </section>
    );
  }

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
        <TierGrid tiers={regularTiers} onJoin={setActive} focusedPlan={focused} authState={authState} navigate={navigate} />
        {active && <JoinModal plan={active} onClose={() => setActive(null)} />}
      </>
    );
  }
  if (sub === "extended") {
    return (
      <>
        <PageHeader {...header} />
        {memberBanner}
        <TierGrid tiers={extendedTiers} onJoin={setActive} focusedPlan={focused} authState={authState} navigate={navigate} />
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
    const businessPlan = { ...focused, tier: "business" };
    const cta = getPlanCta(businessPlan, authState);
    const samePlan = member?.membership?.plan === "business";
    const isDisabled = cta.disabled && samePlan;
    const handleBusinessClick = () => {
      if (cta.action === "dashboard") navigate("/member/dashboard");
      else setActive(businessPlan);
    };
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
                onClick={handleBusinessClick}
                disabled={isDisabled}
                className={`w-full mt-7 py-3.5 rounded-md font-medium transition ${
                  isDisabled
                    ? "bg-stone-600 text-stone-300 cursor-not-allowed"
                    : "bg-[#E07A1F] hover:bg-[#c66c1a] text-white"
                }`}
                data-testid="signup-business"
              >
                {cta.label}
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
      {plans.find((p) => p.slug === "free") && (
        <FreeMemberSection plan={plans.find((p) => p.slug === "free")} onJoin={setActive} authState={authState} navigate={navigate} />
      )}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.filter((p) => p.slug !== "free").map((p) => (
            <PlanCard key={p.slug} p={p} onJoin={setActive} authState={authState} navigate={navigate} />
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
