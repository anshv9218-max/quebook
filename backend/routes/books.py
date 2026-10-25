# ============================================================
#  QueBook — Books Router (routes/books.py)
#  GET /api/books       — list books with optional filtering
#  GET /api/books/{id}  — single book detail
# ============================================================

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import get_db
from models import Book
from genre_utils import genres_to_tags

router = APIRouter(prefix="/api/books", tags=["Books"])


@router.get("", response_model=None)
def list_books(
    genre: Optional[str] = Query(None, description="Filter by genre (case-insensitive)"),
    search: Optional[str] = Query(None, description="Search by title, author, or genre"),
    limit: int = Query(100, ge=1, le=500, description="Max number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    """
    Return books from the database.

    Supports:
    - Genre filtering:  GET /api/books?genre=Fantasy
    - Text search:      GET /api/books?search=harry
    - Pagination:       GET /api/books?limit=20&offset=40
    - Combined:         GET /api/books?genre=Fantasy&search=tolkien
    """
    query = db.query(Book)

    if genre:
        # ILIKE = case-insensitive LIKE in PostgreSQL
        query = query.filter(Book.genres.ilike(f"%{genre}%"))

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Book.title.ilike(term),
                Book.author.ilike(term),
                Book.genres.ilike(term),
            )
        )

    # Sort by ratings_count descending so popular books appear first
    query = query.order_by(Book.ratings_count.desc().nullslast())

    books = query.offset(offset).limit(limit).all()

    return [_serialize_book(b) for b in books]


@router.get("/{book_id}", response_model=None)
def get_book(book_id: int, db: Session = Depends(get_db)):
    """Return details for a single book by its integer book_id."""
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail=f"Book with id {book_id} not found")
    return _serialize_book(book)


# ── Private helper ─────────────────────────────────────────────

def _serialize_book(book: Book) -> dict:
    """Convert a Book ORM object to a frontend-compatible dict."""
    tags = genres_to_tags(book.genres)
    return {
        "id": book.book_id,
        "book_id": book.book_id,
        "title": book.title,
        "author": book.author,
        "genres": book.genres or "",
        "genre": tags[0] if tags else "",
        "tags": tags,
        "description": book.description or "",
        "rating": float(book.average_rating) if book.average_rating is not None else 0.0,
        "average_rating": float(book.average_rating) if book.average_rating is not None else 0.0,
        "ratings_count": book.ratings_count or 0,
        "coverUrl": book.cover_url or "",
        "cover_url": book.cover_url or "",
    }
