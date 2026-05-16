// Mock data for India Club of Greater Dayton — for frontend preview

// Real photos sourced from indiaclubdayton.org/images/headers/2026
export const HERO_IMAGES = [
  "/icgd/features/grow-your-business.jpg",
  "/icgd/features/donate-for-home.jpg",
  "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  "https://images.unsplash.com/photo-1468234847176-28606331216a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
];

export const STATS = [
  { label: "Founded", value: "1967" },
  { label: "Member Families", value: "1000+" },
  { label: "Annual Events", value: "40+" },
  { label: "Years of Service", value: "58" },
];

export const FEATURE_HIGHLIGHTS = [
  {
    title: "Become a Member",
    description: "Join 1000+ families and immerse in cultural events, networking and community.",
    image: "/icgd/features/become-a-member.png",
    cta: "Join Today",
    link: "/membership/regular",
    accent: "#8B1A1A",
  },
  {
    title: "Sponsor India Club",
    description: "A community-funded institution supported by sponsors and well-wishers.",
    image: "/icgd/features/grow-together.jpg",
    cta: "Sponsor Us",
    link: "/sponsorship/become-sponsor",
    accent: "#E07A1F",
  },
  {
    title: "Business Membership",
    description: "Grow your business with the largest Indian community in Greater Dayton.",
    image: "/icgd/features/grow-your-business.jpg",
    cta: "Learn More",
    link: "/membership/business",
    accent: "#C9A961",
  },
  {
    title: "Donate to Own a Place",
    description: "Help us build a permanent home so we can serve you more efficiently.",
    image: "/icgd/features/donate-for-home.jpg",
    cta: "Donate Now",
    link: "/sponsorship/donate",
    accent: "#8B1A1A",
  },
];

export const EVENT_CATEGORIES = [
  {
    slug: "difi",
    name: "DIFI",
    tagline: "Dayton India Festival of India",
    description: "The signature multi-day cultural festival celebrating Indian dance, music, food and tradition.",
    image: "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#E07A1F",
  },
  {
    slug: "diwali",
    name: "Diwali",
    tagline: "Festival of Lights",
    description: "Light up the night with diyas, fireworks, performances and the warmth of community.",
    image: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#8B1A1A",
  },
  {
    slug: "rising-stars",
    name: "Rising Stars",
    tagline: "Showcasing Young Talent",
    description: "A youth showcase celebrating dance, music, and dramatic arts from rising performers.",
    image: "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#C9A961",
  },
  {
    slug: "golden-jewels",
    name: "Golden Jewels",
    tagline: "Honoring Our Seniors",
    description: "Programs and gatherings celebrating our elders — the golden jewels of our community.",
    image: "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#8B1A1A",
  },
  {
    slug: "womens-connect",
    name: "Women's Connect",
    tagline: "Empower & Inspire",
    description: "A platform for women to learn, lead and uplift one another through workshops and meetups.",
    image: "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#E07A1F",
  },
  {
    slug: "sports",
    name: "Sports",
    tagline: "Cricket, Tennis & More",
    description: "Tournaments, leagues and friendly matches that keep our community active and connected.",
    image: "https://images.unsplash.com/photo-1468234847176-28606331216a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#C9A961",
  },
  {
    slug: "picnic",
    name: "Picnic",
    tagline: "Summer Community Picnic",
    description: "Sun, games and home-style food — the annual ICGD picnic brings everyone together.",
    image: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#E07A1F",
  },
  {
    slug: "upcoming",
    name: "Upcoming Events",
    tagline: "Don't Miss What's Next",
    description: "All confirmed events on the ICGD calendar — register and reserve your seat early.",
    image: "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    color: "#8B1A1A",
  },
];

export const UPCOMING_EVENTS = [
  {
    id: "evt-1",
    title: "Rising Star May 2026",
    category: "Rising Stars",
    date: "May 17, 2026",
    time: "5:00 PM – 9:00 PM",
    venue: "Sinclair Community College, Dayton",
    image: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    description: "Annual youth talent showcase featuring solo and group performances in classical, semi-classical and contemporary styles.",
    registrationOpen: true,
  },
  {
    id: "evt-2",
    title: "Diwali Mela 2026",
    category: "Diwali",
    date: "November 1, 2026",
    time: "4:00 PM – 10:00 PM",
    venue: "Dayton Convention Center",
    image: "https://images.unsplash.com/photo-1645264090488-a019de493023?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    description: "Diwali Mela with dance performances, bazaar stalls, traditional dinner and firework finale.",
    registrationOpen: true,
  },
  {
    id: "evt-3",
    title: "ICGD Summer Picnic",
    category: "Picnic",
    date: "July 12, 2026",
    time: "11:00 AM – 5:00 PM",
    venue: "Eastwood MetroPark, Dayton",
    image: "https://images.unsplash.com/photo-1651512186979-737021ace442?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    description: "Community picnic with cricket, antakshari, kids games and home-made Indian food.",
    registrationOpen: true,
  },
  {
    id: "evt-4",
    title: "Women's Connect: Lead the Change",
    category: "Women's Connect",
    date: "March 8, 2026",
    time: "6:00 PM – 8:30 PM",
    venue: "Online & In-person, Centerville",
    image: "https://images.unsplash.com/photo-1592843997881-cab3860b1067?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    description: "International Women's Day event featuring keynote speakers, leadership panel and networking.",
    registrationOpen: false,
  },
  {
    id: "evt-5",
    title: "Cricket Premier League — ICGD Cup",
    category: "Sports",
    date: "August 23, 2026",
    time: "8:00 AM – 7:00 PM",
    venue: "Wegerzyn Gardens, Dayton",
    image: "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    description: "Annual six-team T10 tournament. Free entry, family-friendly, food trucks on-site.",
    registrationOpen: true,
  },
  {
    id: "evt-6",
    title: "Golden Jewels Tea & Bhajan Evening",
    category: "Golden Jewels",
    date: "April 5, 2026",
    time: "4:00 PM – 6:30 PM",
    venue: "Hindu Temple of Dayton",
    image: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    description: "A peaceful evening of bhajans, chai and conversation curated for our golden community members.",
    registrationOpen: true,
  },
];

