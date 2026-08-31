// ============================================================
//  QueBook — Ratings Module (ratings.js)
//  Single source of truth for rating state.
//
//  Strategy: write-through cache.
//  - Writes go to localStorage immediately (instant UI feedback)
//  - Writes also fire to the backend API asynchronously
//  - Reads from localStorage for fast UI state (progress bar, star states)
//  - My Ratings page reads from the backend for accurate, persistent data
// ============================================================

import { USER_ID, postRating, deleteRating } from './api.js';

const STORAGE_KEY = 'quebook_user_ratings';
let memoryRatings = null;

// ── Load / initialise ─────────────────────────────────────────

export function loadRatings() {
  if (memoryRatings !== null) return memoryRatings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    memoryRatings = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[Ratings] Failed to load from localStorage', e);
    memoryRatings = {};
  }
  return memoryRatings;
}

// ── Save (write-through) ──────────────────────────────────────

export function saveRating(book, ratingVal) {
  if (!book) return;

  // Support both numeric book_id (from API) and legacy string id
  const bookId = book.book_id ?? book.id;
  if (bookId === undefined || bookId === null) return;

  // 1. Update in-memory cache immediately
  const ratings = loadRatings();
  ratings[bookId] = {
    id: bookId,
    book_id: bookId,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl || book.cover_url || '',
    genre: book.genre || '',
    description: book.description || '',
    rating: ratingVal,
    ratedAt: Date.now(),
  };
  memoryRatings = ratings;

  // 2. Persist to localStorage (instant, synchronous)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
  } catch (e) {
    console.error('[Ratings] Failed to write to localStorage', e);
  }

  // 3. Sync to backend asynchronously (fire-and-forget)
  //    A numeric book_id is required for the API call.
  const numericBookId = typeof bookId === 'number' ? bookId : parseInt(bookId, 10);
  if (!isNaN(numericBookId)) {
    postRating(USER_ID, numericBookId, ratingVal).catch(err => {
      console.warn('[Ratings] Backend sync failed (rating saved locally):', err.message);
    });
  }
}

// ── Remove ────────────────────────────────────────────────────

export async function removeRating(bookId) {
  // Sync to backend first to confirm deletion succeeds
  const numericBookId = typeof bookId === 'number' ? bookId : parseInt(bookId, 10);
  if (!isNaN(numericBookId)) {
    // If this throws, the catch block in my-ratings.js will handle it.
    await deleteRating(USER_ID, numericBookId);
  }

  // If we reach here, backend deletion was successful
  const ratings = loadRatings();
  if (ratings[bookId]) {
    delete ratings[bookId];
    memoryRatings = ratings;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
    } catch (e) {
      console.error('[Ratings] Failed to update localStorage', e);
    }
  }
}

// ── Read helpers ──────────────────────────────────────────────

export function getRating(bookId) {
  const ratings = loadRatings();
  const r = ratings[bookId];
  if (!r) return 0;
  return typeof r === 'object' ? (r.rating || 0) : r;
}

export function getAllRatings() {
  const ratings = loadRatings();
  return Object.values(ratings)
    .filter(r => r && (typeof r === 'object' ? r.rating > 0 : r > 0))
    .sort((a, b) => (b.ratedAt || 0) - (a.ratedAt || 0));
}
