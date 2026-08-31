# ============================================================
#  QueBook — Ratings Router (routes/ratings.py)
#  POST /api/ratings          — submit or update a rating
#  GET  /api/ratings/{user_id} — get all ratings for a user
# ============================================================


from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import Book, UserRating
from schemas import RatingCreate
from genre_utils import genres_to_tags

router = APIRouter(prefix="/api/ratings", tags=["Ratings"])


@router.post("", response_model=None, status_code=200)
def submit_rating(payload: RatingCreate, db: Session = Depends(get_db)):
    """
    Submit a rating for a book.

    - Validates the book exists.
    - Validates the rating is 1–5 (also enforced by Pydantic).
    - If the user has already rated this book: UPDATE the existing rating.
    - If this is a new rating: INSERT a new row.
    - Returns a success response with 'action': 'created' | 'updated'.
    """
    # 1. Confirm the book exists
    book = db.query(Book).filter(Book.book_id == payload.book_id).first()
    if not book:
        raise HTTPException(
            status_code=404,
            detail=f"Book with id {payload.book_id} not found"
        )

    # 2. Look for an existing rating (upsert logic)
    existing = (
        db.query(UserRating)
        .filter(
            UserRating.user_id == payload.user_id,
            UserRating.book_id == payload.book_id,
        )
        .first()
    )

    if existing:
        existing.rating = payload.rating
        db.commit()
        db.refresh(existing)
        action = "updated"
    else:
        new_rating = UserRating(
            user_id=payload.user_id,
            book_id=payload.book_id,
            rating=payload.rating,
        )
        db.add(new_rating)
        db.commit()
        db.refresh(new_rating)
        action = "created"

    return {
        "message": f"Rating {action} successfully",
        "user_id": payload.user_id,
        "book_id": payload.book_id,
        "rating": payload.rating,
        "action": action,
    }


@router.get("/{user_id}", response_model=None)
def get_user_ratings(user_id: int, db: Session = Depends(get_db)):
    """
    Return all books rated by a user, including full book details.
    Powers the 'My Ratings' page.
    """
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="user_id must be a positive integer")

    # JOIN user_ratings with books to get full details in one query
    results = (
        db.query(UserRating, Book)
        .join(Book, UserRating.book_id == Book.book_id)
        .filter(UserRating.user_id == user_id)
        .all()
    )

    return [_serialize_rated_book(ur, book) for ur, book in results]


# ── Private helper ─────────────────────────────────────────────

def _serialize_rated_book(ur: UserRating, book: Book) -> dict:
    """Merge a UserRating and Book into a frontend-compatible dict."""
    tags = genres_to_tags(book.genres)
    return {
        "id": book.book_id,
        "book_id": book.book_id,
        "user_id": ur.user_id,
        "title": book.title,
        "author": book.author,
        "genres": book.genres or "",
        "genre": tags[0] if tags else "",
        "tags": tags,
        "description": book.description or "",
        "rating": ur.rating,              # User's own rating (1-5)
        "average_rating": float(book.average_rating) if book.average_rating is not None else 0.0,
        "ratings_count": book.ratings_count or 0,
        "coverUrl": book.cover_url or "",
        "cover_url": book.cover_url or "",
    }

@router.delete("/{user_id}/{book_id}", response_model=None)
def delete_rating(user_id: int, book_id: int, db: Session = Depends(get_db)):
    """
    Remove a user's rating for a specific book.
    """
    existing = (
        db.query(UserRating)
        .filter(
            UserRating.user_id == user_id,
            UserRating.book_id == book_id,
        )
        .first()
    )

    if not existing:
        raise HTTPException(status_code=404, detail="Rating not found")

    db.delete(existing)
    db.commit()

    return {"message": "Rating deleted successfully", "action": "deleted"}
