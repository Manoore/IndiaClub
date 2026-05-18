import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Upload, Search } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../hooks/use-toast";

/**
 * Generic admin CRUD page.
 * Props:
 *  - title, description
 *  - endpoint (e.g. "events")
 *  - columns: [{ key, label, render?(row) }]
 *  - fields: [{ key, label, type: 'text'|'textarea'|'number'|'select'|'image'|'checkbox'|'tags'|'array-of-objects', options?, required, placeholder, default }]
 *  - readOnly (for inbox-style)
 *  - extraActions: function(row) returning JSX (for approve/reject etc)
 */
export default function CrudPage({ title, description, endpoint, columns, fields, readOnly = false, extraActions = null, isInbox = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null=closed, {}=create, obj=edit
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const url = isInbox ? `/admin/${endpoint}` : `/admin/${endpoint}`;

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get(url);
      setItems(r.data || []);
    } catch (e) {
      toast({ title: "Failed to load", description: String(e.message) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint]);

  const handleSave = async (data) => {
    try {
      if (editing.id) {
        await apiClient.put(`${url}/${editing.id}`, data);
        toast({ title: "Updated" });
      } else {
        await apiClient.post(url, data);
        toast({ title: "Created" });
      }
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.response?.data?.detail || String(e.message) });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await apiClient.delete(`${url}/${id}`);
      toast({ title: "Deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed" });
    }
  };

  const filtered = items.filter((i) => {
    if (!search) return true;
    return Object.values(i).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-7 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900">{title}</h1>
          {description && <p className="text-stone-500 mt-1 text-sm">{description}</p>}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm sm:w-56" />
          </div>
          {!readOnly && (
            <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition whitespace-nowrap">
              <Plus className="w-4 h-4" /> New
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                {columns.map((c) => <th key={c.key} className="text-left px-5 py-3 font-cinzel tracking-wider text-[11px]">{c.label.toUpperCase()}</th>)}
                <th className="px-5 py-3 text-right font-cinzel tracking-wider text-[11px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="text-center py-10 text-stone-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="text-center py-10 text-stone-400">No items.</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="hover:bg-amber-50/40 transition">
                  {columns.map((c) => (
                    <td key={c.key} className="px-5 py-3 align-top text-stone-700">
                      {c.render ? c.render(row) : <span className="line-clamp-2">{String(row[c.key] ?? "")}</span>}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {extraActions && extraActions(row, load)}
                    {!readOnly && (
                      <button onClick={() => setEditing(row)} className="p-1.5 text-stone-500 hover:text-[#8B1A1A] ml-1" title="Edit"><Pencil className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleDelete(row.id)} className="p-1.5 text-stone-500 hover:text-red-600 ml-1" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && (
        <EditModal
          isNew={!editing.id}
          initial={editing}
          fields={fields}
          title={title}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function EditModal({ isNew, initial, fields, title, onClose, onSave }) {
  const seed = {};
  fields.forEach((f) => { seed[f.key] = initial[f.key] ?? f.default ?? (f.type === "checkbox" ? false : (f.type === "tags" || f.type === "array-of-objects" ? [] : "")); });
  const [data, setData] = useState(seed);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const updateField = (key, value) => setData((d) => ({ ...d, [key]: value }));

  const submit = (e) => { e.preventDefault(); onSave(data); };

  const uploadFile = async (key, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large (5MB max)" }); return; }
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await apiClient.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const fullUrl = (process.env.REACT_APP_BACKEND_URL || "") + r.data.url;
      updateField(key, fullUrl);
      toast({ title: "Uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", description: e.response?.data?.detail || String(e.message) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-stone-200 p-5 flex items-center justify-between z-10">
          <div>
            <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">{isNew ? "NEW" : "EDIT"}</div>
            <h3 className="font-display text-2xl text-[#8B1A1A]">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-md"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-stone-700 mb-1">{f.label}{f.required && <span className="text-red-500">*</span>}</label>
              {f.type === "textarea" ? (
                <textarea rows={f.rows || 3} value={data[f.key] || ""} required={f.required} onChange={(e) => updateField(f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              ) : f.type === "number" ? (
                <input type="number" value={data[f.key] ?? ""} required={f.required} onChange={(e) => updateField(f.key, e.target.value === "" ? null : Number(e.target.value))} placeholder={f.placeholder} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              ) : f.type === "select" ? (
                <select value={data[f.key] || ""} onChange={(e) => updateField(f.key, e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] bg-white">
                  <option value="">{f.placeholder || "Select"}</option>
                  {(f.options || []).map((o) => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
                </select>
              ) : f.type === "checkbox" ? (
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!data[f.key]} onChange={(e) => updateField(f.key, e.target.checked)} className="w-4 h-4 accent-[#8B1A1A]" />
                  <span className="text-sm text-stone-700">{f.hint || "Yes"}</span>
                </label>
              ) : f.type === "image" ? (
                <div className="space-y-2">
                  <input type="text" value={data[f.key] || ""} onChange={(e) => updateField(f.key, e.target.value)} placeholder="Image URL or upload below" className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded text-xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Upload Image"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(f.key, e.target.files[0])} />
                  </label>
                  {data[f.key] && <img src={data[f.key]} alt="preview" className="max-h-32 rounded border border-stone-200" />}
                </div>
              ) : f.type === "tags" ? (
                <textarea rows={3} value={(data[f.key] || []).join("\n")} onChange={(e) => updateField(f.key, e.target.value.split("\n").filter(Boolean))} placeholder={"One per line"} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              ) : f.type === "array-of-objects" ? (
                <ArrayOfObjects value={data[f.key] || []} onChange={(v) => updateField(f.key, v)} schema={f.schema} />
              ) : f.type === "ticket-types" ? (
                <TicketTypesEditor value={data[f.key] || []} onChange={(v) => updateField(f.key, v)} />
              ) : (
                <input type="text" value={data[f.key] || ""} required={f.required} onChange={(e) => updateField(f.key, e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
              )}
              {f.hint && f.type !== "checkbox" && <p className="text-xs text-stone-400 mt-1">{f.hint}</p>}
            </div>
          ))}
          <div className="pt-3 flex gap-3">
            <button type="submit" className="flex-1 py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition">Save</button>
            <button type="button" onClick={onClose} className="px-5 py-3 border border-stone-200 hover:bg-stone-50 rounded-md font-medium transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArrayOfObjects({ value, onChange, schema = [] }) {
  const add = () => onChange([...value, Object.fromEntries(schema.map((k) => [k, ""]))]);
  const update = (i, key, v) => onChange(value.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="p-3 bg-stone-50 rounded border border-stone-200">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {schema.map((k) => (
                <input key={k} placeholder={k} value={row[k] || ""} onChange={(e) => update(i, k, e.target.value)} className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm outline-none focus:border-[#8B1A1A]" />
              ))}
            </div>
            <button type="button" onClick={() => remove(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8B1A1A] rounded text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add</button>
    </div>
  );
}

function TicketTypesEditor({ value, onChange }) {
  const genId = () => Math.random().toString(36).slice(2, 10);
  const add = () =>
    onChange([
      ...value,
      {
        id: genId(),
        name: "Regular",
        description: "",
        price: 0,
        members_only: false,
        sale_start: "",
        sale_end: "",
        quantity_total: 0,
        quantity_sold: 0,
        order: (value?.length || 0) + 1,
      },
    ]);
  const update = (i, key, v) => onChange(value.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)));
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const cls = "px-2 py-1.5 border border-stone-200 rounded text-sm outline-none focus:border-[#8B1A1A] w-full";
  return (
    <div className="space-y-3">
      {(value || []).map((t, i) => (
        <div key={t.id || i} className="p-3 bg-stone-50 rounded border border-stone-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-xs text-stone-500 font-cinzel tracking-wider">TICKET TYPE #{i + 1}</div>
            <button type="button" onClick={() => remove(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Name (e.g. Early Bird)" value={t.name || ""} onChange={(e) => update(i, "name", e.target.value)} className={cls} />
            <input type="number" placeholder="Price (USD)" value={t.price ?? 0} onChange={(e) => update(i, "price", Number(e.target.value))} className={cls} />
          </div>
          <input placeholder="Short description (optional)" value={t.description || ""} onChange={(e) => update(i, "description", e.target.value)} className={`${cls} mt-2`} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input type="datetime-local" placeholder="Sale start" value={t.sale_start || ""} onChange={(e) => update(i, "sale_start", e.target.value)} className={cls} />
            <input type="datetime-local" placeholder="Sale end" value={t.sale_end || ""} onChange={(e) => update(i, "sale_end", e.target.value)} className={cls} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input type="number" placeholder="Total quantity (0 = unlimited)" value={t.quantity_total ?? 0} onChange={(e) => update(i, "quantity_total", Number(e.target.value))} className={cls} />
            <div className="flex items-center gap-2 text-sm text-stone-600">
              Sold: <span className="font-medium">{t.quantity_sold || 0}</span>
              {t.quantity_total > 0 && <span className="text-stone-400">/ {t.quantity_total}</span>}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer mt-2">
            <input type="checkbox" checked={!!t.members_only} onChange={(e) => update(i, "members_only", e.target.checked)} className="w-4 h-4 accent-[#8B1A1A]" />
            <span className="text-sm text-stone-700">Members only (only active members can purchase)</span>
          </label>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8B1A1A] rounded text-xs font-medium">
        <Plus className="w-3.5 h-3.5" /> Add Ticket Type
      </button>
    </div>
  );
}
