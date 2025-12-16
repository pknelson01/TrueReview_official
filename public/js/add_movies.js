// =============================================================================
//  add_movies.js — Client-side rendering for Add Movie page
// =============================================================================

const searchInput = document.getElementById("movie-search");
const resultsDiv = document.getElementById("search-results");
const loadingText = document.getElementById("loading-text");
const errorText = document.getElementById("error-text");

let debounceTimer = null;

// -----------------------------------------------------------------------------
//  RENDER RESULTS INTO HTML
// -----------------------------------------------------------------------------
function renderResults(movies) {
    resultsDiv.innerHTML = "";

    if (!movies || movies.length === 0) {
        resultsDiv.innerHTML = `<p class="no-results">No movies found.</p>`;
        return;
    }

    movies.forEach(movie => {
        // Create card as link - links to edit page for watched movies, rate page for unwatched
        const card = document.createElement("a");
        card.className = movie.isWatched ? "movie-card watched" : "movie-card";

        if (movie.isWatched && movie.watched_id) {
            card.href = `/update-movie/${movie.watched_id}`;
        } else if (movie.isWatched && !movie.watched_id) {
            // Safety fallback - if watched but no watched_id, link to rate page
            console.warn("Movie marked as watched but missing watched_id:", movie);
            card.href = `/rate-movie/${movie.movie_id}`;
        } else {
            card.href = `/rate-movie/${movie.movie_id}`;
        }

        card.innerHTML = `
            <div class="poster-wrapper">
                <img class="poster" src="${movie.poster_full_url}" alt="${movie.movie_title}" onerror="this.src='/TrueReview_logo/Poster_BW.png'" />
            </div>

            <div class="movie-info">
                <h2 class="title">${movie.movie_title}</h2>
                <p class="year">${movie.isCurrentYear ? movie.fullReleaseDate : movie.releaseYear}</p>
            </div>

            ${movie.isWatched ? '<div class="watched-label">Watched</div>' : ''}
        `;

        resultsDiv.appendChild(card);
    });
}

// -----------------------------------------------------------------------------
//  FETCH SEARCH RESULTS
// -----------------------------------------------------------------------------
async function searchMovies(query) {
    if (!query.trim()) {
        resultsDiv.innerHTML = "";
        return;
    }

    loadingText.style.display = "block";
    errorText.style.display = "none";

    try {
        // IMPORTANT: Your backend route is /api/search-movies
        const res = await fetch(`/api/search-movies?q=${encodeURIComponent(query)}`);

        if (!res.ok) throw new Error("Bad response");

        const movies = await res.json();
        
        loadingText.style.display = "none";
        renderResults(movies);

    } catch (err) {
        loadingText.style.display = "none";
        errorText.style.display = "block";
        console.error("Search Error:", err);
    }
}

// -----------------------------------------------------------------------------
//  DEBOUNCE INPUT
// -----------------------------------------------------------------------------
searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        searchMovies(searchInput.value);
    }, 300);
});
