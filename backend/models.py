# ============================================================
#  QueBook — SQLAlchemy Models (models.py)
#  Maps to the existing PostgreSQL tables (no schema changes)
# ============================================================

from sqlalchemy import Column, Integer, Text, Numeric, CheckConstraint, ForeignKey
from database import Base


class Book(Base):
    """
    Mirrors the existing `public.books` table exactly.
    Do NOT modify this to add columns — the DB schema is fixed.
    """
    __tablename__ = "books"
    __table_args__ = {"schema": "public"}

    book_id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    author = Column(Text, nullable=False)
    genres = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    average_rating = Column(Numeric(3, 2), nullable=True)
    ratings_count = Column(Integer, nullable=True)
    cover_url = Column(Text, nullable=True)


class UserRating(Base):
    """
    Mirrors the existing `public.user_ratings` table exactly.
    Composite primary key (user_id, book_id).
    """
    __tablename__ = "user_ratings"
    __table_args__ = {"schema": "public"}

    user_id = Column(Integer, primary_key=True, nullable=False)
    book_id = Column(
        Integer,
        ForeignKey("public.books.book_id"),
        primary_key=True,
        nullable=False,
    )
    rating = Column(
        Integer,
        CheckConstraint("rating >= 1 AND rating <= 5"),
        nullable=False,
    )
