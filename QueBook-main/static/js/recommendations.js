// ============================================================
//  QueBook — Recommendations Module (recommendations.js)
//  Rating interaction, flying-book animation, and recommendations.
//  Updated to fetch genre books and recommendations from the backend API.
// ============================================================

import { getBooksByGenre } from './data.js';
import { fetchRecommendations } from './api.js';
import { USER_ID } from './api.js';
import { getRating, saveRating, getAllRatings } from './ratings.js';
import { getQueryParam } from './navigation.js';
import { openModal, el } from './app.js';

const MIN_RATINGS = 5;
let currentGenre = 'Fiction';

export function initRecommendationsPage() {
  currentGenre = getQueryParam('genre') || 'Fiction';
  renderRatingScreen();
}

export async function renderRatingScreen() {
  const genre = currentGenre;

  // Back button
  const backBtn = document.getElementById('rating-back-btn');
  if (backBtn) {
    backBtn.textContent = `← ${genre ? genre.toUpperCase() : 'DISCOVER'}`;
    backBtn.onclick = () => { window.location.href = 'index.html'; };
  }

  // Show a loading placeholder in the grid
  const grid = document.getElementById('rating-grid');
  if (grid) {
    grid.innerHTML = '<p style="color:var(--grey-3); font-size:1rem; padding:40px 0; text-align:center; grid-column:1/-1;">Loading books…</p>';
  }

  // Fetch books for the selected genre
  let genreBooks = [];
  try {
    genreBooks = await getBooksByGenre(genre);
  } catch (err) {
    console.error('[Recommendations] Failed to load genre books:', err);
  }

  // Filter unrated books
  let books = genreBooks.filter(b => getRating(b.book_id ?? b.id) === 0);

  // Pad with other unrated books if fewer than 12
  if (books.length < 12) {
    try {
      const { fetchBooks } = await import('./api.js');
      const all = await fetchBooks({ limit: 200 });
      const extra = all.filter(b =>
        (b.genre || '').toLowerCase() !== genre.toLowerCase() &&
        getRating(b.book_id ?? b.id) === 0 &&
        !books.some(item => (item.book_id ?? item.id) === (b.book_id ?? b.id))
      );
      books = [...books, ...extra];
    } catch (_) { /* ignore */ }
  }

  const totalToShow  = Math.min(books.length, 12);
  const booksToRate  = books.slice(0, totalToShow);
  const totalRated   = getAllRatings().length;

  updateProgress(totalRated, Math.max(totalRated + booksToRate.length, 12));

  if (!grid) return;
  grid.innerHTML = '';

  if (booksToRate.length === 0) {
    grid.innerHTML = '<p style="color:var(--grey-3); font-size:1rem; padding: 40px 0; text-align:center; grid-column: 1/-1;">You\'ve rated all available books! Check your recommendations below or explore more genres.</p>';
    showRecommendationsSection();
    return;
  }

  booksToRate.forEach(book => {
    const bookId       = book.book_id ?? book.id;
    const currentRating = getRating(bookId);
    const card = el('div', 'rating-book-card');
    card.setAttribute('data-book-id', bookId);

    // Cover
    const coverWrap = el('div', 'rating-cover-wrap');
    const img = document.createElement('img');
    img.src = book.coverUrl || book.cover_url || '';
    img.alt = `${book.title} cover`;
    img.loading = 'lazy';
    img.onerror = () => {
      coverWrap.innerHTML = `
        <div class="book-cover-placeholder">
          <span class="placeholder-icon">📚</span>
          <span class="placeholder-title">${book.title}</span>
        </div>`;
    };
    coverWrap.appendChild(img);
    coverWrap.addEventListener('click', () => openModal(book));
    card.appendChild(coverWrap);

    // Meta
    const meta = el('div', 'rating-book-meta', `
      <div class="rating-book-title">${book.title}</div>
      <div class="rating-book-author">${book.author}</div>
      <div class="rating-prompt">How much did you like it?</div>
    `);
    card.appendChild(meta);

    // Stars
    const starsRow = el('div', 'stars');
    starsRow.setAttribute('role', 'radiogroup');
    starsRow.setAttribute('aria-label', `Rate ${book.title}`);

    const ratingValueEl = el('span', `rating-value${currentRating > 0 ? ' rated' : ''}`);
    ratingValueEl.textContent = currentRating > 0 ? `${currentRating}/5` : '';

    for (let i = 1; i <= 5; i++) {
      const star = el('span', `star${i <= currentRating ? ' filled' : ''}`, '★');
      star.setAttribute('role', 'radio');
      star.setAttribute('aria-label', `${i} star${i !== 1 ? 's' : ''}`);
      star.setAttribute('aria-checked', i <= currentRating ? 'true' : 'false');
      star.setAttribute('tabindex', '0');
      star.dataset.value = i;

      const handleRate = () => {
        const val = parseInt(star.dataset.value);

        // Update stars immediately (instant UI)
        starsRow.querySelectorAll('.star').forEach((s, idx) => {
          if (idx < val) {
            s.classList.add('filled');
            s.setAttribute('aria-checked', 'true');
          } else {
            s.classList.remove('filled');
            s.setAttribute('aria-checked', 'false');
          }
        });

        ratingValueEl.textContent = `${val}/5`;
        ratingValueEl.classList.add('rated');

        // Launch smooth flying book animation → My Ratings, then save
        flyBookToRatings(book, val, card);
      };

      star.addEventListener('click', handleRate);
      star.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleRate(); });
      starsRow.appendChild(star);
    }

    starsRow.appendChild(ratingValueEl);
    meta.appendChild(starsRow);
    grid.appendChild(card);
  });

  grid.dataset.total = Math.max(totalRated + booksToRate.length, 12);
}

