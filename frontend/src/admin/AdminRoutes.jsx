import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAdminAuth } from "../api/AdminAuthContext";
import AdminLayout from "./AdminLayout";
import Dashboard from "./Dashboard";
import AdminLogin from "./AdminLogin";
import AdminSettings from "./AdminSettings";
import {
  EventsAdmin, NewsAdmin, ExecTeamAdmin, GalleryAdmin, SponsorsAdmin, DonorsAdmin,
  ClassifiedsAdmin, PastPresidentsAdmin, AwardeesAdmin, TaxReturnsAdmin, ProgramsAdmin,
  MembershipPlansAdmin, MembershipAppsAdmin, SubscribersAdmin, ContactInboxAdmin,
  DonationsAdmin, SponsorInquiriesAdmin, EventRegistrationsAdmin
} from "./AdminPages";

const Protected = ({ children }) => {
  const { isAuthed } = useAdminAuth();
  if (!isAuthed) return <Navigate to="/admin/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
};

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="" element={<Protected><Dashboard /></Protected>} />
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
    </Routes>
  );
}
