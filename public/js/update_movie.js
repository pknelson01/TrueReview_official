const watchedId = window.location.pathname.split("/").pop();
let currentMemory = null;

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

    // Pre-fill watched_date
    if (data.watched_date) {
        const dateStr = new Date(data.watched_date).toISOString().split("T")[0];
        document.getElementById("watched-date").value = dateStr;
        const [y, m, d] = dateStr.split("-");
        document.getElementById("date-btn").textContent = `${m}/${d}/${y}`;
        document.getElementById("date-btn").classList.add("active");
    }

    // Pre-fill in_theater
    if (data.in_theater === 1) {
        document.getElementById("theater-btn").classList.add("active");
        document.getElementById("in-theater").value = "1";
    }

    // Store memory filename
    currentMemory = data.memory || null;
    if (currentMemory) {
        document.getElementById("memory-btn").classList.add("active");
    }

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

// Date button — clicking opens native date picker overlay
const dateBtn = document.getElementById("date-btn");
const datePicker = document.getElementById("watched-date");
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

// In-Theaters toggle
const theaterBtn = document.getElementById("theater-btn");
const theaterInput = document.getElementById("in-theater");
theaterBtn.addEventListener("click", () => {
    const isActive = theaterBtn.classList.toggle("active");
    theaterInput.value = isActive ? "1" : "0";
});

// Memory button — open modal
const memoryBtn = document.getElementById("memory-btn");
const memoryModal = document.getElementById("memory-modal");
const memoryModalBody = document.getElementById("memory-modal-body");
const memoryModalTitle = document.getElementById("memory-modal-title");
const memoryModalClose = document.getElementById("memory-modal-close");

memoryBtn.addEventListener("click", () => {
    if (currentMemory) {
        // Show existing image
        memoryModalTitle.textContent = "Memory";
        memoryModalBody.innerHTML = `
            <img src="/uploads/memory_images/${currentMemory}" class="memory-image" alt="Memory" />
            <button type="button" class="memory-delete-btn" id="memory-delete-btn">Remove Memory</button>
        `;
        document.getElementById("memory-delete-btn").addEventListener("click", async () => {
            try {
                const res = await fetch(`/api/upload/memory/${watchedId}`, { method: "DELETE" });
                if (res.ok) {
                    currentMemory = null;
                    document.getElementById("memory-btn").classList.remove("active");
                    memoryModal.classList.remove("active");
                }
            } catch (err) {
                console.error("Error deleting memory:", err);
            }
        });
    } else {
        // Show upload dropzone
        memoryModalTitle.textContent = "Add Memory";
        memoryModalBody.innerHTML = `
            <div class="memory-dropzone" id="memory-dropzone">
                <p>Drop an image here or click to select</p>
                <input type="file" id="memory-file-input" accept="image/*" style="display:none;" />
            </div>
        `;
        const dropzone = document.getElementById("memory-dropzone");
        const fileInput = document.getElementById("memory-file-input");

        dropzone.addEventListener("click", () => fileInput.click());

        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });
        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("dragover");
        });
        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.classList.remove("dragover");
            if (e.dataTransfer.files.length > 0) {
                uploadMemoryFile(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener("change", () => {
            if (fileInput.files.length > 0) {
                uploadMemoryFile(fileInput.files[0]);
            }
        });
    }
    memoryModal.classList.add("active");
});

async function uploadMemoryFile(file) {
    // Pre-check image before uploading
    const checkForm = new FormData();
    checkForm.append("file", file);
    try {
        const checkRes = await fetch("/api/check-image", { method: "POST", body: checkForm });
        const checkData = await checkRes.json();
        if (!checkData.safe) {
            const dropzone = document.getElementById("memory-dropzone");
            if (dropzone) {
                dropzone.innerHTML = `<p style="color:#ff6b6b;">Image flagged as inappropriate. Please choose another image.</p>`;
            }
            return;
        }
    } catch (err) {
        console.error("Image check failed:", err);
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(`/api/upload/memory/${watchedId}`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (res.ok && data.success) {
            currentMemory = data.filename;
            document.getElementById("memory-btn").classList.add("active");
            memoryModal.classList.remove("active");
            if (typeof showToast === 'function') showToast("Image uploaded");
        } else {
            currentMemory = null;
            document.getElementById("memory-btn").classList.remove("active");
            memoryModal.classList.remove("active");
        }
    } catch (err) {
        console.error("Error uploading memory:", err);
    }
}

// Close memory modal
memoryModalClose.addEventListener("click", () => {
    memoryModal.classList.remove("active");
});
memoryModal.addEventListener("click", (e) => {
    if (e.target === memoryModal) {
        memoryModal.classList.remove("active");
    }
});

loadWatchedEntry();
