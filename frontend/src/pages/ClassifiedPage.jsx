import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Search, MapPin, Calendar, Phone, Loader2, Clock, CheckCircle2, Globe, Mail, Store, LogIn } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiClient, absoluteUrl } from "../api/client";
import { useMemberAuth } from "../api/MemberAuthContext";
import { useSiteSettings } from "../api/SiteSettingsContext";
import Honeypot, { HONEYPOT_FIELD } from "../components/Honeypot";

const SignInPrompt = ({ text }) => (
  <div className="bg-white p-8 rounded-2xl border border-amber-100 text-center max-w-xl mx-auto" data-testid="members-only-prompt">
    <LogIn className="w-10 h-10 text-[#8B1A1A] mx-auto mb-3" />
    <h2 className="font-display text-2xl text-[#8B1A1A] mb-2">Members only</h2>
    <p className="text-stone-600 mb-5">{text}</p>
    <Link to="/login" className="inline-flex px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium">Sign in or create an account</Link>
  </div>
);

const CATEGORIES = ["All", "Education", "Housing", "Vehicles", "Services", "For Sale", "Jobs"];
const LOCATIONS = ["All", "Dayton", "Centerville", "Beavercreek", "Kettering", "Springboro", "Oakwood"];

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }); } catch { return ""; }
};

