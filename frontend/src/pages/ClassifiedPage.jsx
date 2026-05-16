import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { CLASSIFIEDS } from "../data/mock";
import { Search, MapPin, Calendar, Plus, X } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const CATEGORIES = ["All", "Education", "Housing", "Vehicles", "Services", "For Sale", "Jobs"];
const LOCATIONS = ["All", "Dayton", "Centerville", "Beavercreek", "Kettering", "Springboro", "Oakwood"];

const List = ({ filter }) => {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [loc, setLoc] = useState("All");
  const localAds = JSON.parse(localStorage.getItem("icgd_ads") || "[]");
  const all = [...localAds, ...CLASSIFIEDS];
  const items = useMemo(() => all.filter((a) =>
    (cat === "All" || a.category === cat) &&
    (loc === "All" || a.location === loc) &&
    (search === "" || a.title.toLowerCase().includes(search.toLowerCase()))
  ), [search, cat, loc, all.length]);
  return (
    <section className="py-16 bg-cream">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white p-4 rounded-xl border border-amber-100 mb-8 grid md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ads" className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="py-2.5 px-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className="py-2.5 px-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white">
            {LOCATIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-20 text-stone-500">No ads match your filters.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((c) => (
              <div key={c.id} className="flex gap-4 p-3 bg-white rounded-xl border border-stone-200 card-hover">
                <img src={c.image} alt={c.title} className="w-28 h-28 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8B1A1A] font-medium">{c.category}</span>
                    <span className="text-stone-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.date}</span>
                  </div>
                  <h4 className="font-display text-lg text-stone-900 mt-1 line-clamp-2">{c.title}</h4>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-stone-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {c.location}</span>
                    <span className="font-semibold text-[#E07A1F]">{c.price}</span>
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

const CategoriesView = () => (
  <section className="py-16 bg-cream">
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {CATEGORIES.slice(1).map((c) => (
        <div key={c} className="bg-white p-6 rounded-xl border border-amber-100 text-center card-hover">
          <div className="font-display text-2xl text-[#8B1A1A]">{c}</div>
          <div className="text-sm text-stone-500 mt-1">{CLASSIFIEDS.filter((a) => a.category === c).length} ads</div>
        </div>
      ))}
    </div>
  </section>
);

const LocationsView = () => (
  <section className="py-16 bg-cream">
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {LOCATIONS.slice(1).map((c) => (
        <div key={c} className="bg-white p-6 rounded-xl border border-amber-100 text-center card-hover">
          <MapPin className="w-6 h-6 text-[#E07A1F] mx-auto mb-2" />
          <div className="font-display text-xl text-stone-900">{c}</div>
          <div className="text-sm text-stone-500 mt-1">{CLASSIFIEDS.filter((a) => a.location === c).length} ads</div>
        </div>
      ))}
    </div>
  </section>
);

const PostAd = () => {
  const [form, setForm] = useState({ title: "", category: "Services", location: "Dayton", price: "", description: "", contact: "" });
  const { toast } = useToast();
  const submit = (e) => {
    e.preventDefault();
    const ads = JSON.parse(localStorage.getItem("icgd_ads") || "[]");
    const newAd = { ...form, id: `local-${Date.now()}`, date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }), image: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=600" };
    ads.unshift(newAd);
    localStorage.setItem("icgd_ads", JSON.stringify(ads));
    toast({ title: "Ad posted!", description: "Your classified is live. View it in All Advertisements." });
    setForm({ title: "", category: "Services", location: "Dayton", price: "", description: "", contact: "" });
  };
  return (
    <section className="py-16 bg-cream">
      <form onSubmit={submit} className="max-w-2xl mx-auto px-6 space-y-3">
        <div className="bg-white p-7 rounded-2xl border border-amber-100">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-2">POST A CLASSIFIED</div>
          <h2 className="font-display text-3xl text-[#8B1A1A] mb-5">Reach 1000+ families</h2>
          <div className="space-y-3">
            <input required placeholder="Ad title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white">
                {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white">
                {LOCATIONS.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input placeholder="Price (e.g. $500)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <textarea required rows={4} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <input required placeholder="Contact email or phone" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
            <button type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium">Post Ad</button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default function ClassifiedPage() {
  const { sub } = useParams();
  const header = {
    undefined: { eyebrow: "BAZAAR", title: "Classifieds", subtitle: "Buy, sell, learn and connect within the ICGD community." },
    categories: { eyebrow: "BROWSE", title: "All Categories" },
    locations: { eyebrow: "BROWSE", title: "All Locations" },
    "all-ads": { eyebrow: "BAZAAR", title: "All Advertisements" },
    "post-ad": { eyebrow: "POST AN AD", title: "Post a Classified" },
  }[sub || "undefined"];
  const render = () => {
    switch (sub) {
      case "categories": return <CategoriesView />;
      case "locations": return <LocationsView />;
      case "all-ads": return <List />;
      case "post-ad": return <PostAd />;
      default: return <List />;
    }
  };
  return (<><PageHeader {...header} image="https://images.unsplash.com/photo-1645264090488-a019de493023?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920" />{render()}</>);
}
