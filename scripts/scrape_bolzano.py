"""Standalone script: scrape OSM for Bolzano venues and save to database."""

import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, engine, Base
from app.models import Lead
from app.osm_scraper import scrape_bolzano
from app.lead_scoring import calculate_score

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    logger.info("Creating database tables if they do not exist ...")
    Base.metadata.create_all(bind=engine)

    logger.info("Starting OSM scrape for Bolzano ...")
    raw_leads = scrape_bolzano()

    db = SessionLocal()
    created = 0
    updated = 0

    try:
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
    except Exception:
        db.rollback()
        logger.exception("Database error during scrape import")
        raise
    finally:
        db.close()

    logger.info("Done.  Leads found: %d | Created: %d | Updated: %d",
                len(raw_leads), created, updated)


if __name__ == "__main__":
    main()
