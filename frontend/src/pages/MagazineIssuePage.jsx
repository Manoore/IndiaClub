import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { apiClient, API } from "../api/client";
import { IssueCover, ArticleCard, MAG_NAME, fmtIssueDate } from "../components/MagazineParts";

export default function MagazineIssuePage() {
  const { slug } = useParams();
  const [issue, setIssue] = useState(undefined);

  useEffect(() => {
    setIssue(undefined);
    apiClient.get(`/magazine/issues/${encodeURIComponent(slug)}`).then((r) => setIssue(r.data)).catch(() => setIssue(null));
  }, [slug]);
  useEffect(() => { if (issue) document.title = `${issue.title} | ${MAG_NAME}`; }, [issue]);

  if (issue === undefined) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>;
  if (issue === null) {
    return (
      <section className="py-32 bg-cream text-center px-6">
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-3">Issue not found</h1>
        <Link to="/magazine" className="px-5 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium">All issues</Link>
      </section>
    );
  }

  return (
    <div className="bg-cream">
      <section className="py-14 border-b border-amber-100" data-testid="magazine-issue">
        <div className="max-w-6xl mx-auto px-6">
          <Link to="/magazine" className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-[#8B1A1A] mb-8"><ArrowLeft className="w-4 h-4" /> {MAG_NAME}</Link>
          <div className="grid md:grid-cols-[280px_1fr] gap-10 items-start">
            <IssueCover issue={issue} className="max-w-[280px] mx-auto md:mx-0" />
            <div>
              <div className="font-cinzel text-xs tracking-[0.25em] text-[#E07A1F]">{MAG_NAME.toUpperCase()} · {fmtIssueDate(issue.issue_date).toUpperCase()}</div>
              <h1 className="font-display text-4xl md:text-5xl text-[#8B1A1A] mt-2" data-testid="issue-title">{issue.title}</h1>
              {issue.intro && <p className="text-stone-700 mt-5 leading-relaxed whitespace-pre-line">{issue.intro}</p>}
              <div className="mt-7 flex flex-wrap gap-3">
                {issue.has_pdf && (
                  <a href={`${API}/magazine/issues/${encodeURIComponent(issue.slug)}/pdf`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium" data-testid="issue-read-pdf">
                    <FileText className="w-4 h-4" /> Read the full issue
                  </a>
                )}
                {issue.external_url && (
                  <a href={issue.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#8B1A1A] text-[#8B1A1A] rounded-md font-medium">
                    Read online <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {issue.articles.length > 0 && (
        <section className="py-14">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-display text-3xl text-stone-900 mb-6">In this issue</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{issue.articles.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
          </div>
        </section>
      )}
    </div>
  );
}
