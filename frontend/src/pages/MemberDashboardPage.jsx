import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useMemberAuth } from "../api/MemberAuthContext";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import {
  User,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  LogOut,
  CreditCard,
  Mail,
  Phone,
  Home as HomeIcon,
  Calendar,
  Edit3,
  Loader2,
  KeyRound,
} from "lucide-react";
import PerksSection from "../components/PerksSection";
import FamilySection from "../components/FamilySection";
import MyTicketsSection from "../components/MyTicketsSection";
import MembershipTermNote, { fmtLongDate } from "../components/MembershipTermNote";
import ChangeTierDialog from "../components/ChangeTierDialog";

const STATUS_META = {
  none: {
    label: "No Membership",
    color: "bg-stone-100 text-stone-700 border-stone-300",
    Icon: AlertCircle,
  },
  pending: {
    label: "Pending Review",
    color: "bg-amber-50 text-amber-800 border-amber-300",
    Icon: Clock,
  },
  active: {
    label: "Active Member",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Application Rejected",
    color: "bg-rose-50 text-rose-800 border-rose-300",
    Icon: XCircle,
  },
  expired: {
    label: "Membership Expired",
    color: "bg-stone-100 text-stone-700 border-stone-300",
    Icon: AlertCircle,
  },
};

const PAYMENT_INSTRUCTIONS = {
  paypal: {
    title: "Pay via PayPal",
    body: "Send your payment to ICGD's PayPal account at contact@indiaclubdayton.org. Include your full name in the memo. Once received, we'll activate your membership.",
  },
  check: {
    title: "Pay by Check",
    body: "Mail your check payable to 'India Club of Greater Dayton' to: ICGD, PO Box, Dayton, OH. Please include your full name on the memo line.",
  },
  other: {
    title: "Alternative Payment",
    body: "Our treasurer will contact you within 2 business days to coordinate your payment method.",
  },
};

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
};

