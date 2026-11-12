import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { apiClient } from "../api/client";
import { IssueCover, ArticleCard, MAG_NAME, fmtIssueDate } from "./MagazineParts";

// Home page block for the latest Vibrant Dayton edition; renders nothing until something is published
export default function HomeMagazine() {
  const [issue, setIssue] = useState(null);
  const [articles, setArticles] = useState([]);
  useEffect(() => {
    apiClient.get("/magazine/issues").then((r) => {
      const list = r.data || [];
      setIssue(list.find((i) => i.featured) || list[0] || null);
    }).catch(() => setIssue(null));
    apiClient.get("/magazine/articles", { params: { limit: 3 } }).then((r) => setArticles(r.data || [])).catch(() => setArticles([]));
  }, []);
  if (!issue && articles.length === 0) return null;

  return (
    <section className="py-20 bg-cream" data-testid="home-magazine">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
          <div>
            <div className="font-cinzel text-xs tracking-[0.25em] text-[#E07A1F]">DIGITAL MAGAZINE</div>
            <h2 className="font-display text-4xl text-[#8B1A1A] mt-1">{MAG_NAME}</h2>
          </div>
          <Link to="/magazine" className="text-sm font-medium text-[#8B1A1A] inline-flex items-center gap-1 hover:gap-2 transition-all">All editions <ArrowRight className="w-4 h-4" /></Link>
        </div>
        <div className={`grid gap-8 ${issue ? "lg:grid-cols-[240px_1fr]" : ""}`}>
          {issue && (
            <Link to={`/magazine/${issue.slug}`} className="group block max-w-[240px] mx-auto lg:mx-0">
              <IssueCover issue={issue} className="group-hover:-translate-y-1 transition" />
              <div className="mt-3 text-xs text-stone-500">{fmtIssueDate(issue.issue_date)}</div>
              <div className="font-display text-lg text-stone-900 group-hover:text-[#8B1A1A]">{issue.title}</div>
            </Link>
          )}
          {articles.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{articles.map((a) => <ArticleCard key={a.id} a={a} showIssue />)}</div>
          )}
        </div>
      </div>
    </section>
  );
}
