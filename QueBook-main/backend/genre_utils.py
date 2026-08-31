# ============================================================
#  QueBook — Genre Utilities (shared across routes)
#  Handles the genres TEXT column which is stored as a
#  Python-list-literal string: "['Fiction', 'Mystery', ...]"
#  or a simple comma-separated string: "Fantasy, Adventure"
# ============================================================

import ast
import re
from typing import List, Optional


def genres_to_tags(genres_str: Optional[str]) -> List[str]:
    """
    Parse the `genres` TEXT column into a clean list of strings.

    Handles two storage formats found in the DB:
    1. Python list literal:  "['Fiction', 'Mystery', 'Thriller']"
    2. Comma-separated:      "Fantasy, Adventure"
    """
    if not genres_str:
        return []

    stripped = genres_str.strip()

    # ── Format 1: Python list literal ─────────────────────────
    if stripped.startswith('['):
        try:
            result = ast.literal_eval(stripped)
            if isinstance(result, list):
                return [str(g).strip() for g in result if str(g).strip()]
        except (ValueError, SyntaxError):
            pass

        # Fallback: strip brackets and split on commas
        inner = stripped.lstrip('[').rstrip(']')
        parts = re.split(r",\s*", inner)
        tags = [p.strip().strip("'\"") for p in parts if p.strip().strip("'\"")]
        return tags

    # ── Format 2: comma-separated ─────────────────────────────
    return [g.strip() for g in stripped.split(',') if g.strip()]