const RevealContact = ({ contact, hidden }) => {
  const [shown, setShown] = useState(false);
  if (hidden) {
    return <Link to="/login" className="text-xs text-[#8B1A1A] hover:underline" data-testid="classified-contact-signin">Sign in as a member to see contact details</Link>;
  }
  if (!contact) return null;
  if (shown) {
    return (
      <a href={contact.includes("@") ? `mailto:${contact}` : `tel:${contact}`} className="text-[#8B1A1A] font-medium text-sm break-all hover:text-[#E07A1F]" data-testid="classified-contact">{contact}</a>
    );
  }
  return (
    <button onClick={() => setShown(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-[#8B1A1A] rounded-md font-medium" data-testid="classified-reveal-contact">
      <Phone className="w-3 h-3" /> Show contact
    </button>
  );
};

const ClassifiedCard = ({ c }) => (
  <div className="flex flex-col bg-white rounded-xl border border-stone-200 card-hover overflow-hidden" data-testid={`classified-card-${c.id}`}>
    {c.image_url && <img src={c.image_url} alt={c.title} className="w-full h-44 object-cover" />}
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8B1A1A] font-medium px-2 py-0.5 bg-amber-50 rounded">{c.category}</span>
        <span className="text-stone-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(c.created_at)}</span>
      </div>
      <h4 className="font-display text-lg text-stone-900 mt-2 line-clamp-2">{c.title}</h4>
      <p className="text-sm text-stone-600 mt-1 line-clamp-2 flex-1">{c.description}</p>
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-stone-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.location}</span>
        {c.price && <span className="font-semibold text-[#E07A1F]">{c.price}</span>}
      </div>
      <div className="mt-3 pt-3 border-t border-stone-100">
        <RevealContact contact={c.contact} hidden={c.contact_hidden} />
      </div>
    </div>
  </div>
);

const List = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [loc, setLoc] = useState("All");

  useEffect(() => {
    apiClient.get("/classifieds")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => items.filter((a) =>
    (cat === "All" || a.category === cat) &&
    (loc === "All" || a.location === loc) &&
    (search === "" || (a.title || "").toLowerCase().includes(search.toLowerCase()))
  ), [items, search, cat, loc]);

  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white p-4 rounded-xl border border-amber-100 mb-8 grid md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ads" className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="classifieds-search" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="py-2.5 px-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white" data-testid="classifieds-filter-category">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className="py-2.5 px-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white" data-testid="classifieds-filter-location">
            {LOCATIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-500 border border-dashed border-stone-300 rounded-xl" data-testid="classifieds-empty">
            No ads match your filters. <Link to="/classified/post-ad" className="text-[#8B1A1A] underline">Post the first ad</Link>.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="classifieds-list">
            {filtered.map((c) => <ClassifiedCard key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </section>
  );
};

const CategoriesView = ({ items }) => (
  <section className="py-16 bg-cream">
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" data-testid="classifieds-categories">
      {CATEGORIES.slice(1).map((c) => (
        <Link to="/classified/all-ads" key={c} className="bg-white p-6 rounded-xl border border-amber-100 text-center card-hover block">
          <div className="font-display text-2xl text-[#8B1A1A]">{c}</div>
          <div className="text-sm text-stone-500 mt-1">{items.filter((a) => a.category === c).length} ads</div>
        </Link>
      ))}
    </div>
  </section>
);

const LocationsView = ({ items }) => (
  <section className="py-16 bg-cream">
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" data-testid="classifieds-locations">
      {LOCATIONS.slice(1).map((c) => (
        <Link to="/classified/all-ads" key={c} className="bg-white p-6 rounded-xl border border-amber-100 text-center card-hover block">
          <MapPin className="w-6 h-6 text-[#E07A1F] mx-auto mb-2" />
          <div className="font-display text-xl text-stone-900">{c}</div>
          <div className="text-sm text-stone-500 mt-1">{items.filter((a) => a.location === c).length} ads</div>
        </Link>
      ))}
    </div>
  </section>
);

const PostAd = () => {
  const { isAuthed } = useMemberAuth();
  const settings = useSiteSettings();
  const [hp, setHp] = useState("");
  const [form, setForm] = useState({ title: "", category: "Services", location: "Dayton", price: "", description: "", contact: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/classifieds", {
        title: form.title,
        category: form.category,
        location: form.location,
        price: form.price || null,
        description: form.description,
        contact: form.contact,
        [HONEYPOT_FIELD]: hp,
      });
      setSubmitted(true);
      toast({ title: "Ad submitted!", description: "Your classified is under review and will go live once approved by the admin." });
      setForm({ title: "", category: "Services", location: "Dayton", price: "", description: "", contact: "" });
    } catch (err) {
      toast({ title: "Couldn't post your ad", description: err?.response?.data?.detail || "Please try again or contact support.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="py-20 bg-cream">
        <div className="max-w-xl mx-auto px-6" data-testid="classifieds-success">
          <div className="bg-white p-8 rounded-2xl border border-amber-100 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-display text-3xl text-[#8B1A1A] mb-2">Ad Submitted!</h2>
            <p className="text-stone-600 mb-1">Your classified is in the queue and will appear on the public board once approved.</p>
            <p className="text-stone-500 text-sm mb-6 flex items-center justify-center gap-1.5"><Clock className="w-4 h-4" /> Review typically takes 24–48 hours.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setSubmitted(false)} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium">Post another</button>
              <Link to="/classified/all-ads" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium transition">Browse Ads</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (settings.classifieds_members_only && !isAuthed) {
    return (
      <section className="py-16 bg-cream px-6">
        <SignInPrompt text="Posting classifieds is open to India Club members. Sign in to post your ad." />
      </section>
    );
  }

  return (
    <section className="py-16 bg-cream">
      <form onSubmit={submit} className="relative max-w-2xl mx-auto px-6 space-y-3" data-testid="classifieds-post-form">
        <Honeypot value={hp} onChange={setHp} />
        <div className="bg-white p-7 rounded-2xl border border-amber-100">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-2">POST A CLASSIFIED</div>
          <h2 className="font-display text-3xl text-[#8B1A1A] mb-1">Reach 1000+ families</h2>
          <p className="text-stone-500 text-sm mb-5">Your ad goes live after a brief admin review (24–48h).</p>
          <div className="space-y-3">
            <input data-testid="classifieds-input-title" required placeholder="Ad title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white" data-testid="classifieds-input-category">
                {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white" data-testid="classifieds-input-location">
                {LOCATIONS.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input placeholder="Price (e.g. $500) — optional" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="classifieds-input-price" />
            <textarea required rows={4} placeholder="Describe what you're selling, offering or looking for" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="classifieds-input-description" />
            <input required placeholder="Contact email or phone (visible after click)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" data-testid="classifieds-input-contact" />
            <button disabled={submitting} type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] disabled:opacity-70 text-amber-50 rounded-md font-medium flex items-center justify-center gap-2" data-testid="classifieds-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? "Submitting..." : "Post Ad"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

const EMPTY_BIZ = { name: "", category: "Other", description: "", phone: "", email: "", website: "", address: "", logo_url: "" };

const BusinessDirectory = () => {
  const { isAuthed } = useMemberAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [mine, setMine] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_BIZ);
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get("/businesses").then((r) => setItems(r.data)).catch(() => setItems([]));
    apiClient.get("/businesses/categories").then((r) => setCategories(r.data)).catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    if (isAuthed) apiClient.get("/members/me/businesses").then((r) => setMine(r.data)).catch(() => setMine([]));
  }, [isAuthed]);

  const filtered = (items || []).filter((b) =>
    (cat === "All" || b.category === cat) &&
    (!q.trim() || `${b.name} ${b.description || ""} ${b.category}`.toLowerCase().includes(q.trim().toLowerCase())));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.post("/businesses", { ...form, [HONEYPOT_FIELD]: hp });
      toast({ title: "Thanks! Your listing is under review", description: "It appears in the directory once an admin approves it." });
      setForm(EMPTY_BIZ);
      setShowForm(false);
      setMine((await apiClient.get("/members/me/businesses")).data);
    } catch (err) {
      toast({ title: "Couldn't submit", description: err?.response?.data?.detail || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const cls = "w-full px-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm";
  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search businesses" className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-md bg-white outline-none focus:border-[#8B1A1A]" data-testid="biz-search" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="py-2.5 px-3 border border-stone-200 rounded-md bg-white" data-testid="biz-category">
            {["All", ...categories].map((c) => <option key={c}>{c}</option>)}
          </select>
          {isAuthed ? (
            <button onClick={() => setShowForm((v) => !v)} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium" data-testid="biz-add">
              {showForm ? "Close form" : "List your business"}
            </button>
          ) : (
            <Link to="/login" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] rounded-md text-sm font-medium text-center">Members: list your business</Link>
          )}
        </div>

        {mine.some((b) => b.status !== "approved") && (
          <div className="mb-6 text-sm bg-sky-50 border border-sky-200 text-sky-900 rounded-lg p-3" data-testid="biz-mine">
            Your listings: {mine.map((b) => `${b.name} (${b.status})`).join(", ")}
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} className="relative bg-white p-6 rounded-2xl border border-amber-100 mb-8 grid md:grid-cols-2 gap-3" data-testid="biz-form">
            <Honeypot value={hp} onChange={setHp} />
            <input required placeholder="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cls} data-testid="biz-name" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={cls} data-testid="biz-form-category">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <textarea rows={3} placeholder="What does your business offer?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${cls} md:col-span-2`} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={cls} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={cls} />
            <input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={cls} />
            <input placeholder="Address / area served" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={cls} />
            <div className="md:col-span-2 flex justify-end">
              <button disabled={busy} className="px-6 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium disabled:opacity-60" data-testid="biz-submit">{busy ? "Submitting…" : "Submit for review"}</button>
            </div>
          </form>
        )}

        {!items ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-500 border border-dashed border-stone-300 rounded-xl" data-testid="biz-empty">
            {items.length === 0 ? "No businesses listed yet — members can add theirs." : "No businesses match your search."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="biz-list">
            {filtered.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-stone-200 p-5 flex gap-4 card-hover">
                {b.logo_url ? <img src={absoluteUrl(b.logo_url)} alt="" className="w-16 h-16 object-contain rounded bg-white border" /> : (
                  <div className="w-16 h-16 rounded bg-amber-50 flex items-center justify-center"><Store className="w-7 h-7 text-[#8B1A1A]" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[#E07A1F] font-medium">{b.category}</div>
                  <h3 className="font-display text-lg text-stone-900">{b.name}</h3>
                  {b.description && <p className="text-sm text-stone-600 line-clamp-3 mt-1">{b.description}</p>}
                  <div className="mt-2 space-y-0.5 text-xs text-stone-600">
                    {b.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> <a href={`tel:${b.phone}`} className="hover:text-[#8B1A1A]">{b.phone}</a></div>}
                    {b.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> <a href={`mailto:${b.email}`} className="hover:text-[#8B1A1A] break-all">{b.email}</a></div>}
                    {b.website && <div className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> <a href={b.website.startsWith("http") ? b.website : `https://${b.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#8B1A1A] break-all">{b.website.replace(/^https?:\/\//, "")}</a></div>}
                    {b.address && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {b.address}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default function ClassifiedPage() {
  const { sub } = useParams();
  // Used by CategoriesView and LocationsView for per-category/location counts
  const [items, setItems] = useState([]);
  useEffect(() => {
    apiClient.get("/classifieds")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]));
  }, []);

  const header = {
    undefined: { eyebrow: "BAZAAR", title: "Classifieds", subtitle: "Buy, sell, learn and connect within the ICGD community." },
    categories: { eyebrow: "BROWSE", title: "All Categories" },
    locations: { eyebrow: "BROWSE", title: "All Locations" },
    "all-ads": { eyebrow: "BAZAAR", title: "All Advertisements" },
    "post-ad": { eyebrow: "POST AN AD", title: "Post a Classified" },
    "business-directory": { eyebrow: "COMMUNITY", title: "Business Directory", subtitle: "Businesses run by members of our community." },
  }[sub || "undefined"];

  const render = () => {
    switch (sub) {
      case "categories": return <CategoriesView items={items} />;
      case "locations": return <LocationsView items={items} />;
      case "all-ads": return <List />;
      case "post-ad": return <PostAd />;
      case "business-directory": return <BusinessDirectory />;
      default: return <List />;
    }
  };
  return (<><PageHeader {...header} image="https://images.unsplash.com/photo-1651512186979-737021ace442?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" />{render()}</>);
}
