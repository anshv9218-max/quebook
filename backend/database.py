# ============================================================
#  QueBook — Database Configuration (database.py)
#  SQLAlchemy engine, session factory, and base declarative class
# ============================================================

import os
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# ── Load environment variables ─────────────────────────────────
# 1. Look in backend/.env
# 2. Fall back to root .env
_current_dir = Path(__file__).resolve().parent
_backend_env = _current_dir / ".env"
_root_env = _current_dir.parent / ".env"

if _backend_env.exists():
    load_dotenv(dotenv_path=_backend_env, encoding="utf-8")
elif _root_env.exists():
    load_dotenv(dotenv_path=_root_env, encoding="utf-8")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Copy backend/.env.example to backend/.env and fill in your Neon PostgreSQL credentials."
    )

# Normalize legacy postgres:// URI scheme to postgresql:// (required by SQLAlchemy)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# ── Engine configuration ───────────────────────────────────────
# Configured for Neon Cloud PostgreSQL (serverless & pooled)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Detect stale serverless connections before use
    pool_recycle=300,         # Recycle connections every 5 minutes
    pool_size=5,              # Conservative pool size suitable for serverless / free tier
    max_overflow=10,          # Burst capacity when traffic spikes
    pool_timeout=30,          # Connection acquisition timeout (seconds)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a database session and
    guarantees cleanup even if an exception is raised.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection() -> tuple[bool, str]:
    """
    Safely tests database connectivity without exposing credentials in logs.
    Returns (is_connected: bool, message: str).
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "PostgreSQL connected"
    except Exception as exc:
        # Avoid leaking connection credentials in error logs
        masked_host = getattr(engine.url, "host", "remote-host")
        logger.error("Database connection failure to %s: %s", masked_host, exc.__class__.__name__)
        return False, f"PostgreSQL connection failed ({exc.__class__.__name__})"
