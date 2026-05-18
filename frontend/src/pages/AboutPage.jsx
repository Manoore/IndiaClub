import React from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { EXECUTIVE_TEAM, PAST_PRESIDENTS, TAX_RETURNS, CONSTITUTION, COMMUNITY_SERVICE_AWARDEES, DIFI_AWARDS } from "../data/mock";
import { Award, FileText, Heart, Scroll, Trophy, Users, Building, Phone, Mail, MapPin } from "lucide-react";
import Mandala from "../components/Mandala";
import { useSiteSettings } from "../api/SiteSettingsContext";
import { apiClient } from "../api/client";

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

const Mission = () => {
  const s = useSiteSettings();
  return (
  <section className="py-20 bg-cream">
    <div className="max-w-4xl mx-auto px-6">
      <p className="text-stone-700 leading-relaxed text-lg font-serif mb-6" data-testid="mission-statement">
        {s.about_mission}
      </p>
      <p className="text-stone-700 leading-relaxed mb-6" data-testid="mission-history">
        {s.about_history}
      </p>
      <h3 className="font-display text-2xl text-[#8B1A1A] mb-4">The objectives of the India Club are:</h3>
      <ul className="space-y-3 mb-8">
        {[
          "To promote the welfare and assimilation of Asian Indians of greater Dayton and vicinity",
          "To sustain and perpetuate the heritage and culture of India",
          "To centralize resources, energies and talents for general betterment of Asian Indians",
          "To promote educational, literacy, and cultural activities",
          "To disseminate information and foster amiable attitudes among the various cultural groups for better understanding and cooperation",
          "To raise funds for specified welfare projects",
        ].map((it, i) => (
          <li key={i} className="flex gap-3 p-4 bg-white border border-amber-100 rounded-lg">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#8B1A1A] text-amber-50 flex items-center justify-center font-cinzel text-xs">{i + 1}</span>
            <span className="text-stone-700">{it}</span>
          </li>
        ))}
      </ul>
      <p className="text-stone-700 leading-relaxed mb-8 italic font-serif">
        The Club periodically organizes cultural and social programs; welfare, charitable and scientific projects; concerts, seminars, and lectures in art and music; and engages in such other activities as may be necessary to meet its objectives.
      </p>
      <div className="grid md:grid-cols-2 gap-5">
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
      <p className="text-stone-500 text-sm mt-8 italic">Tax ID/EIN: 31-1184659 — ICGD does not promote any specific political, religious or social agendas.</p>
    </div>
  </section>
  );
};

const TextPage = ({ children }) => (
  <section className="py-20 bg-cream">
    <div className="max-w-4xl mx-auto px-6 prose prose-stone">{children}</div>
  </section>
);

