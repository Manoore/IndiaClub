import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { apiClient, API } from "../api/client";
import { IssueCover, ArticleCard, MAG_NAME, fmtIssueDate } from "../components/MagazineParts";
import PdfReader from "../components/PdfReader";

// One edition of the magazine: the whole PDF to scroll through, page by page
export default function MagazineIssuePage() {
  const { slug } = useParams();
  const [edition, setEdition] = useState(undefined);

  useEffect(() => {
    setEdition(undefined);
    apiClient.get(`/magazine/issues/${encodeURIComponent(slug)}`).then((r) => setEdition(r.data)).catch(() => setEdition(null));
  }, [slug]);
  useEffect(() => { if (edition) document.title = `${edition.title} | ${MAG_NAME}`; }, [edition]);

  if (edition === undefined) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>;
  if (edition === null) {
    return (
      <section className="py-32 bg-cream text-center px-6">
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-3">Edition not found</h1>
        <Link to="/magazine" className="px-5 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium">All editions</Link>
      </section>
    );
  }
  const pdfUrl = edition.has_pdf ? `${API}/magazine/issues/${encodeURIComponent(edition.slug)}/pdf` : null;
  const when = fmtIssueDate(edition.issue_date);

  return (
    <div className="bg-cream">
      <section className={`pt-10 ${pdfUrl ? "pb-6" : "pb-14 border-b border-amber-100"}`} data-testid="magazine-issue">
        <div className={`${pdfUrl ? "max-w-4xl" : "max-w-6xl"} mx-auto px-4 sm:px-6`}>
          <Link to="/magazine" className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-[#8B1A1A] mb-6"><ArrowLeft className="w-4 h-4" /> {MAG_NAME}</Link>
          <div className={pdfUrl ? "" : "grid md:grid-cols-[280px_1fr] gap-10 items-start"}>
            {/* Without a PDF the cover stands in; with one, the first page is the cover */}
            {!pdfUrl && <IssueCover issue={edition} className="max-w-[280px] mx-auto md:mx-0" />}
            <div>
              <div className="font-cinzel text-xs tracking-[0.25em] text-[#E07A1F]">{MAG_NAME.toUpperCase()}{when ? ` · ${when.toUpperCase()}` : ""}</div>
              <h1 className="font-display text-4xl md:text-5xl text-[#8B1A1A] mt-2" data-testid="issue-title">{edition.title}</h1>
              {edition.intro && <p className="text-stone-700 mt-4 leading-relaxed whitespace-pre-line">{edition.intro}</p>}
              {edition.external_url && (
                <a href={edition.external_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] rounded-md text-sm font-medium">
                  Read online <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {pdfUrl && (
        <section className="pb-14">
          <div className="max-w-4xl mx-auto px-2 sm:px-6">
            <PdfReader url={pdfUrl} title={edition.title} fileName={`Vibrant-Dayton-${edition.slug}.pdf`} />
          </div>
        </section>
      )}

      {edition.articles.length > 0 && (
        <section className="py-14 border-t border-amber-100">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-display text-3xl text-stone-900 mb-6">In this edition</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{edition.articles.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
          </div>
        </section>
      )}
    </div>
  );
}
