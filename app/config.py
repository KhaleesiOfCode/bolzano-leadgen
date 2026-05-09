import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DB_PATH = BASE_DIR / "data" / "leads.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