const Constitution = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-10">
        <h2 className="font-display text-4xl text-[#8B1A1A]">India Club of Greater Dayton</h2>
        <p className="font-cinzel text-sm tracking-[0.3em] text-[#E07A1F] mt-2">CONSTITUTION & BYLAWS</p>
      </div>
      <div className="space-y-4">
        {CONSTITUTION.map((a) => (
          <details key={a.n} className="group bg-white border border-amber-100 rounded-xl overflow-hidden">
            <summary className="cursor-pointer px-6 py-4 flex items-center justify-between hover:bg-amber-50/40 transition">
              <div className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-full bg-[#8B1A1A] text-amber-50 flex items-center justify-center font-cinzel text-sm">{a.n}</span>
                <h3 className="font-display text-xl text-stone-900">Article {a.n} — {a.title}</h3>
              </div>
              <span className="text-[#E07A1F] group-open:rotate-180 transition">▼</span>
            </summary>
            <div className="px-6 pb-6 pt-2 border-t border-amber-100">
              <ul className="space-y-2 mt-4">
                {a.items.map((it, i) => (
                  <li key={i} className="text-stone-700 text-sm leading-relaxed pl-3 border-l-2 border-amber-200">{it}</li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
      <p className="text-sm text-stone-500 mt-10 text-center">Full PDF available upon written request to <a href="mailto:contact@indiaclubdayton.org" className="text-[#8B1A1A] hover:text-[#E07A1F]">contact@indiaclubdayton.org</a>.</p>
    </div>
  </section>
);

const Nonprofit = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-4xl mx-auto px-6">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B1A1A]/10 border border-[#8B1A1A]/20 rounded-full mb-4">
          <FileText className="w-4 h-4 text-[#8B1A1A]" />
          <span className="font-cinzel text-xs tracking-[0.22em] text-[#8B1A1A]">501(c)(3) AFFIRMATION</span>
        </div>
        <h2 className="font-display text-4xl text-stone-900">India Club is a 501(c)(3) nonprofit organization</h2>
        <p className="text-stone-600 mt-3 font-serif">Recognized by the United States Internal Revenue Service since 1967.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-10">
        <div className="p-6 bg-white border border-amber-100 rounded-xl">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">EMPLOYER IDENTIFICATION NUMBER</div>
          <div className="text-stone-800 font-display text-2xl mt-2">31-1184659</div>
        </div>
        <div className="p-6 bg-white border border-amber-100 rounded-xl">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">STATUS</div>
          <div className="text-stone-800 font-display text-2xl mt-2">501(c)(3) Public Charity</div>
        </div>
        <div className="p-6 bg-white border border-amber-100 rounded-xl">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">YEAR RECOGNIZED</div>
          <div className="text-stone-800 font-display text-2xl mt-2">1967</div>
        </div>
        <div className="p-6 bg-white border border-amber-100 rounded-xl">
          <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">STATE OF REGISTRATION</div>
          <div className="text-stone-800 font-display text-2xl mt-2">Ohio, USA</div>
        </div>
      </div>

      <div className="bg-white border-2 border-dashed border-amber-200 rounded-2xl p-10 text-center">
        <FileText className="w-12 h-12 text-[#E07A1F] mx-auto mb-4" />
        <h3 className="font-display text-2xl text-[#8B1A1A] mb-2">IRS Determination Letter</h3>
        <p className="text-stone-600 mb-5 max-w-md mx-auto">Two-page IRS letter confirming ICGD's tax-exempt status under section 501(c)(3) of the Internal Revenue Code.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="#" className="px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded-md text-sm font-medium transition">View Page 1</a>
          <a href="#" className="px-5 py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-amber-50 rounded-md text-sm font-medium transition">View Page 2</a>
        </div>
        <p className="text-xs text-stone-400 mt-4 italic">Contributions to ICGD are tax-deductible to the fullest extent allowed by law.</p>
      </div>
    </div>
  </section>
);

const TaxReturns = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-5xl mx-auto px-6">
      <p className="text-stone-700 leading-relaxed mb-6">
        The India Club of Greater Dayton is an Ohio State Registered, Tax Exempt 501(c)(3) non-profit organization. Below are our compliance documents available for public view.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-200 rounded-md mb-8">
        <span className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">TAX ID / EIN</span>
        <span className="font-semibold text-stone-900">31-1184659</span>
      </div>
      <div className="bg-white border border-amber-100 rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#8B1A1A] via-[#E07A1F] to-[#C9A961]" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-amber-50/60 text-stone-700">
              <tr>
                <th className="text-left px-5 py-3 font-cinzel tracking-wider text-xs">YEAR</th>
                <th className="text-left px-5 py-3 font-cinzel tracking-wider text-xs">FILED BY</th>
                <th className="text-left px-5 py-3 font-cinzel tracking-wider text-xs">PRESIDENT</th>
                <th className="text-right px-5 py-3 font-cinzel tracking-wider text-xs">DOCUMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {TAX_RETURNS.map((t) => (
                <tr key={t.year} className="hover:bg-amber-50/40 transition">
                  <td className="px-5 py-3 font-display text-lg text-[#8B1A1A]">{t.year}</td>
                  <td className="px-5 py-3 text-stone-700">{t.filedBy}</td>
                  <td className="px-5 py-3 text-stone-700">{t.president}</td>
                  <td className="px-5 py-3 text-right">
                    {t.available ? (
                      <a href="#" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#8B1A1A] hover:bg-[#6f1414] text-amber-50 rounded text-xs font-medium transition">View {t.year}</a>
                    ) : (
                      <span className="text-stone-400 text-xs italic">Not Available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
);

const PastPresidents = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-5xl mx-auto px-6">
      <p className="text-stone-600 mb-8 font-serif text-lg">
        Honoring the visionary leaders who shaped India Club of Greater Dayton across the decades. Below is the chronological list of our Presidents based on our publicly available IRS filings.
      </p>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#8B1A1A] via-[#E07A1F] to-[#C9A961]" />
        <ul className="space-y-4">
          {PAST_PRESIDENTS.map((p, i) => (
            <li key={i} className="relative pl-14">
              <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-white border-4 border-[#E07A1F] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#8B1A1A]" />
              </div>
              <div className="bg-white border border-amber-100 rounded-xl p-5 flex items-center justify-between card-hover">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#8B1A1A] text-amber-50 flex items-center justify-center font-cinzel text-sm">
                    {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-display text-xl text-stone-900">{p.name}</div>
                    <div className="text-xs text-stone-500 font-cinzel tracking-[0.18em]">PRESIDENT</div>
                  </div>
                </div>
                <div className="font-display text-2xl text-[#E07A1F]">{p.year}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

const CommunityServiceAwardees = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-5xl mx-auto px-6">
      <p className="text-stone-700 leading-relaxed font-serif text-lg mb-8">
        Each year India Club of Greater Dayton honors a community member whose volunteer service has uplifted our families and the broader Dayton community. The award is presented at the annual Diwali Mela.
      </p>
      <div className="grid md:grid-cols-2 gap-5">
        {COMMUNITY_SERVICE_AWARDEES.map((a) => (
          <div key={a.year} className="card-hover p-6 bg-white border border-amber-100 rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="font-cinzel text-xs tracking-[0.22em] text-[#E07A1F]">RECIPIENT</div>
              <div className="font-display text-3xl text-[#8B1A1A]">{a.year}</div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-[#E07A1F]" />
              <div className="font-display text-2xl text-stone-900">{a.name}</div>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{a.contribution}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const DIFIAwards = () => (
  <section className="py-20 bg-cream">
    <div className="max-w-5xl mx-auto px-6">
      <p className="text-stone-700 leading-relaxed font-serif text-lg mb-8">
        The Dayton International Festival Inc. (DIFI) has recognized India Club of Greater Dayton multiple times for our cultural showcases, multicultural booths and community contributions over the years.
      </p>
      <div className="space-y-3">
        {DIFI_AWARDS.map((a, i) => (
          <div key={i} className="card-hover flex items-center gap-5 p-5 bg-white border border-amber-100 rounded-xl">
            <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-[#E07A1F] to-[#8B1A1A] flex items-center justify-center text-amber-50">
              <Trophy className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-display text-2xl text-[#8B1A1A]">{a.year}</span>
                <span className="font-cinzel text-[10px] tracking-[0.22em] text-stone-500 px-2 py-0.5 bg-amber-50 rounded">DIFI AWARD</span>
              </div>
              <div className="font-display text-xl text-stone-900">{a.title}</div>
              <div className="text-sm text-stone-600 mt-0.5">{a.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
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

const Contact = () => {
  const s = useSiteSettings();
  return (
  <section className="py-20 bg-cream">
    <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12">
      <div>
        <h2 className="font-display text-3xl text-[#8B1A1A] mb-3">Get in Touch</h2>
        <p className="text-stone-600 mb-8">We'd love to hear from you. Drop us a note, call us, or join our next event.</p>
        <div className="space-y-4">
          <a href={`tel:${(s.contact_phone || "").replace(/[^\d+]/g, "")}`} className="flex items-start gap-4 p-4 bg-white border border-amber-100 rounded-xl hover:border-[#E07A1F] transition" data-testid="contact-phone-card"><Phone className="w-5 h-5 text-[#E07A1F] mt-0.5" /><div><div className="font-semibold text-stone-900">Call</div><div className="text-sm text-stone-600">{s.contact_phone}</div></div></a>
          <a href={`mailto:${s.contact_email}`} className="flex items-start gap-4 p-4 bg-white border border-amber-100 rounded-xl hover:border-[#E07A1F] transition" data-testid="contact-email-card"><Mail className="w-5 h-5 text-[#E07A1F] mt-0.5" /><div><div className="font-semibold text-stone-900">Email</div><div className="text-sm text-stone-600">{s.contact_email}</div></div></a>
          <div className="flex items-start gap-4 p-4 bg-white border border-amber-100 rounded-xl" data-testid="contact-address-card"><MapPin className="w-5 h-5 text-[#E07A1F] mt-0.5" /><div><div className="font-semibold text-stone-900">Location</div><div className="text-sm text-stone-600">{s.contact_address}</div></div></div>
        </div>
      </div>
      <ContactForm />
    </div>
  </section>
  );
};

const ContactForm = () => {
  const [data, setData] = React.useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = React.useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/contact", data);
    } catch {
      // fallback to localStorage if API fails
      const inbox = JSON.parse(localStorage.getItem("icgd_inbox") || "[]");
      inbox.push({ ...data, date: new Date().toISOString() });
      localStorage.setItem("icgd_inbox", JSON.stringify(inbox));
    }
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
