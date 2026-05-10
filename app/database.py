import logging
from sqlalchemy import create_engine, text, inspect as sa_inspect
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
    from app.models import Lead, NEW_COLUMNS, NEW_INDEXES

    Base.metadata.create_all(bind=engine)

    inspector = sa_inspect(engine)

    existing_columns = {c["name"] for c in inspector.get_columns("leads")}
    with engine.connect() as conn:
        for col_name, col_type in NEW_COLUMNS.items():
            if col_name not in existing_columns:
                logger.info("Adding missing column: %s (%s)", col_name, col_type)
                conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
        conn.commit()

    existing_indexes = {ix["name"] for ix in inspector.get_indexes("leads")}
    with engine.begin() as conn:
        for idx_name, idx_cols in NEW_INDEXES.items():
            if idx_name not in existing_indexes:
                cols = ", ".join(idx_cols)
                logger.info("Adding missing index: %s (%s)", idx_name, cols)
                conn.execute(text(f"CREATE INDEX {idx_name} ON leads ({cols})"))
