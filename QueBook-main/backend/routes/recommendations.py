# ============================================================
#  QueBook — Recommendations Router (routes/recommendations.py)
#  GET /api/recommendations/{user_id}
# ============================================================

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from recommender.engine import get_recommendations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.get("/{user_id}", response_model=None)
def recommend_for_user(
    user_id: int,
    top_n: int = Query(15, ge=1, le=50, description="Number of recommendations to return"),
    db: Session = Depends(get_db),
):
    """
    Return personalised book recommendations for a user.

    Uses a deterministic content-based filtering algorithm based on:
    - genres
    - author
    - average rating (popularity)
    """
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="user_id must be a positive integer")

    # Fetch recommendations using the lightweight content-based engine
    recommendations = get_recommendations(
        user_id=user_id,
        db=db,
        top_n=top_n,
    )

    # Return as plain list. The frontend is fully backward-compatible 
    # with receiving an array (it sets taste_summary to null).
    return recommendations
