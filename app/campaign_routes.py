import json
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Lead
from app.campaign_models import EmailTemplate, Campaign, CampaignLead

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Schemas ─────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    business_group: Optional[str] = None
    language: str = "en"

class TemplateResponse(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    business_group: Optional[str] = None
    language: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class CampaignCreate(BaseModel):
    name: str
    template_id: Optional[int] = None
    filters: Optional[dict] = None

class CampaignResponse(BaseModel):
    id: int
    name: str
    template_id: Optional[int] = None
    filters: Optional[dict] = None
    status: str
    sent_count: int
    open_count: int
    reply_count: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Templates ───────────────────────────────────────────

@router.get("/campaigns/templates", response_model=list[TemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    return db.query(EmailTemplate).order_by(EmailTemplate.created_at.desc()).all()


@router.post("/campaigns/templates", response_model=TemplateResponse)
def create_template(body: TemplateCreate, db: Session = Depends(get_db)):
    tmpl = EmailTemplate(**body.model_dump())
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.delete("/campaigns/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tmpl = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404)
    db.delete(tmpl)
    db.commit()
    return {"ok": True}


# ─── Campaigns ───────────────────────────────────────────

@router.get("/campaigns", response_model=list[CampaignResponse])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(body: CampaignCreate, db: Session = Depends(get_db)):
    camp = Campaign(
        name=body.name,
        template_id=body.template_id,
        filters=body.filters,
        status="draft",
    )
    db.add(camp)
    db.commit()
    db.refresh(camp)
    return camp


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not camp:
        raise HTTPException(404)
    return camp


@router.patch("/campaigns/{campaign_id}/status")
def update_campaign_status(campaign_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not camp:
        raise HTTPException(404)
    camp.status = status
    db.commit()
    return {"status": camp.status}


# ─── Leads in Campaign ───────────────────────────────────

@router.post("/campaigns/{campaign_id}/preview-leads")
def preview_campaign_leads(campaign_id: int, db: Session = Depends(get_db)):
    camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not camp:
        raise HTTPException(404)

    query = db.query(Lead)
    filters = camp.filters or {}
    if filters.get("business_group"):
        groups = [g.strip() for g in filters["business_group"].split(",")]
        query = query.filter(Lead.business_group.in_(groups))
    if filters.get("business_subgroup"):
        subs = [s.strip() for s in filters["business_subgroup"].split(",")]
        query = query.filter(Lead.business_subgroup.in_(subs))
    if filters.get("city"):
        query = query.filter(Lead.city.ilike(f"%{filters['city']}%"))
    if filters.get("has_website") is not None:
        val = str(filters["has_website"]).lower() == "true"
        query = query.filter(Lead.has_website.is_(val))
    if filters.get("has_email") is not None:
        val = str(filters["has_email"]).lower() == "true"
        query = query.filter(Lead.has_email.is_(val))
    if filters.get("min_score"):
        query = query.filter(Lead.lead_score >= int(filters["min_score"]))
    if filters.get("lead_status"):
        query = query.filter(Lead.lead_status == filters["lead_status"])

    leads = query.order_by(Lead.lead_score.desc()).limit(200).all()

    existing_ids = {cl.lead_id for cl in db.query(CampaignLead).filter(CampaignLead.campaign_id == campaign_id).all()}

    result = []
    for l in leads:
        result.append({
            "id": l.id,
            "name": l.name,
            "business_group": l.business_group,
            "business_subgroup": l.business_subgroup,
            "city": l.city,
            "email": l.email,
            "lead_score": l.lead_score,
            "in_campaign": l.id in existing_ids,
        })
    return {"leads": result, "total": len(result)}


@router.post("/campaigns/{campaign_id}/add-leads")
def add_leads_to_campaign(campaign_id: int, body: dict, db: Session = Depends(get_db)):
    camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not camp:
        raise HTTPException(404)

    lead_ids = body.get("lead_ids", [])
    added = 0
    for lid in lead_ids:
        exists = db.query(CampaignLead).filter(
            CampaignLead.campaign_id == campaign_id,
            CampaignLead.lead_id == lid,
        ).first()
        if not exists:
            db.add(CampaignLead(campaign_id=campaign_id, lead_id=lid, status="pending"))
            added += 1
    db.commit()
    return {"added": added}


@router.get("/campaigns/{campaign_id}/leads")
def list_campaign_leads(campaign_id: int, db: Session = Depends(get_db)):
    rows = db.query(CampaignLead).filter(CampaignLead.campaign_id == campaign_id).all()
    result = []
    for cl in rows:
        lead = db.query(Lead).filter(Lead.id == cl.lead_id).first()
        result.append({
            "id": cl.id,
            "lead_id": cl.lead_id,
            "lead_name": lead.name if lead else None,
            "lead_email": lead.email if lead else None,
            "status": cl.status,
            "sent_at": cl.sent_at.isoformat() if cl.sent_at else None,
            "opened_at": cl.opened_at.isoformat() if cl.opened_at else None,
            "replied_at": cl.replied_at.isoformat() if cl.replied_at else None,
        })
    return result


@router.post("/campaigns/{campaign_id}/approve-leads")
def approve_campaign_leads(campaign_id: int, body: dict, db: Session = Depends(get_db)):
    lead_ids = body.get("lead_ids", [])
    updated = 0
    for cl in db.query(CampaignLead).filter(
        CampaignLead.campaign_id == campaign_id,
        CampaignLead.lead_id.in_(lead_ids),
    ).all():
        cl.status = "approved"
        updated += 1
    db.commit()
    return {"approved": updated}


# ─── Send (one lead at a time — manual approval) ────────

@router.post("/campaigns/{campaign_id}/send/{campaign_lead_id}")
def send_campaign_email(campaign_id: int, campaign_lead_id: int, db: Session = Depends(get_db)):
    cl = db.query(CampaignLead).filter(
        CampaignLead.id == campaign_lead_id,
        CampaignLead.campaign_id == campaign_id,
    ).first()
    if not cl:
        raise HTTPException(404)

    lead = db.query(Lead).filter(Lead.id == cl.lead_id).first()
    camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()

    if not lead or not lead.email:
        cl.status = "error"
        cl.error = "No email address"
        db.commit()
        return {"status": "error", "error": "No email address"}

    template = db.query(EmailTemplate).filter(EmailTemplate.id == camp.template_id).first() if camp.template_id else None

    subject = template.subject if template else "Hello from Bolzano LeadGen"
    body = template.body if template else ""

    subject = subject.replace("{{name}}", lead.name or "there")
    subject = subject.replace("{{business}}", lead.name or "your business")
    subject = subject.replace("{{city}}", lead.city or "your area")

    body = body.replace("{{name}}", lead.name or "there")
    body = body.replace("{{business}}", lead.name or "your business")
    body = body.replace("{{city}}", lead.city or "your area")
    body = body.replace("{{website}}", lead.website or "your website")
    body = body.replace("{{subgroup}}", (lead.business_subgroup or "").replace("_", " "))

    logger.info("=== PREVIEW EMAIL (not sent) ===")
    logger.info("To: %s", lead.email)
    logger.info("Subject: %s", subject)
    logger.info("Body:\n%s", body)
    logger.info("================================")

    cl.status = "sent"
    cl.sent_at = datetime.now(timezone.utc)
    camp.sent_count = (camp.sent_count or 0) + 1
    db.commit()

    return {
        "status": "sent",
        "to": lead.email,
        "subject": subject,
        "body_preview": body[:200],
    }


# ─── Tracking pixel ──────────────────────────────────────

@router.get("/campaigns/track/open/{campaign_lead_id}")
def track_open(campaign_lead_id: int, db: Session = Depends(get_db)):
    cl = db.query(CampaignLead).filter(CampaignLead.id == campaign_lead_id).first()
    if cl and not cl.opened_at:
        cl.opened_at = datetime.now(timezone.utc)
        camp = db.query(Campaign).filter(Campaign.id == cl.campaign_id).first()
        if camp:
            camp.open_count = (camp.open_count or 0) + 1
        db.commit()
    return {"status": "ok"}


@router.post("/campaigns/track/reply")
def track_reply(body: dict, db: Session = Depends(get_db)):
    campaign_lead_id = body.get("campaign_lead_id")
    if not campaign_lead_id:
        raise HTTPException(400, detail="campaign_lead_id required")
    cl = db.query(CampaignLead).filter(CampaignLead.id == campaign_lead_id).first()
    if cl and not cl.replied_at:
        cl.replied_at = datetime.now(timezone.utc)
        camp = db.query(Campaign).filter(Campaign.id == cl.campaign_id).first()
        if camp:
            camp.reply_count = (camp.reply_count or 0) + 1
        db.commit()
    return {"status": "ok"}
