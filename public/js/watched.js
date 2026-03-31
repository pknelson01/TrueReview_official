console.log("Watched page loaded.");

let allMovies = [];
let currentFilter = sessionStorage.getItem('watchedFilter') || 'activity-desc';

async function loadWatched() {
    try {
        const res = await fetch("/api/watched");
        allMovies = await res.json();

        console.log("Watched movies data:", allMovies);

        // Assign entry numbers based on watched_id order (most recent = highest number)
        // Sort by watched_id to get chronological order
        const sortedByWatchedId = [...allMovies].sort((a, b) => a.watched_id - b.watched_id);

        // Assign entry numbers starting from 1 for oldest
        sortedByWatchedId.forEach((movie, index) => {
            movie.entryNumber = index + 1;
        });

        // Build genre submenu from loaded data
        buildGenreSubmenu();

        // Apply saved filter or default
        applyFilter(currentFilter);
    } catch (err) {
        console.error("Error loading watched movies:", err);
    }
}

function buildGenreSubmenu() {
    const genreSet = new Set();
    allMovies.forEach(movie => {
        if (movie.genre) {
            movie.genre.split(',').forEach(g => {
                const trimmed = g.trim();
                if (trimmed) genreSet.add(trimmed);
            });
        }
    });
    const genres = [...genreSet].sort();
    const submenu = document.getElementById('genre-submenu');
    if (submenu) {
        submenu.innerHTML = genres.map(g =>
            `<div class="filter-option" data-filter="genre-${g}">${g.toUpperCase()}</div>`
        ).join('');

        // Attach click handlers to new genre options
        submenu.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const filterType = option.getAttribute('data-filter');
                if (filterType) {
                    e.stopPropagation();
                    document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    applyFilter(filterType);
                    document.getElementById('filter-dropdown').classList.remove('active');
                }
            });
        });
    }
}

function getFilterDisplayName(filterType) {
    const names = {
        'activity-asc': 'Activity: First → Last',
        'rating-desc': 'Rating: Highest → Lowest',
        'rating-asc': 'Rating: Lowest → Highest',
        'year-desc': 'Year: Newest → Oldest',
        'year-asc': 'Year: Oldest → Newest',
        'alpha-asc': 'Alphabetical: A → Z',
        'alpha-desc': 'Alphabetical: Z → A',
        'theater-yes': 'In Theaters',
        'theater-no': 'Not In Theaters',
        'has-review': 'Has Written Review',
    };
    if (names[filterType]) return names[filterType];
    if (filterType.startsWith('rating-')) return `Rating: ${filterType.split('-')[1]}/10`;
    if (filterType.startsWith('genre-')) return `Genre: ${filterType.substring(6)}`;
    return filterType;
}

function applyFilter(filterType) {
    currentFilter = filterType;
    // Save filter to sessionStorage
    sessionStorage.setItem('watchedFilter', filterType);

    // Show/hide remove filter button and active filter label
    const isDefault = filterType === 'activity-desc';
    const removeBtn = document.getElementById('remove-filter-btn');
    const filterLabel = document.getElementById('active-filter-label');
    if (removeBtn) {
        removeBtn.style.display = isDefault ? 'none' : 'inline-block';
    }
    if (filterLabel) {
        if (isDefault) {
            filterLabel.style.display = 'none';
        } else {
            filterLabel.style.display = 'inline-block';
            filterLabel.textContent = getFilterDisplayName(filterType);
        }
    }

    let filteredMovies = [...allMovies];

    // Apply rating filters (ranges: 0/10 = 0.0-0.9, 1/10 = 1.0-1.9, 2/10 = 2.0-2.9, etc.)
    if (filterType.startsWith('rating-') && filterType !== 'rating-desc' && filterType !== 'rating-asc') {
        const ratingBase = parseInt(filterType.split('-')[1]);
        filteredMovies = filteredMovies.filter(movie => {
            const userRating = parseFloat(movie.user_rating);
            // For rating 10, match exactly 10.0
            if (ratingBase === 10) {
                return userRating === 10.0;
            }
            // For others, match range (e.g., 0/10 matches 0.0 to 0.9, 9/10 matches 9.0 to 9.9)
            return userRating >= ratingBase && userRating < (ratingBase + 1);
        });
    }

    // Apply review filter
    if (filterType === 'has-review') {
        filteredMovies = filteredMovies.filter(movie => movie.review && movie.review.trim() !== '');
    }

    // Apply genre filter
    if (filterType.startsWith('genre-')) {
        const genre = filterType.substring(6);
        filteredMovies = filteredMovies.filter(movie => {
            if (!movie.genre) return false;
            return movie.genre.split(',').map(g => g.trim()).includes(genre);
        });
    }

    // Apply theater filters
    if (filterType === 'theater-yes') {
        filteredMovies = filteredMovies.filter(movie => movie.in_theater === 1);
    } else if (filterType === 'theater-no') {
        filteredMovies = filteredMovies.filter(movie => movie.in_theater !== 1);
    }

    // Apply sorting
    switch(filterType) {
        case 'activity-desc':
            // Default order - already sorted by watched_id DESC from API
            break;
        case 'activity-asc':
            filteredMovies.sort((a, b) => a.watched_id - b.watched_id);
            break;
        case 'year-desc':
            filteredMovies.sort((a, b) => {
                const yearA = a.movie_release_date ? new Date(a.movie_release_date).getFullYear() : null;
                const yearB = b.movie_release_date ? new Date(b.movie_release_date).getFullYear() : null;

                // Put movies without release dates at the end
                if (yearA === null && yearB === null) return 0;
                if (yearA === null) return 1;
                if (yearB === null) return -1;

                return yearB - yearA;
            });
            break;
        case 'year-asc':
            filteredMovies.sort((a, b) => {
                const yearA = a.movie_release_date ? new Date(a.movie_release_date).getFullYear() : null;
                const yearB = b.movie_release_date ? new Date(b.movie_release_date).getFullYear() : null;

                // Put movies without release dates at the end
                if (yearA === null && yearB === null) return 0;
                if (yearA === null) return 1;
                if (yearB === null) return -1;

                return yearA - yearB;
            });
            break;
        case 'rating-desc':
            filteredMovies.sort((a, b) => (parseFloat(b.user_rating) || 0) - (parseFloat(a.user_rating) || 0));
            break;
        case 'rating-asc':
            filteredMovies.sort((a, b) => (parseFloat(a.user_rating) || 0) - (parseFloat(b.user_rating) || 0));
            break;
        case 'alpha-asc':
            filteredMovies.sort((a, b) => a.movie_title.localeCompare(b.movie_title));
            break;
        case 'alpha-desc':
            filteredMovies.sort((a, b) => b.movie_title.localeCompare(a.movie_title));
            break;
    }

    displayMovies(filteredMovies);
}

