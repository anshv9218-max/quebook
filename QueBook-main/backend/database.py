# ============================================================
#  QueBook — Database Configuration (database.py)
#  SQLAlchemy engine, session factory, and base declarative class
# ============================================================

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file in the same directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), encoding="utf-8")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Copy backend/.env.example to backend/.env and fill in your credentials."
    )

engine = create_engine(
    DATABASE_URL,
    # Keep a small connection pool — fine for dev/hackathon
    pool_pre_ping=True,  # Reconnect silently on stale connections
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