export const EXECUTIVE_TEAM = [
  { id: 2, name: "Ajay Jindal", role: "President", image: "/icgd/team/l_20260112012436.jpg" },
  { id: 3, name: "Vijaya Patil", role: "President Elect", image: "/icgd/team/l_20260112013546.jpg" },
  { id: 1, name: "Puneeta Aggarwal", role: "Ex President", image: "/icgd/team/l_20260112012120.jpg" },
  { id: 4, name: "Pooja Lele", role: "Secretary", image: "/icgd/team/l_20260112013059.jpg" },
  { id: 8, name: "Amala Ganathe", role: "Treasurer", image: "/icgd/team/l_20260112012906.jpg" },
  { id: 6, name: "Karthik Jeeva", role: "Membership Chair", image: "/icgd/team/l_20260112013023.jpg" },
  { id: 12, name: "Chandrani Mukherjee", role: "Cultural Chair", image: "/icgd/team/l_20260112012944.jpg" },
  { id: 13, name: "Kuldeep Surana", role: "Cultural Alternate", image: "/icgd/team/l_20260112013035.jpg" },
  { id: 17, name: "Shruti Nagaraju", role: "Cultural Alternate", image: "/icgd/team/l_20260112012401.jpg" },
  { id: 11, name: "Pinki Chowdhury", role: "Youth Chair", image: "/icgd/team/l_20260112013047.jpg" },
  { id: 23, name: "Prisha Rajulapalli", role: "Youth Representative", image: "/icgd/team/l_20260108013447.jpg" },
  { id: 24, name: "Aalna Makote", role: "Youth Representative", image: "/icgd/team/l_20260112012915.jpg" },
  { id: 25, name: "Prisha Echuri", role: "Youth Representative", image: "/icgd/team/l_20260108013501.jpg" },
  { id: 18, name: "Devandra Goel", role: "DIFI Delegate", image: "/icgd/team/l_20260112013604.jpg" },
  { id: 20, name: "Girija Chaubey", role: "DIFI Alternate", image: "/icgd/team/l_20260112013000.jpg" },
  { id: 19, name: "Jigisha Vaddhi", role: "DIFI Design Lead", image: "/icgd/team/l_20260112013012.jpg" },
  { id: 21, name: "Amit Kumar", role: "Event Coordinator", image: "/icgd/team/l_20260112012931.jpg" },
  { id: 5, name: "Suman Srinivasan", role: "Golden Jewels Lead", image: "/icgd/team/l_20260112012414.jpg" },
  { id: 9, name: "Rajiv Ranjan", role: "Sports Chair", image: "/icgd/team/l_20260112012346.jpg" },
  { id: 7, name: "Prakash Gupta", role: "Webmaster", image: "/icgd/team/l_20260112012334.jpg" },
];

export const PAST_PRESIDENTS = [
  { year: "2017", name: "Ashesh Agrawal" },
  { year: "2016", name: "Rakesh Arora" },
  { year: "2015", name: "Pratibha Gupta" },
  { year: "2014", name: "Vinit Mishra" },
  { year: "2013", name: "Srinivas Katragadda" },
  { year: "2012", name: "Ravi Swaminathan" },
  { year: "2011", name: "Hyacinth Dey" },
  { year: "2010", name: "Ravi Ravikumar" },
  { year: "2009", name: "Rakesh Gupta" },
  { year: "2008", name: "Bhanu Raghavan" },
  { year: "2007", name: "Hemant Garg" },
  { year: "2006", name: "Ashwin Rao" },
  { year: "2005", name: "Raj Singh" },
  { year: "2004", name: "Bhanu Raghavan" },
  { year: "2003", name: "Krishna Sharma" },
];