function displayMovies(movies) {
    const grid = document.querySelector(".movies-grid");
    grid.innerHTML = "";

    // Update total entries count
    document.getElementById("total-entries").textContent = `TOTAL ENTRIES: ${movies.length}`;

    if (movies.length === 0) {
        grid.innerHTML = `<p class="empty-msg">No movies found with this filter.</p>`;
        return;
    }

    movies.forEach((movie) => {
        const card = document.createElement("a");
        card.href = "#";
        card.className = "movie-card";
        card.addEventListener("click", (e) => {
            e.preventDefault();
            openUpdateModal(movie.watched_id);
        });

        // Use entryNumber assigned during load - stays consistent regardless of sort order
        const entryNumber = String(movie.entryNumber).padStart(3, '0');

        const theaterIcon = movie.in_theater === 1
            ? '/TrueReview_logo/noBG/Poster_color-removebg-preview.png'
            : '/TrueReview_logo/noBG/Poster_BW-removebg-preview.png';

        card.innerHTML = `
            <div class="poster-wrapper">
                <img
                    src="${movie.poster_full_url}"
                    alt="${movie.movie_title}"
                    class="movie-poster"
                    onerror="this.src='/TrueReview_logo/Poster_BW.png'"
                >
                <div class="watched-entry-number">ENTRY_${entryNumber}</div>
                <div class="hover-overlay">
                    <img class="theater-icon" src="${theaterIcon}" data-watched-id="${movie.watched_id}" alt="Theater toggle">
                    <div class="rating-display">${movie.user_rating}</div>
                    <div class="rating-label">RATING</div>
                </div>
            </div>
        `;

        // Theater toggle click handler
        const iconEl = card.querySelector('.theater-icon');
        iconEl.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                const res = await fetch(`/api/toggle-theater/${movie.watched_id}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    movie.in_theater = data.in_theater;
                    iconEl.src = data.in_theater === 1
                        ? '/TrueReview_logo/noBG/Poster_color-removebg-preview.png'
                        : '/TrueReview_logo/noBG/Poster_BW-removebg-preview.png';
                }
            } catch (err) {
                console.error('Failed to toggle theater:', err);
            }
        });

        grid.appendChild(card);
    });
}

// Filter dropdown toggle
document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.getElementById('filter-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.filter-option');

    // Set active class on the currently selected filter
    const savedFilter = sessionStorage.getItem('watchedFilter') || 'activity-desc';
    filterOptions.forEach(opt => {
        if (opt.getAttribute('data-filter') === savedFilter) {
            opt.classList.add('active');
        }
    });

    // Remove filter button
    const removeFilterBtn = document.getElementById('remove-filter-btn');
    if (removeFilterBtn) {
        removeFilterBtn.addEventListener('click', () => {
            filterOptions.forEach(opt => opt.classList.remove('active'));
            const defaultOpt = document.querySelector('[data-filter="activity-desc"]');
            if (defaultOpt) defaultOpt.classList.add('active');
            applyFilter('activity-desc');
        });
    }

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!filterDropdown.contains(e.target) && e.target !== filterBtn) {
            filterDropdown.classList.remove('active');
        }
    });

    // Handle filter selection
    filterOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const filterType = option.getAttribute('data-filter');

            // Only apply filter if this option has a data-filter attribute
            if (filterType) {
                e.stopPropagation();

                // Remove active class from all options
                filterOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to selected option
                option.classList.add('active');

                // Apply the filter
                applyFilter(filterType);

                // Close dropdown
                filterDropdown.classList.remove('active');
            }
            // If no data-filter (parent menu item), don't do anything - just show submenu
        });
    });
});

// Load immediately
loadWatched();
