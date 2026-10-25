// ============================================================
//  QueBook — Main App Entry (app.js)
//  Common initialization, shared search, modal, & routing.
//  Updated to use the backend API via api.js.
// ============================================================

import { loadAllBooks, getBooksCache, GENRES } from './data.js';
import { fetchBooks } from './api.js';
import { loadRatings } from './ratings.js';
import { initNavigation } from './navigation.js';
import { initDiscoverPage } from './discover.js';
import { initRecommendationsPage } from './recommendations.js';
import { initMyRatingsPage } from './my-ratings.js';

// ── DOM Helper ────────────────────────────────────────────────
export function el(tag, className = '', html = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (html) element.innerHTML = html;
  return element;
}

export function buildCoverImg(book) {
  const wrap = el('div', 'book-cover-wrap');
  const img = document.createElement('img');
  img.src = book.coverUrl || book.cover_url || '';
  img.alt = `${book.title} cover`;
  img.loading = 'lazy';
  img.onerror = () => {
    wrap.innerHTML = `
      <div class="book-cover-placeholder">
        <span class="placeholder-icon">📚</span>
        <span class="placeholder-title">${book.title}</span>
      </div>`;
  };
  wrap.appendChild(img);
  return wrap;
}

// ── Modal System ──────────────────────────────────────────────
export function openModal(book) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay || !book) return;

  const titleEl     = document.getElementById('modal-title');
  const authorEl    = document.getElementById('modal-author');
  const descEl      = document.getElementById('modal-desc');
  const tagsEl      = document.getElementById('modal-tags');
  const starsEl     = document.getElementById('modal-stars');
  const ratingTextEl= document.getElementById('modal-rating-text');
  const coverWrap   = document.getElementById('modal-cover-wrap');

  if (titleEl)  titleEl.textContent = book.title;
  if (authorEl) authorEl.textContent = book.author;
  if (descEl)   descEl.textContent = book.description || 'No description available for this title yet.';

  if (tagsEl) {
    tagsEl.innerHTML = '';
    const tags = book.tags || (book.genre ? [book.genre] : []);
    tags.forEach(tag => tagsEl.appendChild(el('span', 'genre-tag', tag)));
  }

  if (starsEl) {
    starsEl.innerHTML = '';
    const r = Math.round(book.rating || book.average_rating || 4);
    for (let i = 1; i <= 5; i++) {
      starsEl.appendChild(el('span', `modal-star${i <= r ? ' filled' : ''}`, '★'));
    }
  }

  if (ratingTextEl) {
    const ratingVal = book.rating || book.average_rating || '4.0';
    ratingTextEl.textContent = `${Number(ratingVal).toFixed(1)} / 5.0`;
  }

  if (coverWrap) {
    coverWrap.innerHTML = '';
    const img = document.createElement('img');
    img.src = book.coverUrl || book.cover_url || '';
    img.alt = `${book.title} cover`;
    img.className = 'modal-cover-img';
    img.onerror = () => {
      coverWrap.innerHTML = `<div class="book-cover-placeholder" style="width:140px;height:210px;"><span class="placeholder-icon">📚</span></div>`;
    };
    coverWrap.appendChild(img);
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ── Search System ─────────────────────────────────────────────
export function initSearch() {
  const searchContainer = document.getElementById('navbar-search');
  const searchInput     = document.getElementById('search-input');
  const clearBtn        = document.getElementById('search-clear-btn');
  const dropdown        = document.getElementById('search-dropdown');

  if (!searchContainer || !searchInput || !clearBtn || !dropdown) return;

  const SEARCH_HISTORY_KEY = 'quebook_recent_searches';
  let currentMatches   = [];
  let highlightedIndex = -1;
  let searchDebounce   = null;  // debounce timer

  // ── Recent history helpers ──────────────────────────────────
  function getRecentSearches() {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function addRecentSearch(book) {
    if (!book) return;
    const bookId = book.book_id ?? book.id;
    if (bookId === undefined) return;
    try {
      let history = getRecentSearches();
      history = history.filter(item => (item.book_id ?? item.id) !== bookId);
      history.unshift({
        id: bookId,
        book_id: bookId,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || book.cover_url || '',
        genre: book.genre || '',
        tags: book.tags || [],
        description: book.description || '',
        timestamp: Date.now(),
      });
      if (history.length > 6) history = history.slice(0, 6);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) { console.error('[Search] Failed to save history', e); }
  }

  function removeRecentSearchItem(bookId) {
    try {
      const history = getRecentSearches().filter(
        item => (item.book_id ?? item.id) !== bookId
      );
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      if (searchInput.value.trim() === '') {
        history.length > 0 ? renderRecentSearches() : hideDropdown();
      }
    } catch (e) { console.error('[Search] Failed to remove history item', e); }
  }

  function clearRecentSearches() {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      hideDropdown();
    } catch (e) { console.error('[Search] Failed to clear history', e); }
  }

  // ── Dropdown helpers ────────────────────────────────────────
  function hideDropdown() {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    highlightedIndex = -1;
    currentMatches = [];
  }

  function showDropdown() { dropdown.style.display = 'block'; }

  function updateClearBtnVisibility() {
    clearBtn.style.display = searchInput.value.length > 0 ? 'inline-flex' : 'none';
  }

  function setHighlight(index) {
    const items = dropdown.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add('highlighted');
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('highlighted');
        item.setAttribute('aria-selected', 'false');
      }
    });
    highlightedIndex = index;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Recent searches render ──────────────────────────────────
  function renderRecentSearches() {
    const history = getRecentSearches();
    if (history.length === 0) { hideDropdown(); return; }

    dropdown.innerHTML = '';
    currentMatches = history;
    highlightedIndex = -1;

    const header = el('div', 'search-history-header');
    header.innerHTML = `
      <span class="search-history-label">Recent Searches</span>
      <button type="button" class="search-history-clear-btn" id="search-history-clear-btn">Clear all</button>
    `;
    header.querySelector('#search-history-clear-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      clearRecentSearches();
    });
    dropdown.appendChild(header);

    history.forEach((book, idx) => {
      const item = buildResultItem(book, idx, true);
      item.addEventListener('click', () => {
        addRecentSearch(book);
        openModal(book);
        hideDropdown();
      });
      dropdown.appendChild(item);
    });
    showDropdown();
  }

  // ── Live search (calls API with debounce) ───────────────────
  async function performSearch() {
    const query = searchInput.value.trim();
    updateClearBtnVisibility();

    if (!query) {
      if (getRecentSearches().length > 0) renderRecentSearches();
      else hideDropdown();
      return;
    }

    // Show a loading indicator while waiting for the API
    dropdown.innerHTML = '<div class="search-no-results"><div class="search-no-results-title">Searching…</div></div>';
    showDropdown();

    // Try the local cache first (instant), then fall back to the API
    const cached = getBooksCache();
    if (cached && cached.length > 0) {
      const q = query.toLowerCase();
      const matches = cached.filter(book => {
        const title  = (book.title  || '').toLowerCase();
        const author = (book.author || '').toLowerCase();
        const genre  = (book.genre  || '').toLowerCase();
        const tags   = Array.isArray(book.tags) ? book.tags.map(t => t.toLowerCase()) : [];
        return title.includes(q) || author.includes(q) || genre.includes(q) || tags.some(t => t.includes(q));
      });
      currentMatches = matches;
      renderResults(matches, query);
      return;
    }

    // No cache yet — hit the API
    try {
      const results = await fetchBooks({ search: query, limit: 20 });
      currentMatches = results;
      renderResults(results, query);
    } catch (err) {
      dropdown.innerHTML = `
        <div class="search-no-results">
          <div class="search-no-results-title">Search unavailable</div>
          <div class="search-no-results-sub">Check your connection and try again.</div>
        </div>`;
      showDropdown();
    }
  }

  // ── Results render ──────────────────────────────────────────
  function renderResults(matches, query) {
    dropdown.innerHTML = '';
    highlightedIndex = -1;

    if (matches.length === 0) {
      const noResults = el('div', 'search-no-results');
      noResults.innerHTML = `
        <div class="search-no-results-title">No books found</div>
        <div class="search-no-results-sub">Try another title, author, or genre.</div>
      `;
      dropdown.appendChild(noResults);
      showDropdown();
      return;
    }

    matches.forEach((book, idx) => {
      const item = buildResultItem(book, idx, false);
      item.addEventListener('click', () => {
        addRecentSearch(book);
        openModal(book);
        hideDropdown();
      });
      dropdown.appendChild(item);
    });
    showDropdown();
  }

  function buildResultItem(book, idx, showRemoveBtn) {
    const item = el('div', showRemoveBtn
      ? 'search-result-item search-history-item'
      : 'search-result-item'
    );
    item.setAttribute('role', 'option');
    item.setAttribute('tabindex', '-1');
    item.setAttribute('aria-selected', 'false');

    const cover = el('div', 'search-result-cover');
    const img = document.createElement('img');
    img.src = book.coverUrl || book.cover_url || '';
    img.alt = `${book.title} cover`;
    img.loading = 'lazy';
    img.onerror = () => { cover.innerHTML = `<div class="book-cover-placeholder"><span>📚</span></div>`; };
    cover.appendChild(img);
    item.appendChild(cover);

    const info = el('div', 'search-result-info');
    info.appendChild(el('div', 'search-result-title', escapeHtml(book.title)));
    info.appendChild(el('div', 'search-result-author', `- ${escapeHtml(book.author)}`));
    item.appendChild(info);

    const genre = book.genre || (book.tags && book.tags[0]) || '';
    if (genre) item.appendChild(el('div', 'search-result-genre', escapeHtml(genre)));

    if (showRemoveBtn) {
      const bookId = book.book_id ?? book.id;
      const removeBtn = el('button', 'search-history-item-remove', '✕');
      removeBtn.setAttribute('title', 'Remove from history');
      removeBtn.setAttribute('aria-label', `Remove ${book.title} from history`);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentSearchItem(bookId);
      });
      item.appendChild(removeBtn);
    }

    item.addEventListener('mouseenter', () => setHighlight(idx));
    return item;
  }

  // ── Event listeners ─────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(performSearch, 250); // 250 ms debounce
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) performSearch();
    else if (getRecentSearches().length > 0) renderRecentSearches();
  });

  searchInput.addEventListener('click', () => {
    if (searchInput.value.trim().length === 0 && getRecentSearches().length > 0) {
      renderRecentSearches();
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    searchInput.value = '';
    updateClearBtnVisibility();
    getRecentSearches().length > 0 ? renderRecentSearches() : hideDropdown();
    searchInput.focus();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (dropdown.style.display === 'none' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (searchInput.value.trim().length > 0) { performSearch(); return; }
      else if (getRecentSearches().length > 0)  { renderRecentSearches(); return; }
    }

    if (dropdown.style.display !== 'none') {
      const items = dropdown.querySelectorAll('.search-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) setHighlight(highlightedIndex < items.length - 1 ? highlightedIndex + 1 : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) setHighlight(highlightedIndex > 0 ? highlightedIndex - 1 : items.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentMatches.length > 0) {
          const book = (highlightedIndex >= 0 && currentMatches[highlightedIndex])
            ? currentMatches[highlightedIndex]
            : currentMatches[0];
          addRecentSearch(book);
          openModal(book);
          hideDropdown();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideDropdown();
        searchInput.blur();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) hideDropdown();
  });
}

// ── Application Initialization ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadRatings();
  initSearch();

  // Modal close button
  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

  // Escape key closes modal
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Detect page and initialise the right module
  const page = document.body.dataset.page || 'discover';
  initNavigation(page);

  // Pre-warm the books cache in the background (makes search instant later)
  loadAllBooks().catch(() => { /* silently ignore pre-warm failures */ });

  if (page === 'discover') {
    initDiscoverPage();
  } else if (page === 'recommendations') {
    initRecommendationsPage();
  } else if (page === 'my-ratings') {
    initMyRatingsPage();
  }
});
