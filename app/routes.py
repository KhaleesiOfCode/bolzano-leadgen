import io
import csv
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Lead
from app.schemas import (
    LeadCreate,
    LeadResponse,
    LeadStatusUpdate,
    LeadNotesUpdate,
    StatsResponse,
)
from app.osm_scraper import scrape_bolzano, scrape_south_tyrol, scrape_city
from app.lead_scoring import calculate_score
from app.email_extractor import enrich_lead_with_email, hunter_email_search
from app.website_classifier import classify_url
from app.google_places import search_business_website, search_digital_agencies

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
def root():
    return {
        "message": "Bolzano LeadGen API is running",
        "docs": "http://127.0.0.1:8000/docs",
        "frontend": "http://localhost:3000",
        "endpoints": {
            "health": "GET /health",
            "scrape_bolzano": "POST /scrape/osm/bolzano",
            "scrape_south_tyrol": "POST /scrape/osm/south-tyrol",
            "scrape_city": "POST /scrape/osm/city/{city_name}",
            "leads": "GET /leads",
            "stats": "GET /stats",
            "csv_export": "GET /leads/export/csv",
        },
    }


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/scrape/osm/bolzano")
def scrape_osm_bolzano(db: Session = Depends(get_db)):
    raw_leads = scrape_bolzano()
    created = 0
    updated = 0

    for raw in raw_leads:
        raw["lead_score"] = calculate_score(raw)

        existing = db.query(Lead).filter(
            Lead.osm_type == raw["osm_type"],
            Lead.osm_id == raw["osm_id"],
        ).first()

        if existing:
            for key, value in raw.items():
                setattr(existing, key, value)
            updated += 1
        else:
            db.add(Lead(**raw))
            created += 1

    db.commit()

    return {
        "leads_found": len(raw_leads),
        "created": created,
        "updated": updated,
    }


@router.post("/scrape/osm/south-tyrol")
def scrape_osm_south_tyrol(db: Session = Depends(get_db)):
    raw_leads = scrape_south_tyrol()
    created = 0
    updated = 0

    for raw in raw_leads:
        raw["lead_score"] = calculate_score(raw)
        existing = db.query(Lead).filter(
            Lead.osm_type == raw["osm_type"],
            Lead.osm_id == raw["osm_id"],
        ).first()
        if existing:
            for key, value in raw.items():
                setattr(existing, key, value)
            updated += 1
        else:
            db.add(Lead(**raw))
            created += 1
    db.commit()
    return {
        "leads_found": len(raw_leads),
        "created": created,
        "updated": updated,
    }


