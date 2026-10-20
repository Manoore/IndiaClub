import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAdminAuth } from "../api/AdminAuthContext";
import AdminLayout from "./AdminLayout";
import Dashboard from "./Dashboard";
import AdminLogin from "./AdminLogin";
import AdminSettings from "./AdminSettings";
import MembersAdmin from "./MembersAdmin";
import SiteContentAdmin from "./SiteContentAdmin";
import TicketOrdersAdmin from "./TicketOrdersAdmin";
import FamilyApprovalsAdmin from "./FamilyApprovalsAdmin";
import CheckInAdmin from "./CheckInAdmin";
import SponsorshipsAdmin from "./SponsorshipsAdmin";
import ReportsAdmin from "./ReportsAdmin";
import AdminUsersAdmin from "./AdminUsersAdmin";
import MembershipPromotionsAdmin from "./MembershipPromotionsAdmin";
import {
  EventsAdmin, NewsAdmin, ExecTeamAdmin, GalleryAdmin, SponsorsAdmin, DonorsAdmin,
  ClassifiedsAdmin, PastPresidentsAdmin, AwardeesAdmin, TaxReturnsAdmin, ProgramsAdmin,
  MembershipPlansAdmin, MembershipAppsAdmin, SubscribersAdmin, ContactInboxAdmin,
  DonationsAdmin, SponsorInquiriesAdmin, EventRegistrationsAdmin, PerksAdmin,
  HeroSlidesAdmin, FeatureHighlightsAdmin, TestimonialsAdmin, SiteStatsAdmin,
  EventCategoriesAdmin, DIFIAwardsAdmin, ConstitutionAdmin, SponsorshipPlansAdmin, BusinessesAdmin,
} from "./AdminPages";

const Protected = ({ children }) => {
  const { isAuthed } = useAdminAuth();
  if (!isAuthed) return <Navigate to="/admin/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
};

// Roles without the dashboard (e.g. check-in volunteers) land on their first allowed page
const Home = () => {
  const { profile, can } = useAdminAuth();
  if (!profile) return null; // wait for the role before loading dashboard data
  if (!can("dashboard") && can("checkin")) return <Navigate to="/admin/check-in" replace />;
  return <Dashboard />;
};

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="" element={<Protected><Home /></Protected>} />
      <Route path="sponsorships" element={<Protected><SponsorshipsAdmin /></Protected>} />
      <Route path="sponsorship-plans" element={<Protected><SponsorshipPlansAdmin /></Protected>} />
      <Route path="businesses" element={<Protected><BusinessesAdmin /></Protected>} />
      <Route path="reports" element={<Protected><ReportsAdmin /></Protected>} />
      <Route path="users" element={<Protected><AdminUsersAdmin /></Protected>} />
      <Route path="membership-promotions" element={<Protected><MembershipPromotionsAdmin /></Protected>} />
      <Route path="members" element={<Protected><MembersAdmin /></Protected>} />
      <Route path="family-approvals" element={<Protected><FamilyApprovalsAdmin /></Protected>} />
      <Route path="check-in" element={<Protected><CheckInAdmin /></Protected>} />
      <Route path="perks" element={<Protected><PerksAdmin /></Protected>} />
      <Route path="site-content" element={<Protected><SiteContentAdmin /></Protected>} />
      <Route path="ticket-orders" element={<Protected><TicketOrdersAdmin /></Protected>} />
      <Route path="events" element={<Protected><EventsAdmin /></Protected>} />
      <Route path="news" element={<Protected><NewsAdmin /></Protected>} />
      <Route path="exec-team" element={<Protected><ExecTeamAdmin /></Protected>} />
      <Route path="gallery" element={<Protected><GalleryAdmin /></Protected>} />
      <Route path="sponsors" element={<Protected><SponsorsAdmin /></Protected>} />
      <Route path="donors" element={<Protected><DonorsAdmin /></Protected>} />
      <Route path="classifieds" element={<Protected><ClassifiedsAdmin /></Protected>} />
      <Route path="past-presidents" element={<Protected><PastPresidentsAdmin /></Protected>} />
      <Route path="awardees" element={<Protected><AwardeesAdmin /></Protected>} />
      <Route path="tax-returns" element={<Protected><TaxReturnsAdmin /></Protected>} />
      <Route path="programs" element={<Protected><ProgramsAdmin /></Protected>} />
      <Route path="membership-plans" element={<Protected><MembershipPlansAdmin /></Protected>} />
      <Route path="membership-applications" element={<Protected><MembershipAppsAdmin /></Protected>} />
      <Route path="subscribers" element={<Protected><SubscribersAdmin /></Protected>} />
      <Route path="contact-messages" element={<Protected><ContactInboxAdmin /></Protected>} />
      <Route path="donations" element={<Protected><DonationsAdmin /></Protected>} />
      <Route path="sponsorship-inquiries" element={<Protected><SponsorInquiriesAdmin /></Protected>} />
      <Route path="event-registrations" element={<Protected><EventRegistrationsAdmin /></Protected>} />
      <Route path="settings" element={<Protected><AdminSettings /></Protected>} />
      <Route path="hero-slides" element={<Protected><HeroSlidesAdmin /></Protected>} />
      <Route path="feature-highlights" element={<Protected><FeatureHighlightsAdmin /></Protected>} />
      <Route path="testimonials" element={<Protected><TestimonialsAdmin /></Protected>} />
      <Route path="site-stats" element={<Protected><SiteStatsAdmin /></Protected>} />
      <Route path="event-categories" element={<Protected><EventCategoriesAdmin /></Protected>} />
      <Route path="difi-awards" element={<Protected><DIFIAwardsAdmin /></Protected>} />
      <Route path="constitution" element={<Protected><ConstitutionAdmin /></Protected>} />
    </Routes>
  );
}
