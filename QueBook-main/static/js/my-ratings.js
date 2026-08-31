// ============================================================
//  QueBook — My Ratings Module (my-ratings.js)
//  Renders rated books, user star ratings, and empty state.
//  Updated to load rated books from the backend API.
// ============================================================

import { fetchRatings } from './api.js';
import { USER_ID } from './api.js';
import { removeRating } from './ratings.js';
import { openModal, el } from './app.js';

export function initMyRatingsPage() {
  const backBtn = document.getElementById('my-ratings-back-btn');
  if (backBtn) {
    backBtn.onclick = () => { window.location.href = 'index.html'; };
  }

  renderMyRatingsGrid();
}

export async function renderMyRatingsGrid() {
  const grid       = document.getElementById('my-ratings-grid');
  const emptyState = document.getElementById('my-ratings-empty');
  const countBadge = document.getElementById('my-ratings-count');

  if (!grid || !emptyState || !countBadge) return;

  // Show a loading state
  countBadge.textContent = 'Loading…';
  grid.innerHTML = '';
  grid.style.display = 'none';
  emptyState.style.display = 'none';

  // Fetch from backend
  let ratedBooks = [];
  try {
    ratedBooks = await fetchRatings(USER_ID);
  } catch (err) {
    console.error('[MyRatings] Failed to load ratings from API:', err);
    // Fallback: show empty state with a helpful note
    countBadge.textContent = '0 books';
    emptyState.style.display = 'block';
    emptyState.querySelector('.my-ratings-empty-title').textContent = 'Could not load your ratings.';
    emptyState.querySelector('.my-ratings-empty-sub').textContent = 'Make sure the backend is running, then refresh.';
    return;
  }

  countBadge.textContent = `${ratedBooks.length} ${ratedBooks.length === 1 ? 'book' : 'books'}`;

  if (ratedBooks.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = '';

  ratedBooks.forEach(book => {
    const bookId = book.book_id ?? book.id;
    const card = el('div', 'my-ratings-card');
    card.setAttribute('data-book-id', bookId);

    // Cover
    const coverWrap = el('div', 'my-ratings-card-cover');
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

    // Content
    const content = el('div', 'my-ratings-card-content');

    const titleEl = el('div', 'my-ratings-card-title', book.title);
    titleEl.addEventListener('click', () => openModal(book));
    content.appendChild(titleEl);

    content.appendChild(el('div', 'my-ratings-card-author', book.author));

    const displayGenre = book.genre || (book.tags && book.tags[0]) || '';
    if (displayGenre) {
      content.appendChild(el('div', 'my-ratings-card-genre', displayGenre));
    }

    // Star rating pill (book.rating = user's rating from the DB)
    const ratingPill = el('div', 'my-ratings-card-rating');
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<span class="my-ratings-star${i <= (book.rating || 0) ? ' filled' : ''}">★</span>`;
    }
    starsHtml += `<span class="my-ratings-num">${book.rating || 0}/5</span>`;
    ratingPill.innerHTML = starsHtml;
    content.appendChild(ratingPill);

    // Remove button — removes from localStorage immediately, re-renders
    const removeBtn = el('button', 'my-ratings-remove-btn', '✕ Remove');
    removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      // Disable button to prevent double-clicks
      removeBtn.disabled = true;
      removeBtn.textContent = 'Removing...';
      
      try {
        // Wait for successful deletion from the backend and local state
        await removeRating(bookId);
        
        // Remove that book from frontend immediately after successful deletion
        card.style.transition = 'opacity 300ms ease, transform 300ms ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.92) translateY(10px)';
        
        setTimeout(() => {
          renderMyRatingsGrid();
        }, 280);
      } catch (err) {
        console.error('[MyRatings] Failed to remove rating:', err);
        removeBtn.disabled = false;
        removeBtn.textContent = '✕ Remove';
      }
    });
    content.appendChild(removeBtn);

    card.appendChild(content);
    grid.appendChild(card);
  });
}
