import React, { useEffect, useState } from "react";
import CrudPage from "./CrudPage";
import { apiClient, absoluteUrl } from "../api/client";

const STATUS = ["draft", "published"];
const ARTICLE_CATEGORIES = ["Community", "Business Spotlight", "Youth", "Culture", "Food & Recipes", "Health", "Events", "Other"];

const StatusPill = ({ s }) => (
  <span className={`text-xs font-cinzel tracking-wider ${s === "published" ? "text-green-700" : "text-amber-700"}`}>{(s || "draft").toUpperCase()}</span>
);
const ViewLink = ({ to }) => (
  <a href={to} target="_blank" rel="noopener noreferrer" className="px-2 py-1 border border-stone-200 rounded text-xs mr-1 hover:border-[#8B1A1A]">View</a>
);

export const MagazineIssuesAdmin = () => (
  <CrudPage title="Vibrant Dayton: Issues" endpoint="magazine-issues"
    description="Each issue has a cover, an intro, and a PDF and/or web articles. Anyone sees the cover and intro; the PDF and full articles need a member sign-in (free accounts count)."
    columns={[
      { key: "cover_url", label: "Cover", render: (r) => r.cover_url ? <img src={absoluteUrl(r.cover_url)} loading="lazy" alt="" className="w-12 h-16 rounded object-cover border" /> : <div className="w-12 h-16 bg-stone-100 rounded" /> },
      { key: "title", label: "Issue" },
      { key: "issue_date", label: "Date" },
      { key: "pdf_url", label: "PDF", render: (r) => <span className="text-xs text-stone-500">{r.pdf_url ? "Uploaded" : r.external_url ? "Link" : "—"}</span> },
      { key: "status", label: "Status", render: (r) => <StatusPill s={r.status} /> },
    ]}
    extraActions={(row) => (row.status === "published" && row.slug ? <ViewLink to={`/magazine/${row.slug}`} /> : null)}
    fields={[
      { key: "title", label: "Issue title", type: "text", required: true, placeholder: "e.g. Diwali 2026" },
      { key: "issue_date", label: "Issue date", type: "date", hint: "Newest issue shows first" },
      { key: "cover_url", label: "Cover image", type: "image", hint: "Portrait (3:4) works best" },
      { key: "intro", label: "Intro / editor's note", type: "textarea", rows: 5 },
      { key: "pdf_url", label: "Full issue as PDF", type: "file", hint: "Up to 10 MB. Only signed-in members can open it." },
      { key: "external_url", label: "Or a link to read it online", type: "text", hint: "e.g. Issuu, Canva or Google Drive. Use this when the PDF is bigger than 10 MB." },
      { key: "featured", label: "Feature on the magazine page", type: "checkbox", hint: "Show as the main issue even if it isn't the newest" },
      { key: "status", label: "Status", type: "select", options: STATUS, default: "draft", hint: "Drafts and their articles stay hidden until published" },
    ]} />
);

export const MagazineArticlesAdmin = () => {
  const [issues, setIssues] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  useEffect(() => {
    apiClient.get("/admin/magazine-issues").then((r) => setIssues(r.data || [])).catch(() => setIssues([]));
    apiClient.get("/admin/businesses").then((r) => setBusinesses((r.data || []).filter((b) => b.status === "approved" && b.slug))).catch(() => setBusinesses([]));
  }, []);
  const issueName = (id) => issues.find((i) => i.id === id)?.title || "—";
  return (
    <CrudPage title="Vibrant Dayton: Articles" endpoint="magazine-articles"
      description="Web articles. Visitors see the summary and the first two paragraphs; signed-in members read everything."
      columns={[
        { key: "cover_url", label: "Image", render: (r) => r.cover_url ? <img src={absoluteUrl(r.cover_url)} loading="lazy" alt="" className="w-16 h-10 rounded object-cover border" /> : <div className="w-16 h-10 bg-stone-100 rounded" /> },
        { key: "title", label: "Title" },
        { key: "issue_id", label: "Issue", render: (r) => <span className="text-xs">{issueName(r.issue_id)}</span> },
        { key: "category", label: "Category" },
        { key: "status", label: "Status", render: (r) => <StatusPill s={r.status} /> },
      ]}
      extraActions={(row) => (row.status === "published" && row.slug ? <ViewLink to={`/magazine/article/${row.slug}`} /> : null)}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "issue_id", label: "Issue", type: "select", placeholder: "Not part of an issue", options: issues.map((i) => ({ value: i.id, label: `${i.title}${i.status === "published" ? "" : " (draft)"}` })) },
        { key: "category", label: "Category", type: "select", options: ARTICLE_CATEGORIES, default: "Community" },
        { key: "author", label: "Author", type: "text" },
        { key: "summary", label: "Summary", type: "textarea", rows: 2, hint: "One or two sentences, shown on cards and to everyone" },
        { key: "cover_url", label: "Main image", type: "image" },
        { key: "body", label: "Article", type: "textarea", rows: 16,
          hint: "Leave a blank line between paragraphs. Start a line with ## for a heading, or - for a bullet point." },
        { key: "business_slug", label: "Featured business (Business Spotlight)", type: "select", placeholder: "None",
          options: businesses.map((b) => ({ value: b.slug, label: b.name })), hint: "Shows a link to the business's page at the end" },
        { key: "order", label: "Order within the issue", type: "number", default: 100 },
        { key: "status", label: "Status", type: "select", options: STATUS, default: "draft" },
      ]} />
  );
};
