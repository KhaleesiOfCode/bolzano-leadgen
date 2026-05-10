from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, UniqueConstraint, Index
from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    __table_args__ = (
        UniqueConstraint("osm_type", "osm_id", name="uq_osm_type_id"),
        Index("idx_lead_business_group", "business_group"),
        Index("idx_lead_business_subgroup", "business_subgroup"),
        Index("idx_lead_city", "city"),
        Index("idx_lead_lead_status", "lead_status"),
        Index("idx_lead_lead_score", "lead_score"),
        Index("idx_lead_has_website", "has_website"),
        Index("idx_lead_has_email", "has_email"),
        Index("idx_lead_website_source", "website_source"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), default="osm")
    osm_type = Column(String(20), nullable=True)
    osm_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    business_group = Column(String(50), nullable=True)
    business_subgroup = Column(String(50), nullable=True)
    classification_confidence = Column(Float, nullable=True)
    cuisine = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    postcode = Column(String(20), nullable=True)
    municipality = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    country = Column(String(100), default="Italy")
    search_area = Column(String(100), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    phone = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    email_source = Column(String(50), nullable=True)
    email_confidence = Column(Float, nullable=True)
    website = Column(String(500), nullable=True)
    website_status = Column(String(50), nullable=True)
    website_source = Column(String(50), nullable=True)
    website_confidence = Column(Float, nullable=True)
    website_discovery_status = Column(String(50), default="not_checked")
    candidate_websites = Column(Text, nullable=True)
    instagram = Column(String(500), nullable=True)
    facebook = Column(String(500), nullable=True)
    opening_hours = Column(String(500), nullable=True)
    has_website = Column(Boolean, default=False)
    has_email = Column(Boolean, default=False)
    lead_score = Column(Integer, default=0)
    lead_status = Column(String(50), default="new")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


NEW_COLUMNS = {
    "business_subgroup": "VARCHAR(50)",
    "classification_confidence": "FLOAT",
    "municipality": "VARCHAR(100)",
    "province": "VARCHAR(100)",
    "region": "VARCHAR(100)",
    "country": "VARCHAR(100)",
    "search_area": "VARCHAR(100)",
    "website_source": "VARCHAR(50)",
    "website_confidence": "FLOAT",
    "website_discovery_status": "VARCHAR(50)",
    "candidate_websites": "TEXT",
}

NEW_INDEXES: dict[str, list[str]] = {
    "idx_lead_business_group": ["business_group"],
    "idx_lead_business_subgroup": ["business_subgroup"],
    "idx_lead_city": ["city"],
    "idx_lead_lead_status": ["lead_status"],
    "idx_lead_lead_score": ["lead_score"],
    "idx_lead_has_website": ["has_website"],
    "idx_lead_has_email": ["has_email"],
    "idx_lead_website_source": ["website_source"],
}
