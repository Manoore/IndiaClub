import React from "react";
import CrudPage from "./CrudPage";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";

export const EventsAdmin = () => (
  <CrudPage title="Events" description="Manage upcoming and past events." endpoint="events"
    columns={[
      { key: "image_url", label: "Image", render: (r) => r.image_url ? <img src={r.image_url} alt="" className="w-14 h-14 rounded object-cover" /> : <div className="w-14 h-14 bg-stone-100 rounded" /> },
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "date", label: "Date" },
      { key: "venue", label: "Venue" },
      { key: "registration_open", label: "Reg", render: (r) => r.registration_open ? <span className="text-green-700 text-xs">OPEN</span> : <span className="text-stone-400 text-xs">CLOSED</span> },
    ]}
    fields={[
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug (URL-friendly)", type: "text", required: true, hint: "e.g. diwali-2026" },
      { key: "category", label: "Category", type: "select", required: true, options: ["DIFI", "Diwali", "Rising Stars", "Golden Jewels", "Women's Connect", "Sports", "Picnic", "Other"] },
      { key: "date", label: "Date", type: "text", required: true, placeholder: "May 17, 2026" },
      { key: "time", label: "Time", type: "text", placeholder: "5:00 PM – 9:00 PM" },
      { key: "venue", label: "Venue", type: "text" },
      { key: "image_url", label: "Featured Image", type: "image" },
      { key: "description", label: "Short Description", type: "textarea", rows: 2 },
      { key: "long_description", label: "Long Description", type: "textarea", rows: 5 },
      { key: "highlights", label: "Highlights", type: "tags", hint: "One bullet per line" },
      { key: "registration_open", label: "Registration Open", type: "checkbox", hint: "Allow public registration" },
      { key: "featured", label: "Featured", type: "checkbox", hint: "Show on homepage" },
    ]} />
);

export const NewsAdmin = () => (
  <CrudPage title="News & Announcements" endpoint="news"
    columns={[
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "published", label: "Status", render: (r) => r.published ? <span className="text-green-700 text-xs">PUBLISHED</span> : <span className="text-stone-400 text-xs">DRAFT</span> },
    ]}
    fields={[
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "image_url", label: "Featured Image", type: "image" },
      { key: "body", label: "Body", type: "textarea", rows: 8, required: true },
      { key: "published", label: "Published", type: "checkbox", default: true },
    ]} />
);

export const ExecTeamAdmin = () => (
  <CrudPage title="Executive Team" endpoint="exec-team"
    columns={[
      { key: "image_url", label: "Photo", render: (r) => <img src={r.image_url} alt="" className="w-12 h-12 rounded-full object-cover" /> },
      { key: "name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "order", label: "Order" },
      { key: "active", label: "Active", render: (r) => r.active ? "✓" : "✕" },
    ]}
    fields={[
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role/Title", type: "text", required: true },
      { key: "image_url", label: "Photo", type: "image" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "order", label: "Display Order", type: "number", default: 100 },
      { key: "active", label: "Active", type: "checkbox", default: true },
    ]} />
);

export const GalleryAdmin = () => (
  <CrudPage title="Gallery" endpoint="gallery"
    columns={[
      { key: "image_url", label: "Image", render: (r) => <img src={r.image_url} alt="" className="w-16 h-16 rounded object-cover" /> },
      { key: "title", label: "Title" },
      { key: "album", label: "Album" },
    ]}
    fields={[
      { key: "title", label: "Title", type: "text", required: true },
      { key: "image_url", label: "Image", type: "image", required: true },
      { key: "album", label: "Album", type: "text", default: "General" },
    ]} />
);

export const SponsorsAdmin = () => (
  <CrudPage title="Sponsors" endpoint="sponsors"
    columns={[
      { key: "logo_url", label: "Logo", render: (r) => r.logo_url ? <img src={r.logo_url} alt="" className="w-14 h-14 rounded object-contain bg-white border" /> : <div className="w-14 h-14 bg-stone-100 rounded" /> },
      { key: "name", label: "Name" },
      { key: "tier", label: "Tier" },
      { key: "active", label: "Active", render: (r) => r.active ? "✓" : "✕" },
    ]}
    fields={[
      { key: "name", label: "Name", type: "text", required: true },
      { key: "logo_url", label: "Logo", type: "image" },
      { key: "tier", label: "Tier", type: "select", options: ["Diamond", "Gold", "Silver", "Bronze"], default: "Bronze" },
      { key: "website", label: "Website", type: "text" },
      { key: "order", label: "Order", type: "number", default: 100 },
      { key: "active", label: "Active", type: "checkbox", default: true },
    ]} />
);

export const DonorsAdmin = () => (
  <CrudPage title="Donors Directory" endpoint="donors"
    columns={[
      { key: "name", label: "Name" },
      { key: "amount", label: "Amount", render: (r) => <span className="font-semibold text-[#E07A1F]">${Number(r.amount || 0).toLocaleString()}</span> },
      { key: "year", label: "Year" },
      { key: "tier", label: "Tier" },
    ]}
    fields={[
      { key: "name", label: "Donor Name", type: "text", required: true },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "year", label: "Year", type: "number", required: true, default: new Date().getFullYear() },
      { key: "tier", label: "Tier", type: "select", options: ["Founder", "Platinum", "Diamond", "Gold", "Silver", "Bronze"], default: "Bronze" },
      { key: "anonymous", label: "Anonymous Donor", type: "checkbox" },
    ]} />
);

