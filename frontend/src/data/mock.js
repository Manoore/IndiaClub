// Static route configuration for navigation.
// All content collections (events, classifieds, sponsors, donors, programs, gallery,
// hero slides, testimonials, feature highlights, site stats, event categories,
// DIFI awards, constitution, executive team, past presidents, awardees, tax returns,
// membership tiers) are served from the backend API. See /api/* endpoints.

export const NAV = [
  { label: "Home", to: "/" },
  {
    label: "About", to: "/about",
    children: [
      { label: "Mission", to: "/about/mission" },
      { label: "Constitution & Bylaws", to: "/about/constitution" },
      { label: "Nonprofit Determination", to: "/about/nonprofit" },
      { label: "Tax Returns", to: "/about/tax-returns" },
      { label: "Past Presidents", to: "/about/past-presidents" },
      { label: "Community Service Awardees", to: "/about/community-service-awardees" },
      { label: "DIFI Awards Received", to: "/about/difi-awards" },
      { label: "Executive Committee", to: "/about/executive-committee" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    label: "Membership", to: "/membership",
    children: [
      { label: "Annual — Regular", to: "/membership/regular" },
      { label: "Annual — Business", to: "/membership/business" },
      { label: "Honorary", to: "/membership/honorary" },
      { label: "Extended", to: "/membership/extended" },
    ],
  },
  {
    label: "Events", to: "/events",
    children: [
      { label: "Upcoming Events", to: "/events/upcoming" },
      { label: "DIFI", to: "/events/difi" },
      { label: "Sports", to: "/events/sports" },
      { label: "Golden Jewels", to: "/events/golden-jewels" },
      { label: "Rising Stars", to: "/events/rising-stars" },
      { label: "Women's Connect", to: "/events/womens-connect" },
      { label: "Picnic", to: "/events/picnic" },
      { label: "Diwali", to: "/events/diwali" },
    ],
  },
  {
    label: "Programs", to: "/programs",
    children: [
      { label: "Charity", to: "/programs/charity" },
      { label: "Education", to: "/programs/education" },
      { label: "Scholarship", to: "/programs/scholarship" },
      { label: "Community Service Awards", to: "/programs/community-service" },
    ],
  },
  {
    label: "Sponsorship", to: "/sponsorship",
    children: [
      { label: "Become a Sponsor", to: "/sponsorship/become-sponsor" },
      { label: "Sponsor Directory", to: "/sponsorship/sponsor-directory" },
      { label: "Donate to India Club", to: "/sponsorship/donate" },
      { label: "Donors Directory", to: "/sponsorship/donors-directory" },
    ],
  },
  {
    label: "Classified", to: "/classified",
    children: [
      { label: "All Categories", to: "/classified/categories" },
      { label: "All Locations", to: "/classified/locations" },
      { label: "All Advertisements", to: "/classified/all-ads" },
      { label: "Post Ad", to: "/classified/post-ad" },
    ],
  },
  { label: "Gallery", to: "/gallery" },
];

// Static placeholder until a real visitor analytics integration is added.
// Replace with a live `/api/stats/visitors` call when ready.
export const VISITOR_COUNT = {
  today: 111,
  yesterday: 419,
  thisWeek: 2035,
  thisMonth: 5945,
  allTime: 201005,
};
