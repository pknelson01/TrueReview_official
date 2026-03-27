const watchedId = window.location.pathname.split("/").pop();

// Load existing watched entry details
async function loadWatchedEntry() {
    const res = await fetch(`/api/watched/${watchedId}`);

    if (!res.ok) {
        console.error("Failed to load watched entry");
        return;
    }

    const data = await res.json();

    // Fill movie visuals
    const posterImg = document.getElementById("movie-poster");
    posterImg.src = data.poster_full_url;
    posterImg.onerror = () => { posterImg.src = '/TrueReview_logo/Poster_BW.png'; };
    document.getElementById("movie-title").textContent = data.movie_title;
    document.getElementById("movie-year").textContent = data.releaseYear;

    // Pre-fill rating + review
    const rating = parseFloat(data.user_rating);
    document.getElementById("rating").value = rating;
    document.getElementById("rating-display").textContent = rating.toFixed(1);
    document.getElementById("review").value = data.review || "";

    // Set form actions
    document.getElementById("update-form").action = `/update-movie/${watchedId}`;
    document.getElementById("delete-form").action = `/delete-movie/${watchedId}`;

    // Load extra movie details from TMDB
    loadMovieDetails(data.movie_id);
}

async function loadMovieDetails(movie_id) {
    try {
        const res = await fetch(`/api/movie-details/${movie_id}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.mpaa_rating) {
            document.getElementById("extra-mpa-value").textContent = data.mpaa_rating;
            document.getElementById("extra-mpa").style.display = "flex";
        }
        if (data.director) {
            document.getElementById("extra-director-value").textContent = data.director;
            document.getElementById("extra-director").style.display = "flex";
        }
        if (data.genres?.length) {
            document.getElementById("extra-genres-value").textContent = data.genres.join(", ");
            document.getElementById("extra-genres").style.display = "flex";
        }
        if (data.cast?.length) {
            document.getElementById("extra-cast-value").textContent = data.cast.join(", ");
            document.getElementById("extra-cast").style.display = "flex";
        }
    } catch (err) {
        console.error("Error loading movie details:", err);
    }
}

// Update rating display as slider moves
const ratingSlider = document.getElementById("rating");
const ratingDisplay = document.getElementById("rating-display");

ratingSlider.addEventListener("input", (e) => {
    const value = parseFloat(e.target.value).toFixed(1);
    ratingDisplay.textContent = value;
});

loadWatchedEntry();
