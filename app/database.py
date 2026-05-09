import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import DB_PATH

DB_PATH.parent.mkdir(exist_ok=True)

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

logger = logging.getLogger(__name__)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_database():
    from app.models import Lead, NEW_COLUMNS

    Base.metadata.create_all(bind=engine)

    inspector = __import__("sqlalchemy", fromlist=["inspect"]).inspect(engine)
    existing_columns = {c["name"] for c in inspector.get_columns("leads")}

    with engine.connect() as conn:
        for col_name, col_type in NEW_COLUMNS.items():
            if col_name not in existing_columns:
                logger.info("Adding missing column: %s (%s)", col_name, col_type)
                conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
        conn.commit()
