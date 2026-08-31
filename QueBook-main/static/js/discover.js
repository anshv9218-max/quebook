// ============================================================
//  QueBook — Discover Module (discover.js)
//  Genre selection, genre preview, and Discover page logic.
//  Updated to fetch books from the backend API.
// ============================================================

import { GENRES, getBooksByGenre } from './data.js';
import { getRating } from './ratings.js';
import { navigateToRecommendations } from './navigation.js';
import { openModal, el, buildCoverImg } from './app.js';

let selectedGenre = null;

export function initDiscoverPage() {
  renderGenreGrid();
}

export function renderGenreGrid() {
  const container = document.getElementById('genre-grid');
  if (!container) return;
  container.innerHTML = '';

  GENRES.forEach(g => {
    const tile = el('button', 'genre-tile');
    tile.setAttribute('aria-pressed', 'false');
    tile.innerHTML = `
      <div class="genre-tile-content">
        <span class="genre-tile-name">${g.id}</span>
        <span class="genre-tile-desc">${g.desc}</span>
      </div>
      <span class="genre-arrow" aria-hidden="true">→</span>
    `;
    tile.addEventListener('click', () => selectGenre(g.id, tile));
    container.appendChild(tile);
  });
}

export function selectGenre(genreId, tileEl) {
  selectedGenre = genreId;

  // Update tile selection
  document.querySelectorAll('.genre-tile').forEach(t => {
    t.classList.remove('selected');
    t.setAttribute('aria-pressed', 'false');
  });
  if (tileEl) {
    tileEl.classList.add('selected');
    tileEl.setAttribute('aria-pressed', 'true');
  }

  renderGenrePreview(genreId);
}

export async function renderGenrePreview(genreId) {
  const preview = document.getElementById('genre-preview');
  if (!preview) return;

  // Show a loading state immediately so the section appears responsive
  preview.innerHTML = `
    <div class="container">
      <div class="preview-header">
        <div class="preview-header-left">
          <div class="preview-label">${genreId}</div>
          <div class="preview-title">A few places to start.</div>
          <div class="preview-sub">Loading books…</div>
        </div>
      </div>
      <div class="book-grid" id="preview-book-grid"></div>
      <div class="preview-cta">
        <button class="btn-primary" id="continue-btn">Continue &nbsp;→</button>
        <span style="font-size:0.82rem; color: var(--grey-3);">You'll rate a few books next</span>
      </div>
    </div>
  `;

  // Force animation replay
  preview.classList.remove('visible');
  void preview.offsetWidth;
  preview.classList.add('visible');

  // Scroll to preview section
  setTimeout(() => {
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);

  // Hook continue button
  const continueBtn = preview.querySelector('#continue-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => navigateToRecommendations(genreId));
  }

  // Fetch books from the API
  let books = [];
  try {
    books = await getBooksByGenre(genreId);
  } catch (err) {
    console.error('[Discover] Failed to load books for genre:', genreId, err);
  }

  // Filter out already-rated books (use local ratings cache for speed)
  const unrated = books.filter(b => getRating(b.book_id ?? b.id) === 0);

  // Update subtitle
  const sub = preview.querySelector('.preview-sub');
  if (sub) {
    sub.textContent = `${unrated.length} unrated ${unrated.length === 1 ? 'book' : 'books'} available`;
  }

  // Populate book grid
  const grid = document.getElementById('preview-book-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (unrated.length === 0) {
    grid.innerHTML = '<p style="color:var(--grey-3); font-size:0.9rem; padding: 20px 0;">You\'ve rated all books in this genre! Check "My Ratings" or explore other genres.</p>';
    return;
  }

  const previewBooks = unrated.slice(0, 8);

  previewBooks.forEach(book => {
    const card = el('div', 'book-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${book.title} by ${book.author}`);

    const coverWrap = buildCoverImg(book);
    card.appendChild(coverWrap);

    const info = el('div', 'book-info', `
      <div class="book-title">${book.title}</div>
      <div class="book-author">${book.author}</div>
    `);
    card.appendChild(info);

    card.addEventListener('click', () => openModal(book));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openModal(book);
    });

    grid.appendChild(card);
  });
}
