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

        // Determine watchlist button style and text
        const watchlistBtnClass = movie.inWatchlist ? "watchlist-btn in-watchlist" : "watchlist-btn";
        const watchlistBtnText = movie.inWatchlist ? "✓ In Watchlist" : "+ Watchlist";

        card.innerHTML = `
            <div class="poster-wrapper">
                <img class="poster" src="${movie.poster_full_url}" alt="${movie.movie_title}" onerror="this.src='/TrueReview_logo/Poster_BW.png'" />
            </div>

            <div class="movie-info">
                <h2 class="title">${movie.movie_title}</h2>
                <p class="year">${movie.isCurrentYear ? movie.fullReleaseDate : movie.releaseYear}</p>
            </div>

            ${movie.isWatched ? '<div class="watched-label">Watched</div>' : ''}
            <button class="${watchlistBtnClass}" onclick="addToWatchlist(event, ${movie.movie_id}, ${movie.watched_id || null}, ${movie.isWatched}, ${movie.inWatchlist})">${watchlistBtnText}</button>
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

// -----------------------------------------------------------------------------
//  CUSTOM MODAL FUNCTIONALITY
// -----------------------------------------------------------------------------
function showConfirmModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById("confirm-modal");
        const yesBtn = document.getElementById("modal-yes");
        const noBtn = document.getElementById("modal-no");

        // Show modal
        modal.classList.add("active");

        // Handle Yes button
        const handleYes = () => {
            modal.classList.remove("active");
            yesBtn.removeEventListener("click", handleYes);
            noBtn.removeEventListener("click", handleNo);
            resolve(true);
        };

        // Handle No button
        const handleNo = () => {
            modal.classList.remove("active");
            yesBtn.removeEventListener("click", handleYes);
            noBtn.removeEventListener("click", handleNo);
            resolve(false);
        };

        yesBtn.addEventListener("click", handleYes);
        noBtn.addEventListener("click", handleNo);

        // Close on overlay click
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                handleNo();
            }
        });
    });
}

// -----------------------------------------------------------------------------
//  ADD TO WATCHLIST FUNCTIONALITY
// -----------------------------------------------------------------------------
async function addToWatchlist(event, movieId, watchedId, isWatched, inWatchlist) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target;

    // If already in watchlist, remove it
    if (inWatchlist) {
        try {
            const res = await fetch(`/api/watchlist/${movieId}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const error = await res.json();
                console.error("Failed to remove from watchlist:", error.error);
                return;
            }

            console.log("Removed from watchlist");
            // Update button appearance
            button.classList.remove("in-watchlist");
            button.textContent = "+ Watchlist";
            // Update the onclick attribute
            button.setAttribute("onclick", `addToWatchlist(event, ${movieId}, ${watchedId || null}, ${isWatched}, false)`);
        } catch (err) {
            console.error("Error removing from watchlist:", err);
        }
        return;
    }

    // If movie is already watched, show confirmation popup
    if (isWatched && watchedId) {
        const confirmed = await showConfirmModal();
        if (!confirmed) return;

        // Move from watched to watchlist
        try {
            const res = await fetch("/api/watchlist/move-from-watched", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ watched_id: watchedId, movie_id: movieId })
            });

            if (!res.ok) {
                const error = await res.json();
                console.error("Failed to move to watchlist:", error.error);
                return;
            }

            // Refresh the search to update the UI
            searchMovies(searchInput.value);
        } catch (err) {
            console.error("Error moving to watchlist:", err);
        }
    } else {
        // Simply add to watchlist (movie not watched)
        try {
            const res = await fetch("/api/watchlist/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ movie_id: movieId, priority_01: 0 })
            });

            if (!res.ok) {
                const error = await res.json();
                console.error("Failed to add to watchlist:", error.error);
                return;
            }

            console.log("Added to watchlist");
            // Update button appearance
            button.classList.add("in-watchlist");
            button.textContent = "✓ In Watchlist";
            // Update the onclick attribute
            button.setAttribute("onclick", `addToWatchlist(event, ${movieId}, ${watchedId || null}, ${isWatched}, true)`);
        } catch (err) {
            console.error("Error adding to watchlist:", err);
        }
    }
}