export const TAX_RETURNS = [
  { year: 2017, filedBy: "Ashesh Agrawal", president: "Ashesh Agrawal", available: true },
  { year: 2016, filedBy: "Rakesh Arora", president: "Rakesh Arora", available: true },
  { year: 2015, filedBy: "Selvam Kandasamy", president: "Pratibha Gupta", available: true },
  { year: 2014, filedBy: "Selvam Kandasamy", president: "Vinit Mishra", available: true },
  { year: 2013, filedBy: "Selvam Kandasamy", president: "Srinivas Katragadda", available: true },
  { year: 2012, filedBy: "Srinivas Katragadda", president: "Ravi Swaminathan", available: true },
  { year: 2011, filedBy: "Ravi Swaminathan", president: "Hyacinth Dey", available: true },
  { year: 2010, filedBy: "—", president: "Ravi Ravikumar", available: false },
  { year: 2009, filedBy: "—", president: "Rakesh Gupta", available: false },
  { year: 2008, filedBy: "Rakesh Gupta", president: "Bhanu Raghavan", available: true },
  { year: 2007, filedBy: "Ravi Ravikumar", president: "Hemant Garg", available: true },
  { year: 2006, filedBy: "Ravi Ravikumar", president: "Ashwin Rao", available: true },
  { year: 2005, filedBy: "Arun Jain", president: "Raj Singh", available: true },
  { year: 2004, filedBy: "Raj Singh", president: "Bhanu Raghavan", available: true },
  { year: 2003, filedBy: "Bhanu Raghavan", president: "Krishna Sharma", available: true },
];

export const SPONSORS = [
  { name: "Athena Investment Properties", logo: "https://ui-avatars.com/api/?name=Athena+Investment&size=220&background=8B1A1A&color=FFF9F0&bold=true&font-size=0.35" },
  { name: "Day Freight", logo: "/icgd/sponsors/day-freight.png" },
  { name: "Dayton Business Journal", logo: "https://ui-avatars.com/api/?name=Dayton+Business&size=220&background=1a0e0a&color=FFF9F0&bold=true&font-size=0.35" },
  { name: "FRI", logo: "https://ui-avatars.com/api/?name=FRI&size=220&background=C9A961&color=FFF9F0&bold=true&font-size=0.4" },
  { name: "GDAA", logo: "https://ui-avatars.com/api/?name=GDAA&size=220&background=8B1A1A&color=FFF9F0&bold=true&font-size=0.4" },
  { name: "Greentree", logo: "https://ui-avatars.com/api/?name=Greentree&size=220&background=2E5E3E&color=FFF9F0&bold=true&font-size=0.35" },
  { name: "India Chat Cafe", logo: "https://ui-avatars.com/api/?name=India+Chat&size=220&background=E07A1F&color=FFF9F0&bold=true&font-size=0.35" },
  { name: "Mike's Auto", logo: "https://ui-avatars.com/api/?name=Mikes+Auto&size=220&background=1a0e0a&color=FFF9F0&bold=true&font-size=0.35" },
  { name: "Mount Mortgage", logo: "https://ui-avatars.com/api/?name=Mount+Mortgage&size=220&background=C9A961&color=FFF9F0&bold=true&font-size=0.35" },
  { name: "Mo Dough", logo: "/icgd/sponsors/mo-dough.jpg" },
  { name: "Nova", logo: "https://ui-avatars.com/api/?name=Nova&size=220&background=E07A1F&color=FFF9F0&bold=true&font-size=0.4" },
  { name: "Shree G", logo: "https://ui-avatars.com/api/?name=Shree+G&size=220&background=2E5E3E&color=FFF9F0&bold=true&font-size=0.35" },
  { name: "Sports Clips", logo: "/icgd/sponsors/sportsclips.jpg" },
  { name: "Bonzi", logo: "https://ui-avatars.com/api/?name=Bonzi&size=220&background=C9A961&color=FFF9F0&bold=true&font-size=0.4" },
  { name: "Alice", logo: "https://ui-avatars.com/api/?name=Alice&size=220&background=8B1A1A&color=FFF9F0&bold=true&font-size=0.4" },
];

export const TESTIMONIALS = [
  { name: "Amrit & Shashi Chadha", date: "Feb 06, 2024", body: "Thank you for sharing the program. You guys had done a wonderful job in planning and organizing the program. Congratulations and God Bless." },
  { name: "Priya Menon", date: "Oct 24, 2024", body: "The Diwali Mela was magical — stalls, dance, fireworks. Felt like home, thousands of miles from India." },
  { name: "Anonymous Patron", date: "Jun 12, 2024", body: "Lots of participants in all age groups and a variety of items. It wasn't all dances or all songs. Keep it up!" },
  { name: "Suresh & Latha Iyer", date: "Apr 18, 2025", body: "Golden Jewels evenings have brought so much joy. The volunteers go above and beyond every single time." },
  { name: "Anjali Verma", date: "Mar 09, 2025", body: "Women's Connect changed how I see leadership. A welcoming, inspiring community of strong women." },
];

