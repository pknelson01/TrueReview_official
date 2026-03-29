// ============================================================================
//  movie_modal.js — Shared rate/update modal component
//  Usage: openRateModal(movieId) or openUpdateModal(watchedId)
//  Set window.onMovieModalClose = (result) => { ... } to handle close
// ============================================================================

(function () {
    // Guard against multiple includes
    if (document.getElementById("mm-overlay")) return;

    // Inject modal HTML
    const modalHTML = `
    <div class="mm-overlay" id="mm-overlay">
      <div class="mm-container">
        <button class="mm-close-btn" id="mm-close">&times;</button>
        <h2 class="mm-title" id="mm-title">Rate This Movie</h2>

        <div class="mm-movie-section">
          <img id="mm-poster" class="mm-poster" src="" alt="Poster" />
          <div class="mm-movie-info">
            <h3 id="mm-movie-title" class="mm-movie-title"></h3>
            <p id="mm-movie-year" class="mm-movie-year"></p>
          </div>
          <div class="mm-extra-info" id="mm-extra-info">
            <div class="mm-extra-item" id="mm-extra-mpa" style="display:none;">
              <span class="mm-extra-label">Rating</span>
              <span class="mm-extra-value" id="mm-extra-mpa-value"></span>
            </div>
            <div class="mm-extra-item" id="mm-extra-director" style="display:none;">
              <span class="mm-extra-label">Director</span>
              <span class="mm-extra-value" id="mm-extra-director-value"></span>
            </div>
            <div class="mm-extra-item" id="mm-extra-genres" style="display:none;">
              <span class="mm-extra-label">Genres</span>
              <span class="mm-extra-value" id="mm-extra-genres-value"></span>
            </div>
            <div class="mm-extra-item" id="mm-extra-cast" style="display:none;">
              <span class="mm-extra-label">Cast</span>
              <span class="mm-extra-value" id="mm-extra-cast-value"></span>
            </div>
          </div>
        </div>

        <div class="mm-form-section">
          <label class="mm-label">Your Rating (0.0 - 10.0):</label>
          <div class="mm-rating-value" id="mm-rating-display">5.0</div>
          <input type="range" id="mm-rating" min="0" max="10" step="0.1" value="5.0" />

          <div class="mm-option-buttons">
            <div class="mm-option-btn-group">
              <button type="button" class="mm-option-btn" id="mm-date-btn">Date</button>
              <input type="date" id="mm-watched-date" class="mm-date-picker-hidden" />
            </div>
            <button type="button" class="mm-option-btn" id="mm-theater-btn">In-Theaters</button>
            <button type="button" class="mm-option-btn" id="mm-memory-btn" style="display:none;">Memory</button>
          </div>

          <label class="mm-label">Review (optional):</label>
          <textarea id="mm-review" class="mm-review" rows="4"></textarea>

          <button class="mm-submit-btn" id="mm-submit-btn">Submit</button>
          <button class="mm-watchlist-btn" id="mm-watchlist-btn">Add to Watchlist</button>
          <button class="mm-favorite-btn" id="mm-favorite-btn" style="display:none;">Set as Favorite Movie</button>
          <button class="mm-delete-btn" id="mm-delete-btn" style="display:none;">Delete Entry</button>
        </div>
      </div>
    </div>

    <div class="mm-sub-overlay" id="mm-confirm-overlay">
      <div class="mm-sub-box">
        <div class="mm-sub-title">Confirm Action</div>
        <div class="mm-sub-message" id="mm-confirm-message">Are you sure? This will delete your entry and review.</div>
        <div class="mm-sub-buttons">
          <button class="mm-sub-btn mm-sub-btn-yes" id="mm-confirm-yes">Yes, I'm Sure</button>
          <button class="mm-sub-btn mm-sub-btn-no" id="mm-confirm-no">Cancel</button>
        </div>
      </div>
    </div>

    <div class="mm-sub-overlay" id="mm-favorite-overlay">
      <div class="mm-sub-box">
        <div class="mm-sub-title">Set as Favorite?</div>
        <div class="mm-sub-message" id="mm-favorite-message"></div>
        <div class="mm-sub-buttons">
          <button class="mm-sub-btn mm-sub-btn-yes" id="mm-favorite-yes">Yes, Set as Favorite</button>
          <button class="mm-sub-btn mm-sub-btn-no" id="mm-favorite-no">Cancel</button>
        </div>
      </div>
    </div>

    <div class="mm-sub-overlay" id="mm-memory-overlay">
      <div class="mm-sub-box" style="max-width:700px;">
        <div class="mm-sub-title" id="mm-memory-title">Memory</div>
        <div class="mm-memory-body" id="mm-memory-body"></div>
        <div style="text-align:center;">
          <button class="mm-memory-close-btn" id="mm-memory-close">Close</button>
        </div>
      </div>
    </div>
    `;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = modalHTML;
    document.body.appendChild(wrapper);

    // ---- Element references ----
    const overlay = document.getElementById("mm-overlay");
    const closeBtn = document.getElementById("mm-close");
    const titleEl = document.getElementById("mm-title");
    const posterEl = document.getElementById("mm-poster");
    const movieTitleEl = document.getElementById("mm-movie-title");
    const movieYearEl = document.getElementById("mm-movie-year");
    const ratingSlider = document.getElementById("mm-rating");
    const ratingDisplay = document.getElementById("mm-rating-display");
    const dateBtn = document.getElementById("mm-date-btn");
    const datePicker = document.getElementById("mm-watched-date");
    const theaterBtn = document.getElementById("mm-theater-btn");
    const memoryBtn = document.getElementById("mm-memory-btn");
    const reviewEl = document.getElementById("mm-review");
    const submitBtn = document.getElementById("mm-submit-btn");
    const watchlistBtn = document.getElementById("mm-watchlist-btn");
    const favoriteBtn = document.getElementById("mm-favorite-btn");
    const deleteBtn = document.getElementById("mm-delete-btn");

    // Extra info elements
    const extraMpa = document.getElementById("mm-extra-mpa");
    const extraMpaVal = document.getElementById("mm-extra-mpa-value");
    const extraDirector = document.getElementById("mm-extra-director");
    const extraDirectorVal = document.getElementById("mm-extra-director-value");
    const extraGenres = document.getElementById("mm-extra-genres");
    const extraGenresVal = document.getElementById("mm-extra-genres-value");
    const extraCast = document.getElementById("mm-extra-cast");
    const extraCastVal = document.getElementById("mm-extra-cast-value");

    // Sub-modal elements
    const confirmOverlay = document.getElementById("mm-confirm-overlay");
    const confirmMessage = document.getElementById("mm-confirm-message");
    const confirmYes = document.getElementById("mm-confirm-yes");
    const confirmNo = document.getElementById("mm-confirm-no");
    const favoriteOverlay = document.getElementById("mm-favorite-overlay");
    const favoriteMessage = document.getElementById("mm-favorite-message");
    const favoriteYes = document.getElementById("mm-favorite-yes");
    const favoriteNo = document.getElementById("mm-favorite-no");
    const memoryOverlay = document.getElementById("mm-memory-overlay");
    const memoryTitle = document.getElementById("mm-memory-title");
    const memoryBody = document.getElementById("mm-memory-body");
    const memoryClose = document.getElementById("mm-memory-close");

    // ---- State ----
    let mode = null; // "rate" or "update"
    let currentMovieId = null;
    let currentWatchedId = null;
    let currentMemory = null;
    let pendingMemoryFile = null; // Holds file for rate mode (uploaded after insert)
    let inTheaterValue = 0;

    // ---- Helpers ----
    function resetModal() {
        ratingSlider.value = 5.0;
        ratingDisplay.textContent = "5.0";
        reviewEl.value = "";
        datePicker.value = "";
        dateBtn.textContent = "Date";
        dateBtn.classList.remove("active");
        theaterBtn.classList.remove("active");
        inTheaterValue = 0;
        currentMemory = null;
        pendingMemoryFile = null;
        currentMovieId = null;
        currentWatchedId = null;

        // Hide extra info
        extraMpa.style.display = "none";
        extraDirector.style.display = "none";
        extraGenres.style.display = "none";
        extraCast.style.display = "none";

        // Reset poster
        posterEl.src = "";
        movieTitleEl.textContent = "";
        movieYearEl.textContent = "";
    }

    function closeModal(result) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
        if (result && typeof window.onMovieModalClose === "function") {
            window.onMovieModalClose(result);
        }
    }

    function showConfirm(message) {
        return new Promise((resolve) => {
            confirmMessage.textContent = message;
            confirmOverlay.classList.add("active");

            const onYes = () => { cleanup(); resolve(true); };
            const onNo = () => { cleanup(); resolve(false); };
            const onBg = (e) => { if (e.target === confirmOverlay) { cleanup(); resolve(false); } };

            function cleanup() {
                confirmOverlay.classList.remove("active");
                confirmYes.removeEventListener("click", onYes);
                confirmNo.removeEventListener("click", onNo);
                confirmOverlay.removeEventListener("click", onBg);
            }

            confirmYes.addEventListener("click", onYes);
            confirmNo.addEventListener("click", onNo);
            confirmOverlay.addEventListener("click", onBg);
        });
    }

    function applyMovieDetails(data) {
        if (data.mpaa_rating || data.mpa_rating) {
            extraMpaVal.textContent = data.mpaa_rating || data.mpa_rating;
            extraMpa.style.display = "flex";
        }
        if (data.director) {
            extraDirectorVal.textContent = data.director;
            extraDirector.style.display = "flex";
        }
        if (data.genres?.length) {
            extraGenresVal.textContent = Array.isArray(data.genres) ? data.genres.join(", ") : data.genres;
            extraGenres.style.display = "flex";
        }
        if (data.cast?.length) {
            extraCastVal.textContent = Array.isArray(data.cast) ? data.cast.join(", ") : data.cast;
            extraCast.style.display = "flex";
        }
    }

    async function loadMovieDetails(movieId) {
        try {
            const res = await fetch(`/api/movie-details/${movieId}`);
            if (!res.ok) return;
            const data = await res.json();
            applyMovieDetails(data);
        } catch (err) {
            console.error("Error loading movie details:", err);
        }
    }

    // ---- Rate Mode ----
    window.openRateModal = async function (movieId) {
        resetModal();
        mode = "rate";
        currentMovieId = movieId;

        titleEl.textContent = "Rate This Movie";
        submitBtn.textContent = "Submit";
        watchlistBtn.textContent = "Add to Watchlist";
        watchlistBtn.style.display = "";
        favoriteBtn.style.display = "none";
        deleteBtn.style.display = "none";
        memoryBtn.style.display = "";

        overlay.classList.add("active");
        document.body.style.overflow = "hidden";

        // Load movie data
        try {
            const res = await fetch(`/api/movie/${movieId}`);
            if (!res.ok) { console.error("Movie not found"); return; }
            const movie = await res.json();

            posterEl.src = movie.poster_full_url;
            posterEl.onerror = () => { posterEl.src = '/TrueReview_logo/Poster_BW.png'; };
            movieTitleEl.textContent = movie.movie_title;
            movieYearEl.textContent = movie.releaseYear || "";
            currentMovieId = movie.movie_id;
        } catch (err) {
            console.error("Error loading movie:", err);
        }

        loadMovieDetails(movieId);

        // Check watchlist status
        try {
            const res = await fetch(`/api/watchlist/check/${movieId}`);
            const data = await res.json();
            if (data.inWatchlist) {
                watchlistBtn.textContent = "Remove from Watchlist";
                watchlistBtn.dataset.inWatchlist = "true";
            } else {
                watchlistBtn.dataset.inWatchlist = "false";
            }
        } catch (err) {}
    };

    // ---- Update Mode ----
    window.openUpdateModal = async function (watchedId) {
        resetModal();
        mode = "update";
        currentWatchedId = watchedId;

        titleEl.textContent = "Update Your Review";
        submitBtn.textContent = "Update";
        watchlistBtn.textContent = "Move to Watchlist";
        watchlistBtn.style.display = "";
        favoriteBtn.style.display = "";
        deleteBtn.style.display = "";
        memoryBtn.style.display = "";

        overlay.classList.add("active");
        document.body.style.overflow = "hidden";

        // Load watched entry data
        try {
            const res = await fetch(`/api/watched/${watchedId}`);
            if (!res.ok) { console.error("Watched entry not found"); return; }
            const data = await res.json();

            posterEl.src = data.poster_full_url;
            posterEl.onerror = () => { posterEl.src = '/TrueReview_logo/Poster_BW.png'; };
            movieTitleEl.textContent = data.movie_title;
            movieYearEl.textContent = data.releaseYear || "";
            currentMovieId = data.movie_id;

            // Pre-fill form
            const rating = parseFloat(data.user_rating);
            ratingSlider.value = rating;
            ratingDisplay.textContent = rating.toFixed(1);
            reviewEl.value = data.review || "";

            // Pre-fill date
            if (data.watched_date) {
                const dateStr = new Date(data.watched_date).toISOString().split("T")[0];
                datePicker.value = dateStr;
                const [y, m, d] = dateStr.split("-");
                dateBtn.textContent = `${m}/${d}/${y}`;
                dateBtn.classList.add("active");
            }

            // Pre-fill theater
            if (data.in_theater === 1) {
                theaterBtn.classList.add("active");
                inTheaterValue = 1;
            }

            // Memory
            currentMemory = data.memory || null;

            // Use details from watched_list (already in response) — no extra API call
            if (data.director || data.genre || data.actors || data.mpa_rating || data.mpaa_rating) {
                const cast = data.actors ? data.actors.split(",").map(a => a.trim()).slice(0, 5) : [];
                const genres = data.genre ? data.genre.split(",").map(g => g.trim()) : [];
                applyMovieDetails({
                    mpaa_rating: data.mpa_rating || data.mpaa_rating,
                    director: data.director,
                    cast,
                    genres
                });
            } else {
                // Fallback to API if watched_list has no metadata
                loadMovieDetails(data.movie_id);
            }
        } catch (err) {
            console.error("Error loading watched entry:", err);
        }
    };

    // ---- Event Listeners ----

    // Rating slider
    ratingSlider.addEventListener("input", (e) => {
        ratingDisplay.textContent = parseFloat(e.target.value).toFixed(1);
    });

    // Date button
    dateBtn.addEventListener("click", () => {
        datePicker.showPicker();
    });
    datePicker.addEventListener("change", () => {
        if (datePicker.value) {
            const [y, m, d] = datePicker.value.split("-");
            dateBtn.textContent = `${m}/${d}/${y}`;
            dateBtn.classList.add("active");
        } else {
            dateBtn.textContent = "Date";
            dateBtn.classList.remove("active");
        }
    });

    // Theater toggle
    theaterBtn.addEventListener("click", () => {
        const isActive = theaterBtn.classList.toggle("active");
        inTheaterValue = isActive ? 1 : 0;
    });

    // Close
    closeBtn.addEventListener("click", () => closeModal(null));
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(null);
    });

    // Submit
    submitBtn.addEventListener("click", async () => {
        const rating = parseFloat(ratingSlider.value);
        if (isNaN(rating) || rating < 0 || rating > 10) {
            alert("Please enter a rating between 0.0 and 10.0");
            return;
        }
        const roundedRating = Math.round(rating * 10) / 10;
        const review = reviewEl.value;
        const watched_date = datePicker.value || "";

        if (mode === "rate") {
            try {
                const res = await fetch(`/api/add-movie/${currentMovieId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: roundedRating, review, watched_date, in_theater: inTheaterValue })
                });
                const data = await res.json();
                if (data.success) {
                    // Upload pending memory image if one was selected
                    if (pendingMemoryFile && data.watched_id) {
                        const formData = new FormData();
                        formData.append("file", pendingMemoryFile);
                        try {
                            await fetch(`/api/upload/memory/${data.watched_id}`, {
                                method: "POST",
                                body: formData
                            });
                        } catch (memErr) {
                            console.error("Error uploading memory:", memErr);
                        }
                    }
                    closeModal({ action: "added", watched_id: data.watched_id });
                }
            } catch (err) {
                console.error("Error adding movie:", err);
            }
        } else if (mode === "update") {
            try {
                const res = await fetch(`/api/update-movie/${currentWatchedId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: roundedRating, review, watched_date, in_theater: inTheaterValue })
                });
                const data = await res.json();
                if (data.success) {
                    closeModal({ action: "updated", watched_id: currentWatchedId });
                }
            } catch (err) {
                console.error("Error updating movie:", err);
            }
        }
    });

    // Watchlist
    watchlistBtn.addEventListener("click", async () => {
        if (mode === "rate") {
            const isInWatchlist = watchlistBtn.dataset.inWatchlist === "true";
            if (isInWatchlist) {
                try {
                    const res = await fetch(`/api/watchlist/${currentMovieId}`, { method: "DELETE" });
                    if (res.ok) closeModal({ action: "watchlist_removed" });
                } catch (err) { console.error(err); }
            } else {
                try {
                    const res = await fetch("/api/watchlist/add", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ movie_id: currentMovieId, priority_01: 0 })
                    });
                    if (res.ok) closeModal({ action: "watchlist_added" });
                } catch (err) { console.error(err); }
            }
        } else if (mode === "update") {
            const confirmed = await showConfirm("Are you sure? This will delete your entry and review and move the movie to your watchlist.");
            if (!confirmed) return;
            try {
                const res = await fetch("/api/watchlist/move-from-watched", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ watched_id: currentWatchedId, movie_id: currentMovieId })
                });
                if (res.ok) closeModal({ action: "moved_to_watchlist" });
            } catch (err) { console.error(err); }
        }
    });

    // Delete
    deleteBtn.addEventListener("click", async () => {
        const confirmed = await showConfirm("Are you sure? This will permanently delete your entry and review.");
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/delete-movie/${currentWatchedId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (data.success) closeModal({ action: "deleted", watched_id: currentWatchedId });
        } catch (err) { console.error(err); }
    });

    // Favorite
    favoriteBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/current-favorite");
            const data = await res.json();
            if (data.title) {
                favoriteMessage.textContent = `"${data.title}" will no longer be set as your favorite movie. Are you sure you want to replace it?`;
            } else {
                favoriteMessage.textContent = "Are you sure you want to set this as your favorite movie?";
            }
        } catch (err) {
            favoriteMessage.textContent = "Are you sure you want to set this as your favorite movie?";
        }

        favoriteOverlay.classList.add("active");
    });

    favoriteYes.addEventListener("click", async () => {
        favoriteOverlay.classList.remove("active");
        try {
            const res = await fetch("/api/set-favorite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ watched_id: currentWatchedId })
            });
            if (res.ok) closeModal({ action: "set_favorite" });
        } catch (err) { console.error(err); }
    });

    favoriteNo.addEventListener("click", () => {
        favoriteOverlay.classList.remove("active");
    });

    favoriteOverlay.addEventListener("click", (e) => {
        if (e.target === favoriteOverlay) favoriteOverlay.classList.remove("active");
    });

    // Memory
    memoryBtn.addEventListener("click", () => {
        if (currentMemory) {
            // Existing memory image (update mode only)
            memoryTitle.textContent = "Memory";
            memoryBody.innerHTML = `
                <img src="/uploads/memory_images/${currentMemory}" class="mm-memory-image" alt="Memory" />
                <button type="button" class="mm-memory-delete-btn" id="mm-memory-delete-btn">Remove Memory</button>
            `;
            document.getElementById("mm-memory-delete-btn").addEventListener("click", async () => {
                try {
                    const res = await fetch(`/api/upload/memory/${currentWatchedId}`, { method: "DELETE" });
                    if (res.ok) {
                        currentMemory = null;
                        memoryOverlay.classList.remove("active");
                    }
                } catch (err) { console.error(err); }
            });
        } else if (pendingMemoryFile) {
            // Rate mode — file already selected but not yet uploaded
            const previewUrl = URL.createObjectURL(pendingMemoryFile);
            memoryTitle.textContent = "Memory";
            memoryBody.innerHTML = `
                <img src="${previewUrl}" class="mm-memory-image" alt="Memory Preview" />
                <button type="button" class="mm-memory-delete-btn" id="mm-memory-delete-btn">Remove Memory</button>
            `;
            document.getElementById("mm-memory-delete-btn").addEventListener("click", () => {
                pendingMemoryFile = null;
                memoryOverlay.classList.remove("active");
            });
        } else {
            // No memory — show upload dropzone
            memoryTitle.textContent = "Add Memory";
            memoryBody.innerHTML = `
                <div class="mm-memory-dropzone" id="mm-memory-dropzone">
                    <p>Drop an image here or click to select</p>
                    <input type="file" id="mm-memory-file-input" accept="image/*" style="display:none;" />
                </div>
            `;
            const dropzone = document.getElementById("mm-memory-dropzone");
            const fileInput = document.getElementById("mm-memory-file-input");

            dropzone.addEventListener("click", () => fileInput.click());
            dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
            dropzone.addEventListener("dragleave", () => { dropzone.classList.remove("dragover"); });
            dropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropzone.classList.remove("dragover");
                if (e.dataTransfer.files.length > 0) handleMemoryFile(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener("change", () => {
                if (fileInput.files.length > 0) handleMemoryFile(fileInput.files[0]);
            });
        }
        memoryOverlay.classList.add("active");
    });

    function handleMemoryFile(file) {
        if (mode === "rate") {
            // Store locally — will upload after movie is added
            pendingMemoryFile = file;
            memoryOverlay.classList.remove("active");
        } else {
            uploadMemory(file);
        }
    }

    async function uploadMemory(file) {
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch(`/api/upload/memory/${currentWatchedId}`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                currentMemory = data.filename;
                memoryOverlay.classList.remove("active");
            }
        } catch (err) { console.error(err); }
    }

    memoryClose.addEventListener("click", () => {
        memoryOverlay.classList.remove("active");
    });
    memoryOverlay.addEventListener("click", (e) => {
        if (e.target === memoryOverlay) memoryOverlay.classList.remove("active");
    });
})();
