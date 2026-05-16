import React from "react";
import PageHeader from "../components/PageHeader";
import { AboutContact } from "./AboutPage";

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="WE'RE HERE" title="Contact Us" subtitle="Questions, ideas, partnership opportunities — we'd love to hear from you." image="https://images.unsplash.com/photo-1543342384-1f1350e27861?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920" />
      <AboutContact />
    </>
  );
}