export const MEMBERSHIP_PLANS = [
  {
    slug: "regular",
    name: "Annual — Regular",
    price: 50,
    period: "Family $50/yr",
    description: "Choose from Student, Individual or Family — full access to all India Club events at member pricing.",
    benefits: [
      "Discounted Event Tickets",
      "Participation in all India Club Events",
      "Free India Club Samachar Newsletter",
      "Free India Club Namaskaar Magazine",
      "Free Online Classified Advt to all Members",
    ],
    featured: true,
  },
  {
    slug: "business",
    name: "Annual — Business",
    price: 250,
    period: "per year",
    description: "Promote your business to 1000+ Indian families. Includes Family Membership as promotional offer.",
    benefits: [
      "Promotional Offer: Includes Family Membership",
      "Discounted Event Tickets",
      "Participation in all the Club Events",
      "Discounted Advt. on Samachar Magazine",
      "Discounted Event Booth Rentals",
      "Free India Club Namaskar (Annual)",
      "Free Online Classified Advt to all Members",
    ],
    featured: false,
  },
  {
    slug: "honorary",
    name: "Honorary",
    price: 0,
    period: "by invitation",
    description: "For individuals who have contributed to the cause and well-being of the Asian Indian Community.",
    benefits: [
      "Subject to Executive Committee approval",
      "No membership dues required",
      "All privileges of Family Membership",
      "Listed on Honor Wall — except voting rights",
    ],
    featured: false,
  },
  {
    slug: "extended",
    name: "Extended",
    price: 200,
    period: "Silver $200 / Gold $400",
    description: "Multi-year membership — buy multiple years and get bonus years free.",
    benefits: [
      "Silver ($200): Buy 4 years, get 5th year FREE",
      "Gold ($400): Buy 8 years, get 2 years FREE",
      "Discounted Event Tickets",
      "Participation in all India Club Events",
      "Free Samachar & Namaskar Magazine",
      "Free Online Classified Advt to Members",
    ],
    featured: false,
  },
];

export const REGULAR_TIERS = [
  {
    slug: "student",
    name: "Student",
    price: 20,
    benefits: [
      "Discounted Event Tickets",
      "Participation in all India Club Events",
      "Free India Club Samachar Newsletter",
      "Free India Club Namaskaar Magazine",
      "Free Online Classified Advt to email to all Members",
    ],
    recommended: false,
  },
  {
    slug: "individual",
    name: "Individual",
    price: 30,
    benefits: [
      "Discounted Event Tickets",
      "Participation in all India Club Events",
      "Free India Club Samachar Newsletter",
      "Free India Club Namaskaar Magazine",
      "Free Online Classified Advt to email to all Members",
    ],
    recommended: false,
  },
  {
    slug: "family",
    name: "Family",
    price: 50,
    benefits: [
      "Discounted Event Tickets",
      "Participation in all India Club Events",
      "Free India Club Samachar Newsletter",
      "Free India Club Namaskaar Magazine",
      "Free Online Classified Advt to email to all",
    ],
    recommended: true,
  },
  {
    slug: "business",
    name: "Business",
    price: 250,
    benefits: [
      "Promotional Offer: Includes Family Membership",
      "Discounted Event Tickets",
      "Participation in all the Club Events",
      "Discounted Advt. on Samachar Magazine",
      "Discounted Event Booth Rentals",
      "Free India Club Namaskar (Annual)",
      "Free Online Classified Advt to all Members",
    ],
    recommended: false,
  },
];

export const EXTENDED_TIERS = [
  {
    slug: "silver",
    name: "Silver Membership",
    price: 200,
    tagline: "5 Years — Buy 4 Get 1 Free",
    benefits: [
      "Buy 4 years of membership and get the 5th year FREE",
      "Discounted Event Tickets",
      "Participation in all India Club Events",
      "Free India Club Samachar Magazine",
      "Free India Club Namaskar Magazine",
      "Free Online Classified Advt to Members",
    ],
    recommended: true,
  },
  {
    slug: "gold",
    name: "Gold Membership",
    price: 400,
    tagline: "10 Years — Buy 8 Get 2 Free",
    benefits: [
      "Buy 8 years of membership and get 2 years FREE",
      "Discounted Event Tickets",
      "Participation in all India Club Events",
      "Free India Club Samachar Magazine",
      "Free India Club Namaskar Magazine",
      "Free Online Classified Advt to Members",
    ],
    recommended: false,
  },
];

