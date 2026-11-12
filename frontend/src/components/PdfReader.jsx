import React, { useEffect, useRef, useState } from "react";
import { Loader2, Download, ExternalLink } from "lucide-react";

// PDF.js draws each page as an image, so the whole magazine shows on every device
// (iPhone/iPad Safari only shows the first page of an embedded PDF).
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let loader = null;
const loadPdfJs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFJS;
      s.async = true;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
        resolve(window.pdfjsLib);
      };
      s.onerror = () => { loader = null; reject(new Error("Couldn't load the PDF reader")); };
      document.head.appendChild(s);
    });
  }
  return loader;
};

function Page({ pdf, number, width, ratio, onVisible }) {
  const holder = useRef(null);
  const canvas = useRef(null);
  const [near, setNear] = useState(false);
  const drawn = useRef(0);

  // Draw a page only when it gets close to the screen
  useEffect(() => {
    const el = holder.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setNear(true)), { rootMargin: "1200px 0px" });
    io.observe(el);
    const seen = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && onVisible(number)), { threshold: 0.4 });
    seen.observe(el);
    return () => { io.disconnect(); seen.disconnect(); };
  }, [number, onVisible]);

  useEffect(() => {
    if (!near || !width || drawn.current === width) return undefined;
    let cancelled = false;
    let task = null;
    pdf.getPage(number).then((page) => {
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      task = page.render({ canvasContext: c.getContext("2d"), viewport: vp });
      return task.promise.then(() => { if (!cancelled) drawn.current = width; });
    }).catch(() => {});
    return () => { cancelled = true; if (task) task.cancel(); };
  }, [near, width, pdf, number]);

  return (
    <div ref={holder} className="relative bg-white shadow-md rounded-sm overflow-hidden" style={{ width, height: width * ratio }} data-testid={`pdf-page-${number}`}>
      {drawn.current !== width && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>}
      <canvas ref={canvas} className="block w-full h-full" aria-label={`Page ${number}`} />
    </div>
  );
}

export default function PdfReader({ url, title = "Magazine", fileName = "magazine.pdf" }) {
  const box = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [ratios, setRatios] = useState([]);
  const [width, setWidth] = useState(0);
  const [current, setCurrent] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let doc = null;
    setPdf(null); setRatios([]); setError("");
    loadPdfJs()
      .then((lib) => lib.getDocument({ url }).promise)
      .then(async (d) => {
        doc = d;
        // Page shapes up front so the page doesn't jump while scrolling
        const sizes = [];
        for (let i = 1; i <= d.numPages; i += 1) {
          const v = (await d.getPage(i)).getViewport({ scale: 1 });
          sizes.push(v.height / v.width);
        }
        if (!cancelled) { setRatios(sizes); setPdf(d); }
      })
      .catch(() => { if (!cancelled) setError("The magazine couldn't be shown here."); });
    return () => { cancelled = true; if (doc) doc.destroy(); };
  }, [url]);

  // Fit pages to the reading column, and redraw sharply when the window size changes
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    let t = null;
    const measure = () => setWidth(Math.max(260, Math.min(900, Math.floor(el.clientWidth))));
    measure();
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(measure, 150); });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  const onVisible = React.useCallback((n) => setCurrent(n), []);

  return (
    <div className="w-full" data-testid="pdf-reader">
      <div className="sticky top-20 md:top-[7.5rem] z-20 mb-4 flex items-center justify-between gap-3 bg-white/95 backdrop-blur border border-stone-200 rounded-lg px-4 py-2 text-sm shadow-sm">
        <span className="text-stone-600" data-testid="pdf-page-count">
          {pdf ? <>Page <strong className="text-stone-900">{current}</strong> of {pdf.numPages}</> : error ? "" : "Loading…"}
        </span>
        <span className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-200 rounded-md hover:border-[#8B1A1A] text-stone-700"><ExternalLink className="w-4 h-4" /><span className="hidden sm:inline">Open</span></a>
          <a href={url} download={fileName} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md" data-testid="pdf-download"><Download className="w-4 h-4" /><span className="hidden sm:inline">Download</span></a>
        </span>
      </div>
      <div ref={box} className="w-full flex flex-col items-center gap-4">
        {error ? (
          <div className="text-center py-16 text-stone-600">
            {error} <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#8B1A1A] underline">Open the PDF</a> instead.
          </div>
        ) : !pdf || !width ? (
          <div className="py-24 flex flex-col items-center text-stone-500 gap-3"><Loader2 className="w-7 h-7 animate-spin text-[#8B1A1A]" /> Opening {title}…</div>
        ) : (
          ratios.map((r, i) => <Page key={i + 1} pdf={pdf} number={i + 1} width={width} ratio={r} onVisible={onVisible} />)
        )}
      </div>
    </div>
  );
}
