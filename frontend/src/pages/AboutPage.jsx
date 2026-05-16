import React from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { EXECUTIVE_TEAM, PAST_PRESIDENTS } from "../data/mock";
import { Award, FileText, Heart, Scroll, Trophy, Users, Building, Phone, Mail, MapPin } from "lucide-react";
import Mandala from "../components/Mandala";

const AboutHub = () => {
  const cards = [
    { to: "/about/mission", icon: Heart, title: "Our Mission", text: "Serving cultural, charity, educational & welfare needs since 1967." },
    { to: "/about/constitution", icon: Scroll, title: "Constitution & Bylaws", text: "The charter that guides our member-run organization." },
    { to: "/about/nonprofit", icon: FileText, title: "Nonprofit Determination", text: "501(c)(3) status and IRS determination affirmation." },
    { to: "/about/tax-returns", icon: Building, title: "Tax Returns", text: "Publicly available 990 filings and financial statements." },
    { to: "/about/past-presidents", icon: Users, title: "Past Presidents", text: "Honoring decades of visionary leadership." },
    { to: "/about/community-service-awardees", icon: Award, title: "Community Service Awardees", text: "Celebrating volunteers who lift our community." },
    { to: "/about/difi-awards", icon: Trophy, title: "DIFI Awards Received", text: "Recognition for our cultural & service contributions." },
    { to: "/about/executive-committee", icon: Users, title: "Executive Committee", text: "The volunteer leadership team for the year." },
  ];
  return (
    <section className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="card-hover p-7 bg-white rounded-2xl border border-stone-200 block group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-[#8B1A1A] transition">
                <Icon className="w-5 h-5 text-[#8B1A1A] group-hover:text-amber-100 transition" />
              </div>
              <h3 className="font-display text-xl text-stone-900 mb-2">{c.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{c.text}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const Mission = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-4xl mx-auto px-6">
      <div className="prose prose-stone max-w-none">
        <p className="text-stone-700 leading-relaxed text-lg font-serif">
          The India Club of Greater Dayton (ICGD) is a Registered, Tax Exempt 501(c)(3) non-profit, non-political, non-religious, volunteer organization serving since 1967 with the primary purpose to serve the <strong>Cultural, Charity, Educational and Welfare</strong> needs of the Asian Indian community in Greater Dayton.
        </p>
        <h2 className="font-display text-3xl text-[#8B1A1A] mt-10">Our Pillars</h2>
        <div className="grid md:grid-cols-2 gap-5 mt-6 not-prose">
          {[
            { t: "Cultural", d: "Preserve & celebrate Indian heritage through festivals, dance, music and arts." },
            { t: "Charity", d: "Support community welfare via fundraising drives, food drives & disaster relief." },
            { t: "Educational", d: "Heritage classes, scholarships and mentorship for our youth." },
            { t: "Welfare", d: "Connect, support and serve the well-being of Asian Indians in Greater Dayton." },
          ].map((p) => (
            <div key={p.t} className="p-6 bg-white border border-amber-100 rounded-xl">
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F] mb-1">PILLAR</div>
              <div className="font-display text-2xl text-[#8B1A1A] mb-2">{p.t}</div>
              <p className="text-stone-600 text-sm">{p.d}</p>
            </div>
          ))}
        </div>
        <p className="text-stone-700 leading-relaxed mt-8">ICGD does not promote any specific political, religious or social agendas. <em>Tax ID/EIN: 31-1184659.</em></p>
      </div>
    </div>
  </section>
);

const TextPage = ({ children }) => (
  <section className="py-20 bg-cream">
    <div className="max-w-4xl mx-auto px-6 prose prose-stone">{children}</div>
  </section>
);

const Constitution = () => (
  <TextPage>
    <h2 className="font-display text-3xl text-[#8B1A1A]">Constitution & Bylaws</h2>
    <p>The India Club of Greater Dayton is governed by a written constitution and bylaws adopted by its members. These documents outline membership classes, executive committee structure, election procedures, meeting protocols, dissolution procedures and amendment processes.</p>
    <h3 className="font-display text-2xl text-[#8B1A1A] mt-6">Article I — Name & Purpose</h3>
    <p>The name of the organization shall be "India Club of Greater Dayton" (ICGD). The purpose is exclusively charitable, cultural, educational and welfare-oriented within the meaning of Section 501(c)(3) of the U.S. Internal Revenue Code.</p>
    <h3 className="font-display text-2xl text-[#8B1A1A] mt-6">Article II — Membership</h3>
    <p>Membership shall be open to any person of Asian Indian origin or descent, or any other person interested in the objectives of the Club. Membership classes include Regular, Business, Honorary, Extended and Life.</p>
    <h3 className="font-display text-2xl text-[#8B1A1A] mt-6">Article III — Executive Committee</h3>
    <p>The affairs of the Club are managed by an Executive Committee comprising the President, President-Elect, Ex-President, Secretary, Treasurer, and the chairs of standing committees. Members are elected annually at the Annual General Meeting.</p>
    <p className="text-sm text-stone-500 mt-8">Full PDF document available upon written request to <a href="mailto:contact@indiaclubdayton.org" className="text-[#8B1A1A]">contact@indiaclubdayton.org</a>.</p>
  </TextPage>
);

const Nonprofit = () => (
  <TextPage>
    <h2 className="font-display text-3xl text-[#8B1A1A]">Nonprofit Determination Affirmation</h2>
    <p>India Club of Greater Dayton is a tax-exempt organization recognized under Section 501(c)(3) of the U.S. Internal Revenue Code. Contributions are deductible to the fullest extent allowed by law.</p>
    <div className="p-6 bg-white border border-amber-100 rounded-xl mt-6 not-prose">
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div><div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">EIN</div><div className="text-stone-800 font-semibold mt-1">31-1184659</div></div>
        <div><div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">STATUS</div><div className="text-stone-800 font-semibold mt-1">501(c)(3) Public Charity</div></div>
        <div><div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">YEAR RECOGNIZED</div><div className="text-stone-800 font-semibold mt-1">1967</div></div>
        <div><div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">STATE</div><div className="text-stone-800 font-semibold mt-1">Ohio, USA</div></div>
      </div>
    </div>
  </TextPage>
);

const TaxReturns = () => (
  <TextPage>
    <h2 className="font-display text-3xl text-[#8B1A1A]">Tax Returns & Financial Statements</h2>
    <p>Per IRS guidelines, India Club of Greater Dayton makes its three most recent Form 990 filings publicly available.</p>
    <div className="mt-6 grid sm:grid-cols-2 gap-4 not-prose">
      {[2024, 2023, 2022, 2021].map((y) => (
        <a key={y} href="#" className="flex items-center justify-between p-5 bg-white border border-amber-100 rounded-xl hover:border-[#8B1A1A] transition">
          <div>
            <div className="font-display text-xl text-[#8B1A1A]">Form 990 — FY {y}</div>
            <div className="text-xs text-stone-500">PDF • Approx 1.2 MB</div>
          </div>
          <span className="text-[#E07A1F] font-medium text-sm">Download</span>
        </a>
      ))}
    </div>
  </TextPage>
);

const PastPresidents = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-4xl mx-auto px-6">
      <h2 className="font-display text-3xl text-[#8B1A1A] mb-2">Past Presidents</h2>
      <p className="text-stone-600 mb-8">Honoring the visionary leaders who shaped ICGD across the decades.</p>
      <div className="divide-y divide-amber-100 bg-white border border-amber-100 rounded-xl overflow-hidden">
        {PAST_PRESIDENTS.map((p, i) => (
          <div key={i} className="flex items-center justify-between p-5 hover:bg-amber-50/50 transition">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#8B1A1A] text-amber-50 flex items-center justify-center font-cinzel text-sm">{PAST_PRESIDENTS.length - i}</div>
              <div>
                <div className="font-display text-lg text-stone-900">{p.name}</div>
                <div className="text-xs text-stone-500">President</div>
              </div>
            </div>
            <div className="font-cinzel text-xs tracking-[0.2em] text-[#E07A1F]">{p.year}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CommunityServiceAwardees = () => (
  <TextPage>
    <h2 className="font-display text-3xl text-[#8B1A1A]">Community Service Awardees</h2>
    <p>Each year ICGD honors a community member whose volunteer service has uplifted our families and the broader Dayton community.</p>
    <div className="grid sm:grid-cols-2 gap-4 mt-6 not-prose">
      {[
        { y: 2024, n: "Dr. Suresh Gupta", c: "Health & education advocacy" },
        { y: 2023, n: "Mrs. Lalita Rao", c: "Senior care & community kitchen" },
        { y: 2022, n: "Pradeep Mehta", c: "Youth mentorship & STEM camps" },
        { y: 2021, n: "Dr. Anjali Verma", c: "COVID-19 community response" },
      ].map((a) => (
        <div key={a.y} className="p-5 bg-white border border-amber-100 rounded-xl">
          <div className="font-cinzel text-xs tracking-[0.2em] text-[#E07A1F]">{a.y}</div>
          <div className="font-display text-xl text-[#8B1A1A] mt-1">{a.n}</div>
          <div className="text-sm text-stone-600">{a.c}</div>
        </div>
      ))}
    </div>
  </TextPage>
);

const DIFIAwards = () => (
  <TextPage>
    <h2 className="font-display text-3xl text-[#8B1A1A]">DIFI Awards Received</h2>
    <p>The Dayton International Festival Institute (DIFI) has recognized ICGD multiple times for our cultural and service contributions.</p>
    <ul className="space-y-3 mt-6 not-prose">
      {[
        "2024 — Outstanding Cultural Showcase, Diwali Mela",
        "2023 — Best Multicultural Booth",
        "2022 — Community Excellence Award",
        "2021 — Pandemic Response Recognition",
      ].map((a, i) => (
        <li key={i} className="flex items-center gap-3 p-4 bg-white border border-amber-100 rounded-lg">
          <Trophy className="w-5 h-5 text-[#E07A1F]" />
          <span className="text-stone-800">{a}</span>
        </li>
      ))}
    </ul>
  </TextPage>
);

const ExecutiveCommittee = () => (
  <section className="py-20 bg-cream relative">
    <Mandala className="absolute -right-40 top-10 w-[400px] h-[400px]" color="#8B1A1A" opacity={0.06} />
    <div className="max-w-7xl mx-auto px-6 relative">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {EXECUTIVE_TEAM.map((m) => (
          <div key={m.id} className="bg-white p-4 rounded-2xl border border-amber-100 card-hover text-center">
            <div className="relative w-full aspect-square rounded-xl overflow-hidden">
              <img src={m.image} alt={m.name} className="w-full h-full object-cover hover:scale-110 transition duration-500" />
            </div>
            <div className="mt-3 font-display text-lg text-stone-900">{m.name}</div>
            <div className="font-cinzel text-[10px] tracking-[0.18em] text-[#E07A1F]">{m.role.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Contact = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12">
      <div>
        <h2 className="font-display text-3xl text-[#8B1A1A] mb-3">Get in Touch</h2>
        <p className="text-stone-600 mb-8">We'd love to hear from you. Drop us a note, call us, or join our next event.</p>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-white border border-amber-100 rounded-xl"><Phone className="w-5 h-5 text-[#E07A1F] mt-0.5" /><div><div className="font-semibold text-stone-900">Call</div><div className="text-sm text-stone-600">(937) 314-8870</div></div></div>
          <div className="flex items-start gap-4 p-4 bg-white border border-amber-100 rounded-xl"><Mail className="w-5 h-5 text-[#E07A1F] mt-0.5" /><div><div className="font-semibold text-stone-900">Email</div><div className="text-sm text-stone-600">contact@indiaclubdayton.org</div></div></div>
          <div className="flex items-start gap-4 p-4 bg-white border border-amber-100 rounded-xl"><MapPin className="w-5 h-5 text-[#E07A1F] mt-0.5" /><div><div className="font-semibold text-stone-900">Location</div><div className="text-sm text-stone-600">Greater Dayton, Ohio, USA</div></div></div>
        </div>
      </div>
      <ContactForm />
    </div>
  </section>
);

const ContactForm = () => {
  const [data, setData] = React.useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = React.useState(false);
  const submit = (e) => {
    e.preventDefault();
    const inbox = JSON.parse(localStorage.getItem("icgd_inbox") || "[]");
    inbox.push({ ...data, date: new Date().toISOString() });
    localStorage.setItem("icgd_inbox", JSON.stringify(inbox));
    setSent(true);
    setData({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSent(false), 4000);
  };
  return (
    <form onSubmit={submit} className="bg-white p-7 rounded-2xl border border-amber-100 space-y-4">
      <input required value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Your name" className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
      <input required type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="Email address" className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
      <input value={data.subject} onChange={(e) => setData({ ...data, subject: e.target.value })} placeholder="Subject" className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
      <textarea required rows={5} value={data.message} onChange={(e) => setData({ ...data, message: e.target.value })} placeholder="Your message" className="w-full px-4 py-3 border border-stone-200 rounded-md outline-none focus:border-[#8B1A1A]" />
      <button type="submit" className="w-full py-3.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md font-medium transition">Send Message</button>
      {sent && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">Message sent! We'll be in touch shortly.</div>}
    </form>
  );
};

const PrivacyTerms = ({ title, body }) => (
  <TextPage>
    <h2 className="font-display text-3xl text-[#8B1A1A]">{title}</h2>
    <p>{body}</p>
  </TextPage>
);

export default function AboutPage() {
  const { sub } = useParams();
  const headers = {
    undefined: { eyebrow: "WHO WE ARE", title: "About India Club", subtitle: "A 58-year journey of culture, community and service.", image: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    mission: { eyebrow: "OUR PURPOSE", title: "Mission & Values", image: "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    constitution: { eyebrow: "GOVERNANCE", title: "Constitution & Bylaws", image: "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    nonprofit: { eyebrow: "501(c)(3)", title: "Nonprofit Determination", image: "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "tax-returns": { eyebrow: "TRANSPARENCY", title: "Tax Returns", image: "https://images.unsplash.com/photo-1468234847176-28606331216a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "past-presidents": { eyebrow: "LEGACY", title: "Past Presidents", image: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "community-service-awardees": { eyebrow: "HONORS", title: "Community Service Awardees", image: "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "difi-awards": { eyebrow: "RECOGNITION", title: "DIFI Awards Received", image: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    "executive-committee": { eyebrow: "LEADERSHIP", title: "Executive Committee", subtitle: "Meet the volunteers steering ICGD this year.", image: "https://images.unsplash.com/photo-1645264090488-a019de493023?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    privacy: { eyebrow: "LEGAL", title: "Privacy Policy", image: "https://images.unsplash.com/photo-1651512186979-737021ace442?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    terms: { eyebrow: "LEGAL", title: "Terms & Conditions", image: "https://images.unsplash.com/photo-1592843997881-cab3860b1067?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
    disclaimer: { eyebrow: "LEGAL", title: "Disclaimer & Cookie Policy", image: "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
  };
  const h = headers[sub] || headers[undefined];

  const renderBody = () => {
    switch (sub) {
      case "mission": return <Mission />;
      case "constitution": return <Constitution />;
      case "nonprofit": return <Nonprofit />;
      case "tax-returns": return <TaxReturns />;
      case "past-presidents": return <PastPresidents />;
      case "community-service-awardees": return <CommunityServiceAwardees />;
      case "difi-awards": return <DIFIAwards />;
      case "executive-committee": return <ExecutiveCommittee />;
      case "privacy": return <PrivacyTerms title="Privacy Policy" body="ICGD respects your privacy. We collect only the information needed to deliver our services — membership management, event registration and communications. We do not sell your data. You may request deletion at any time by emailing contact@indiaclubdayton.org." />;
      case "terms": return <PrivacyTerms title="Terms & Conditions" body="By accessing this site or registering for ICGD events you agree to these terms. ICGD reserves the right to modify event dates, refund policies and member benefits with reasonable notice to members." />;
      case "disclaimer": return <PrivacyTerms title="Disclaimer & Cookie Policy" body="This site uses cookies for analytics and to deliver a better experience. ICGD content is provided for informational purposes and does not constitute legal, medical or financial advice." />;
      default: return <AboutHub />;
    }
  };

  return (
    <>
      <PageHeader {...h} />
      {renderBody()}
      {(!sub) && (
        <section className="pb-20 bg-cream"><div className="max-w-4xl mx-auto px-6"><Contact /></div></section>
      )}
    </>
  );
}

export { Contact as AboutContact };