export const EVENT_DETAILS = {
  difi: {
    longDescription: "DIFI — the Dayton International Festival Inc. — is one of Ohio's premier multicultural celebrations. India Club proudly represents the Indian community every year with a vibrant booth featuring classical and folk dance performances, traditional cuisine, henna art, saree displays, and live music from across India's many regions.",
    highlights: [
      "Bharatanatyam, Kathak, Kuchipudi & folk dance performances",
      "Authentic regional Indian food (North, South, Bengali, Punjabi)",
      "Live tabla, sitar and Bollywood music",
      "Henna/Mehendi artists & Saree drape demonstrations",
      "Children's craft corner with diya painting & rangoli",
    ],
    venue: "Dayton Convention Center, Downtown Dayton",
    typical: "Annual — Memorial Day Weekend",
  },
  diwali: {
    longDescription: "Diwali is India Club's most beloved annual celebration — a magical evening that brings 1500+ community members together to mark the Festival of Lights. Expect a star-studded cultural showcase, traditional dinner, dance performances by groups like Dholida Dolls, Bong Beats, Dancing Clouds, MMM and Devi Vandana.",
    highlights: [
      "Cultural showcase: 15+ dance & music performances",
      "Traditional Indian dinner (vegetarian & non-vegetarian)",
      "Diya lighting ceremony & Lakshmi Puja",
      "Bazaar stalls — sarees, jewelry, sweets, handicrafts",
      "Children's activities and Diwali photo booth",
      "Firework finale (subject to venue policy)",
    ],
    venue: "Dayton Convention Center",
    typical: "Last weekend of October or first weekend of November",
  },
  "rising-stars": {
    longDescription: "Rising Stars is ICGD's signature youth showcase celebrating the talent, dedication and creativity of our young community members aged 5–22. It's not a competition — it's a stage for every aspiring artist to shine in front of a warm, encouraging audience.",
    highlights: [
      "Solo and group performances",
      "Classical, semi-classical, fusion & Bollywood dance",
      "Vocal performances — Hindustani, Carnatic, light music",
      "Instrumental — sitar, tabla, violin, keyboard",
      "Dramatic skits & poetry recitations",
      "Every performer receives a certificate of participation",
    ],
    venue: "Sinclair Community College Auditorium",
    typical: "Spring (May)",
  },
  "golden-jewels": {
    longDescription: "Golden Jewels is a heartfelt program dedicated to our senior community members — the elders whose wisdom, stories and warmth are the soul of ICGD. We host regular tea evenings, bhajan sessions, health talks, day trips and a year-end appreciation gala.",
    highlights: [
      "Monthly tea & antakshari evenings",
      "Bhajan & devotional music sessions",
      "Annual health awareness camp with local physicians",
      "Day trips to museums, gardens and local attractions",
      "Year-end Golden Jewels Gala honoring seniors 70+",
      "Buddy program connecting seniors with families",
    ],
    venue: "Hindu Temple of Dayton & rotating venues",
    typical: "Monthly + Annual Gala in April",
  },
  "womens-connect": {
    longDescription: "Women's Connect is ICGD's empowerment platform — a space where women learn, lead, share stories, find mentors and uplift one another. From leadership workshops to wellness retreats, from career circles to mom's nights — we have something for every season of life.",
    highlights: [
      "International Women's Day annual signature event",
      "Quarterly leadership & career workshops",
      "Wellness, fitness and yoga circles",
      "New-mom support group & meet-ups",
      "Networking dinners with women business leaders",
      "Annual entrepreneurship pitch evening",
    ],
    venue: "Centerville & online (hybrid format)",
    typical: "Monthly meet-ups + March 8 signature event",
  },
  sports: {
    longDescription: "ICGD Sports brings the community together through the games we love. We organize year-round leagues, tournaments and family-friendly recreational events. Whether you're a serious athlete or a weekend casual, there is a spot for you on our roster.",
    highlights: [
      "Cricket Premier League — annual six-team T10 tournament",
      "Table tennis leagues (singles & doubles)",
      "Badminton open & junior tournaments",
      "Volleyball summer league",
      "Yoga classes (weekly, all levels)",
      "Family fitness day & 5K community walk",
    ],
    venue: "Wegerzyn Gardens & local community centers",
    typical: "Year-round — major tournaments July–September",
  },
  picnic: {
    longDescription: "The ICGD Annual Summer Picnic is the warmest day on our calendar — a relaxed afternoon of cricket, antakshari, kids games, food and laughter. No tickets, no formality — just bring your family and a smile.",
    highlights: [
      "Free entry for all India Club members and guests",
      "Cricket and volleyball tournaments",
      "Antakshari & kids' carnival games",
      "Home-style Indian lunch served picnic-style",
      "Tug-of-war, sack race & musical chairs",
      "Live tambola (housie) for grown-ups",
    ],
    venue: "Eastwood MetroPark, Dayton",
    typical: "Mid-July",
  },
  upcoming: {
    longDescription: "Here are all the confirmed upcoming events on the ICGD calendar. Register early — many events sell out, and members enjoy priority booking and discounted pricing.",
    highlights: [
      "Members get up to 50% off ticket prices",
      "Children under 5 free at most events",
      "Early-bird discounts available 30 days out",
      "Volunteer to attend free + earn community service hours",
    ],
    venue: "Various venues across Greater Dayton",
    typical: "Year-round",
  },
};