export function updateProgress(rated, total) {
  const min   = MIN_RATINGS;
  const pct   = Math.min((rated / total) * 100, 100);
  const minPct = Math.min((min / total) * 100, 100);
  const ready  = rated >= min;

  const labelEl = document.getElementById('progress-label-count');
  if (labelEl) labelEl.textContent = `${rated} / ${total} rated`;

  const hintEl = document.getElementById('progress-hint');
  if (hintEl) {
    hintEl.textContent = ready ? '✓ Ready' : `${min - rated} more needed`;
    hintEl.className = `progress-label-right${ready ? ' ready' : ''}`;
  }

  const fill = document.getElementById('progress-fill');
  if (fill) {
    fill.style.width = `${pct}%`;
    fill.style.background = ready ? 'var(--black)' : '#AAAAAA';
  }

  const marker = document.getElementById('progress-marker');
  if (marker) marker.style.left = `${minPct}%`;

  const btn = document.getElementById('get-reco-btn');
  if (btn) {
    btn.disabled = !ready;
    btn.setAttribute('aria-disabled', String(!ready));
    btn.textContent = ready ? 'Get My Recommendations →' : `Rate at least ${min} books`;
    btn.onclick = () => showRecommendationsSection();
  }
}

export function flyBookToRatings(book, ratingVal, sourceElement) {
  let coverEl = null;
  if (sourceElement) {
    coverEl = sourceElement.querySelector('.rating-cover-wrap') ||
              sourceElement.querySelector('.book-cover-wrap') ||
              sourceElement.querySelector('img') ||
              sourceElement;
  }

  const navRatings = document.getElementById('nav-ratings');
  if (!coverEl || !navRatings) {
    saveRating(book, ratingVal);
    return;
  }

  const startRect  = coverEl.getBoundingClientRect();
  const targetRect = navRatings.getBoundingClientRect();

  // Create flying clone
  const clone = document.createElement('div');
  clone.className = 'flying-book-clone';
  clone.style.left   = `${startRect.left}px`;
  clone.style.top    = `${startRect.top}px`;
  clone.style.width  = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;

  const cloneImg = document.createElement('img');
  cloneImg.src = book.coverUrl || book.cover_url || '';
  cloneImg.alt = `${book.title} cover`;
  clone.appendChild(cloneImg);
  document.body.appendChild(clone);

  void clone.offsetWidth; // force reflow

  // Step 1: Subtle lift
  clone.classList.add('lifting');

  // Fade out source card
  if (sourceElement) {
    sourceElement.style.transition = 'opacity 380ms cubic-bezier(0.16, 1, 0.3, 1), transform 380ms cubic-bezier(0.16, 1, 0.3, 1)';
    sourceElement.style.opacity    = '0';
    sourceElement.style.transform  = 'scale(0.9) translateY(8px)';
    sourceElement.style.pointerEvents = 'none';
  }

  // Step 2: Fly to #nav-ratings
  setTimeout(() => {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top  + targetRect.height / 2;
    const startCenterX  = startRect.left  + startRect.width / 2;
    const startCenterY  = startRect.top   + startRect.height / 2;

    const deltaX = targetCenterX - startCenterX;
    const deltaY = targetCenterY - startCenterY;

    clone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2) rotate(-5deg)`;
    clone.style.opacity   = '0.12';
  }, 70);

  // Step 3: Land, pulse navbar, save rating, remove card from DOM
  setTimeout(() => {
    if (clone && clone.parentNode) clone.parentNode.removeChild(clone);

    navRatings.classList.add('nav-pulse');
    setTimeout(() => navRatings.classList.remove('nav-pulse'), 450);

    // Save rating (writes to localStorage + fires API call)
    saveRating(book, ratingVal);

    if (sourceElement && sourceElement.parentNode) {
      sourceElement.parentNode.removeChild(sourceElement);
    }

    const totalRated = getAllRatings().length;
    const grid  = document.getElementById('rating-grid');
    const total = parseInt(grid ? grid.dataset.total : '12') || 12;
    updateProgress(totalRated, total);
  }, 680);
}

export async function showRecommendationsSection() {
  const recoSection = document.getElementById('recommendations-section');
  if (recoSection) {
    recoSection.style.display = 'block';
    await renderRecommendations();
    recoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export async function renderRecommendations() {
  const genre = currentGenre;

  // Show loading states in the recommendation containers
  const featuredContainer = document.getElementById('reco-featured-inner');
  const recoGrid = document.getElementById('reco-grid');
  if (featuredContainer) {
    featuredContainer.innerHTML = '<p style="color:var(--grey-3); padding:20px 0;">Loading recommendations…</p>';
  }
  if (recoGrid) recoGrid.innerHTML = '';

  // Fetch personalised recommendations from the backend
  // fetchRecommendations now always returns { tasteSummary, recommendations }
  let tasteSummary = null;
  let sorted = [];
  try {
    const result = await fetchRecommendations(USER_ID, 15);
    tasteSummary = result.tasteSummary;
    sorted       = result.recommendations;
  } catch (err) {
    console.error('[Recommendations] Failed to fetch recommendations:', err);
    if (featuredContainer) {
      featuredContainer.innerHTML = '<p style="color:var(--grey-3); padding:20px 0;">Could not load recommendations. Make sure the backend is running.</p>';
    }
    return;
  }

  if (sorted.length === 0) {
    if (featuredContainer) {
      featuredContainer.innerHTML = '<p style="color:var(--grey-3); padding:20px 0;">No recommendations yet. Rate more books to improve your suggestions!</p>';
    }
    return;
  }

  const featured = sorted[0];
  const rest     = sorted.slice(1);

  const genreBadge = document.getElementById('reco-genre-badge');
  if (genreBadge) genreBadge.textContent = `${genre.toUpperCase()} · BOOKS`;

  const countEl = document.getElementById('reco-count');
  if (countEl) countEl.textContent = `${sorted.length} recommendations`;

  // Render the AI taste summary banner (only when AI is active)
  renderTasteSummary(tasteSummary);

  renderFeatured(featured);
  renderRecoGrid(rest);
}

/**
 * Render the AI taste summary banner above the featured recommendation.
 * If summary is null (AI not active / fallback mode), remove any existing banner.
 */
function renderTasteSummary(summary) {
  // Remove any previously rendered banner (e.g., on re-render)
  const existing = document.getElementById('ai-taste-banner');
  if (existing) existing.innerHTML = '';

  if (!summary || !existing) return;

  existing.innerHTML = `
    <div class="ai-insight-banner">
      <span class="ai-insight-label">✦ AI Insight</span>
      <p class="ai-insight-text">${escapeHtml(summary)}</p>
    </div>
  `;
}

// Simple HTML escaper used in taste summary to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderFeatured(book) {
  const container = document.getElementById('reco-featured-inner');
  if (!container || !book) return;
  container.innerHTML = '';

  const coverEl = el('div', 'reco-featured-cover');
  const img = document.createElement('img');
  img.src = book.coverUrl || book.cover_url || '';
  img.alt = `${book.title} cover`;
  img.onerror = () => {
    coverEl.innerHTML = `<div class="book-cover-placeholder"><span class="placeholder-icon">📚</span><span class="placeholder-title">${book.title}</span></div>`;
  };
  coverEl.appendChild(img);
  coverEl.addEventListener('click', () => openModal(book));

  const info = el('div', 'reco-featured-info');
  const matchPct = book.matchPercentage || Math.round((book.recommendation_score || 0.85) * 100);
  const match = el('div', 'reco-match-badge', `${matchPct}% Match`);
  info.appendChild(match);

  const titleEl = el('div', 'reco-featured-title', book.title.toUpperCase());
  titleEl.addEventListener('click', () => openModal(book));
  info.appendChild(titleEl);

  info.appendChild(el('div', 'reco-featured-author', book.author));

  const tagsWrap = el('div', 'reco-featured-genres');
  (book.tags || (book.genre ? [book.genre] : [])).forEach(tag => {
    tagsWrap.appendChild(el('span', 'genre-tag', tag));
  });
  info.appendChild(tagsWrap);

  const whyWrap   = el('div', 'reco-featured-why');
  const whyBtn    = el('button', 'why-trigger', '✦ Why this?');
  // Use AI-generated reason when available, otherwise show a generic fallback
  const reasonText = (book.reason && book.reason.trim())
    ? book.reason
    : 'Similar to the books you rated highly, especially in genre and themes.';
  const whyTooltip = el('div', 'why-tooltip', `"${escapeHtml(reasonText)}"`);
  whyBtn.addEventListener('click', () => {
    whyTooltip.classList.toggle('visible');
    whyBtn.textContent = whyTooltip.classList.contains('visible') ? '✦ Hide' : '✦ Why this?';
  });
  whyWrap.appendChild(whyBtn);
  whyWrap.appendChild(whyTooltip);
  info.appendChild(whyWrap);

  const openBtn = el('div', '');
  openBtn.style.marginTop = '8px';
  const viewBtn = el('button', 'btn-secondary', 'View details');
  viewBtn.addEventListener('click', () => openModal(book));
  openBtn.appendChild(viewBtn);
  info.appendChild(openBtn);

  container.appendChild(coverEl);
  container.appendChild(info);
}

function renderRecoGrid(books) {
  const grid = document.getElementById('reco-grid');
  if (!grid) return;
  grid.innerHTML = '';

  books.forEach(book => {
    const card = el('div', 'reco-card');
    card.addEventListener('click', () => openModal(book));

    const coverWrap = el('div', 'reco-cover-wrap');
    const img = document.createElement('img');
    img.src = book.coverUrl || book.cover_url || '';
    img.alt = `${book.title} cover`;
    img.loading = 'lazy';
    img.onerror = () => {
      coverWrap.innerHTML = `<div class="book-cover-placeholder"><span class="placeholder-icon">📚</span><span class="placeholder-title">${book.title}</span></div>`;
    };
    coverWrap.appendChild(img);
    card.appendChild(coverWrap);

    const info = el('div', 'reco-card-info');
    info.innerHTML = `
      <div class="reco-card-title">${book.title}</div>
      <div class="reco-card-author">${book.author}</div>
    `;

    const whyRow    = el('div', 'reco-card-why-row');
    const matchPct  = book.matchPercentage || Math.round((book.recommendation_score || 0.85) * 100);
    const matchSpan = el('span', 'reco-card-match', `${matchPct}% Match`);
    const whyBtn    = el('button', 'why-trigger', 'Why?');
    // Use AI-generated reason when available, otherwise show a generic fallback
    const cardReasonText = (book.reason && book.reason.trim())
      ? book.reason
      : 'Similar genre, themes, and style to what you rated highly.';
    const tooltip   = el('div', 'reco-card-why-tooltip', escapeHtml(cardReasonText));

    whyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltip.classList.toggle('visible');
      whyBtn.textContent = tooltip.classList.contains('visible') ? 'Hide' : 'Why?';
    });

    whyRow.appendChild(matchSpan);
    whyRow.appendChild(whyBtn);
    info.appendChild(whyRow);
    info.appendChild(tooltip);
    card.appendChild(info);
    grid.appendChild(card);
  });
}
