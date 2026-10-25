from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


def gen_id() -> str:
    return str(uuid.uuid4())


# ---------- Auth ----------
class AdminUser(BaseModel):
    id: str = Field(default_factory=gen_id)
    username: str
    password_hash: str
    role: str = "webmaster"
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ---------- Generic ----------
class FileEntry(BaseModel):
    id: str = Field(default_factory=gen_id)
    filename: str
    mime_type: str
    data_base64: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- Domain ----------
class Event(BaseModel):
    id: str = Field(default_factory=gen_id)
    title: str
    slug: str
    category: str
    date: str  # legacy free-text display (kept for backward compat); prefer start_date
    time: Optional[str] = None
    venue: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    image_url: Optional[str] = None
    highlights: List[str] = []
    registration_open: bool = True
    featured: bool = False
    color: Optional[str] = "#8B1A1A"
    typical_timing: Optional[str] = None
    ticket_types: List[dict] = []  # see TicketType model schema
    # ---- Phase 5: structured scheduling + format ----
    event_format: str = "in_person"  # in_person | online | hybrid
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None  # if set and != start_date → multi-day
    online_url: Optional[str] = None  # Zoom / Meet / YouTube link
    schedule: List[dict] = []  # [{day, time, title, location_or_link}]
    promo_codes: List[dict] = []  # [{code, kind, value, max_uses, used, per_customer, starts, ends, min_purchase, categories, enabled}]
    # ---- Pricing (see checkout.py) ----
    price_periods: List[dict] = []  # [{id, name, start, end}] in Eastern time; ticket_types[].period_prices[id] = {non_member, member}
    sponsor_perks: dict = {}  # {level_slug: {mode: default|off|price, price}}
    donations_enabled: bool = True
    fee_mode: str = "absorb"  # absorb (ICGD pays card fees) | voluntary (buyer may add a contribution)
    fee_percent: float = 3.0
    fee_fixed: float = 0.30
    capacity: int = 0  # whole-event limit across ticket types; 0 = unlimited
    created_at: datetime = Field(default_factory=datetime.utcnow)