export const ClassifiedsAdmin = () => {
  const { toast } = useToast();
  const approve = async (row, reload) => {
    await apiClient.post(`/admin/classifieds/${row.id}/approve`);
    toast({ title: "Approved" });
    reload();
  };
  const reject = async (row, reload) => {
    await apiClient.post(`/admin/classifieds/${row.id}/reject`);
    toast({ title: "Rejected" });
    reload();
  };
  return (
    <CrudPage title="Classifieds" endpoint="classifieds"
      columns={[
        { key: "title", label: "Title" },
        { key: "category", label: "Category" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status", render: (r) => (
          <span className={`text-xs font-cinzel tracking-wider ${r.status === 'approved' ? 'text-green-700' : r.status === 'rejected' ? 'text-red-600' : 'text-amber-700'}`}>{(r.status || '').toUpperCase()}</span>
        )},
      ]}
      extraActions={(row, reload) => row.status !== 'approved' ? (
        <>
          <button onClick={() => approve(row, reload)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium mr-1 hover:bg-green-200">Approve</button>
          <button onClick={() => reject(row, reload)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium mr-1 hover:bg-red-200">Reject</button>
        </>
      ) : null}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "category", label: "Category", type: "select", options: ["Education", "Housing", "Vehicles", "Services", "For Sale", "Jobs"] },
        { key: "location", label: "Location", type: "select", options: ["Dayton", "Centerville", "Beavercreek", "Kettering", "Springboro", "Oakwood"] },
        { key: "price", label: "Price", type: "text" },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "image_url", label: "Image", type: "image" },
        { key: "contact", label: "Contact", type: "text", required: true },
        { key: "status", label: "Status", type: "select", options: ["pending", "approved", "rejected"], default: "approved" },
      ]} />
  );
};

export const PastPresidentsAdmin = () => (
  <CrudPage title="Past Presidents" endpoint="past-presidents"
    columns={[
      { key: "year", label: "Year" },
      { key: "name", label: "Name" },
      { key: "order", label: "Order" },
    ]}
    fields={[
      { key: "year", label: "Year", type: "text", required: true, placeholder: "2024" },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "order", label: "Order", type: "number", default: 0 },
    ]} />
);

export const AwardeesAdmin = () => (
  <CrudPage title="Awardees" description="Community Service Awards & DIFI Awards" endpoint="awardees"
    columns={[
      { key: "year", label: "Year" },
      { key: "name", label: "Name / Title" },
      { key: "type", label: "Type", render: (r) => <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs">{r.type === 'difi' ? 'DIFI' : 'Community'}</span> },
      { key: "contribution", label: "Detail" },
    ]}
    fields={[
      { key: "year", label: "Year", type: "number", required: true },
      { key: "name", label: "Name/Title", type: "text", required: true },
      { key: "contribution", label: "Contribution/Description", type: "textarea" },
      { key: "type", label: "Type", type: "select", options: [{ label: "Community Service", value: "community" }, { label: "DIFI Award", value: "difi" }], default: "community", required: true },
      { key: "order", label: "Order", type: "number", default: 0 },
    ]} />
);

export const TaxReturnsAdmin = () => (
  <CrudPage title="Tax Returns" endpoint="tax-returns"
    columns={[
      { key: "year", label: "Year" },
      { key: "filed_by", label: "Filed By" },
      { key: "president", label: "President" },
      { key: "available", label: "Available", render: (r) => r.available ? "✓" : "✕" },
    ]}
    fields={[
      { key: "year", label: "Year", type: "number", required: true },
      { key: "filed_by", label: "Filed By", type: "text" },
      { key: "president", label: "President", type: "text" },
      { key: "file_id", label: "File ID (uploaded PDF)", type: "text", hint: "Upload PDF first, then paste file id" },
      { key: "available", label: "Document Available", type: "checkbox", default: true },
      { key: "order", label: "Order", type: "number", default: 0 },
    ]} />
);

export const ProgramsAdmin = () => (
  <CrudPage title="Programs" endpoint="programs"
    columns={[
      { key: "image_url", label: "Image", render: (r) => r.image_url ? <img src={r.image_url} alt="" className="w-14 h-14 rounded object-cover" /> : <div className="w-14 h-14 bg-stone-100 rounded" /> },
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "impact", label: "Impact" },
    ]}
    fields={[
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "image_url", label: "Image", type: "image" },
      { key: "summary", label: "Short Summary", type: "textarea", rows: 2 },
      { key: "intro", label: "Intro Paragraph", type: "textarea", rows: 3 },
      { key: "initiatives", label: "Initiatives", type: "array-of-objects", schema: ["name", "desc"] },
      { key: "impact", label: "Impact Statement", type: "text" },
      { key: "order", label: "Order", type: "number", default: 100 },
    ]} />
);