@router.post("/scrape/osm/city/{city_name}")
def scrape_osm_city(city_name: str, db: Session = Depends(get_db)):
    try:
        raw_leads = scrape_city(city_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    created = 0
    updated = 0
    for raw in raw_leads:
        raw["lead_score"] = calculate_score(raw)
        existing = db.query(Lead).filter(
            Lead.osm_type == raw["osm_type"],
            Lead.osm_id == raw["osm_id"],
        ).first()
        if existing:
            for key, value in raw.items():
                setattr(existing, key, value)
            updated += 1
        else:
            db.add(Lead(**raw))
            created += 1
    db.commit()
    return {
        "leads_found": len(raw_leads),
        "created": created,
        "updated": updated,
    }


@router.post("/scrape/digital-agencies/{city_name}")
def scrape_digital_agencies(city_name: str, db: Session = Depends(get_db)):
    results = search_digital_agencies(city_name)
    created = 0
    skipped = 0
    for raw in results:
        raw["lead_score"] = calculate_score(raw)
        existing = db.query(Lead).filter(
            Lead.name == raw["name"],
            Lead.source == "google_places_digital",
            Lead.city.ilike(f"%{city_name}%"),
        ).first()
        if existing:
            skipped += 1
        else:
            db.add(Lead(**raw))
            created += 1
    db.commit()
    return {
        "leads_found": len(results),
        "created": created,
        "updated": 0,
        "skipped_duplicates": skipped,
    }


@router.get("/leads", response_model=list[LeadResponse])
def list_leads(
    has_website: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    business_group: Optional[str] = Query(None),
    business_subgroup: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    municipality: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    search_area: Optional[str] = Query(None),
    website_status: Optional[str] = Query(None),
    website_discovery_status: Optional[str] = Query(None),
    website_source: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None, ge=0),
    max_score: Optional[int] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    if has_website is not None:
        if has_website.lower() == "true":
            query = query.filter(Lead.has_website.is_(True))
        elif has_website.lower() == "false":
            query = query.filter(Lead.has_website.is_(False))

    if lead_status is not None:
        query = query.filter(Lead.lead_status == lead_status)

    if business_group is not None:
        groups = [g.strip() for g in business_group.split(",")]
        query = query.filter(Lead.business_group.in_(groups))

    if business_subgroup is not None:
        subgroups = [s.strip() for s in business_subgroup.split(",")]
        query = query.filter(Lead.business_subgroup.in_(subgroups))

    if city is not None:
        query = query.filter(Lead.city.ilike(f"%{city}%"))

    if municipality is not None:
        query = query.filter(Lead.municipality.ilike(f"%{municipality}%"))

    if province is not None:
        query = query.filter(Lead.province.ilike(f"%{province}%"))

    if search_area is not None:
        query = query.filter(Lead.search_area.ilike(f"%{search_area}%"))

    if website_status is not None:
        query = query.filter(Lead.website_status == website_status)

    if website_discovery_status is not None:
        query = query.filter(Lead.website_discovery_status == website_discovery_status)

    if website_source is not None:
        query = query.filter(Lead.website_source == website_source)

    if min_score is not None:
        query = query.filter(Lead.lead_score >= min_score)

    if max_score is not None:
        query = query.filter(Lead.lead_score <= max_score)

    return query.order_by(Lead.lead_score.desc()).offset(skip).limit(limit).all()


@router.get("/leads/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/leads/{lead_id}/status", response_model=LeadResponse)
def update_lead_status(
    lead_id: int,
    body: LeadStatusUpdate,
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.lead_status = body.lead_status
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/leads/{lead_id}/notes", response_model=LeadResponse)
def update_lead_notes(
    lead_id: int,
    body: LeadNotesUpdate,
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.notes = body.notes
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/leads/{lead_id}/website", response_model=LeadResponse)
def update_lead_website(
    lead_id: int,
    body: dict,
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    website = body.get("website")
    if website:
        classification = classify_url(website)
        lead.website = website
        lead.has_website = True
        lead.website_source = classification["url_type"]
        lead.website_discovery_status = "official_website_found"
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/accept-candidate")
def accept_candidate_website(
    lead_id: int,
    body: dict,
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    website = body.get("website")
    if not website:
        raise HTTPException(status_code=400, detail="website is required")
    classification = classify_url(website)
    lead.website = website
    lead.has_website = True
    lead.website_source = classification["url_type"]
    lead.website_status = "verified"
    lead.website_discovery_status = "official_website_found"
    lead.lead_score = calculate_score(
        {c.name: getattr(lead, c.name) for c in lead.__table__.columns}
    )
    db.commit()
    db.refresh(lead)
    return {"status": "accepted", "website": website}


@router.get("/leads/export/csv")
def export_leads_csv(
    has_website: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    business_group: Optional[str] = Query(None),
    business_subgroup: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    municipality: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    search_area: Optional[str] = Query(None),
    website_status: Optional[str] = Query(None),
    website_discovery_status: Optional[str] = Query(None),
    website_source: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None, ge=0),
    max_score: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    if has_website is not None:
        if has_website.lower() == "true":
            query = query.filter(Lead.has_website.is_(True))
        elif has_website.lower() == "false":
            query = query.filter(Lead.has_website.is_(False))

    if lead_status is not None:
        query = query.filter(Lead.lead_status == lead_status)

    if business_group is not None:
        groups = [g.strip() for g in business_group.split(",")]
        query = query.filter(Lead.business_group.in_(groups))

    if business_subgroup is not None:
        subgroups = [s.strip() for s in business_subgroup.split(",")]
        query = query.filter(Lead.business_subgroup.in_(subgroups))

    if city is not None:
        query = query.filter(Lead.city.ilike(f"%{city}%"))

    if municipality is not None:
        query = query.filter(Lead.municipality.ilike(f"%{municipality}%"))

    if province is not None:
        query = query.filter(Lead.province.ilike(f"%{province}%"))

    if search_area is not None:
        query = query.filter(Lead.search_area.ilike(f"%{search_area}%"))

    if website_status is not None:
        query = query.filter(Lead.website_status == website_status)

    if website_discovery_status is not None:
        query = query.filter(Lead.website_discovery_status == website_discovery_status)

    if website_source is not None:
        query = query.filter(Lead.website_source == website_source)

    if min_score is not None:
        query = query.filter(Lead.lead_score >= min_score)

    if max_score is not None:
        query = query.filter(Lead.lead_score <= max_score)

    leads = query.order_by(Lead.lead_score.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        "id", "name", "category", "business_group", "business_subgroup",
        "classification_confidence", "cuisine", "address", "city",
        "municipality", "province", "region", "country", "search_area",
        "postcode", "lat", "lon", "phone", "email", "email_source",
        "email_confidence", "website", "website_status", "website_source",
        "website_confidence", "website_discovery_status", "candidate_websites",
        "instagram", "facebook", "opening_hours", "has_website", "has_email",
        "lead_score", "lead_status", "notes", "created_at", "updated_at",
    ]
    writer.writerow(headers)
    for lead in leads:
        writer.writerow([
            lead.id, lead.name, lead.category, lead.business_group,
            lead.business_subgroup, lead.classification_confidence,
            lead.cuisine, lead.address, lead.city, lead.municipality,
            lead.province, lead.region, lead.country, lead.search_area,
            lead.postcode, lead.lat, lead.lon, lead.phone, lead.email,
            lead.email_source, lead.email_confidence, lead.website,
            lead.website_status, lead.website_source, lead.website_confidence,
            lead.website_discovery_status, lead.candidate_websites,
            lead.instagram, lead.facebook, lead.opening_hours,
            lead.has_website, lead.has_email, lead.lead_score,
            lead.lead_status, lead.notes, lead.created_at, lead.updated_at,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"},
    )


@router.post("/leads/{lead_id}/enrich", response_model=LeadResponse)
def enrich_lead_email(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead_dict = {c.name: getattr(lead, c.name) for c in lead.__table__.columns}
    enriched = enrich_lead_with_email(lead_dict)
    for key, value in enriched.items():
        setattr(lead, key, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/enrich-hunter", response_model=LeadResponse)
def enrich_lead_hunter(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead_dict = {c.name: getattr(lead, c.name) for c in lead.__table__.columns}

    domain = None
    if lead_dict.get("website"):
        from urllib.parse import urlparse
        domain = urlparse(lead_dict["website"]).netloc
        domain = domain.removeprefix("www.").lower()

    if domain:
        import os
        api_key = os.getenv("HUNTER_API_KEY", "").strip()
        if api_key:
            emails = hunter_email_search(domain, api_key)
            if emails:
                best = emails[0]
                lead.email = best.get("value")
                lead.email_source = "hunter"
                lead.email_confidence = best.get("confidence", 0.5) / 100.0
                lead.has_email = True
                db.commit()
                db.refresh(lead)

    return lead


@router.post("/leads/enrich/batch")
def enrich_leads_batch(
    limit: int = Query(50, ge=1, le=200),
    business_group: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Lead).filter(
        Lead.has_website.is_(True),
        Lead.has_email.is_(False),
    )
    if business_group:
        query = query.filter(Lead.business_group == business_group)
    leads = query.limit(limit).all()
    enriched = 0
    errors = 0
    for lead in leads:
        try:
            lead_dict = {c.name: getattr(lead, c.name) for c in lead.__table__.columns}
            result = enrich_lead_with_email(lead_dict)
            for key, value in result.items():
                setattr(lead, key, value)
            enriched += 1
        except Exception as e:
            logger.warning("Failed to enrich lead %d (%s): %s", lead.id, lead.name, e)
            errors += 1
    db.commit()
    return {"processed": len(leads), "enriched": enriched, "errors": errors}


@router.get("/leads/{lead_id}/search-website")
def search_lead_website_google(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    result = search_business_website(
        name=lead.name or "",
        city=lead.city or "Bolzano",
        category=lead.category or lead.business_subgroup,
    )

    if result.get("website") and lead.website != result["website"]:
        lead.candidate_websites = result["website"]
        lead.website_source = result.get("url_type") or result.get("source")
        lead.website_confidence = result.get("confidence", 0.0)
        lead.website_discovery_status = result.get("status", "needs_manual_verification")
        db.commit()
        db.refresh(lead)

    return {
        "lead_id": lead_id,
        "found": result.get("website") is not None,
        "website": result.get("website"),
        "source": result.get("source"),
        "confidence": result.get("confidence", 0.0),
        "status": result.get("status"),
        "error": result.get("error"),
    }


@router.post("/leads/search-website/batch")
def search_websites_google_batch(
    limit: int = Query(50, ge=1, le=200),
    business_group: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Lead).filter(Lead.has_website.is_(False))
    if business_group:
        query = query.filter(Lead.business_group == business_group)

    leads = query.limit(limit).all()
    found = 0
    errors = 0

    for lead in leads:
        try:
            result = search_business_website(
                name=lead.name or "",
                city=lead.city or "Bolzano",
                category=lead.category or lead.business_subgroup,
            )
            if result.get("website"):
                lead.candidate_websites = result["website"]
                lead.website_source = result.get("url_type") or result.get("source")
                lead.website_confidence = result.get("confidence", 0.0)
                lead.website_discovery_status = result.get("status", "needs_manual_verification")
                found += 1
            time.sleep(0.2)
        except Exception as e:
            logger.warning("Google search failed for lead %d: %s", lead.id, e)
            errors += 1

    db.commit()

    return {"processed": len(leads), "found": found, "errors": errors}


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Lead.id)).scalar() or 0
    avg_score = db.query(func.avg(Lead.lead_score)).scalar() or 0.0
    with_email = db.query(Lead).filter(Lead.has_email.is_(True)).count()
    with_website = db.query(Lead).filter(Lead.has_website.is_(True)).count()
    needs_manual = (
        db.query(Lead).filter(Lead.lead_status == "needs_manual_verification").count()
    )
    official_websites = db.query(Lead).filter(Lead.website_source == "official").count()
    social_only = db.query(Lead).filter(Lead.website_source == "social").count()
    booking_platform_only = db.query(Lead).filter(Lead.website_source == "booking_platform").count()
    directory_only = db.query(Lead).filter(Lead.website_source == "directory").count()
    no_website_osm = db.query(Lead).filter(Lead.website_status == "missing_in_osm").count()

    cat_rows = (
        db.query(Lead.category, func.count(Lead.id))
        .filter(Lead.category.isnot(None)).group_by(Lead.category).all()
    )
    by_category = {row[0] or "unknown": row[1] for row in cat_rows}

    group_rows = (
        db.query(Lead.business_group, func.count(Lead.id))
        .filter(Lead.business_group.isnot(None)).group_by(Lead.business_group).all()
    )
    by_business_group = {row[0] or "unknown": row[1] for row in group_rows}

    subgroup_rows = (
        db.query(Lead.business_subgroup, func.count(Lead.id))
        .filter(Lead.business_subgroup.isnot(None)).group_by(Lead.business_subgroup).all()
    )
    by_business_subgroup = {row[0] or "unknown": row[1] for row in subgroup_rows}

    city_rows = (
        db.query(Lead.city, func.count(Lead.id))
        .filter(Lead.city.isnot(None)).group_by(Lead.city).all()
    )
    by_city = {row[0] or "unknown": row[1] for row in city_rows}

    status_rows = (
        db.query(Lead.lead_status, func.count(Lead.id))
        .group_by(Lead.lead_status).all()
    )
    by_status = {row[0] or "unknown": row[1] for row in status_rows}

    top_cities_rows = (
        db.query(Lead.city, func.count(Lead.id))
        .filter(Lead.city.isnot(None))
        .group_by(Lead.city)
        .order_by(func.count(Lead.id).desc()).limit(10).all()
    )
    top_cities = [{"city": row[0], "count": row[1]} for row in top_cities_rows]

    missing_website_rows = (
        db.query(Lead.category, func.count(Lead.id))
        .filter(Lead.has_website.is_(False), Lead.category.isnot(None))
        .group_by(Lead.category)
        .order_by(func.count(Lead.id).desc()).limit(10).all()
    )
    top_categories_missing_website = [
        {"category": row[0], "count": row[1]} for row in missing_website_rows
    ]

    return StatsResponse(
        total_leads=total,
        by_category=by_category,
        by_business_group=by_business_group,
        by_business_subgroup=by_business_subgroup,
        by_city=by_city,
        by_status=by_status,
        avg_lead_score=round(float(avg_score), 2),
        with_email=with_email,
        with_website=with_website,
        needs_manual_verification=needs_manual,
        official_websites=official_websites,
        social_only=social_only,
        booking_platform_only=booking_platform_only,
        directory_only=directory_only,
        no_website_osm=no_website_osm,
        top_cities=top_cities,
        top_categories_missing_website=top_categories_missing_website,
    )
