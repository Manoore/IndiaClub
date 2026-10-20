import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";
import { CheckCircle2, XCircle, Trash2, Loader2, Search, Infinity as InfinityIcon } from "lucide-react";
import { PaymentSelect } from "./PaymentStatus";

const STATUS_PILL = {
  none: "bg-stone-100 text-stone-600",
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  expired: "bg-stone-200 text-stone-700",
};

const FILTERS = ["all", "pending", "active", "none", "rejected", "expired"];

const fmt = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
};

export default function MembersAdmin() {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(FILTERS.includes(searchParams.get("status")) ? searchParams.get("status") : "all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const r = await apiClient.get(`/admin/members${qs}`);
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    setBusy(id);
    try {
      await apiClient.post(`/admin/members/${id}/approve`);
      toast({ title: "Member approved" });
      await load();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      toast({ title: "Approve failed", description: e.response?.data?.detail });
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id) => {
    const reason = window.prompt("Reason for rejection (optional):") || "";
    setBusy(id);
    try {
      await apiClient.post(`/admin/members/${id}/reject`, { reason });
      toast({ title: "Member application rejected" });
      await load();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      toast({ title: "Reject failed", description: e.response?.data?.detail });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Permanently delete this member? This cannot be undone.")) return;
    setBusy(id);
    try {
      await apiClient.delete(`/admin/members/${id}`);
      toast({ title: "Member deleted" });
      await load();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      toast({ title: "Delete failed", description: e.response?.data?.detail });
    } finally {
      setBusy(null);
    }
  };

  const setPayment = async (m, status) => {
    try {
      await apiClient.post(`/admin/members/${m.id}/mark-paid?status=${status}`);
      toast({ title: "Payment status updated" });
      await load();
    } catch (e) {
      toast({ title: "Update failed", description: e.response?.data?.detail });
    }
  };

  const setLifetime = async (m, lifetime) => {
    const msg = lifetime
      ? `Mark ${m.first_name} ${m.last_name} as a legacy lifetime member? Their membership will never expire.`
      : `Remove lifetime status from ${m.first_name} ${m.last_name}? They'll move to an annual membership ending Dec 31.`;
    if (!window.confirm(msg)) return;
    try {
      const r = await apiClient.post(`/admin/members/${m.id}/lifetime?lifetime=${lifetime}`);
      toast({ title: lifetime ? "Lifetime membership granted" : "Lifetime membership removed" });
      setSelected(r.data);
      await load();
    } catch (e) {
      toast({ title: "Update failed", description: e.response?.data?.detail });
    }
  };

  const filtered = items.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${m.first_name || ""} ${m.last_name || ""} ${m.email || ""} ${m.phone || ""}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900">Members</h1>
          <p className="text-stone-500 mt-1 text-sm">Registered users and their membership status.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wider transition ${
              filter === s
                ? "bg-[#8B1A1A] text-amber-50"
                : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
            }`}
            data-testid={`filter-${s}`}
          >
            {s}
          </button>
        ))}
        <div className="w-full sm:w-auto sm:ml-auto relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email…"
            className="pl-9 pr-3 py-1.5 rounded border border-stone-200 text-sm w-full sm:w-64 outline-none focus:border-[#8B1A1A]"
            data-testid="members-search"
          />
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B1A1A]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No members in this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Plan / Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valid through</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((m) => {
                const ms = m.membership?.status || "none";
                return (
                  <tr key={m.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(m)}
                        className="text-left"
                        data-testid={`member-row-${m.id}`}
                      >
                        <div className="font-medium text-stone-900">
                          {m.first_name} {m.last_name}
                        </div>
                        <div className="text-xs text-stone-500">{m.email}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {m.membership?.plan || "—"}
                      {m.membership?.tier && (
                        <span className="text-xs text-stone-500"> / {m.membership.tier}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                          STATUS_PILL[ms] || STATUS_PILL.none
                        }`}
                      >
                        {ms}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                      {m.membership?.lifetime ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8B1A1A]"><InfinityIcon className="w-3.5 h-3.5" /> Lifetime</span>
                      ) : fmt(m.membership?.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      {m.membership?.plan && !m.membership?.lifetime ? (
                        <PaymentSelect
                          value={m.membership?.payment_status || (m.membership?.payment_received ? "paid" : "pending")}
                          onChange={(v) => setPayment(m, v)}
                          testid={`member-pay-${m.id}`}
                        />
                      ) : <span className="text-stone-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ms === "pending" && (
                          <>
                            <button
                              onClick={() => approve(m.id)}
                              disabled={busy === m.id}
                              className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium hover:bg-emerald-200 disabled:opacity-50 flex items-center gap-1"
                              data-testid={`approve-${m.id}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => reject(m.id)}
                              disabled={busy === m.id}
                              className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded text-xs font-medium hover:bg-rose-200 disabled:opacity-50 flex items-center gap-1"
                              data-testid={`reject-${m.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                        {ms === "active" && (
                          <button
                            onClick={() => reject(m.id)}
                            disabled={busy === m.id}
                            className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded text-xs font-medium hover:bg-stone-200 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => remove(m.id)}
                          disabled={busy === m.id}
                          className="p-1.5 hover:bg-rose-50 rounded text-rose-600 disabled:opacity-50"
                          title="Delete"
                          data-testid={`delete-${m.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {selected && (
        <MemberDetailDrawer
          member={selected}
          onClose={() => setSelected(null)}
          onLifetime={setLifetime}
          onChanged={async (m) => { setSelected(m); await load(); }}
        />
      )}
    </div>
  );
}

const Field = ({ label, value }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">{label}</div>
    <div className="text-stone-900 text-sm mt-0.5">{value || "—"}</div>
  </div>
);

const ACTION_LABELS = {
  join: "Joined", change_plan: "Changed plan", renew: "Renewed", payment: "Payment", override: "Manual override",
  approve: "Approved", expire: "Expired",
};
const RULE_LABELS = {
  standard: "12 months from payment", promotion: "Promotion", kept_current: "Kept current expiration (never shortened)",
  override: "Set by admin", lifetime: "Lifetime",
};

const MembershipHistory = ({ memberId, version }) => {
  const [items, setItems] = useState(null);
  useEffect(() => {
    apiClient.get(`/admin/members/${memberId}/history`).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [memberId, version]);
  if (!items) return <Loader2 className="w-4 h-4 animate-spin text-[#8B1A1A]" />;
  if (!items.length) return <p className="text-xs text-stone-400">No history recorded yet.</p>;
  return (
    <ul className="divide-y divide-stone-100 text-xs" data-testid="member-history">
      {items.map((e) => (
        <li key={e.id} className="py-2">
          <div className="flex justify-between gap-2">
            <span className="font-medium text-stone-800">{ACTION_LABELS[e.action] || e.action}{e.payment_status ? ` · ${e.payment_status.replace("_", " ")}` : ""}</span>
            <span className="text-stone-400 whitespace-nowrap">{fmt(e.created_at)}</span>
          </div>
          {(e.previous_end || e.new_end) && e.action !== "expire" && (
            <div className="text-stone-600">Expiration: {fmt(e.previous_end)} → {fmt(e.new_end)}</div>
          )}
          {e.promotion?.name && <div className="text-emerald-700">Promotion: {e.promotion.name}</div>}
          {e.reason && <div className="text-stone-600 italic">“{e.reason}”</div>}
          <div className="text-stone-400">by {e.actor}</div>
        </li>
      ))}
    </ul>
  );
};

const ExpirationOverride = ({ member: m, onChanged }) => {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await apiClient.post(`/admin/members/${m.id}/expiration`, { end_date: date, reason });
      toast({ title: "Expiration updated", description: "The change is recorded in the member's history." });
      setDate("");
      setReason("");
      onChanged(r.data);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast({ title: "Couldn't update", description: Array.isArray(d) ? "A reason is required." : d || err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-5 p-4 border border-stone-200 rounded-lg space-y-2" data-testid="expiration-override">
      <div className="text-sm font-medium text-stone-900">Set a different expiration date</div>
      <p className="text-xs text-stone-500">For board-approved exceptions. A reason is required and kept for auditing.</p>
      <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm" data-testid="override-date" />
      <input required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. EC approved extension for volunteer service)" className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm" data-testid="override-reason" />
      <button disabled={busy} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#8B1A1A] text-amber-50 disabled:opacity-60" data-testid="override-save">
        {busy ? "Saving…" : "Save expiration"}
      </button>
    </form>
  );
};

const MemberDetailDrawer = ({ member: m, onClose, onLifetime, onChanged }) => {
  const ms = m.membership?.status || "none";
  const [version, setVersion] = useState(0);
  const changed = (updated) => { setVersion((v) => v + 1); onChanged(updated); };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-500">Member</div>
            <h2 className="font-display text-2xl text-stone-900">
              {m.first_name} {m.last_name}
            </h2>
            <div className="text-sm text-stone-500">{m.email}</div>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Field label="Phone" value={m.phone} />
          <Field label="Alt phone" value={m.phone_alt} />
          <Field label="Gender" value={m.gender} />
          <Field label="Country" value={m.country} />
          <Field label="Address" value={[m.address, m.address2].filter(Boolean).join(", ")} />
          <Field label="City / State / ZIP" value={[m.city, m.state, m.zip].filter(Boolean).join(", ")} />
        </div>

        <h3 className="font-display text-lg text-[#8B1A1A] mb-3">Membership</h3>
        <div className="bg-stone-50 rounded-lg p-4 grid grid-cols-2 gap-3">
          <Field label="Status" value={ms.toUpperCase()} />
          <Field label="Plan" value={m.membership?.plan} />
          <Field label="Tier" value={m.membership?.tier} />
          <Field label="Family count" value={m.membership?.family_count} />
          <Field label="Donation" value={`$${m.membership?.donation_amount || 0}`} />
          <Field label="Payment method" value={m.membership?.payment_method?.toUpperCase()} />
          <Field label="School" value={m.membership?.school_name} />
          <Field label="Degree" value={m.membership?.degree_program} />
          <Field label="Submitted" value={fmt(m.membership?.submitted_at)} />
          <Field label="Start date" value={fmt(m.membership?.start_date)} />
          <Field label="Valid through" value={m.membership?.lifetime ? "Lifetime" : fmt(m.membership?.end_date)} />
          <Field label="Member since" value={fmt(m.joined_at)} />
          <Field label="Expiration rule" value={RULE_LABELS[m.membership?.term_rule] || "—"} />
          {m.membership?.promotion?.name && <Field label="Promotion used" value={m.membership.promotion.name} />}
          <Field label="Payment confirmed" value={m.membership?.paid_at ? fmt(m.membership.paid_at) : "Not yet"} />
          <Field label="Approved by" value={m.membership?.approved_by} />
          {m.membership?.rejection_reason && (
            <div className="col-span-2">
              <Field label="Rejection reason" value={m.membership.rejection_reason} />
            </div>
          )}
        </div>

        <div className="mt-5 p-4 border border-stone-200 rounded-lg">
          <div className="text-sm font-medium text-stone-900">Legacy lifetime membership</div>
          <p className="text-xs text-stone-500 mt-1">
            Lifetime memberships can't be bought online any more. Use this for existing lifetime members so they never expire.
          </p>
          <button
            onClick={() => onLifetime(m, !m.membership?.lifetime)}
            className="mt-3 px-3 py-1.5 rounded-md text-xs font-medium border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50"
            data-testid="toggle-lifetime"
          >
            {m.membership?.lifetime ? "Remove lifetime status" : "Mark as lifetime member"}
          </button>
        </div>

        {m.membership?.plan && <ExpirationOverride member={m} onChanged={changed} />}

        <h3 className="font-display text-lg text-[#8B1A1A] mt-6 mb-2">History</h3>
        <MembershipHistory memberId={m.id} version={`${version}-${m.updated_at}`} />
      </div>
    </div>
  );
};
