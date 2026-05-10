import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, migrate_database, SessionLocal
from app.routes import router
from app.campaign_models import EmailTemplate, Campaign, CampaignLead
from app.seed_templates import seed_templates

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

Base.metadata.create_all(bind=engine)
migrate_database()

db = SessionLocal()
try:
    seed_templates(db)
finally:
    db.close()

app = FastAPI(
    title="Bolzano LeadGen",
    description="Lead-generation tool for South Tyrol businesses",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

from app.campaign_routes import router as campaign_router
app.include_router(campaign_router)
