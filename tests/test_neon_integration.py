"""
Integration Test Suite for QueBook with Neon PostgreSQL.
Verifies connection, table row counts, schema mapping, and core route functionality.
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

import database
import models
import routes.books as books_route
import routes.ratings as ratings_route
import routes.recommendations as recs_route
import recommender.engine as engine
from sqlalchemy import text


def run_checks():
    print("=" * 60)
    print("      QUEBOOK — NEON POSTGRESQL INTEGRATION TEST SUITE")
    print("=" * 60)

    # 1. Test database connection
    print("\n[Check 1/6] Testing Neon PostgreSQL Connection...")
    is_connected, msg = database.test_connection()
    print(f"Status: {msg}")
    assert is_connected, f"Database connection failed: {msg}"

    # 2. Test row counts
    print("\n[Check 2/6] Verifying Table Row Counts...")
    with database.engine.connect() as conn:
        books_count = conn.execute(text("SELECT COUNT(*) FROM public.books")).scalar()
        ratings_count = conn.execute(text("SELECT COUNT(*) FROM public.user_ratings")).scalar()
    print(f"• public.books count:        {books_count} (Expected: 1200)")
    print(f"• public.user_ratings count: {ratings_count} (Expected: 10)")
    assert books_count == 1200, f"Expected 1200 books, got {books_count}"
    assert ratings_count == 10, f"Expected 10 user ratings, got {ratings_count}"

    db = database.SessionLocal()
    try:
        # 3. Test book listing and cover URLs
        print("\n[Check 3/6] Testing Book Listing Endpoint & Cover URLs...")
        books = books_route.list_books(genre=None, search=None, limit=5, offset=0, db=db)
        print(f"• Fetched {len(books)} books successfully.")
        assert len(books) == 5, f"Expected 5 books, got {len(books)}"
        first_book = books[0]
        print(f"• Sample Book [ID={first_book['id']}]: \"{first_book['title']}\" by {first_book['author']}")
        print(f"• Cover URL: {first_book['coverUrl']}")
        assert first_book["coverUrl"], "Cover URL should not be empty!"

        # 4. Test book search
        print("\n[Check 4/6] Testing Book Search Filtering...")
        search_results = books_route.list_books(genre=None, search="Harry", limit=3, offset=0, db=db)
        print(f"• Found {len(search_results)} books matching query 'Harry'.")
        assert len(search_results) > 0, "Expected at least 1 book for 'Harry' search"

        # 5. Test user ratings endpoint
        print("\n[Check 5/6] Testing User Ratings Endpoint...")
        user_ratings = ratings_route.get_user_ratings(user_id=1, db=db)
        print(f"• User 1 has {len(user_ratings)} rated books.")
        assert len(user_ratings) > 0, "Expected rated books for User 1"
        sample_rating = user_ratings[0]
        print(f"• Rated Book: \"{sample_rating['title']}\" — Rated {sample_rating['rating']}/5 stars")

        # 6. Test recommendations endpoint
        print("\n[Check 6/6] Testing Content-Based Recommendation Engine...")
        recommendations = recs_route.recommend_for_user(user_id=1, top_n=5, db=db)
        print(f"• Generated {len(recommendations)} recommendations for User 1.")
        assert len(recommendations) > 0, "Expected recommendations to be returned"
        top_rec = recommendations[0]
        print(f"• Top Pick: \"{top_rec['title']}\" by {top_rec['author']}")
        print(f"• Match Percentage: {top_rec['matchPercentage']}% (Score: {top_rec['recommendation_score']})")

        print("\n" + "=" * 60)
        print("   ✓ ALL 6 INTEGRATION CHECKS PASSED WITH NEON POSTGRESQL!")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    try:
        run_checks()
    except Exception as exc:
        print(f"\n[X] Integration check failed: {exc}")
        sys.exit(1)
