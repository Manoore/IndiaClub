import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { Loader2, ArrowLeft, Lock, Store, ArrowRight } from "lucide-react";
import { apiClient, absoluteUrl } from "../api/client";
import { useMemberAuth } from "../api/MemberAuthContext";
import { ArticleBody, MAG_NAME } from "../components/MagazineParts";

export default function MagazineArticlePage() {
  const { slug } = useParams();
  const loc = useLocation();
  const { isAuthed, token } = useMemberAuth();
  const [a, setA] = useState(undefined);
  const [biz, setBiz] = useState(null);

  // Reload after sign-in so the full article replaces the preview
  useEffect(() => {
    setA(undefined);
    apiClient.get(`/magazine/articles/${encodeURIComponent(slug)}`).then((r) => setA(r.data)).catch(() => setA(null));
  }, [slug, isAuthed, token]);
  useEffect(() => {
    if (a) document.title = `${a.title} | ${MAG_NAME}`;
    setBiz(null);
    if (a?.business_slug) apiClient.get(`/businesses/by-slug/${encodeURIComponent(a.business_slug)}`).then((r) => setBiz(r.data)).catch(() => setBiz(null));
  }, [a]);

  if (a === undefined) return <div className="py-32 flex justify-center"><Loader2 className="w-7 h-7 text-[#8B1A1A] animate-spin" /></div>;
  if (a === null) {
    return (
      <section className="py-32 bg-cream text-center px-6">
        <h1 className="font-display text-3xl text-[#8B1A1A] mb-3">Article not found</h1>
        <Link to="/magazine" className="px-5 py-2.5 bg-[#8B1A1A] text-amber-50 rounded-md text-sm font-medium">Back to {MAG_NAME}</Link>
      </section>
    );
  }
  const next = encodeURIComponent(loc.pathname);

  return (
    <article className="bg-cream pb-16" data-testid="magazine-article">
      {a.cover_url && (
        <div className="h-64 md:h-96 bg-stone-200"><img src={absoluteUrl(a.cover_url)} alt="" className="w-full h-full object-cover" /></div>
      )}
      <div className="max-w-3xl mx-auto px-6">
        <div className={`${a.cover_url ? "-mt-16 relative" : "pt-12"} bg-white rounded-2xl border border-stone-200 p-6 md:p-10 shadow-sm`}>
          <Link to={a.issue ? `/magazine/${a.issue.slug}` : "/magazine"} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#8B1A1A] mb-5">
            <ArrowLeft className="w-4 h-4" /> {a.issue ? a.issue.title : MAG_NAME}
          </Link>
          <div className="text-xs text-[#E07A1F] font-medium tracking-wide">{a.category}</div>
          <h1 className="font-display text-3xl md:text-4xl text-stone-900 mt-1" data-testid="article-title">{a.title}</h1>
          {a.author && <div className="text-sm text-stone-500 mt-2">By {a.author}</div>}
          {a.summary && <p className="text-lg text-stone-600 mt-5 italic">{a.summary}</p>}
          <hr className="my-7 border-amber-100" />

          <ArticleBody paragraphs={a.paragraphs || []} />

          {a.locked && (
            <div className="relative mt-2">
              <div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              <div className="text-center bg-amber-50 border border-amber-200 rounded-xl p-7" data-testid="article-locked">
                <Lock className="w-6 h-6 text-[#8B1A1A] mx-auto mb-2" />
                <h3 className="font-display text-xl text-[#8B1A1A]">Keep reading with a free ICGD account</h3>
                <p className="text-sm text-stone-600 mt-1">{MAG_NAME} is free for everyone with an account.</p>
                <div className="mt-4 flex justify-center gap-3 flex-wrap">
                  <Link to={`/login?next=${next}`} className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium" data-testid="article-signin">Sign in</Link>
                  <Link to={`/login?mode=signup&next=${next}`} className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] rounded-md text-sm font-medium">Create free account</Link>
                </div>
              </div>
            </div>
          )}

          {biz && (
            <Link to={`/business/${biz.slug}`} className="mt-10 flex items-center gap-4 bg-stone-50 border border-stone-200 rounded-xl p-4 hover:border-[#8B1A1A] transition" data-testid="article-business">
              {biz.logo_url ? <img src={absoluteUrl(biz.logo_url)} alt="" className="w-14 h-14 rounded-lg object-contain bg-white border" /> : <div className="w-14 h-14 rounded-lg bg-amber-50 flex items-center justify-center"><Store className="w-6 h-6 text-[#8B1A1A]" /></div>}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-stone-500">Featured business</div>
                <div className="font-display text-lg text-stone-900">{biz.name}</div>
                {biz.tagline && <div className="text-sm text-stone-600 truncate">{biz.tagline}</div>}
              </div>
              <ArrowRight className="w-5 h-5 text-[#8B1A1A]" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
