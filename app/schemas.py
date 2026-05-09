from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class LeadCreate(BaseModel):
    source: str = "osm"
    osm_type: Optional[str] = None
    osm_id: Optional[int] = None
    name: Optional[str] = None
    category: Optional[str] = None
    business_group: Optional[str] = None
    business_subgroup: Optional[str] = None
    classification_confidence: Optional[float] = None
    cuisine: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    municipality: Optional[str] = None
    province: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    search_area: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    email_source: Optional[str] = None
    email_confidence: Optional[float] = None
    website: Optional[str] = None
    website_status: Optional[str] = None
    website_source: Optional[str] = None
    website_confidence: Optional[float] = None
    website_discovery_status: Optional[str] = None
    candidate_websites: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    opening_hours: Optional[str] = None
    has_website: bool = False
    has_email: bool = False
    lead_score: int = 0
    lead_status: str = "new"
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    business_group: Optional[str] = None
    business_subgroup: Optional[str] = None
    classification_confidence: Optional[float] = None
    cuisine: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    municipality: Optional[str] = None
    province: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    search_area: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    email_source: Optional[str] = None
    email_confidence: Optional[float] = None
    website: Optional[str] = None
    website_status: Optional[str] = None
    website_source: Optional[str] = None
    website_confidence: Optional[float] = None
    website_discovery_status: Optional[str] = None
    candidate_websites: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    opening_hours: Optional[str] = None
    has_website: Optional[bool] = None
    has_email: Optional[bool] = None
    lead_score: Optional[int] = None
    lead_status: Optional[str] = None
    notes: Optional[str] = None


class LeadStatusUpdate(BaseModel):
    lead_status: str = Field(..., description="New status value")


class LeadNotesUpdate(BaseModel):
    notes: str = Field(..., description="New notes text")


class LeadResponse(BaseModel):
    id: int
    source: Optional[str] = None
    osm_type: Optional[str] = None
    osm_id: Optional[int] = None
    name: Optional[str] = None
    category: Optional[str] = None
    business_group: Optional[str] = None
    business_subgroup: Optional[str] = None
    classification_confidence: Optional[float] = None
    cuisine: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    municipality: Optional[str] = None
    province: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    search_area: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    email_source: Optional[str] = None
    email_confidence: Optional[float] = None
    website: Optional[str] = None
    website_status: Optional[str] = None
    website_source: Optional[str] = None
    website_confidence: Optional[float] = None
    website_discovery_status: Optional[str] = None
    candidate_websites: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    opening_hours: Optional[str] = None
    has_website: bool = False
    has_email: bool = False
    lead_score: int = 0
    lead_status: str = "new"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StatsResponse(BaseModel):
    total_leads: int = 0
    by_category: dict = {}
    by_business_group: dict = {}
    by_business_subgroup: dict = {}
    by_city: dict = {}
    by_status: dict = {}
    avg_lead_score: float = 0.0
    with_email: int = 0
    with_website: int = 0
    needs_manual_verification: int = 0
    official_websites: int = 0
    social_only: int = 0
    booking_platform_only: int = 0
    directory_only: int = 0
    no_website_osm: int = 0
    top_cities: list = []
    top_categories_missing_website: list = []
