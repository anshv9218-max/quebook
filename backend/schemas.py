# ============================================================
#  QueBook — Pydantic Schemas (schemas.py)
#  Request/response validation and serialization
# ============================================================

from typing import List, Optional
from pydantic import BaseModel, field_validator, ConfigDict
import sys
import os

# Ensure backend root is on path for genre_utils import
_backend_root = os.path.dirname(os.path.abspath(__file__))
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from genre_utils import genres_to_tags



# ── Book schemas ────────────────────────────────────────────────

class BookOut(BaseModel):
    """Book data returned to the frontend."""
    model_config = ConfigDict(from_attributes=True)

    book_id: int
    title: str
    author: str
    genres: str
    description: Optional[str] = None
    average_rating: Optional[float] = None
    ratings_count: Optional[int] = None
    cover_url: Optional[str] = None

    # Computed fields for frontend compatibility
    @property
    def tags(self) -> List[str]:
        return genres_to_tags(self.genres)

    @property
    def genre(self) -> str:
        """Primary genre (first in the list)."""
        tags = genres_to_tags(self.genres)
        return tags[0] if tags else ""

    def model_post_init(self, __context):
        pass  # hook available if needed

    def to_frontend_dict(self) -> dict:
        """
        Serialize into the exact shape the frontend JS expects.
        Maps DB field names → frontend camelCase names.
        """
        tags = genres_to_tags(self.genres)
        return {
            "id": self.book_id,          # numeric; JS uses this as the key
            "book_id": self.book_id,
            "title": self.title,
            "author": self.author,
            "genre": tags[0] if tags else "",
            "tags": tags,
            "description": self.description or "",
            "rating": float(self.average_rating) if self.average_rating else 0.0,
            "average_rating": float(self.average_rating) if self.average_rating else 0.0,
            "ratings_count": self.ratings_count or 0,
            "coverUrl": self.cover_url or "",
            "cover_url": self.cover_url or "",
        }


# ── Rating schemas ──────────────────────────────────────────────

class RatingCreate(BaseModel):
    """Incoming rating submission from the frontend."""
    user_id: int
    book_id: int
    rating: int

    @field_validator("rating")
    @classmethod
    def rating_must_be_valid(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("user_id", "book_id")
    @classmethod
    def id_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("ID must be a positive integer")
        return v


class RatingOut(BaseModel):
    """A single user rating with full book details — powers the My Ratings page."""
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    book_id: int
    rating: int

    # Book details (joined)
    title: str
    author: str
    genres: str
    description: Optional[str] = None
    average_rating: Optional[float] = None
    ratings_count: Optional[int] = None
    cover_url: Optional[str] = None

    def to_frontend_dict(self) -> dict:
        tags = genres_to_tags(self.genres)
        return {
            "id": self.book_id,
            "book_id": self.book_id,
            "title": self.title,
            "author": self.author,
            "genre": tags[0] if tags else "",
            "tags": tags,
            "description": self.description or "",
            "rating": self.rating,           # User's own rating (1-5)
            "average_rating": float(self.average_rating) if self.average_rating else 0.0,
            "ratings_count": self.ratings_count or 0,
            "coverUrl": self.cover_url or "",
            "cover_url": self.cover_url or "",
        }


class RatingResponse(BaseModel):
    """Success response after saving a rating."""
    message: str
    user_id: int
    book_id: int
    rating: int
    action: str  # "created" or "updated"


# ── Recommendation schemas ──────────────────────────────────────

class RecommendationOut(BaseModel):
    """A recommended book with its recommendation score."""
    model_config = ConfigDict(from_attributes=True)

    book_id: int
    title: str
    author: str
    genres: str
    description: Optional[str] = None
    average_rating: Optional[float] = None
    ratings_count: Optional[int] = None
    cover_url: Optional[str] = None
    recommendation_score: float  # Internal score used for ranking

    def to_frontend_dict(self) -> dict:
        tags = genres_to_tags(self.genres)
        # Convert score (0-1 float) to a match percentage for the frontend
        match_pct = round(self.recommendation_score * 100)
        return {
            "id": self.book_id,
            "book_id": self.book_id,
            "title": self.title,
            "author": self.author,
            "genre": tags[0] if tags else "",
            "tags": tags,
            "description": self.description or "",
            "rating": float(self.average_rating) if self.average_rating else 0.0,
            "average_rating": float(self.average_rating) if self.average_rating else 0.0,
            "ratings_count": self.ratings_count or 0,
            "coverUrl": self.cover_url or "",
            "cover_url": self.cover_url or "",
            "recommendation_score": self.recommendation_score,
            "matchPercentage": match_pct,   # For the frontend "% Match" badge
        }