const ChangePasswordCard = () => {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast({ title: "Passwords don't match" });
      return;
    }
    if (form.new_password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters." });
      return;
    }
    setBusy(true);
    try {
      await apiClient.post("/members/me/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast({ title: "Password updated" });
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast({ title: "Update failed", description: err.response?.data?.detail || "Try again." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-amber-100">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-[#8B1A1A]" />
        <h3 className="font-display text-xl text-[#8B1A1A]">Change Password</h3>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          required
          placeholder="Current password"
          value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          className="w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
          data-testid="change-pw-current"
        />
        <input
          type="password"
          required
          placeholder="New password"
          value={form.new_password}
          onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          className="w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
          data-testid="change-pw-new"
        />
        <input
          type="password"
          required
          placeholder="Confirm new password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          className="w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm"
          data-testid="change-pw-confirm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          data-testid="change-pw-submit"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
};

const ProfileEditor = ({ member, onSaved }) => {
  const [f, setF] = useState({
    first_name: member.first_name || "",
    last_name: member.last_name || "",
    gender: member.gender || "",
    phone: member.phone || "",
    phone_alt: member.phone_alt || "",
    address: member.address || "",
    address2: member.address2 || "",
    city: member.city || "",
    state: member.state || "",
    zip: member.zip || "",
    country: member.country || "United States",
  });
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await apiClient.put("/members/me", f);
      toast({ title: "Profile updated" });
      onSaved(r.data);
    } catch (err) {
      toast({ title: "Update failed", description: err.response?.data?.detail || "Try again." });
    } finally {
      setBusy(false);
    }
  };
  const cls =
    "w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm";
  return (
    <div className="bg-white p-6 rounded-2xl border border-amber-100">
      <div className="flex items-center gap-2 mb-4">
        <Edit3 className="w-5 h-5 text-[#8B1A1A]" />
        <h3 className="font-display text-xl text-[#8B1A1A]">Profile Information</h3>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="First name"
            value={f.first_name}
            onChange={(e) => setF({ ...f, first_name: e.target.value })}
            className={cls}
            data-testid="profile-first-name"
          />
          <input
            required
            placeholder="Last name"
            value={f.last_name}
            onChange={(e) => setF({ ...f, last_name: e.target.value })}
            className={cls}
            data-testid="profile-last-name"
          />
        </div>
        <select
          value={f.gender}
          onChange={(e) => setF({ ...f, gender: e.target.value })}
          className={cls}
          data-testid="profile-gender"
        >
          <option value="">Gender (optional)</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Phone"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            className={cls}
            data-testid="profile-phone"
          />
          <input
            placeholder="Alt phone"
            value={f.phone_alt}
            onChange={(e) => setF({ ...f, phone_alt: e.target.value })}
            className={cls}
            data-testid="profile-phone-alt"
          />
        </div>
        <input
          placeholder="Address"
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
          className={cls}
          data-testid="profile-address"
        />
        <input
          placeholder="Apt / Suite (optional)"
          value={f.address2}
          onChange={(e) => setF({ ...f, address2: e.target.value })}
          className={cls}
          data-testid="profile-address2"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            placeholder="City"
            value={f.city}
            onChange={(e) => setF({ ...f, city: e.target.value })}
            className={cls}
            data-testid="profile-city"
          />
          <input
            placeholder="State"
            value={f.state}
            onChange={(e) => setF({ ...f, state: e.target.value })}
            className={cls}
            data-testid="profile-state"
          />
          <input
            placeholder="ZIP"
            value={f.zip}
            onChange={(e) => setF({ ...f, zip: e.target.value })}
            className={cls}
            data-testid="profile-zip"
          />
        </div>
        <input
          placeholder="Country"
          value={f.country}
          onChange={(e) => setF({ ...f, country: e.target.value })}
          className={cls}
          data-testid="profile-country"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          data-testid="profile-save"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </form>
    </div>
  );
};

const PAY_LABELS = {
  pending: { label: "Payment pending", cls: "bg-amber-100 text-amber-800" },
  awaiting_check: { label: "Awaiting check", cls: "bg-sky-100 text-sky-800" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  failed: { label: "Payment failed", cls: "bg-rose-100 text-rose-800" },
  refunded: { label: "Refunded", cls: "bg-stone-200 text-stone-700" },
};

// "What did I sign up for": plan + tier names and fee, looked up from the published plans
const SubscriptionSummary = ({ membership: m, plans }) => {
  const plan = plans.find((p) => p.slug === m.plan);
  const tier = (plan?.tiers || []).find((t) => t.slug === m.tier);
  const planName = m.lifetime ? "Lifetime (legacy)" : plan?.name || (m.plan || "").replace(/^\w/, (c) => c.toUpperCase());
  const tierName = tier?.name || (m.tier === "student" ? "Youth" : m.tier ? m.tier.replace(/^\w/, (c) => c.toUpperCase()) : null);
  const fee = m.lifetime ? 0 : tier ? tier.price : plan?.price;
  const donation = Number(m.donation_amount || 0);
  const pay = PAY_LABELS[m.payment_status || (m.payment_received ? "paid" : "pending")] || PAY_LABELS.pending;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4" data-testid="subscription-summary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500">Your membership</div>
          <div className="font-display text-2xl text-[#8B1A1A]" data-testid="subscription-name">
            {tierName ? `${tierName} membership` : planName}
          </div>
          {tierName && <div className="text-sm text-stone-600">{planName}</div>}
        </div>
        {!m.lifetime && <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${pay.cls}`} data-testid="subscription-payment">{pay.label}</span>}
      </div>
      {m.scheduled_tier && (
        <div className="mt-2 text-sm text-amber-800" data-testid="scheduled-tier-note">
          Switching to {(plan?.tiers || []).find((t) => t.slug === m.scheduled_tier)?.name || m.scheduled_tier} at your next renewal.
        </div>
      )}
      {(m.upgrades || []).filter((u) => u.amount > 0 && ["pending", "awaiting_check"].includes(u.payment_status)).map((u) => (
        <div key={u.id} className="mt-2 text-sm text-sky-900 bg-sky-50 border border-sky-200 rounded-md px-3 py-2" data-testid="upgrade-due-note">
          Upgrade balance due: <strong>${u.amount}</strong> ({u.payment_method}). The Treasurer will confirm it once received.
        </div>
      ))}
      {!m.lifetime && fee != null && (
        <div className="mt-3 text-sm text-stone-700 flex flex-wrap gap-x-5 gap-y-1">
          <span>Fee: <strong>${Number(fee).toLocaleString()}</strong></span>
          {donation > 0 && <span>Donation: <strong>${donation.toLocaleString()}</strong></span>}
          <span>Total: <strong>${(Number(fee) + donation).toLocaleString()}</strong></span>
          {m.payment_method && <span>Paying by: <strong className="capitalize">{m.payment_method}</strong></span>}
          {m.family_count > 1 && <span>Family members: <strong>{m.family_count}</strong></span>}
        </div>
      )}
    </div>
  );
};

export default function MemberDashboardPage() {
  const { member, isAuthed, bootstrapping, logout, refresh } = useMemberAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState([]);
  const [changeTier, setChangeTier] = useState(null); // tier slug to preselect, or "" for default

  // Always load fresh membership details (e.g. right after signing up or renewing)
  useEffect(() => {
    if (isAuthed) refresh();
    apiClient.get("/membership-plans").then((r) => setPlans(Array.isArray(r.data) ? r.data : [])).catch(() => setPlans([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  // /member/dashboard#change-type opens the change-type dialog (linked from the Membership page)
  useEffect(() => {
    if (member && window.location.hash.startsWith("#change-type")) {
      setChangeTier(new URLSearchParams(window.location.hash.split("?")[1] || "").get("tier") || "");
    }
  }, [member]);

  useEffect(() => {
    if (!bootstrapping && !isAuthed) nav("/login");
  }, [bootstrapping, isAuthed, nav]);

  useEffect(() => {
    if (member && window.location.hash === "#family") {
      setTimeout(() => document.getElementById("family")?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  }, [member]);

  if (bootstrapping || !member) {
    return (
      <section className="py-32 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#8B1A1A]" />
      </section>
    );
  }

  const ms = (member.membership && member.membership.status) || "none";
  const meta = STATUS_META[ms] || STATUS_META.none;
  const StatusIcon = meta.Icon;

  return (
    <>
      <PageHeader
        eyebrow="MY ACCOUNT"
        title={`Hello, ${member.first_name || "Member"}`}
        subtitle="Your membership home"
        image="https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
      />
      <section className="py-12 bg-cream min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-6 space-y-6">
          {/* Quick info bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white rounded-2xl p-5 border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#8B1A1A] text-amber-50 flex items-center justify-center font-display text-lg">
                {(member.first_name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-stone-900" data-testid="member-name">
                  {member.first_name} {member.last_name}
                </div>
                <div className="text-sm text-stone-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {member.email}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${meta.color}`}
                data-testid="membership-status-badge"
              >
                <StatusIcon className="w-3.5 h-3.5" /> {meta.label}
              </div>
              <button
                onClick={logout}
                className="text-sm text-stone-600 hover:text-[#8B1A1A] flex items-center gap-1.5"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>

          {/* Membership card */}
          <div className="bg-white rounded-2xl p-6 border border-amber-100">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-[#8B1A1A]" />
              <h2 className="font-display text-2xl text-[#8B1A1A]">Membership</h2>
            </div>

            {ms === "none" && (
              <div className="text-center py-8">
                <p className="text-stone-600 mb-4">You haven't subscribed to a membership plan yet.</p>
                <Link
                  to="/membership"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium"
                  data-testid="cta-subscribe"
                >
                  Browse Membership Plans
                </Link>
              </div>
            )}

            {ms === "pending" && (
              <div className="space-y-4">
                <SubscriptionSummary membership={member.membership} plans={plans} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Info label="Family Count" value={member.membership.family_count} />
                  <Info label="Donation" value={`$${member.membership.donation_amount || 0}`} />
                  <Info label="Payment Method" value={(member.membership.payment_method || "—").toUpperCase()} />
                  <Info label="Submitted" value={formatDate(member.membership.submitted_at)} />
                </div>
                {PAYMENT_INSTRUCTIONS[member.membership.payment_method] && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="font-medium text-amber-900 mb-1">
                      {PAYMENT_INSTRUCTIONS[member.membership.payment_method].title}
                    </div>
                    <p className="text-sm text-amber-900/90">
                      {PAYMENT_INSTRUCTIONS[member.membership.payment_method].body}
                    </p>
                  </div>
                )}
                <p className="text-sm text-stone-600">
                  Your application is under review. Once payment is confirmed, an administrator will activate your
                  membership.
                </p>
                <Link
                  to="/membership"
                  className="inline-flex items-center gap-2 text-sm text-[#8B1A1A] hover:text-[#E07A1F] font-medium"
                  data-testid="change-plan-link"
                >
                  Change plan
                </Link>
              </div>
            )}

            {ms === "active" && (
              <div className="space-y-4">
                <SubscriptionSummary membership={member.membership} plans={plans} />
                {!member.membership.lifetime && (plans.find((p) => p.slug === member.membership.plan)?.tiers || []).length > 1 && (
                  <button onClick={() => setChangeTier("")} className="text-sm font-medium text-[#8B1A1A] hover:text-[#E07A1F] underline-offset-2 hover:underline" data-testid="change-tier-btn">
                    Change membership type
                  </button>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Info label="Member Since" value={formatDate(member.joined_at || member.membership.start_date)} />
                  <Info label="Valid From" value={formatDate(member.membership.start_date)} />
                  <Info label="Valid Through" value={member.membership.lifetime ? "Lifetime — never expires" : formatDate(member.membership.end_date)} />
                </div>
                {member.membership.promotion?.name && (
                  <div className="text-sm text-emerald-800" data-testid="membership-promo-note">🎉 Your expiration comes from the {member.membership.promotion.name}.</div>
                )}
                {!member.membership.lifetime && ["pending", "awaiting_check"].includes(member.membership.payment_status) && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-900" data-testid="membership-payment-note">
                    {member.membership.payment_status === "awaiting_check"
                      ? "We're waiting for your check — make it payable to India Club of Greater Dayton. The Treasurer will mark it received."
                      : "Payment not yet recorded. The Treasurer will confirm it once received."}
                  </div>
                )}
                <RenewBanner membership={member.membership} onRenew={refresh} />
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-emerald-900">You're an active India Club member!</div>
                    <div className="text-sm text-emerald-900/90 mt-1">
                      Enjoy member pricing on events, our quarterly newsletter, and the joy of belonging to this 1000+
                      family community.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {ms === "rejected" && (
              <div className="space-y-3">
                <p className="text-rose-700">Unfortunately, your application was not approved.</p>
                {member.membership.rejection_reason && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-900">
                    <span className="font-medium">Reason:</span> {member.membership.rejection_reason}
                  </div>
                )}
                <Link
                  to="/membership"
                  className="inline-flex items-center gap-2 text-sm text-[#8B1A1A] hover:text-[#E07A1F] font-medium"
                >
                  Re-apply
                </Link>
              </div>
            )}

            {ms === "expired" && (
              <div className="space-y-3" data-testid="membership-expired-section">
                <p className="text-stone-700">Your membership expired on {formatDate(member.membership.end_date)}.</p>
                <RenewButton onRenew={refresh} label="Renew now" membership={member.membership} />
              </div>
            )}
          </div>

          <FamilySection
            enabled={!!member.family_enabled}
            onUpgrade={
              ms === "active" && (plans.find((p) => p.slug === member.membership.plan)?.tiers || []).some((t) => t.slug === "family")
                ? () => setChangeTier("family")
                : undefined
            }
          />
          {changeTier !== null && plans.length > 0 && (
            <ChangeTierDialog
              membership={member.membership}
              plan={plans.find((p) => p.slug === member.membership.plan)}
              initialTier={changeTier}
              onClose={() => { setChangeTier(null); if (window.location.hash) window.history.replaceState(null, "", window.location.pathname); }}
              onDone={refresh}
            />
          )}
          <MyTicketsSection />

          {/* Profile + Password */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ProfileEditor member={member} onSaved={refresh} />
            <ChangePasswordCard />
          </div>

          {/* Member Perks */}
          <PerksSection
            memberStatus={ms}
            title={ms === "active" ? "Your Member Perks" : "Membership Perks"}
            subtitle={ms === "active" ? "All the benefits you enjoy as an active member of India Club." : undefined}
          />
        </div>
      </section>
    </>
  );
}

const Info = ({ label, value }) => (
  <div className="bg-stone-50 rounded-lg p-3">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">{label}</div>
    <div className="text-stone-900 mt-0.5 capitalize">{String(value)}</div>
  </div>
);

// Fetches the expiration this renewal would give, so members see it before paying
const useRenewalQuote = (membership) => {
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (!membership?.plan || membership.lifetime) return;
    apiClient.get("/membership/quote", { params: { plan: membership.plan, tier: membership.tier || undefined } })
      .then((r) => setQuote(r.data)).catch(() => setQuote(null));
  }, [membership?.plan, membership?.tier, membership?.lifetime, membership?.end_date]);
  return quote;
};

const RenewButton = ({ onRenew, label = "Renew", membership, quote: given }) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const fetched = useRenewalQuote(given ? null : membership);
  const quote = given || fetched;
  const click = async () => {
    setBusy(true);
    try {
      const r = await apiClient.post("/members/me/renew");
      toast({ title: "Renewal submitted!", description: `Valid through ${fmtLongDate(r.data?.membership?.end_date)}. We'll confirm once payment is received.` });
      if (onRenew) await onRenew();
    } catch (err) {
      toast({ title: "Couldn't renew", description: err?.response?.data?.detail || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <MembershipTermNote quote={quote} testid="renew-quote" />
      <button onClick={click} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] disabled:opacity-70 text-amber-50 rounded-md font-medium" data-testid="member-renew-btn">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
};

// Shown when expiry is within 30 days, or whenever a promotion makes renewing now worthwhile
const RenewBanner = ({ membership, onRenew }) => {
  const quote = useRenewalQuote(membership);
  const endDt = membership?.end_date ? new Date(membership.end_date) : null;
  if (!endDt || isNaN(endDt) || membership.lifetime) return null;
  const days = Math.ceil((endDt - new Date()) / (1000 * 60 * 60 * 24));
  const promo = quote?.rule === "promotion";
  if (days > 30 && !promo) return null;
  const urgent = days <= 7;
  return (
    <div className={`rounded-lg p-4 border space-y-3 ${promo ? "bg-emerald-50/40 border-emerald-200" : urgent ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`} data-testid="membership-renewal-banner">
      <div className={`text-sm ${urgent && !promo ? "text-rose-900" : "text-stone-800"}`}>
        <strong>{promo ? `${quote.promotion.name} is on` : days > 0 ? `Expires in ${days} day${days === 1 ? "" : "s"}` : "Expires today"}</strong>
        <span className="ml-2 opacity-80">— renew now to keep member pricing. Renewing never shortens your current membership.</span>
      </div>
      <RenewButton onRenew={onRenew} label="Renew Now" quote={quote} />
    </div>
  );
};
