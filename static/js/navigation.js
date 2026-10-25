// ============================================================
//  BOOKLY / Quebook — Navigation Module (navigation.js)
//  Page routing, active navbar states, and URL parameters
// ============================================================

export function initNavigation(activePage = 'discover') {
  const navLogo = document.getElementById('nav-logo');
  const navDiscover = document.getElementById('nav-discover');
  const navRatings = document.getElementById('nav-ratings');

  if (navLogo) {
    navLogo.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (navDiscover) {
    if (activePage === 'discover') {
      navDiscover.classList.add('active');
    } else {
      navDiscover.classList.remove('active');
    }
    navDiscover.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  if (navRatings) {
    if (activePage === 'my-ratings') {
      navRatings.classList.add('active');
    } else {
      navRatings.classList.remove('active');
    }
    navRatings.addEventListener('click', () => {
      window.location.href = 'my_ratings.html';
    });
  }
}

export function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

export function navigateToRecommendations(genre) {
  if (!genre) return;
  window.location.href = `recommendations.html?genre=${encodeURIComponent(genre)}`;
}