export const PROGRAM_DETAILS = {
  charity: {
    intro: "ICGD's charity arm channels community generosity toward causes that matter — locally in Dayton and internationally back home in India.",
    initiatives: [
      { name: "Foodbank Dayton Partnership", desc: "Quarterly food drives collecting non-perishables. Over 5,000 lbs donated annually." },
      { name: "United Way Greater Dayton", desc: "ICGD is a designated workplace giving recipient. Members can donate via payroll deduction." },
      { name: "India Flood & Earthquake Relief", desc: "Activated emergency drives in 2018 (Kerala floods), 2020 (Cyclone Amphan) and 2023 (earthquake response)." },
      { name: "Winter Coat Drive", desc: "Every December, we collect coats for the Dayton homeless shelters in partnership with Goodwill." },
      { name: "Blood Donation Camp", desc: "Annual camp with the Community Blood Center every fall." },
    ],
    impact: "Over $300,000 raised in cumulative donations across our 58-year history.",
  },
  education: {
    intro: "Education has always been a core ICGD pillar. From heritage language classes for our youth to college mentorship and STEM workshops — we invest in the next generation.",
    initiatives: [
      { name: "Saturday Heritage School", desc: "Hindi, Telugu, Tamil and Bengali language classes for K–8 students every Saturday morning." },
      { name: "SAT & College Prep", desc: "Volunteer mentorship led by community professionals — free for member families." },
      { name: "STEM Summer Camp", desc: "One-week intensive STEM camp every July for ages 8–14, run by ICGD engineers." },
      { name: "Bharatanatyam & Tabla Classes", desc: "Subsidized classical arts classes for children of members." },
      { name: "Cultural Storytelling Series", desc: "Monthly evenings featuring stories from Indian epics and folktales for kids." },
    ],
    impact: "200+ children enrolled in our Saturday school programs across the years.",
  },
  scholarship: {
    intro: "The ICGD Scholarship Program awards five $2,000 scholarships every year to graduating high school seniors of Indian origin in the Greater Dayton area.",
    initiatives: [
      { name: "Eligibility", desc: "Asian Indian student graduating high school in the Greater Dayton area with a college admission offer." },
      { name: "Criteria", desc: "Merit (academic performance), community service, financial need and a 500-word essay on Indian heritage." },
      { name: "Application Window", desc: "Opens February 1 and closes April 15 each year." },
      { name: "Award Amount", desc: "$2,000 per recipient — paid directly to the recipient's college/university." },
      { name: "Selection", desc: "Reviewed by a five-member volunteer Scholarship Committee. Recipients announced at Diwali Mela." },
    ],
    impact: "75+ scholarships awarded to date — totaling over $150,000 in college support.",
  },
  "community-service": {
    intro: "The Community Service Awards recognize individuals whose volunteer efforts have profoundly impacted the Asian Indian community of Greater Dayton.",
    initiatives: [
      { name: "Annual Award", desc: "One award presented each year at the Diwali Mela to a community volunteer." },
      { name: "Nominations", desc: "Open to all members. Submit nominations between July and September each year." },
      { name: "Selection Committee", desc: "A panel of past Presidents and Community Service Awardees reviews nominations." },
      { name: "Recognition", desc: "Trophy, lifetime ICGD membership and a feature in the Samachar newsletter." },
      { name: "Honor Wall", desc: "All past recipients are honored on the permanent ICGD Honor Wall." },
    ],
    impact: "Honored 25+ exceptional volunteers over the program's lifetime.",
  },
};

export const PROGRAMS = [
  {
    slug: "charity",
    name: "Charity",
    image: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    summary: "Annual food drives, disaster relief contributions and partnerships with local nonprofits.",
    details: "Over the years ICGD has raised over $300,000 in support of the United Way, Foodbank Dayton, India flood relief and earthquake response. We organize at least four major charity drives annually.",
  },
  {
    slug: "education",
    name: "Education",
    image: "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    summary: "Heritage classes, language workshops and STEM mentorship for our youth.",
    details: "Saturday school for Hindi, Telugu, Tamil and Bengali. SAT and college-prep mentorship by community professionals. Free art and dance camps every summer.",
  },
  {
    slug: "scholarship",
    name: "Scholarship",
    image: "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    summary: "Merit and need-based scholarships for graduating high-school seniors.",
    details: "Each year ICGD awards five $2,000 scholarships funded by community sponsors. Application opens in February and closes in April.",
  },
  {
    slug: "community-service",
    name: "Community Service Awards",
    image: "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
    summary: "Honoring volunteers whose service uplifts the Dayton Indian community.",
    details: "Annual award celebrated at the Diwali Mela. Past recipients include Dr. Suresh Gupta, Mrs. Lalita Rao and Engineer Pradeep Mehta.",
  },
];

