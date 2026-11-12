import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { absoluteUrl } from "../api/client";

export const MAG_NAME = "Vibrant Dayton";

export const fmtIssueDate = (d) => {
  if (!d) return "";
  const dt = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export const IssueCover = ({ issue, className = "" }) => (
  <div className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-md bg-gradient-to-br from-[#8B1A1A] via-[#a8361f] to-[#E07A1F] ${className}`}>
    {issue.cover_url ? (
      <img src={absoluteUrl(issue.cover_url)} alt={`${issue.title} cover`} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
    ) : (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-50 p-4 text-center">
        <BookOpen className="w-10 h-10 mb-3 opacity-80" />
        <div className="font-cinzel text-[10px] tracking-[0.3em] opacity-80">{MAG_NAME.toUpperCase()}</div>
        <div className="font-display text-xl mt-1">{issue.title}</div>
      </div>
    )}
  </div>
);

export const IssueCard = ({ issue }) => (
  <Link to={`/magazine/${issue.slug}`} className="group block" data-testid={`issue-${issue.slug}`}>
    <IssueCover issue={issue} className="group-hover:-translate-y-1 transition duration-300" />
    <div className="mt-3">
      <div className="text-xs text-stone-500">{fmtIssueDate(issue.issue_date)}</div>
      <div className="font-display text-lg text-stone-900 group-hover:text-[#8B1A1A] transition">{issue.title}</div>
      {issue.articles > 0 && <div className="text-xs text-stone-500">{issue.articles} article{issue.articles === 1 ? "" : "s"}</div>}
    </div>
  </Link>
);

export const ArticleCard = ({ a, showIssue = false }) => (
  <Link to={`/magazine/article/${a.slug}`} className="group bg-white rounded-xl border border-stone-200 overflow-hidden card-hover flex flex-col" data-testid={`article-${a.slug}`}>
    <div className="aspect-[16/9] bg-amber-50 overflow-hidden">
      {a.cover_url ? (
        <img src={absoluteUrl(a.cover_url)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-[#E07A1F]/60" /></div>
      )}
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <div className="text-xs text-[#E07A1F] font-medium">{a.category}{showIssue && a.issue ? ` · ${a.issue.title}` : ""}</div>
      <h3 className="font-display text-xl text-stone-900 group-hover:text-[#8B1A1A] transition mt-0.5">{a.title}</h3>
      {a.summary && <p className="text-sm text-stone-600 line-clamp-3 mt-1.5">{a.summary}</p>}
      <div className="mt-auto pt-4 flex items-center justify-between text-xs text-stone-500">
        <span>{a.author ? `By ${a.author}` : ""}</span>
        <span className="text-[#8B1A1A] font-medium inline-flex items-center gap-1">Read <ArrowRight className="w-3.5 h-3.5" /></span>
      </div>
    </div>
  </Link>
);

// Article text: blank line between paragraphs, "## " heading, lines starting "- " become a list. No HTML is used.
export const ArticleBody = ({ paragraphs }) => (
  <div className="space-y-5 text-[17px] leading-relaxed text-stone-800" data-testid="article-body">
    {paragraphs.map((p, i) => {
      const t = p.trim();
      if (t.startsWith("## ")) return <h2 key={i} className="font-display text-2xl text-[#8B1A1A] pt-2">{t.slice(3)}</h2>;
      const lines = t.split("\n");
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        return <ul key={i} className="list-disc pl-6 space-y-1">{lines.map((l, j) => <li key={j}>{l.replace(/^\s*[-•]\s+/, "")}</li>)}</ul>;
      }
      return <p key={i} className="whitespace-pre-line">{t}</p>;
    })}
  </div>
);
