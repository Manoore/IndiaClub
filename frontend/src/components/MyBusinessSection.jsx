import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Loader2, ImagePlus, X, ExternalLink, CheckCircle2, Clock, AlertTriangle, EyeOff } from "lucide-react";
import { apiClient, absoluteUrl } from "../api/client";
import { useToast } from "../hooks/use-toast";

const EMPTY = {
  name: "", category: "Other", tagline: "", description: "", about: "", services: [], website: "", phone: "", email: "",
  address: "", hours: "", member_offer: "", facebook: "", instagram: "", linkedin: "", youtube: "",
  logo_url: "", cover_url: "", photos: [],
};
const MAX_PHOTOS = 6;
const cls = "w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm bg-white";

const Label = ({ children, hint }) => (
  <label className="block text-xs font-medium text-stone-700 mb-1">{children}{hint && <span className="text-stone-400 font-normal"> · {hint}</span>}</label>
);

// Uploads one image for the listing and returns its address
const useUpload = () => {
  const { toast } = useToast();
  return async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await apiClient.post("/members/me/business/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      return r.data.url;
    } catch (e) {
      toast({ title: "Upload failed", description: e.response?.data?.detail || e.message, variant: "destructive" });
      return null;
    }
  };
};

const ImageField = ({ label, hint, value, onChange, wide = false, testid }) => {
  const upload = useUpload();
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    const url = await upload(f);
    setBusy(false);
    if (url) onChange(url);
  };
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <div className="flex items-center gap-3">
        <div className={`${wide ? "w-40 h-20" : "w-20 h-20"} rounded-lg border border-dashed border-stone-300 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0`}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin text-[#8B1A1A]" /> : value ? <img src={absoluteUrl(value)} alt="" className={`w-full h-full ${wide ? "object-cover" : "object-contain"}`} /> : <ImagePlus className="w-5 h-5 text-stone-400" />}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => ref.current?.click()} className="px-3 py-1.5 border border-stone-300 hover:border-[#8B1A1A] rounded text-xs" data-testid={testid}>
            {value ? "Replace" : "Upload"}
          </button>
          {value && <button type="button" onClick={() => onChange("")} className="text-xs text-stone-500 hover:text-red-600 text-left">Remove</button>}
        </div>
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pick} />
      </div>
    </div>
  );
};

const PhotosField = ({ value, onChange }) => {
  const upload = useUpload();
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - value.length);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    const urls = [];
    for (const f of files) {
      const u = await upload(f); // one at a time keeps the order
      if (u) urls.push(u);
    }
    setBusy(false);
    onChange([...value, ...urls].slice(0, MAX_PHOTOS));
  };
  return (
    <div>
      <Label hint={`up to ${MAX_PHOTOS}, 2 MB each`}>Photos</Label>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {value.map((p) => (
          <div key={p} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 group">
            <img src={absoluteUrl(p)} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((x) => x !== p))} aria-label="Remove photo"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {value.length < MAX_PHOTOS && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy}
            className="aspect-square rounded-lg border border-dashed border-stone-300 hover:border-[#8B1A1A] flex flex-col items-center justify-center text-xs text-stone-500 gap-1" data-testid="biz-photos-add">
            {busy ? <Loader2 className="w-5 h-5 animate-spin text-[#8B1A1A]" /> : <><ImagePlus className="w-5 h-5" /> Add</>}
          </button>
        )}
      </div>
      <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pick} />
    </div>
  );
};

const ServicesField = ({ value, onChange }) => {
  const [t, setT] = useState("");
  const add = () => {
    const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))].slice(0, 20));
    setT("");
  };
  return (
    <div>
      <Label hint="press Enter after each">Services / products</Label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-stone-700 rounded-full pl-2.5 pr-1 py-0.5 text-xs">
            {s}<button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="p-0.5 hover:text-red-600"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <input value={t} onChange={(e) => setT(e.target.value)} onBlur={add}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="e.g. Wedding catering" className={cls} data-testid="biz-service-input" />
    </div>
  );
};

