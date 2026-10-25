// ============================================================
//  QueBook — API Client (api.js)
//  Centralised fetch wrapper for all backend communication.
//  All other modules import from here — never fetch directly.
// ============================================================

// Base URL of the FastAPI backend.
// When the frontend is served BY FastAPI (recommended), this is the same origin.
// For local file:// access during development, point to the running server.
const API_BASE = 'http://localhost:8000';

// ── MVP User ID ───────────────────────────────────────────────
// For this hackathon version we use a fixed user_id.
// Replace with a real auth token / user object when auth is added.
export const USER_ID = 1;

// ── Internal fetch helper ─────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = body.detail || detail;
      } catch (_) { /* ignore parse errors */ }
      throw new Error(detail);
    }

    return await res.json();
  } catch (err) {
    console.error(`[QueBook API] ${options.method || 'GET'} ${path} failed:`, err.message);
    throw err;
  }
}

// ── Books ─────────────────────────────────────────────────────

/**
 * Fetch a list of books from the backend.
 * @param {Object} params  - Optional filters: { genre, search, limit, offset }
 * @returns {Promise<Array>} Array of book objects (frontend shape)
 */
export async function fetchBooks(params = {}) {
  const qs = new URLSearchParams();
  if (params.genre)  qs.set('genre',  params.genre);
  if (params.search) qs.set('search', params.search);
  if (params.limit)  qs.set('limit',  params.limit);
  if (params.offset) qs.set('offset', params.offset);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch(`/api/books${query}`);
}

/**
 * Fetch a single book by its numeric book_id.
 * @param {number} bookId
 * @returns {Promise<Object>} Book object
 */
export async function fetchBook(bookId) {
  return apiFetch(`/api/books/${bookId}`);
}

// ── Ratings ───────────────────────────────────────────────────

/**
 * Submit or update a rating for a book.
 * @param {number} userId
 * @param {number} bookId
 * @param {number} rating  1–5
 * @returns {Promise<Object>} { message, action, ... }
 */
export async function postRating(userId, bookId, rating) {
  return apiFetch('/api/ratings', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, book_id: bookId, rating }),
  });
}

/**
 * Fetch all rated books for a user.
 * @param {number} userId
 * @returns {Promise<Array>} Array of rated book objects (book info + user rating)
 */
export async function fetchRatings(userId) {
  return apiFetch(`/api/ratings/${userId}`, { cache: 'no-store' });
}

/**
 * Delete a rating for a book.
 * @param {number} userId
 * @param {number} bookId
 * @returns {Promise<Object>}
 */
export async function deleteRating(userId, bookId) {
  return apiFetch(`/api/ratings/${userId}/${bookId}`, {
    method: 'DELETE'
  });
}

// ── Recommendations ───────────────────────────────────────────

/**
 * Fetch personalised recommendations for a user.
 *
 * The backend may return either:
 *   - AI active:   { taste_summary: "...", recommendations: [...] }
 *   - Fallback:    [ ...books ]
 *
 * This function normalizes both into:
 *   { tasteSummary: string|null, recommendations: Array }
 *
 * @param {number} userId
 * @param {number} [topN=15]  How many to return
 * @returns {Promise<{ tasteSummary: string|null, recommendations: Array }>}
 */
export async function fetchRecommendations(userId, topN = 15) {
  const data = await apiFetch(`/api/recommendations/${userId}?top_n=${topN}`, { cache: 'no-store' });

  // Plain array → fallback mode (no AI)
  if (Array.isArray(data)) {
    return { tasteSummary: null, recommendations: data };
  }

  // Object → AI mode
  if (data && typeof data === 'object' && Array.isArray(data.recommendations)) {
    return {
      tasteSummary: data.taste_summary || null,
      recommendations: data.recommendations,
    };
  }

  // Unexpected shape — return empty safely
  console.warn('[QueBook API] Unexpected recommendations response shape:', data);
  return { tasteSummary: null, recommendations: [] };
}