class News(BaseModel):
    id: str = Field(default_factory=gen_id)
    title: str
    slug: str
    body: str
    image_url: Optional[str] = None
    published: bool = True
    published_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExecMember(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    role: str
    image_url: Optional[str] = None
    bio: Optional[str] = None
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GalleryImage(BaseModel):
    id: str = Field(default_factory=gen_id)
    title: str
    image_url: str
    album: Optional[str] = "General"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Sponsor(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    logo_url: Optional[str] = None
    tier: str = "Bronze"  # Platinum | Gold | Silver | Bronze
    website: Optional[str] = None
    active: bool = True
    order: int = 100
    sponsorship_id: Optional[str] = None  # set when created from a paid sponsorship
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Donor(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    amount: float
    year: int
    tier: str = "Bronze"
    anonymous: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Classified(BaseModel):
    id: str = Field(default_factory=gen_id)
    title: str
    category: str
    location: str
    price: Optional[str] = None
    description: str
    image_url: Optional[str] = None
    contact: str
    status: str = "pending"  # pending | approved | rejected
    member_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Subscriber(BaseModel):
    id: str = Field(default_factory=gen_id)
    email: EmailStr
    name: Optional[str] = None
    subscribed_at: datetime = Field(default_factory=datetime.utcnow)


class ContactMessage(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    email: EmailStr
    subject: Optional[str] = None
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Donation(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    email: EmailStr
    amount: float
    message: Optional[str] = None
    payment_status: str = "pending"  # pending | awaiting_check | paid | failed | refunded
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MembershipApplication(BaseModel):
    id: str = Field(default_factory=gen_id)
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    family: int = 1
    plan: str  # regular | business | honorary | extended
    tier: Optional[str] = None  # student | individual | family | business | silver | gold
    status: str = "pending"  # pending | approved | rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SponsorshipInquiry(BaseModel):
    id: str = Field(default_factory=gen_id)
    company: str
    contact: str
    email: EmailStr
    phone: str
    tier: Optional[str] = None
    message: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EventRegistration(BaseModel):
    id: str = Field(default_factory=gen_id)
    event_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    family_count: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PastPresident(BaseModel):
    id: str = Field(default_factory=gen_id)
    year: str
    name: str
    order: int = 100


class Awardee(BaseModel):
    id: str = Field(default_factory=gen_id)
    year: int
    name: str
    contribution: Optional[str] = None
    type: str = "community"  # community | difi
    order: int = 100


class TaxReturn(BaseModel):
    id: str = Field(default_factory=gen_id)
    year: int
    filed_by: Optional[str] = None
    president: Optional[str] = None
    file_id: Optional[str] = None
    available: bool = True
    order: int = 100


class ProgramInitiative(BaseModel):
    name: str
    desc: str


class Program(BaseModel):
    id: str = Field(default_factory=gen_id)
    slug: str
    name: str
    image_url: Optional[str] = None
    summary: Optional[str] = None
    intro: Optional[str] = None
    initiatives: List[ProgramInitiative] = []
    impact: Optional[str] = None
    order: int = 100


class MembershipTier(BaseModel):
    slug: str
    name: str
    price: float
    benefits: List[str] = []
    recommended: bool = False
    tagline: Optional[str] = None
    # Admin-managed rules; None falls back to the plan's setting
    includes_family: Optional[bool] = None  # named family members share the benefits
    member_pricing: Optional[bool] = None  # member ticket prices and members-only tickets
    term_years: Optional[int] = None  # years covered per purchase


class MembershipPlan(BaseModel):
    id: str = Field(default_factory=gen_id)
    slug: str
    name: str
    price: float
    period: str
    description: str
    benefits: List[str] = []
    featured: bool = False
    tiers: List[MembershipTier] = []
    hidden: bool = False  # legacy plans (e.g. lifetime) that can't be bought online
    order: int = 100
    includes_family: Optional[bool] = None
    member_pricing: Optional[bool] = None
    term_years: Optional[int] = None


class MemberPerk(BaseModel):
    id: str = Field(default_factory=gen_id)
    title: str
    description: str
    icon: Optional[str] = "Gift"
    image_url: Optional[str] = None
    link: Optional[str] = None
    link_label: Optional[str] = None
    badge: Optional[str] = None
    category: Optional[str] = "General"
    active: bool = True
    order: int = 100
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TicketType(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    description: Optional[str] = ""
    price: float = 0  # legacy/default; treat as regular non-member price
    member_price: Optional[float] = None  # if set, active members pay this
    early_bird_price: Optional[float] = None  # if set, anyone pays this until early_bird_end_date
    early_bird_end_date: Optional[datetime] = None
    child_price: Optional[float] = None  # ages 3–11 (verified family members); under 3 free
    sponsor_price: Optional[float] = None  # with a valid sponsor code; 0 = included in sponsorship
    members_only: bool = False
    sale_start: Optional[datetime] = None  # if None, available immediately
    sale_end: Optional[datetime] = None  # if None, available until event date
    quantity_total: int = 0  # 0 = unlimited
    quantity_sold: int = 0
    order: int = 100


class TicketOrderItem(BaseModel):
    ticket_type_id: str
    ticket_type_name: str
    unit_price: float
    quantity: int


class TicketOrder(BaseModel):
    id: str = Field(default_factory=gen_id)
    event_id: str
    event_title: str
    member_id: Optional[str] = None
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None
    items: List[TicketOrderItem] = []
    subtotal: float = 0
    total: float = 0
    payment_method: str = "paypal"  # paypal | check | cash | stripe
    payment_status: str = "pending"  # pending | awaiting_check | paid | failed | refunded
    notes: Optional[str] = ""
    tickets: List[dict] = []  # per-attendee [{code, attendee_name, ticket_type_id, age_band, price, checked_in_at}]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TicketPurchaseRequest(BaseModel):
    event_id: str
    items: List[dict] = []  # [{ticket_type_id, quantity}]
    attendees: Optional[List[dict]] = None  # [{ticket_type_id, name?, family_member_id?}] overrides items
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None
    payment_method: str = "paypal"
    promo_code: Optional[str] = None  # Phase 5: apply discount if valid
    sponsor_code: Optional[str] = None  # unlocks sponsor_price for active sponsors
    notes: Optional[str] = ""


class GoogleSignInRequest(BaseModel):
    credential: str  # Google ID token from frontend


class SiteSettings(BaseModel):
    """Single-document collection holding all editable site content."""
    id: str = "main"
    # General
    site_name: str = "India Club of Greater Dayton"
    contact_email: str = "contact@indiaclubdayton.org"
    contact_phone: str = "(937) 314-8870"
    contact_address: str = "Dayton, OH"
    social_facebook: Optional[str] = ""
    social_twitter: Optional[str] = ""
    social_instagram: Optional[str] = ""
    social_youtube: Optional[str] = ""
    # Home hero
    home_hero_eyebrow: str = "SINCE 1967"
    home_hero_title: str = "India Club of Greater Dayton"
    home_hero_subtitle: str = "A vibrant home for 1000+ Indian-American families — celebrating heritage, culture and community for 58 years and counting."
    home_hero_cta_primary: str = "Become a Member"
    home_hero_cta_secondary: str = "Explore Events"
    home_hero_image: Optional[str] = ""
    # Stats
    home_stat_1_value: str = "1967"
    home_stat_1_label: str = "Founded"
    home_stat_2_value: str = "1000+"
    home_stat_2_label: str = "Families"
    home_stat_3_value: str = "40+"
    home_stat_3_label: str = "Events / Year"
    # Why Join
    home_why_join_title: str = "Why join India Club?"
    home_why_join_text: str = "Members enjoy discounted tickets to all our cultural events, voting rights at the AGM, a quarterly newsletter, and the unmatched joy of belonging to a 1000+ family Indian community in the heart of Ohio."
    # About page
    about_mission: str = "India Club of Greater Dayton is dedicated to preserving and promoting Indian heritage, culture, and community values."
    about_history: str = "Founded in 1967, ICGD has been the cornerstone of the Indian-American community in Dayton, Ohio."
    # Footer
    footer_tagline: str = "Celebrating Indian heritage, culture, and community since 1967."
    footer_copyright: str = "© 2026 India Club of Greater Dayton. All rights reserved."
    # Honorary
    honorary_contact_email: str = "president@indiaclubdayton.org"
    # Community
    classifieds_members_only: bool = False
    # Analytics
    google_analytics_id: Optional[str] = ""
    # Checkout donation prompt
    donation_title: str = "Support India Club"
    donation_text: str = ("Your additional contribution helps ICGD continue bringing our community together "
                          "through cultural, educational, and community programs.")
    donation_presets: List[float] = [10, 25, 50, 100]
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SiteSettingsUpdate(BaseModel):
    """Partial update — any subset of SiteSettings fields."""
    site_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    social_instagram: Optional[str] = None
    social_youtube: Optional[str] = None
    home_hero_eyebrow: Optional[str] = None
    home_hero_title: Optional[str] = None
    home_hero_subtitle: Optional[str] = None
    home_hero_cta_primary: Optional[str] = None
    home_hero_cta_secondary: Optional[str] = None
    home_hero_image: Optional[str] = None
    home_stat_1_value: Optional[str] = None
    home_stat_1_label: Optional[str] = None
    home_stat_2_value: Optional[str] = None
    home_stat_2_label: Optional[str] = None
    home_stat_3_value: Optional[str] = None
    home_stat_3_label: Optional[str] = None
    home_why_join_title: Optional[str] = None
    home_why_join_text: Optional[str] = None
    about_mission: Optional[str] = None
    about_history: Optional[str] = None
    footer_tagline: Optional[str] = None
    footer_copyright: Optional[str] = None
    honorary_contact_email: Optional[str] = None
    classifieds_members_only: Optional[bool] = None
    google_analytics_id: Optional[str] = None
    donation_title: Optional[str] = None
    donation_text: Optional[str] = None
    donation_presets: Optional[List[float]] = None


# ---------- Member (logged-in user) ----------
class MemberMembership(BaseModel):
    plan: Optional[str] = None  # regular | business | honorary | extended
    tier: Optional[str] = None  # student | individual | family | business | silver | gold
    status: str = "none"  # none | pending | active | rejected | expired
    school_name: Optional[str] = None
    degree_program: Optional[str] = None
    donation_amount: float = 0
    payment_method: Optional[str] = None  # paypal | check | other
    family_count: int = 1
    submitted_at: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    lifetime: bool = False
    payment_status: Optional[str] = None  # pending | awaiting_check | paid | failed | refunded
    term_kind: Optional[str] = None  # new | renewal
    term_rule: Optional[str] = None  # standard | promotion | kept_current | override | lifetime
    promotion: Optional[dict] = None  # {id, name} when a promotion set the expiration
    paid_at: Optional[datetime] = None  # expiration is recalculated from this date


class Member(BaseModel):
    id: str = Field(default_factory=gen_id)
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    gender: Optional[str] = None
    phone: Optional[str] = None
    phone_alt: Optional[str] = None
    address: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = "United States"
    membership: MemberMembership = Field(default_factory=MemberMembership)
    joined_at: Optional[datetime] = None  # original join date, never overwritten
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MemberRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str

    @field_validator("phone")
    @classmethod
    def _phone_required(cls, v: str) -> str:
        v = (v or "").strip()
        if sum(c.isdigit() for c in v) < 7:
            raise ValueError("Enter a valid phone number")
        return v


class MemberLoginRequest(BaseModel):
    email: EmailStr
    password: str


class MemberProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    phone_alt: Optional[str] = None
    address: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None


class MemberPasswordChange(BaseModel):
    current_password: str
    new_password: str


class MemberSubscribeRequest(BaseModel):
    plan: str
    tier: Optional[str] = None
    school_name: Optional[str] = None
    degree_program: Optional[str] = None
    donation_amount: float = 0
    payment_method: str  # paypal | check | other
    family_count: int = 1
    # Address fields (also update profile during subscribe)
    address: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None


class MemberRejectRequest(BaseModel):
    reason: Optional[str] = ""



# ---------- Home page CMS content ----------
class HeroSlide(BaseModel):
    id: str = Field(default_factory=gen_id)
    image_url: str
    headline: Optional[str] = None
    subhead: Optional[str] = None
    cta_label: Optional[str] = None
    cta_link: Optional[str] = None
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FeatureHighlight(BaseModel):
    id: str = Field(default_factory=gen_id)
    title: str
    description: str
    image_url: Optional[str] = None
    cta: str = "Learn More"
    link: str = "/"
    accent: str = "#8B1A1A"  # Hex color
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Testimonial(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    body: str
    date: Optional[str] = None  # e.g. "Feb 06, 2024" — kept as string for display flexibility
    rating: int = 5
    image_url: Optional[str] = None
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SiteStat(BaseModel):
    id: str = Field(default_factory=gen_id)
    label: str
    value: str
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)



# ---------- Event Categories / Programs landing pages ----------
class EventCategory(BaseModel):
    id: str = Field(default_factory=gen_id)
    slug: str
    name: str
    tagline: Optional[str] = ""
    description: Optional[str] = ""
    image_url: Optional[str] = None
    color: str = "#8B1A1A"
    long_description: Optional[str] = ""
    highlights: List[str] = []
    venue: Optional[str] = ""
    typical_timing: Optional[str] = ""
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DIFIAward(BaseModel):
    id: str = Field(default_factory=gen_id)
    year: int
    title: str
    note: Optional[str] = ""
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConstitutionSection(BaseModel):
    id: str = Field(default_factory=gen_id)
    n: str  # Roman numeral, e.g. "I", "II"
    title: str
    items: List[str] = []
    order: int = 100
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- Sponsorships ----------
class SponsorshipPlan(BaseModel):
    id: str = Field(default_factory=gen_id)
    slug: str
    name: str  # Platinum | Gold | Silver | Bronze
    price: float
    benefits: List[str] = []
    active: bool = True
    order: int = 100
    # Event ticket perk for people named on the sponsorship (events can switch it off or set a price)
    perk_kind: str = "none"  # none | free | member | percent | fixed
    perk_value: float = 0
    named_people: int = 0  # how many people the sponsor can name
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- Community business directory ----------
class Business(BaseModel):
    id: str = Field(default_factory=gen_id)
    name: str
    category: str = "Other"
    description: Optional[str] = ""
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    member_id: Optional[str] = None
    status: str = "pending"  # pending | approved | rejected
    order: int = 100
    created_at: datetime = Field(default_factory=datetime.utcnow)