export const CLASSIFIEDS = [
  { id: "c1", title: "Looking for a Hindi Tutor", category: "Education", location: "Centerville", date: "Jul 02, 2026", price: "$25/hr", image: "https://images.unsplash.com/photo-1468234847176-28606331216a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
  { id: "c2", title: "2BR Apartment for Rent — Beavercreek", category: "Housing", location: "Beavercreek", date: "Jun 28, 2026", price: "$1,450/mo", image: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
  { id: "c3", title: "Pre-owned Toyota Camry 2019", category: "Vehicles", location: "Dayton", date: "Jun 21, 2026", price: "$14,500", image: "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
  { id: "c4", title: "Bharatanatyam classes — Beginners welcome", category: "Services", location: "Kettering", date: "Jun 19, 2026", price: "$80/mo", image: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
  { id: "c5", title: "Handcrafted Sarees — Direct from Banaras", category: "For Sale", location: "Dayton", date: "Jun 14, 2026", price: "$150+", image: "https://images.unsplash.com/photo-1645264090488-a019de493023?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
  { id: "c6", title: "Tax Filing & CPA Services", category: "Services", location: "Centerville", date: "Jun 10, 2026", price: "Quote on call", image: "https://images.unsplash.com/photo-1651512186979-737021ace442?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600" },
];

export const GALLERY = [
  { id: 1, src: "https://images.unsplash.com/photo-1592843997881-cab3860b1067?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "ICGD Cultural Evening" },
  { id: 2, src: "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Diwali Celebration" },
  { id: 3, src: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Classical Dance Recital" },
  { id: 4, src: "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Festival Performance" },
  { id: 5, src: "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Rising Stars Show" },
  { id: 6, src: "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Community Gathering" },
  { id: 7, src: "https://images.unsplash.com/photo-1468234847176-28606331216a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Cultural Showcase" },
  { id: 8, src: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Indian Festival" },
  { id: 9, src: "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Stage Performance" },
  { id: 10, src: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Group Dance" },
  { id: 11, src: "https://images.unsplash.com/photo-1645264090488-a019de493023?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Youth Performance" },
  { id: 12, src: "https://images.unsplash.com/photo-1651512186979-737021ace442?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Cultural Night" },
  { id: 13, src: "https://images.unsplash.com/photo-1592843997881-cab3860b1067?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "ICGD Event" },
  { id: 14, src: "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Rising Star May 2026" },
  { id: 15, src: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600", title: "Grow Together" },
];

export const VISITOR_COUNT = {
  today: 111,
  yesterday: 419,
  thisWeek: 2035,
  thisMonth: 5945,
  allTime: 201005,
};

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

export const CONSTITUTION = [
  {
    n: "I",
    title: "Name and Location",
    items: [
      "1.1 The name of this non-profit 501(c)(3) organization shall be India Club of Greater Dayton (hereinafter referred to as India Club).",
      "1.2 The registered office of India Club shall be located in the greater Dayton area in the state of Ohio.",
    ],
  },
  {
    n: "II",
    title: "Objectives",
    items: [
      "2.1 To promote the welfare and assimilation of Asian Indians of greater Dayton and vicinity.",
      "2.2 To sustain and perpetuate the heritage and culture of India.",
      "2.3 To centralize resources, energies and talents for general betterment of Asian Indians.",
      "2.4 To promote educational, literacy, cultural and charitable activities.",
      "2.5 To disseminate information provided by other non-profit organizations via e-mail or other means and foster amiable attitudes among the various cultural groups for better understanding and cooperation.",
      "2.6 To raise funds for specified welfare projects.",
    ],
  },
  {
    n: "III",
    title: "Club Activities",
    items: [
      "3.1 At all times the Club shall remain a non-partisan, secular, and non-sectarian organization.",
      "3.2 The Club shall not encourage or promote any treasonous or seditious activity designed to adversely affect accomplishment of Club's objectives.",
      "3.3 Upon approval by the Executive Committee (E.C.), India Club may affiliate or disaffiliate with organizations/institutions, which are consistent with that of India Club.",
      "3.4 The Club shall organize periodically cultural and social programs; welfare, charitable and scientific projects; concerts, seminars, and lectures in art and music.",
      "3.5 The funds of the Club may be spent for achieving the objectives set forth above upon approval by a simple majority vote of the E.C.",
      "3.6 Any purchase of capital goods or equipment costing over $5,000 must be approved by the General Body.",
      "3.7 With approval of the E.C., the Club may engage in fund raising activities for any specific common cause or special project.",
      "3.8 The Club shall meet its financial obligations through membership fees, special fund raising programs and donations.",
    ],
  },
  {
    n: "IV",
    title: "Membership",
    items: [
      "4.1 Any individual who subscribes to the objectives of the India Club can become a member. The member shall agree to abide by the Constitution.",
      "4.2 There shall be five classes of memberships: (A) Family, (B) Individual, (C) Student, (D) Institutional, (E) Honorary.",
      "4.3 Annual and life membership dues will be decided by the E.C. every year.",
      "4.4 To be eligible to vote, a member must be in good standing — annual fees paid/renewed by March 15.",
      "4.5 Family members shall have two votes — one for the principal member and one for any other family member.",
    ],
  },
  {
    n: "V",
    title: "Fiscal Year",
    items: [
      "5.1 The fiscal year of the Club shall commence on the first day of January of each year and end on the 31st day of December.",
    ],
  },
  {
    n: "VI",
    title: "Executive Committee",
    items: [
      "6.1 The E.C. shall consist of eleven members: President, President-elect, Secretary, Treasurer and seven members at large.",
      "6.2 Of the seven members at large, one shall hold the position of Delegate to International Festivals (DIFI) and at least two shall be youth aged 16–23.",
      "6.3 The E.C. shall meet at least nine times a year. Six members shall constitute the quorum.",
      "6.4 Members of the E.C. shall not receive any remuneration for their services.",
      "6.5 The President-elect succeeds the President in case of vacancy; other vacancies are filled from within the E.C. or general membership.",
    ],
  },
  {
    n: "VII",
    title: "Responsibilities and Duties of Officers",
    items: [
      "PRESIDENT — Chief executive officer; presides over meetings; responsible for coordinating activities, public relations and maintaining 501(c)(3) status.",
      "PRESIDENT-ELECT — Acts in absence of the President; custodian of capital goods and equipment.",
      "SECRETARY — Recording officer; maintains minutes, member mailing addresses and voter list.",
      "TREASURER — Custody of all funds; maintains account books; publishes audited annual financial report.",
      "DELEGATE TO INTERNATIONAL FESTIVALS (DIFI) — Represents India Club at DIFI and other international events.",
      "TRUSTEES — President, Secretary, and Treasurer act as trustees.",
      "EX-OFFICIO — The previous year's President serves as Ex-officio member of the current E.C.",
      "AUDITOR — Appointed by the President; performs at least one audit in the last quarter of fiscal year.",
    ],
  },
  {
    n: "VIII",
    title: "Nominations and Elections",
    items: [
      "8.1 A Nominating Committee (N.C.) is appointed by the President at least two months before the annual general body meeting.",
      "8.2 The N.C. is composed of five members; the outgoing President acts as Chairman.",
      "8.4 The N.C. presents one candidate each for President-elect, Secretary, Treasurer and six members of the E.C.",
      "8.5 No individual shall serve on the E.C. for more than six consecutive years.",
      "8.8 Candidates are elected by a simple majority vote of voting members present at the meeting.",
    ],
  },
  {
    n: "IX",
    title: "Conduct of Meetings and Quorum",
    items: [
      "9.1 The annual general body meeting is held during the last quarter of fiscal year.",
      "9.2 Special meetings may be held upon a call of the E.C. or upon written request of 50+ members.",
      "9.4 All meetings shall be presided over by the President; conducted per parliamentary practice.",
      "9.5 Notice of meetings shall be sent to each voting member at least 15 days in advance.",
      "9.7 25% of all voting members shall form the quorum for a business or election meeting.",
    ],
  },
  {
    n: "X",
    title: "Amendments",
    items: [
      "10.1 Amendments may be proposed by the E.C. or by written request of at least 50 voting members.",
      "10.2 General information on proposed amendments shall be sent to members at least 15 days prior to the meeting.",
    ],
  },
  {
    n: "XI",
    title: "Dissolution",
    items: [
      "11.1 In the event of dissolution, any net assets remaining shall be donated to secular, non-profit, charitable, cultural organization(s) consistent with India Club's objectives and meeting 501(c)(3) criteria.",
      "11.2 The assets will be frozen for a period of one year to address unforeseen liabilities before donations are made.",
    ],
  },
];

export const COMMUNITY_SERVICE_AWARDEES = [
  { year: 2024, name: "Dr. Suresh Gupta", contribution: "Health & education advocacy across Greater Dayton" },
  { year: 2023, name: "Mrs. Lalita Rao", contribution: "Senior care initiatives and community kitchen" },
  { year: 2022, name: "Pradeep Mehta", contribution: "Youth mentorship and summer STEM camps" },
  { year: 2021, name: "Dr. Anjali Verma", contribution: "Pandemic-era community health response" },
  { year: 2019, name: "Hyacinth Dey", contribution: "Decades of cultural programming leadership" },
  { year: 2018, name: "Ravi Swaminathan", contribution: "Sustained financial stewardship of ICGD" },
  { year: 2017, name: "Bhanu Raghavan", contribution: "Multi-year service across two presidential terms" },
];

export const DIFI_AWARDS = [
  { year: 2024, title: "Outstanding Cultural Showcase", note: "Diwali Mela performance" },
  { year: 2023, title: "Best Multicultural Booth", note: "DIFI World Affairs Festival" },
  { year: 2022, title: "Community Excellence Award", note: "Volunteer-led programming" },
  { year: 2021, title: "Pandemic Response Recognition", note: "Virtual event innovation" },
  { year: 2019, title: "Heritage Showcase Excellence", note: "Cultural diversity celebration" },
  { year: 2017, title: "Best Performance Group", note: "Indian classical dance" },
];
