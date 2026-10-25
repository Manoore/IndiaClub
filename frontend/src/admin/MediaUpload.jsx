import React, { useRef, useState } from "react";
import { Upload, Loader2, FileText, X, Link as LinkIcon } from "lucide-react";
import { apiClient, absoluteUrl } from "../api/client";
import { useToast } from "../hooks/use-toast";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload an image or PDF straight from the computer (click or drag and drop).
 * Pasting a link is still possible, as a secondary option.
 * kind: "image" | "pdf"
 */
export default function MediaUpload({ value, onChange, kind = "image", testid }) {
  const { toast } = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const isPdf = kind === "pdf";
  const accept = isPdf ? "application/pdf" : "image/png,image/jpeg,image/webp,image/gif";

  const upload = async (file) => {
    if (!file) return;
    const okType = isPdf ? file.type === "application/pdf" : /^image\/(png|jpeg|webp|gif)$/.test(file.type);
    if (!okType) {
      toast({ title: "That file type isn't supported", description: isPdf ? "Choose a PDF file." : "Choose a PNG, JPG, WebP or GIF image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "The limit is 5 MB. Try a smaller or compressed file." });
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await apiClient.post("/admin/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(absoluteUrl(r.data.url));
      toast({ title: isPdf ? "PDF uploaded" : "Image uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", description: e.response?.data?.detail || e.message });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    upload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-2" data-testid={testid}>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid={testid ? `${testid}-file` : undefined} />
      {value ? (
        <div className="flex items-center gap-3 p-2 border border-stone-200 rounded-md bg-white">
          {isPdf ? (
            <a href={value} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#8B1A1A] hover:underline min-w-0">
              <FileText className="w-8 h-8 flex-shrink-0" /> <span className="truncate">View uploaded PDF</span>
            </a>
          ) : (
            <img src={value} alt="Preview" className="h-20 max-w-[10rem] rounded object-cover border border-stone-200" />
          )}
          <div className="ml-auto flex flex-col sm:flex-row gap-1.5">
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:border-[#8B1A1A] rounded text-xs disabled:opacity-50">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Replace
            </button>
            <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:border-red-500 hover:text-red-600 rounded text-xs">
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          disabled={busy}
          className={`w-full flex flex-col items-center justify-center gap-1 py-6 border-2 border-dashed rounded-md text-sm transition-colors ${drag ? "border-[#8B1A1A] bg-amber-50" : "border-stone-300 hover:border-[#8B1A1A] bg-stone-50"}`}
          data-testid={testid ? `${testid}-drop` : undefined}
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin text-[#8B1A1A]" /> : isPdf ? <FileText className="w-6 h-6 text-[#8B1A1A]" /> : <Upload className="w-6 h-6 text-[#8B1A1A]" />}
          <span className="font-medium text-stone-800">{busy ? "Uploading…" : isPdf ? "Upload a PDF" : "Upload an image"}</span>
          <span className="text-xs text-stone-500">Click to choose a file, or drag it here · {isPdf ? "PDF" : "PNG, JPG, WebP or GIF"}, up to 5 MB</span>
        </button>
      )}
      {showLink ? (
        <input type="url" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A] text-sm" />
      ) : (
        <button type="button" onClick={() => setShowLink(true)} className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#8B1A1A]">
          <LinkIcon className="w-3 h-3" /> Or paste a link instead
        </button>
      )}
    </div>
  );
}
