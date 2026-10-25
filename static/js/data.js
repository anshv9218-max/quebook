// ============================================================
//  QueBook — Data Module (data.js)
//  Genre definitions (static) + async API wrappers.
//
//  NOTE: The BOOKS array has been removed. All book data now
//  comes from the FastAPI backend via api.js.
//  The GENRES array stays static — no need to hit the DB.
// ============================================================

import { fetchBooks } from './api.js';

// ── In-memory book cache ──────────────────────────────────────
// Populated lazily on first call to loadAllBooks().
// Used by search so we don't re-fetch on every keystroke.
let _booksCache = null;
let _booksCachePromise = null;

/**
 * Load all books into memory (once).
 * Subsequent calls return the cached result immediately.
 * @returns {Promise<Array>}
 */
export async function loadAllBooks() {
  if (_booksCache !== null) return _booksCache;
  if (_booksCachePromise) return _booksCachePromise;

  _booksCachePromise = fetchBooks({ limit: 500 }).then(books => {
    _booksCache = books;
    _booksCachePromise = null;
    return books;
  });
  return _booksCachePromise;
}

/**
 * Get the current in-memory cache (may be null if not loaded yet).
 * @returns {Array|null}
 */
export function getBooksCache() {
  return _booksCache;
}

/**
 * Fetch books for a specific genre from the backend.
 * @param {string} genre
 * @returns {Promise<Array>}
 */
export async function getBooksByGenre(genre) {
  return fetchBooks({ genre, limit: 200 });
}

// ── Static Genres ─────────────────────────────────────────────
// These are curated labels — kept static to avoid a DB round-trip
// just for displaying genre tiles.
export const GENRES = [
  { id: 'Fiction',         desc: 'Timeless stories about the human condition' },
  { id: 'Fantasy',         desc: 'Magic, mythology and extraordinary worlds' },
  { id: 'Science Fiction', desc: 'Futuristic worlds and impossible ideas' },
  { id: 'Mystery',         desc: 'Secrets, clues and stories that keep you guessing' },
  { id: 'Thriller',        desc: 'Tension, twists and edge-of-your-seat stakes' },
  { id: 'Romance',         desc: 'Intimate stories about love in all its forms' },
  { id: 'Horror',          desc: 'Fear crafted with purpose and intelligence' },
  { id: 'Biography',       desc: 'Real lives told with clarity and depth' },
  { id: 'History',         desc: 'The past, illuminated with perspective' },
  { id: 'Self-Help',       desc: 'Clarity, habits and tools for a better life' },
  { id: 'Adventure',       desc: 'Journeys that transform every character involved' },
  { id: 'Philosophy',      desc: 'Big questions, sharply examined' },
];
