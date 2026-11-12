import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, BookOpen, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { apiClient } from "../api/client";
import { IssueCover, IssueCard, ArticleCard, MAG_NAME, fmtIssueDate } from "../components/MagazineParts";

export default function MagazinePage() {
  const [issues, setIssues] = useState(null);
  const [articles, setArticles] = useState([]);
  const [cat, setCat] = useState("All");

  useEffect(() => {
    apiClient.get("/magazine/issues").then((r) => setIssues(r.data || [])).catch(() => setIssues([]));
    apiClient.get("/magazine/articles", { params: { limit: 60 } }).then((r) => setArticles(r.data || [])).catch(() => setArticles([]));
  }, []);

  const latest = useMemo(() => (issues || []).find((i) => i.featured) || (issues || [])[0], [issues]);
  const past = (issues || []).filter((i) => i !== latest);
  const cats = useMemo(() => ["All", ...new Set(articles.map((a) => a.category).filter(Boolean))], [articles]);
  const shown = articles.filter((a) => cat === "All" || a.category === cat).slice(0, 12);

  return (
    <>
      <PageHeader eyebrow="DIGITAL MAGAZINE" title={MAG_NAME}
        subtitle="Stories, people and businesses from the Indian community of Greater Dayton."
        image="https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" />

      {!issues ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>
      ) : !latest && articles.length === 0 ? (
        <section className="py-24 bg-cream text-center px-6" data-testid="magazine-empty">
          <BookOpen className="w-10 h-10 text-[#E07A1F] mx-auto mb-3" />
          <h2 className="font-display text-2xl text-[#8B1A1A]">The first edition is on its way</h2>
          <p className="text-stone-600 mt-2">Check back soon for {MAG_NAME}.</p>
        </section>
      ) : (
        <>
          {latest && (
            <section className="py-14 bg-cream">
              <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-[260px_1fr] gap-10 items-center" data-testid="magazine-latest">
                <Link to={`/magazine/${latest.slug}`}><IssueCover issue={latest} className="max-w-[260px] mx-auto hover:-translate-y-1 transition" /></Link>
                <div>
                  <div className="font-cinzel text-xs tracking-[0.25em] text-[#E07A1F]">LATEST EDITION{latest.issue_date ? ` · ${fmtIssueDate(latest.issue_date).toUpperCase()}` : ""}</div>
                  <h2 className="font-display text-4xl text-[#8B1A1A] mt-2">{latest.title}</h2>
                  {latest.intro && <p className="text-stone-700 mt-4 leading-relaxed whitespace-pre-line line-clamp-6">{latest.intro}</p>}
                  <Link to={`/magazine/${latest.slug}`} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium" data-testid="magazine-open-latest">
                    Read this edition <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {articles.length > 0 && (
            <section className="py-14 bg-white">
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
                  <h2 className="font-display text-3xl text-stone-900">Latest stories</h2>
                  {cats.length > 2 && (
                    <div className="flex gap-2 flex-wrap">
                      {cats.map((c) => (
                        <button key={c} onClick={() => setCat(c)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${cat === c ? "bg-[#8B1A1A] text-amber-50 border-[#8B1A1A]" : "bg-white text-stone-600 border-stone-200 hover:border-[#8B1A1A]"}`}>{c}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{shown.map((a) => <ArticleCard key={a.id} a={a} showIssue />)}</div>
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="py-14 bg-cream">
              <div className="max-w-7xl mx-auto px-6">
                <h2 className="font-display text-3xl text-stone-900 mb-6">Past editions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6" data-testid="magazine-past">
                  {past.map((i) => <IssueCard key={i.id} issue={i} />)}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
