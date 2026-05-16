import React from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { PROGRAMS } from "../data/mock";
import { Heart, BookOpen, GraduationCap, Award, ArrowRight } from "lucide-react";

const ICON = { charity: Heart, education: BookOpen, scholarship: GraduationCap, "community-service": Award };

const ProgramsHub = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-6">
      {PROGRAMS.map((p) => {
        const Icon = ICON[p.slug] || Heart;
        return (
          <Link to={`/programs/${p.slug}`} key={p.slug} className="card-hover bg-white rounded-2xl border border-amber-100 overflow-hidden group">
            <div className="relative h-56 overflow-hidden">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
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
    </div>
  </section>
);

const ProgramDetail = ({ p }) => {
  const Icon = ICON[p.slug] || Heart;
  return (
    <section className="py-20 bg-cream">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#E07A1F] flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></div>
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">PROGRAM</div>
        </div>
        <p className="text-stone-700 leading-relaxed font-serif text-lg mb-6">{p.summary}</p>
        <p className="text-stone-700 leading-relaxed mb-8">{p.details}</p>
        <div className="bg-white p-6 rounded-xl border border-amber-100">
          <h3 className="font-display text-xl text-[#8B1A1A] mb-2">Want to volunteer or contribute?</h3>
          <p className="text-stone-600 mb-4">Your time, skills and donations directly power this program.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/sponsorship/donate" className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition">Donate</Link>
            <Link to="/contact" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium transition">Volunteer</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function ProgramsPage() {
  const { sub } = useParams();
  const p = PROGRAMS.find((x) => x.slug === sub);
  const header = p
    ? { eyebrow: "PROGRAM", title: p.name, subtitle: p.summary, image: p.image }
    : { eyebrow: "WHAT WE DO", title: "Our Programs", subtitle: "Charity, education, scholarship and community service — four pillars of our mission.", image: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920" };
  return (
    <>
      <PageHeader {...header} />
      {p ? <ProgramDetail p={p} /> : <ProgramsHub />}
    </>
  );
}