export const MembershipPlansAdmin = () => (
  <CrudPage title="Membership Plans" endpoint="membership-plans"
    columns={[
      { key: "name", label: "Plan" },
      { key: "slug", label: "Slug" },
      { key: "price", label: "Price", render: (r) => <span>${r.price}</span> },
      { key: "featured", label: "Featured", render: (r) => r.featured ? "✓" : "✕" },
    ]}
    fields={[
      { key: "slug", label: "Slug", type: "text", required: true },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "price", label: "Price (USD)", type: "number", required: true },
      { key: "period", label: "Period Label", type: "text", placeholder: "per year" },
      { key: "description", label: "Description", type: "textarea", rows: 2 },
      { key: "benefits", label: "Benefits", type: "tags" },
      { key: "featured", label: "Featured", type: "checkbox" },
      { key: "order", label: "Order", type: "number", default: 100 },
    ]} />
);

export const PerksAdmin = () => (
  <CrudPage title="Member Perks" description="Benefits shown on the member dashboard." endpoint="perks"
    columns={[
      { key: "image_url", label: "Img", render: (r) => r.image_url ? <img src={r.image_url} alt="" className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded flex items-center justify-center text-xs text-stone-500">{r.icon || "Gift"}</div> },
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "badge", label: "Badge", render: (r) => r.badge ? <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-cinzel tracking-wider">{r.badge}</span> : "" },
      { key: "order", label: "Order" },
      { key: "active", label: "Active", render: (r) => r.active ? "✓" : "✕" },
    ]}
    fields={[
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", rows: 3, required: true },
      { key: "icon", label: "Icon (Lucide name)", type: "select", default: "Gift", options: ["Gift", "Ticket", "Tag", "Newspaper", "BookOpen", "Vote", "Users", "Store", "Heart", "Award", "Calendar", "Star", "Sparkles", "ShoppingBag", "GraduationCap"] },
      { key: "image_url", label: "Image (optional, overrides icon)", type: "image" },
      { key: "badge", label: "Badge", type: "select", options: [{ label: "(none)", value: "" }, { label: "NEW", value: "NEW" }, { label: "POPULAR", value: "POPULAR" }, { label: "MEMBER-ONLY", value: "MEMBER-ONLY" }, { label: "LIMITED", value: "LIMITED" }] },
      { key: "category", label: "Category", type: "text", default: "General", placeholder: "e.g. Events, Community, Publications" },
      { key: "link", label: "Optional link", type: "text", placeholder: "/events or https://…" },
      { key: "link_label", label: "Link button label", type: "text", placeholder: "Browse Events" },
      { key: "order", label: "Display order", type: "number", default: 100 },
      { key: "active", label: "Active (visible to members)", type: "checkbox", default: true },
    ]} />
);

// Read-only inbox-style pages
export const MembershipAppsAdmin = () => (
  <CrudPage title="Membership Applications" endpoint="membership-applications" isInbox readOnly
    columns={[
      { key: "first_name", label: "Name", render: (r) => `${r.first_name} ${r.last_name}` },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "plan", label: "Plan" },
      { key: "family", label: "Family" },
      { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
    ]}
    fields={[]} />
);

export const SubscribersAdmin = () => (
  <CrudPage title="Newsletter Subscribers" endpoint="subscribers" isInbox readOnly
    columns={[
      { key: "email", label: "Email" },
      { key: "name", label: "Name" },
      { key: "subscribed_at", label: "Subscribed", render: (r) => r.subscribed_at ? new Date(r.subscribed_at).toLocaleDateString() : "" },
    ]} fields={[]} />
);

export const ContactInboxAdmin = () => (
  <CrudPage title="Contact Messages" endpoint="contact-messages" isInbox readOnly
    columns={[
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "subject", label: "Subject" },
      { key: "message", label: "Message", render: (r) => <span className="line-clamp-2 max-w-md">{r.message}</span> },
      { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
    ]} fields={[]} />
);

export const DonationsAdmin = () => (
  <CrudPage title="Donations" endpoint="donations" isInbox readOnly
    columns={[
      { key: "name", label: "Donor" },
      { key: "email", label: "Email" },
      { key: "amount", label: "Amount", render: (r) => <span className="font-semibold text-[#E07A1F]">${r.amount}</span> },
      { key: "message", label: "Message" },
      { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
    ]} fields={[]} />
);

export const SponsorInquiriesAdmin = () => (
  <CrudPage title="Sponsorship Inquiries" endpoint="sponsorship-inquiries" isInbox readOnly
    columns={[
      { key: "company", label: "Company" },
      { key: "contact", label: "Contact" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "tier", label: "Tier" },
      { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
    ]} fields={[]} />
);

export const EventRegistrationsAdmin = () => (
  <CrudPage title="Event Registrations" endpoint="event-registrations" isInbox readOnly
    columns={[
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "family_count", label: "Family" },
      { key: "event_id", label: "Event" },
      { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "" },
    ]} fields={[]} />
);
