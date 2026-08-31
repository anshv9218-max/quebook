# ============================================================
#  QueBook — FastAPI Application Entry Point (main.py)
#
#  Run with:  uvicorn main:app --reload
#  Docs at:   http://localhost:8000/docs
# ============================================================

import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from routes.books import router as books_router
from routes.ratings import router as ratings_router
from routes.recommendations import router as recommendations_router

# ── Application factory ────────────────────────────────────────

app = FastAPI(
    title="QueBook API",
    description=(
        "Backend API for QueBook — a personalised book recommendation system.\n\n"
        "Endpoints:\n"
        "- `GET /api/books` — List books with optional genre/search filtering\n"
        "- `GET /api/books/{book_id}` — Single book details\n"
        "- `POST /api/ratings` — Submit or update a rating\n"
        "- `GET /api/ratings/{user_id}` — All ratings for a user\n"
        "- `GET /api/recommendations/{user_id}` — Personalised recommendations\n"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────
# Allow the frontend (served by this same server, or a local dev server)
# to call the API. In production, replace with specific origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",   # VS Code Live Server
        "http://127.0.0.1:5500",
        "null",                    # file:// origin (browser local file access)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── API Routers ────────────────────────────────────────────────
app.include_router(books_router)
app.include_router(ratings_router)
app.include_router(recommendations_router)

# ── Static file serving ────────────────────────────────────────
# Resolve the project root (one level above backend/)
_project_root = Path(__file__).parent.parent

# Serve static assets (CSS, JS, images) at /static
_static_dir = _project_root / "static"
if _static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

# Serve HTML templates at /templates
_templates_dir = _project_root / "templates"
if _templates_dir.exists():
    app.mount("/templates", StaticFiles(directory=str(_templates_dir), html=True), name="templates")


# ── Root redirect ──────────────────────────────────────────────
@app.get("/", include_in_schema=False)
def root():
    """Redirect root URL to the Discover page."""
    return RedirectResponse(url="/templates/index.html")


# ── Health check ───────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Simple health-check endpoint."""
    return {
        "status": "ok",
        "service": "QueBook Backend"
    }


# ── Global error handler ───────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all handler — never expose raw stack traces to clients."""
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )
