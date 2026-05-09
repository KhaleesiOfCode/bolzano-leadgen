import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, migrate_database
from app.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

Base.metadata.create_all(bind=engine)
migrate_database()

app = FastAPI(
    title="Bolzano LeadGen",
    description="Lead-generation tool for Bolzano businesses",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
