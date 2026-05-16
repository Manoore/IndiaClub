import React from "react";
import PageHeader from "../components/PageHeader";
import { AboutContact } from "./AboutPage";

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="WE'RE HERE" title="Contact Us" subtitle="Questions, ideas, partnership opportunities — we'd love to hear from you." image="https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" />
      <AboutContact />
    </>
  );
}