const StatusNote = ({ b }) => {
  if (b.status === "pending") return <div className="flex gap-2 items-start text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3"><Clock className="w-4 h-4 mt-0.5 shrink-0" /> Waiting for an admin to approve your listing. You can keep editing meanwhile.</div>;
  if (b.status === "rejected") return <div className="flex gap-2 items-start text-sm bg-rose-50 border border-rose-200 text-rose-900 rounded-lg p-3"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> An admin didn't approve this listing. Update it and save to send it for review again.</div>;
  if (!b.visible) return <div className="flex gap-2 items-start text-sm bg-stone-100 border border-stone-200 text-stone-700 rounded-lg p-3"><EyeOff className="w-4 h-4 mt-0.5 shrink-0" /> Your listing is hidden because your Business membership has lapsed. It comes back as soon as you renew.</div>;
  return (
    <div className="flex gap-2 items-center justify-between flex-wrap text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-3">
      <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Live in the Business Directory. Changes you save show straight away.</span>
      <Link to={`/business/${b.slug}`} className="inline-flex items-center gap-1 font-medium underline" data-testid="biz-view-page">View page <ExternalLink className="w-3.5 h-3.5" /></Link>
    </div>
  );
};

export default function MyBusinessSection() {
  const { toast } = useToast();
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await apiClient.get("/members/me/business");
      setInfo(r.data);
      const b = r.data.businesses?.[0];
      if (b) setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, b[k] ?? EMPTY[k]])));
    } catch {
      setInfo({ eligible: false, businesses: [], categories: [] });
    }
  };
  useEffect(() => { load(); }, []);

  if (!info) return null;
  const biz = info.businesses?.[0];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (biz) await apiClient.put(`/members/me/business/${biz.id}`, form);
      else await apiClient.post("/members/me/business", form);
      toast({ title: biz ? "Listing updated" : "Listing sent for approval", description: biz ? undefined : "An admin will review it shortly." });
      setEditing(false);
      await load();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast({ title: "Couldn't save", description: Array.isArray(d) ? d.map((x) => x.msg).join("; ") : d || err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="my-business" className="bg-white border border-stone-200 rounded-2xl p-6 scroll-mt-28" data-testid="my-business">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Store className="w-5 h-5 text-[#8B1A1A]" /></div>
        <div>
          <h2 className="font-display text-2xl text-[#8B1A1A]">My Business</h2>
          <p className="text-sm text-stone-500">Showcase your business in the ICGD Business Directory.</p>
        </div>
      </div>

      {!info.eligible && !biz ? (
        <div className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-lg p-4" data-testid="biz-not-eligible">
          Business listings are part of the <strong>Business membership</strong>: your own page with your story, photos, services,
          website and a special offer for members.{" "}
          <Link to="/membership/regular" className="text-[#8B1A1A] font-medium underline">See Business membership</Link>
        </div>
      ) : !editing ? (
        <div className="space-y-4">
          {biz ? (
            <>
              <StatusNote b={biz} />
              <div className="flex items-center gap-4">
                {biz.logo_url ? <img src={absoluteUrl(biz.logo_url)} alt="" className="w-14 h-14 object-contain rounded-lg border" /> : <div className="w-14 h-14 rounded-lg bg-amber-50 flex items-center justify-center"><Store className="w-6 h-6 text-[#8B1A1A]" /></div>}
                <div className="min-w-0">
                  <div className="font-display text-lg text-stone-900">{biz.name}</div>
                  <div className="text-xs text-stone-500">{biz.category}{biz.tagline ? ` · ${biz.tagline}` : ""}</div>
                </div>
              </div>
              {info.eligible ? (
                <button onClick={() => setEditing(true)} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium" data-testid="biz-edit">Edit listing</button>
              ) : (
                <p className="text-sm text-stone-600">Renew your Business membership to edit your listing.</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-stone-600">You haven't listed your business yet. It takes about 5 minutes; an admin approves it before it goes live.</p>
              <button onClick={() => setEditing(true)} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium" data-testid="biz-create">Create my listing</button>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={save} className="space-y-6" data-testid="biz-form">
          <fieldset className="grid md:grid-cols-2 gap-4">
            <legend className="font-cinzel text-xs tracking-[0.2em] text-[#E07A1F] mb-2">THE BASICS</legend>
            <div><Label>Business name *</Label><input required maxLength={150} value={form.name} onChange={set("name")} className={cls} data-testid="biz-name" /></div>
            <div><Label>Category *</Label>
              <select value={form.category} onChange={set("category")} className={cls} data-testid="biz-category">
                {(info.categories || []).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label hint="one line, shown under your name">Tagline</Label><input maxLength={160} value={form.tagline} onChange={set("tagline")} className={cls} placeholder="e.g. Authentic South Indian catering for every occasion" data-testid="biz-tagline" /></div>
            <div className="md:col-span-2"><Label hint="2–3 sentences for the directory card">Short description</Label><textarea rows={2} maxLength={600} value={form.description} onChange={set("description")} className={cls} /></div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="font-cinzel text-xs tracking-[0.2em] text-[#E07A1F] mb-2">YOUR STORY</legend>
            <div><Label hint="how you started, what makes you different">About your business</Label><textarea rows={7} maxLength={6000} value={form.about} onChange={set("about")} className={cls} data-testid="biz-about" /></div>
            <ServicesField value={form.services} onChange={setVal("services")} />
            <div><Label hint="shown in green on your page">Special offer for ICGD members</Label><input maxLength={300} value={form.member_offer} onChange={set("member_offer")} className={cls} placeholder="e.g. 10% off your first order. Mention ICGD." data-testid="biz-offer" /></div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="font-cinzel text-xs tracking-[0.2em] text-[#E07A1F] mb-2">PICTURES</legend>
            <div className="grid sm:grid-cols-2 gap-4">
              <ImageField label="Logo" hint="square works best" value={form.logo_url} onChange={setVal("logo_url")} testid="biz-logo" />
              <ImageField label="Cover photo" hint="wide, shown at the top" value={form.cover_url} onChange={setVal("cover_url")} wide testid="biz-cover" />
            </div>
            <PhotosField value={form.photos} onChange={setVal("photos")} />
          </fieldset>

          <fieldset className="grid md:grid-cols-2 gap-4">
            <legend className="font-cinzel text-xs tracking-[0.2em] text-[#E07A1F] mb-2">CONTACT</legend>
            <div><Label>Website</Label><input value={form.website} onChange={set("website")} className={cls} placeholder="www.yourbusiness.com" data-testid="biz-website" /></div>
            <div><Label>Phone</Label><input value={form.phone} onChange={set("phone")} className={cls} /></div>
            <div><Label>Email</Label><input type="email" value={form.email} onChange={set("email")} className={cls} /></div>
            <div><Label hint="or area served">Address</Label><input value={form.address} onChange={set("address")} className={cls} /></div>
            <div className="md:col-span-2"><Label hint="one line per day or range">Opening hours</Label><textarea rows={3} maxLength={500} value={form.hours} onChange={set("hours")} className={cls} placeholder={"Mon–Fri 9am–6pm\nSat 10am–4pm"} /></div>
          </fieldset>

          <fieldset className="grid md:grid-cols-2 gap-4">
            <legend className="font-cinzel text-xs tracking-[0.2em] text-[#E07A1F] mb-2">SOCIAL MEDIA</legend>
            {["facebook", "instagram", "linkedin", "youtube"].map((k) => (
              <div key={k}><Label>{k === "linkedin" ? "LinkedIn" : k === "youtube" ? "YouTube" : k[0].toUpperCase() + k.slice(1)}</Label>
                <input value={form[k]} onChange={set(k)} className={cls} placeholder={`${k}.com/yourpage`} /></div>
            ))}
          </fieldset>

          <div className="flex gap-3 justify-end border-t border-stone-100 pt-4">
            <button type="button" onClick={() => { setEditing(false); load(); }} className="px-5 py-2.5 border border-stone-200 rounded-md text-sm">Cancel</button>
            <button disabled={saving} className="px-6 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2" data-testid="biz-save">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {biz ? "Save changes" : "Submit for approval"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
