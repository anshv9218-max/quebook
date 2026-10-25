# ============================================================
#  QueBook — Recommendation Engine (recommender/engine.py)
#  Content-based filtering using genres, author, and ratings
# ============================================================

from typing import List, Dict, Optional
from collections import defaultdict
from sqlalchemy.orm import Session

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models import Book, UserRating
from genre_utils import genres_to_tags   # shared genre parser — single source of truth


def get_recommendations(
    user_id: int,
    db: Session,
    top_n: int = 15,
) -> List[dict]:
    """
    Content-based recommendation engine.

    Algorithm:
    1. Fetch all books the user has rated.
    2. Build a weighted taste profile from highly-rated books:
       - Genre scores: frequency × rating weight
       - Author scores: rating weight for each author rated highly
    3. Score all unrated books:
       - Genre score: sum of matching genre weights
       - Author bonus: rating weight if the user liked the author
       - Popularity bonus: small boost from average_rating (0–5 scale)
    4. Normalise scores to [0, 1] and return top-N.

    Only books with rating >= 3 contribute to the positive taste signal.
    """
    return _run_engine(user_id, db, top_n)


def _run_engine(
    user_id: int,
    db: Session,
    top_n: int,
) -> List[dict]:
    """
    Core content-based engine implementation.
    """

    # ── 1. Fetch user ratings ──────────────────────────────────
    user_ratings: List[UserRating] = (
        db.query(UserRating)
        .filter(UserRating.user_id == user_id)
        .all()
    )

    if not user_ratings:
        # No ratings yet — return top-rated books overall
        return _fallback_popular_books(db, top_n)

    rated_book_ids = {ur.book_id for ur in user_ratings}

    # Map book_id → rating for fast lookup
    rating_map: Dict[int, int] = {ur.book_id: ur.rating for ur in user_ratings}

    # Fetch rated book details
    rated_books: List[Book] = (
        db.query(Book)
        .filter(Book.book_id.in_(rated_book_ids))
        .all()
    )

    # ── 2. Build taste profile ─────────────────────────────────
    # Weight: rating 5 = 2.0, rating 4 = 1.5, rating 3 = 1.0
    # Negative signals (1–2) are ignored (don't penalize for now)
    genre_weights: Dict[str, float] = defaultdict(float)
    author_weights: Dict[str, float] = defaultdict(float)

    for book in rated_books:
        user_rating = rating_map.get(book.book_id, 0)
        if user_rating < 3:
            continue  # Skip disliked books

        weight = _rating_to_weight(user_rating)

        for genre in genres_to_tags(book.genres):
            genre_weights[genre.lower()] += weight

        author_weights[book.author.lower()] += weight

    if not genre_weights and not author_weights:
        # User only rated books 1-2 stars — return popular books
        return _fallback_popular_books(db, top_n, exclude_ids=rated_book_ids)

    # Normalise genre weights so the most-rated genre = 1.0
    max_genre_w = max(genre_weights.values(), default=1.0)
    norm_genre: Dict[str, float] = {g: w / max_genre_w for g, w in genre_weights.items()}

    max_author_w = max(author_weights.values(), default=1.0)
    norm_author: Dict[str, float] = {a: w / max_author_w for a, w in author_weights.items()}

    # ── 3. Score all unrated books ─────────────────────────────
    all_books: List[Book] = (
        db.query(Book)
        .filter(Book.book_id.notin_(rated_book_ids))
        .all()
    )

    scored: List[tuple] = []  # (score, Book)

    for book in all_books:
        score = 0.0

        # Genre score (max possible = sum of all genre weights if all genres match)
        book_genres = [g.lower() for g in genres_to_tags(book.genres)]
        genre_score = sum(norm_genre.get(g, 0.0) for g in book_genres)

        # Author bonus
        author_score = norm_author.get(book.author.lower(), 0.0) * 0.5

        # Popularity bonus (0–0.2 range, so it's a tiebreaker not a driver)
        avg_r = float(book.average_rating) if book.average_rating else 0.0
        popularity_bonus = (avg_r / 5.0) * 0.2

        score = genre_score + author_score + popularity_bonus
        scored.append((score, book))

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)
    top_scored = scored[:top_n]

    # ── 4. Normalise scores to [0, 1] ─────────────────────────
    if not top_scored:
        return []

    max_score = top_scored[0][0] if top_scored[0][0] > 0 else 1.0

    results = []
    for score, book in top_scored:
        normalised = round(score / max_score, 4)
        results.append(_serialize_recommendation(book, normalised))

    return results


# ── Fallback ───────────────────────────────────────────────────

def _fallback_popular_books(
    db: Session,
    top_n: int = 15,
    exclude_ids: Optional[set] = None,
) -> List[dict]:
    """Return top-rated books when the user has no (positive) ratings."""
    query = db.query(Book).order_by(
        Book.average_rating.desc().nullslast(),
        Book.ratings_count.desc().nullslast(),
    )
    if exclude_ids:
        query = query.filter(Book.book_id.notin_(exclude_ids))

    books = query.limit(top_n).all()
    return [_serialize_recommendation(b, 1.0) for b in books]


# ── Private helpers ────────────────────────────────────────────

def _rating_to_weight(rating: int) -> float:
    """Convert a 1-5 star rating to a recommendation weight."""
    weights = {5: 2.0, 4: 1.5, 3: 1.0, 2: 0.0, 1: 0.0}
    return weights.get(rating, 0.0)


def _serialize_recommendation(book: Book, score: float) -> dict:
    """Serialize a Book + score into a frontend-compatible dict."""
    tags = genres_to_tags(book.genres)
    match_pct = max(1, round(score * 100))  # at least 1% for display
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
        "recommendation_score": score,
        "matchPercentage": match_pct,
    }
