# 📚 QueBook — Intelligent Book Recommendation Web Application

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon.tech-336791.svg?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Modular%20ES%20Modules-yellow.svg)](#-codebase-structure)

**QueBook** is a modern, editorial, full-stack book recommendation system. It couples an interactive vanilla JavaScript frontend with a high-performance **FastAPI** backend and a **Neon PostgreSQL** database containing curated books and ratings. A custom **content-based recommendation engine** builds real-time weighted user taste profiles to calculate personalized book suggestions.

---

## 📑 Table of Contents

1. [System Architecture](#-system-architecture)
2. [End-to-End Workflow & Data Flow](#-end-to-end-workflow--data-flow)
3. [Recommendation Engine Algorithm](#-recommendation-engine-algorithm)
4. [Complete Codebase Structure](#-complete-codebase-structure)
5. [API Reference](#-api-reference)
6. [Database Schema](#-database-schema)
7. [Running the Application](#-running-the-application)
   - [Method 1: Docker (Recommended)](#method-1-docker-compose-recommended)
   - [Method 2: Local Native Execution](#method-2-local-python-execution)
8. [Key Frontend Features](#-key-frontend-features)

---

## 🏛️ System Architecture

```mermaid
graph TB
    subgraph ClientLayer ["Client Layer (Browser)"]
        UI_Home["Discover Page<br/>(templates/index.html)"]
        UI_Recs["Recommendations Shelf<br/>(templates/recommendations.html)"]
        UI_Ratings["My Ratings Collection<br/>(templates/my_ratings.html)"]
        JS_API["API Client Module<br/>(static/js/api.js)"]
    end

    subgraph ServerLayer ["FastAPI Server & Middleware (backend/main.py)"]
        StaticServe["Static File Mounter<br/>(/static & /templates)"]
        CORS["CORS Middleware"]
        RouteBooks["Books Router<br/>(/api/books)"]
        RouteRatings["Ratings Router<br/>(/api/ratings)"]
        RouteRecs["Recommendations Router<br/>(/api/recommendations)"]
    end

    subgraph LogicLayer ["Recommendation Engine (backend/recommender/)"]
        TasteProfile["Taste Profiler<br/>Weighted Genre & Author Aggregator"]
        Scorer["Content-based Scorer<br/>Genre + Author + Popularity"]
        Normalizer["Score Normalizer<br/>Percentage Match [0–100%]"]
    end

    subgraph DataLayer ["Database Layer (PostgreSQL - Neon Cloud)"]
        DB_Books[("books table<br/>(1,200 curated books)")]
        DB_Ratings[("user_ratings table<br/>(User 1-5 star ratings)")]
    end

    UI_Home --> JS_API
    UI_Recs --> JS_API
    UI_Ratings --> JS_API
    JS_API -->|HTTP REST Requests| ServerLayer

    ServerLayer --> RouteBooks
    ServerLayer --> RouteRatings
    ServerLayer --> RouteRecs

    RouteBooks -->|Query with ILIKE & Limit| DB_Books
    RouteRatings -->|Upsert Rating| DB_Ratings

    RouteRecs --> TasteProfile
    TasteProfile -->|Fetch User Ratings| DB_Ratings
    TasteProfile -->|Fetch Rated Book Metadata| DB_Books
    TasteProfile --> Scorer
    Scorer -->|Fetch Unrated Candidates| DB_Books
    Scorer --> Normalizer
    Normalizer --> RouteRecs
```

---

## 🔄 End-to-End Workflow & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Reader (User)
    participant Front as Frontend (ES Modules)
    participant API as FastAPI Backend
    participant Engine as Recommender Engine
    participant DB as Neon PostgreSQL

    Note over User, DB: 1. Exploration & Genre Browsing
    User->>Front: Visits Home / Selects Genre
    Front->>API: GET /api/books?genre={genre}&limit=30
    API->>DB: SELECT * FROM books WHERE genres ILIKE %genre%
    DB-->>API: 30 Book Records
    API-->>Front: JSON Book Catalog
    Front-->>User: Renders Book Cards & Metadata

    Note over User, DB: 2. Rating a Book (Feedback Signal)
    User->>Front: Clicks 1–5 Stars on Book Card
    Front->>Front: Plays Flying Book Animation to Navbar Badge
    Front->>API: POST /api/ratings { user_id: 1, book_id: 119, rating: 5 }
    API->>DB: Upsert into user_ratings (INSERT or UPDATE)
    DB-->>API: Confirmed
    API-->>Front: { status: "success", action: "created" }

    Note over User, DB: 3. Dynamic Personalized Recommendations
    User->>Front: Navigates to Recommendations Page
    Front->>API: GET /api/recommendations/1?top_n=15
    API->>Engine: get_recommendations(user_id=1, top_n=15)
    Engine->>DB: Query user_ratings for user_id=1
    DB-->>Engine: List of Rated Books & Scores
    Engine->>DB: Query Unrated Books from books table
    DB-->>Engine: Unrated Book Pool
    Engine->>Engine: Calculate Weighted Genre + Author + Popularity Scores
    Engine->>Engine: Normalize Scores to Match Percentages (e.g., 95% Match)
    Engine-->>API: Sorted Top-15 Recommended Books
    API-->>Front: JSON Recommendations Array
    Front-->>User: Renders Personalized Shelf with Top Pick & Match Breakdown
```

---

## 🧠 Recommendation Engine Algorithm

The recommendation engine (`backend/recommender/engine.py`) operates via deterministic **content-based filtering** with weighted taste profiling:

```mermaid
flowchart TD
    Start(["Start: Recommendation Request (user_id)"]) --> FetchRatings["Fetch all ratings for user_id from DB"]
    FetchRatings --> HasRatings{"Any ratings found?"}

    HasRatings -- No --> Fallback["Fallback: Return top books sorted by average_rating & ratings_count"]
    Fallback --> ReturnResults

    HasRatings -- Yes --> FilterPositives["Filter books with rating >= 3 stars<br/>(1-2 stars excluded from positive signal)"]
    FilterPositives --> WeightAssign["Assign Weights:<br/>• 5 Stars = 2.0<br/>• 4 Stars = 1.5<br/>• 3 Stars = 1.0"]

    WeightAssign --> ProfileBuild["Build Taste Profile:<br/>• Genre Weights = Σ (genre_frequency × rating_weight)<br/>• Author Weights = Σ (author_frequency × rating_weight)"]
    ProfileBuild --> ProfileNorm["Normalize Profile Weights so maximum weight = 1.0"]

    ProfileNorm --> CandidatePool["Query all unrated books from DB"]
    CandidatePool --> BookScoring["Score each candidate book:<br/>Score = Genre_Score + (0.5 × Author_Score) + (0.2 × Avg_Rating / 5.0)"]

    BookScoring --> SortDesc["Sort candidate books descending by Score"]
    SortDesc --> TopN["Slice Top-N items (e.g. 15 books)"]
    TopN --> ScoreNorm["Calculate Match Percentage:<br/>Match% = round((Score / Max_Score) × 100)"]
    ScoreNorm --> ReturnResults(["Return Serialized Books with matchPercentage"])
```

### Mathematical Scoring Formulation:
For every unrated book $b$:
$$\text{GenreScore}(b) = \sum_{g \in \text{genres}(b)} W_{\text{genre}}(g)$$
$$\text{AuthorScore}(b) = W_{\text{author}}(\text{author}(b)) \times 0.5$$
$$\text{PopularityBonus}(b) = \left(\frac{\text{average\_rating}(b)}{5.0}\right) \times 0.2$$
$$\text{TotalScore}(b) = \text{GenreScore}(b) + \text{AuthorScore}(b) + \text{PopularityBonus}(b)$$

---

## 📂 Complete Codebase Structure

```
QueBook/
├── backend/
│   ├── recommender/
│   │   ├── __init__.py               # Recommender package initializer
│   │   └── engine.py                 # Content-based recommendation algorithm
│   ├── routes/
│   │   ├── __init__.py               # Routes package initializer
│   │   ├── books.py                  # GET /api/books (filtering, pagination, search)
│   │   ├── ratings.py                # POST & GET /api/ratings (upsert & user ratings)
│   │   └── recommendations.py        # GET /api/recommendations/{user_id}
│   ├── .env                          # Local database connection credentials (Neon URL)
│   ├── .env.example                  # Template configuration for environment variables
│   ├── app.py                        # Unified server launcher (Docker, venv & host aware)
│   ├── database.py                   # SQLAlchemy engine, session maker, get_db dependency
│   ├── genre_utils.py                # Normalized genre parser and string/tag transformer
│   ├── main.py                       # FastAPI application factory, CORS & static mounts
│   ├── models.py                     # SQLAlchemy models (Book, UserRating)
│   ├── requirements.txt              # Backend Python dependencies
│   └── schemas.py                    # Pydantic schemas for request validation & serialization
│
├── static/
│   ├── css/
│   │   ├── base.css                  # Color variables, design tokens, typography, modal & animations
│   │   ├── navbar.css                # Frosted glass header, search input & search history dropdown
│   │   ├── discover.css              # Hero section, genre pill grid & book preview showcase
│   │   ├── recommendations.css       # Rating engine, star controls, progress bar & recommendation shelf
│   │   └── my-ratings.css            # Collection bookshelf, rating badges & removal cards
│   ├── js/
│   │   ├── api.js                    # Centralized async fetch wrapper for all backend endpoints
│   │   ├── app.js                    # Core UI initialization, search overlay & modal controller
│   │   ├── data.js                   # Mock fallback catalog used if backend is unreachable
│   │   ├── discover.js               # Interactive genre selection and catalog rendering
│   │   ├── my-ratings.js             # Rated bookshelf view, removal handler & empty state
│   │   ├── navigation.js             # URL routing, navigation highlighting & query params
│   │   ├── ratings.js                # Local storage cache synchronizer for ratings
│   │   └── recommendations.js        # Star rating interactions, flying animation & recommendations
│   └── images/                       # Project image assets & SVG icons
│
├── templates/
│   ├── index.html                    # Discover page (entry browse interface)
│   ├── recommendations.html          # Dynamic rating & personalized recommendations page
│   └── my_ratings.html               # User's rated shelf page
│
├── Dockerfile                        # Multi-stage production container definition
├── docker-compose.yml                # Docker compose orchestration file
├── .dockerignore                     # Docker build exclusions (.venv, logs, SQL dumps)
├── index.html                        # Root redirector to /templates/index.html
├── quebook_backup.sql                # PostgreSQL database dump (1,200 books + schemas)
├── requirements.txt                  # Root project requirements copy
└── README.md                         # Comprehensive project documentation
```

---

## 📡 API Reference

Interactive Swagger documentation is available at: **`http://localhost:8000/docs`**

| Method | Endpoint | Query / Path Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | _None_ | Backend health check verification |
| `GET` | `/api/books` | `genre` (str), `search` (str), `limit` (int), `offset` (int) | List books with optional genre or text search |
| `GET` | `/api/books/{book_id}` | `book_id` (int, path) | Fetch single book details |
| `POST`| `/api/ratings` | **Body:** `{ user_id, book_id, rating }` | Submit or update a book rating (1–5) |
| `GET` | `/api/ratings/{user_id}`| `user_id` (int, path) | Fetch all ratings submitted by a user |
| `DELETE`| `/api/ratings/{user_id}/{book_id}`| `user_id`, `book_id` (path) | Delete a user rating |
| `GET` | `/api/recommendations/{user_id}`| `user_id` (path), `top_n` (int) | Compute and retrieve personalized recommendations |

---

## 🗄️ Database Schema

QueBook uses two relational tables mapped via SQLAlchemy in `backend/models.py`:

```mermaid
erDiagram
    books ||--o{ user_ratings : "receives ratings"
    books {
        int book_id PK
        text title
        text author
        text genres
        text description
        numeric average_rating
        int ratings_count
        text cover_url
    }
    user_ratings {
        int user_id PK
        int book_id PK, FK
        int rating "CHECK (rating BETWEEN 1 AND 5)"
    }
```

- **`books`**: Contains 1,200 curated titles with genres, ratings, authors, and cover image URLs.
- **`user_ratings`**: Stores user ratings using a composite primary key (`user_id`, `book_id`).

---

## 🚀 Running the Application

### Method 1: Docker Compose (Recommended)

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is running.

```bash
# 1. Build and run container in one step
docker compose up --build

# Or use the built-in app.py docker trigger:
python backend/app.py --docker
```
Once started, visit:
- **Application:** [http://localhost:8000](http://localhost:8000)
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

To stop the container:
```bash
docker compose down
```

---

### Method 2: Local Python Execution

If running directly on your host machine:

1. **Activate Virtual Environment or use Python 3.10+:**
   ```bash
   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS
   source .venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Verify Configuration (`backend/.env`):**
   ```env
   DATABASE_URL=postgresql://neondb_owner:npg_ATb4NGdwn1pL@ep-small-star-axw82fxv.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

4. **Start the Application:**
   ```bash
   python backend/app.py
   ```
   > **Note:** `backend/app.py` automatically detects your environment, verifies the database connection, registers routes, and binds the server to `0.0.0.0:8000`.

---

## ✨ Key Frontend Features

1. **Discover Page (`templates/index.html`)**:
   - Editorial dark theme with custom typography and smooth glassmorphism.
   - Live search overlay with recent search history stored in `localStorage`.
   - Filterable genre selection cards that automatically hide already-rated books.

2. **Recommendation & Rating Shelf (`templates/recommendations.html`)**:
   - Interactive 5-star rating control with real-time optimistic UI updates.
   - **Flying-book animation**: When a book is rated, the cover card animates toward the *"My Ratings"* header counter.
   - Real-time rating progress meter unlocking recommendations after rating books.
   - Top recommendation highlight and calculated match percentage badges (e.g. `98% Match`).

3. **My Ratings Page (`templates/my_ratings.html`)**:
   - Personal library shelf showcasing all rated books.
   - Remove rating button (`✕ Remove`) that instantly updates the database and restores the book to the recommendation engine.
