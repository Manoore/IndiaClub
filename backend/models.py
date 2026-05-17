from pydantic import BaseModel, Field, EmailStr
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
    date: str
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
    tier: str = "Bronze"  # Diamond | Gold | Silver | Bronze
    website: Optional[str] = None
    active: bool = True
    order: int = 100
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
    order: int = 100


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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MemberRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None


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
