import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./App.css";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/toaster";
import { AdminAuthProvider } from "./api/AdminAuthContext";

import Home from "./pages/Home";
import AboutPage from "./pages/AboutPage";
import EventsPage from "./pages/EventsPage";
import MembershipPage from "./pages/MembershipPage";
import ProgramsPage from "./pages/ProgramsPage";
import SponsorshipPage from "./pages/SponsorshipPage";
import ClassifiedPage from "./pages/ClassifiedPage";
import GalleryPage from "./pages/GalleryPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import AdminRoutes from "./admin/AdminRoutes";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
};

const PublicShell = ({ children }) => (
  <>
    <Navbar />
    <main>{children}</main>
    <Footer />
  </>
);

function AppRoutes() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
      </Routes>
    );
  }
  return (
    <PublicShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/about/:sub" element={<AboutPage />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route path="/membership/:sub" element={<MembershipPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:sub" element={<EventsPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/programs/:sub" element={<ProgramsPage />} />
        <Route path="/sponsorship" element={<SponsorshipPage />} />
        <Route path="/sponsorship/:sub" element={<SponsorshipPage />} />
        <Route path="/classified" element={<ClassifiedPage />} />
        <Route path="/classified/:sub" element={<ClassifiedPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </PublicShell>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AdminAuthProvider>
          <ScrollToTop />
          <AppRoutes />
          <Toaster />
        </AdminAuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
