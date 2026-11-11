import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { Loader2, ArrowLeft, FileText, ExternalLink, Lock } from "lucide-react";
import { apiClient } from "../api/client";
import { useMemberAuth } from "../api/MemberAuthContext";
import { useToast } from "../hooks/use-toast";
import { IssueCover, ArticleCard, MAG_NAME, fmtIssueDate } from "../components/MagazineParts";

export default function MagazineIssuePage() {
  const { slug } = useParams();
  const loc = useLocation();
  const { isAuthed } = useMemberAuth();
  const { toast } = useToast();
  const [issue, setIssue] = useState(undefined);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setIssue(undefined);
    apiClient.get(`/magazine/issues/${encodeURIComponent(slug)}`).then((r) => setIssue(r.data)).catch(() => setIssue(null));
  }, [slug]);
  useEffect(() => { if (issue) document.title = `${issue.title} | ${MAG_NAME}`; }, [issue]);

  // The PDF is only served to signed-in members, so it's fetched with the sign-in and opened from memory
  const openPdf = async () => {
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const r = await apiClient.get(`/magazine/issues/${slug}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (tab) tab.close();
      toast({ title: "Couldn't open the issue", description: e.response?.status === 401 ? "Please sign in again." : "Please try again.", variant: "destructive" });
    } finally {
      setOpening(false);
    }
  };

  if (issue === undefined) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>;
  if (issue === null) {
    return (
      <section className="py-32 bg-cream text-center px-6">
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-3">Issue not found</h1>
        <Link to="/magazine" className="px-5 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium">All issues</Link>
      </section>
    );
  }
  const signIn = `/login?next=${encodeURIComponent(loc.pathname)}`;

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
                {issue.has_pdf && (isAuthed ? (
                  <button onClick={openPdf} disabled={opening} className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium disabled:opacity-60" data-testid="issue-read-pdf">
                    {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Read the full issue
                  </button>
                ) : (
                  <Link to={signIn} className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium" data-testid="issue-signin">
                    <Lock className="w-4 h-4" /> Sign in to read the full issue
                  </Link>
                ))}
                {issue.external_url && (
                  <a href={issue.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#8B1A1A] text-[#8B1A1A] rounded-md font-medium">
                    Read online <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              {issue.has_pdf && !isAuthed && (
                <p className="text-xs text-stone-500 mt-3">Free for everyone with an ICGD account. <Link to={`/login?mode=signup&next=${encodeURIComponent(loc.pathname)}`} className="underline">Create a free account</Link></p>
              )}
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
