# Quebook 📚

A modern, minimal, and editorial book recommendation web application built with clean modular architecture, pure vanilla JavaScript (ES Modules), and custom CSS.

---

## 🏗️ Modular Architecture

```
QUEBOOK/
│
├── index.html                   # Root entry point with instant redirect
│
├── templates/
│   ├── index.html               # Discover / Genre selection page
│   ├── recommendations.html     # Book rating engine & personalized recommendations
│   └── my_ratings.html          # User's rated books collection shelf
│
├── static/
│   ├── css/
│   │   ├── base.css             # Design tokens, reset, typography, modals, flying-book animation
│   │   ├── navbar.css           # Header navigation, tinted glass search bar & recent search history
│   │   ├── discover.css         # Hero section, genre grid & interactive genre preview
│   │   ├── recommendations.css  # Rating engine, star rating, sticky CTA & recommendations
│   │   └── my-ratings.css       # My Ratings grid, user star badges & empty state
│   │
│   ├── js/
│   │   ├── app.js               # Core app initialization, modal system & live search history
│   │   ├── data.js              # Curated mock dataset of books & genres
│   │   ├── navigation.js        # Multi-page routing, active nav states & URL parameters
│   │   ├── ratings.js           # Single source of truth for localStorage rating operations
│   │   ├── discover.js          # Genre selection & preview filtering
│   │   ├── recommendations.js   # Rating interaction, progress bar & recommendations rendering
│   │   └── my-ratings.js        # Rated bookshelf rendering, removal & empty state
│   │
│   └── images/                  # Static image assets
│
└── README.md
```

---

## 🌟 Key Features

1. **Discover Page (`templates/index.html`)**:
   - Editorial hero section with frosted glass search bar.
   - Live search & Recent Search History panel with "Clear all" button, small book templates, and `- Author Name` formatting.
   - Interactive genre selection grid that filters out already-rated books in preview.

2. **Recommendation & Rating Engine (`templates/recommendations.html`)**:
   - Genre-specific book rating shelf.
   - Interactive star rating with real-time feedback.
   - **Flying-book animation**: Rated book cover lifts and flies toward the *"My Ratings"* header item with a glowing pulse.
   - Progress bar tracking ratings needed to unlock recommendations.
   - Top Pick featured recommendation and algorithmic matching breakdown.

3. **My Ratings Page (`templates/my_ratings.html`)**:
   - Dedicated collection shelf for all books rated by the user.
   - Shows user's exact rating (1-5 stars) and timestamp.
   - Ability to remove books (`✕ Remove`), automatically restoring them to the Discover and Rating pages.
   - Empty state illustration with CTA.

4. **Persistence & Modular State**:
   - All ratings and search history persist in `localStorage` across page reloads and sessions.
   - No framework or external API dependencies.
