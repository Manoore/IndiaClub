import { useMemberAuth } from "../api/MemberAuthContext";

/**
 * The right membership call-to-action for whoever is looking:
 * visitors are invited to join, members go to their dashboard, lapsed members renew,
 * free members upgrade. `joinLabel` is the text shown to visitors.
 */
export default function useMembershipCta(joinLabel = "Become a Member") {
  const { isAuthed, member } = useMemberAuth();
  const m = member?.membership || {};
  if (!isAuthed) return { to: "/membership/regular", label: joinLabel, state: "visitor" };
  if (m.lifetime || (m.status === "active" && m.plan && m.plan !== "free")) {
    return { to: "/member/dashboard", label: "My Membership", state: "member" };
  }
  if (m.status === "expired") return { to: "/member/dashboard", label: "Renew Membership", state: "expired" };
  if (m.status === "pending") return { to: "/member/dashboard", label: "My Membership", state: "pending" };
  if (m.plan === "free") return { to: "/membership/regular", label: "Upgrade Membership", state: "free" };
  return { to: "/membership/regular", label: joinLabel, state: "signed-in" };
}
