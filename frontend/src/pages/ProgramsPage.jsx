import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { Heart, BookOpen, GraduationCap, Award, ArrowRight, Check, TrendingUp, Loader2 } from "lucide-react";
import { apiClient } from "../api/client";

const ICON = { charity: Heart, education: BookOpen, scholarship: GraduationCap, "community-service": Award };

const ProgramsHub = ({ programs }) => (
  <section className="py-20 bg-cream" data-testid="programs-hub">
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-6">
      {programs.map((p) => {
        const Icon = ICON[p.slug] || Heart;
        return (
          <Link to={`/programs/${p.slug}`} key={p.slug} className="card-hover bg-white rounded-2xl border border-amber-100 overflow-hidden group" data-testid={`program-card-${p.slug}`}>
            <div className="relative h-56 overflow-hidden">
              {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-[#E07A1F] flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></div>
            </div>
            <div className="p-6">
              <h3 className="font-display text-2xl text-[#8B1A1A] mb-2">{p.name}</h3>
              <p className="text-stone-600 leading-relaxed mb-4">{p.summary}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#8B1A1A] group-hover:text-[#E07A1F]">Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" /></span>
            </div>
          </Link>
        );
      })}
      {programs.length === 0 && (
        <div className="col-span-full text-center text-stone-500 py-10 border border-dashed border-stone-300 rounded-xl" data-testid="programs-empty">
          No programs yet. Add them in Admin → Programs.
        </div>
      )}
    </div>
  </section>
);

const ProgramDetail = ({ p }) => {
  const Icon = ICON[p.slug] || Heart;
  return (
    <section className="py-20 bg-cream" data-testid={`program-detail-${p.slug}`}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#E07A1F] flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></div>
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">PROGRAM</div>
        </div>
        <p className="text-stone-700 leading-relaxed font-serif text-lg mb-10">{p.intro || p.summary}</p>

        {p.initiatives && p.initiatives.length > 0 && (
          <>
            <h3 className="font-display text-3xl text-[#8B1A1A] mb-6">Our Initiatives</h3>
            <div className="grid md:grid-cols-2 gap-5 mb-10">
              {p.initiatives.map((it, i) => (
                <div key={i} className="card-hover p-6 bg-white border border-amber-100 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-[#8B1A1A]" />
                    </div>
                    <div>
                      <div className="font-display text-lg text-stone-900 mb-1">{it.name}</div>
                      <p className="text-sm text-stone-600 leading-relaxed">{it.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {p.impact && (
          <div className="bg-gradient-to-r from-[#8B1A1A] to-[#6f1414] rounded-2xl p-8 text-amber-50 flex items-center gap-5">
            <TrendingUp className="w-10 h-10 text-[#E07A1F] flex-shrink-0" />
            <div>
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">OUR IMPACT</div>
              <div className="font-display text-2xl mt-1">{p.impact}</div>
            </div>
          </div>
        )}

        <div className="bg-white p-7 rounded-xl border border-amber-100 mt-10">
          <h3 className="font-display text-xl text-[#8B1A1A] mb-2">Want to volunteer or contribute?</h3>
          <p className="text-stone-600 mb-4">Your time, skills and donations directly power this program.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/sponsorship/donate" className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition" data-testid="program-donate-cta">Donate</Link>
            <Link to="/contact" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium transition" data-testid="program-volunteer-cta">Volunteer</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function ProgramsPage() {
  const { sub } = useParams();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/programs")
      .then((r) => setPrograms(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  const p = programs.find((x) => x.slug === sub);
  const header = p
    ? { eyebrow: "PROGRAM", title: p.name, subtitle: p.summary, image: p.image_url }
    : { eyebrow: "WHAT WE DO", title: "Our Programs", subtitle: "Charity, education, scholarship and community service — four pillars of our mission.", image: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" };

  if (loading) {
    return (
      <section className="py-32 bg-cream min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1A1A] animate-spin" />
      </section>
    );
  }

  return (
    <>
      <PageHeader {...header} />
      {p ? <ProgramDetail p={p} /> : <ProgramsHub programs={programs} />}
    </>
  );
}
