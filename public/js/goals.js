// ============================================================
// GOALS PAGE — goals.js
// ============================================================

// Mobile menu toggle
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
}

// Update dashboard tab with display_name
async function updateDashboardTab() {
    try {
        const res = await fetch("/api/user/username");
        const data = await res.json();
        document.getElementById("dashboard-tab").textContent = data.display_name.toUpperCase();
        const mobileDashTab = document.getElementById("mobile-dashboard-tab");
        if (mobileDashTab) mobileDashTab.textContent = data.display_name;
    } catch (err) {
        console.error("Error loading display name:", err);
    }
}
updateDashboardTab();

// ============================================================
// STATE
// ============================================================
let currentSearchType = 'actor';
let existingGoals = [];
let searchDebounce = null;

// ============================================================
// ELEMENTS
// ============================================================
const addGoalBtn = document.getElementById('add-goal-btn');
const addGoalPanel = document.getElementById('add-goal-panel');
const panelClose = document.getElementById('panel-close');
const searchInput = document.getElementById('goal-search-input');
const searchResults = document.getElementById('search-results');
const typeTabs = document.querySelectorAll('.type-tab');
const goalsLoading = document.getElementById('goals-loading');
const goalsEmpty = document.getElementById('goals-empty');
const goalsGrid = document.getElementById('goals-grid');

// Modal elements
const goalModal = document.getElementById('goal-detail-modal');
const goalModalTitle = document.getElementById('goal-modal-title');
const goalModalProgress = document.getElementById('goal-modal-progress');
const goalModalProgressText = document.getElementById('goal-modal-progress-text');
const goalModalBody = document.getElementById('goal-modal-body');
const goalModalClose = document.getElementById('goal-modal-close');
const goalAddAllBtn = document.getElementById('goal-add-all-btn');

// Goal image elements
const goalImageBtn = document.getElementById('goal-image-btn');
const goalImageOverlay = document.getElementById('goal-image-overlay');
const goalImageOverlayBody = document.getElementById('goal-image-overlay-body');
const goalImageClose = document.getElementById('goal-image-close');

// Custom goal elements
const standardSearch = document.getElementById('standard-search');
const customSearch = document.getElementById('custom-search');
const customGoalName = document.getElementById('custom-goal-name');
const customCreateBtn = document.getElementById('custom-create-btn');
const modalCustomSearch = document.getElementById('modal-custom-search');
const modalMovieSearch = document.getElementById('modal-movie-search');
const modalSearchResults = document.getElementById('modal-search-results');

// ============================================================
// ADD GOAL PANEL TOGGLE
// ============================================================
addGoalBtn.addEventListener('click', () => {
    const isOpen = addGoalPanel.style.display !== 'none';
    addGoalPanel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
        searchInput.value = '';
        searchResults.innerHTML = '';
        customGoalName.value = '';
        if (currentSearchType === 'custom') {
            customGoalName.focus();
        } else {
            searchInput.focus();
        }
    }
});

panelClose.addEventListener('click', () => {
    addGoalPanel.style.display = 'none';
});

// ============================================================
// TYPE TABS
// ============================================================
typeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        typeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSearchType = tab.dataset.type;

        if (currentSearchType === 'custom') {
            standardSearch.style.display = 'none';
            customSearch.style.display = 'block';
            customGoalName.value = '';
            customGoalName.focus();
        } else {
            standardSearch.style.display = 'block';
            customSearch.style.display = 'none';

            const placeholders = {
                actor: 'Search for an actor...',
                director: 'Search for a director...',
                franchise: 'Search for a franchise / collection...',
            };
            searchInput.placeholder = placeholders[currentSearchType];
            searchInput.value = '';
            searchResults.innerHTML = '';
            searchInput.focus();
        }
    });
});

// ============================================================
// CUSTOM GOAL CREATION
// ============================================================
customCreateBtn.addEventListener('click', async () => {
    const name = customGoalName.value.trim();
    if (!name) {
        customGoalName.focus();
        return;
    }

    customCreateBtn.textContent = 'CREATING...';
    customCreateBtn.disabled = true;

    try {
        const res = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goal_type: 'custom',
                tmdb_id: Math.floor(Math.random() * 2000000000), // unique placeholder since custom goals don't have a TMDb entity
                goal_name: name,
            }),
        });

        if (res.ok) {
            customGoalName.value = '';
            addGoalPanel.style.display = 'none';
            const newGoal = await res.json();
            await loadGoals();
            // Open the new goal right away so user can add movies
            openGoalModal(newGoal.goal_id);
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to create goal');
        }
    } catch (err) {
        console.error('Custom goal create error:', err);
    }

    customCreateBtn.textContent = 'CREATE GOAL';
    customCreateBtn.disabled = false;
});

// ============================================================
// SEARCH
// ============================================================
searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = searchInput.value.trim();
    if (!q) {
        searchResults.innerHTML = '';
        return;
    }
    searchDebounce = setTimeout(() => runSearch(q), 350);
});

async function runSearch(q) {
    const type = currentSearchType === 'franchise' ? 'franchise' : 'person';
    try {
        const res = await fetch(`/api/goals/search?q=${encodeURIComponent(q)}&type=${type}`);
        const results = await res.json();

        // Filter by department for person searches
        let filtered = results;
        if (currentSearchType === 'actor') {
            filtered = results.filter(r => r.department === 'Acting');
        } else if (currentSearchType === 'director') {
            filtered = results.filter(r => r.department === 'Directing');
        }

        if (filtered.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
            return;
        }

        searchResults.innerHTML = filtered.map(r => {
            const imgSrc = r.profile_path || r.poster_path;
            const imgClass = currentSearchType === 'franchise' ? '' : 'person';
            const goalType = r.source === 'keyword' ? 'keyword' : currentSearchType;
            const alreadyAdded = existingGoals.some(g => g.goal_type === goalType && g.tmdb_id === r.tmdb_id);
            const detailText = r.source === 'keyword' ? 'Keyword — all related films' : (currentSearchType === 'franchise' ? 'Collection' : r.department);
            const icon = r.source === 'keyword' ? 'fa-tags' : (currentSearchType === 'franchise' ? 'fa-film' : 'fa-user');

            return `
                <div class="search-result-item">
                    ${imgSrc
                        ? `<img class="search-result-img ${imgClass}" src="${imgSrc}" alt="">`
                        : `<div class="search-result-img ${imgClass}" style="display:flex;align-items:center;justify-content:center;color:var(--steel);font-size:16px;"><i class="fas ${icon}"></i></div>`
                    }
                    <div class="search-result-info">
                        <div class="search-result-name">${r.name}</div>
                        <div class="search-result-detail">${detailText}</div>
                    </div>
                    <button class="search-result-add ${alreadyAdded ? 'added' : ''}"
                        data-tmdb-id="${r.tmdb_id}"
                        data-name="${r.name}"
                        data-profile="${r.profile_path || ''}"
                        data-poster="${r.poster_path || ''}"
                        data-source="${r.source || ''}"
                        ${alreadyAdded ? 'disabled' : ''}>
                        ${alreadyAdded ? 'ADDED' : 'ADD'}
                    </button>
                </div>
            `;
        }).join('');

        // Attach add handlers
        searchResults.querySelectorAll('.search-result-add:not(.added)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                addGoal(btn);
            });
        });

    } catch (err) {
        console.error('Search error:', err);
        searchResults.innerHTML = '<div class="search-no-results">Search failed</div>';
    }
}

// ============================================================
// ADD GOAL
// ============================================================
async function addGoal(btn) {
    const tmdb_id = parseInt(btn.dataset.tmdbId);
    const goal_name = btn.dataset.name;
    const profile_path = btn.dataset.profile || null;
    const poster_path = btn.dataset.poster || null;
    const goalType = btn.dataset.source === 'keyword' ? 'keyword' : currentSearchType;

    btn.textContent = '...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goal_type: goalType,
                tmdb_id,
                goal_name,
                profile_path,
                poster_path,
            }),
        });

        if (res.ok) {
            btn.textContent = 'ADDED';
            btn.classList.add('added');
            loadGoals();
        } else {
            const data = await res.json();
            if (data.error === 'Goal already exists') {
                btn.textContent = 'ADDED';
                btn.classList.add('added');
            } else if (data.error === 'Maximum of 10 goals reached') {
                btn.textContent = 'LIMIT';
                alert('You can have a maximum of 10 goals.');
            } else {
                btn.textContent = 'ADD';
                btn.disabled = false;
            }
        }
    } catch (err) {
        console.error('Add goal error:', err);
        btn.textContent = 'ADD';
        btn.disabled = false;
    }
}

// ============================================================
// LOAD GOALS
// ============================================================
async function loadGoals() {
    try {
        const res = await fetch('/api/goals');
        existingGoals = await res.json();

        goalsLoading.style.display = 'none';

        if (existingGoals.length === 0) {
            goalsEmpty.style.display = 'block';
            goalsGrid.style.display = 'none';
            return;
        }

        goalsEmpty.style.display = 'none';
        goalsGrid.style.display = 'grid';

        // Fetch progress for each goal in parallel
        const progressPromises = existingGoals.map(g =>
            fetch(`/api/goals/${g.goal_id}/progress`).then(r => r.json()).catch(() => null)
        );
        const progressData = await Promise.all(progressPromises);

        goalsGrid.innerHTML = existingGoals.map((goal, i) => {
            const progress = progressData[i];
            const total = progress ? progress.total : 0;
            const watched = progress ? progress.watched : 0;
            const percent = progress ? progress.percent : 0;
            const isComplete = percent === 100 && total > 0;

            const imgSrc = goal.custom_image ? `/uploads/goal_images/${goal.custom_image}` : (goal.profile_path || goal.poster_path);
            const isFranchiseType = goal.goal_type === 'franchise' || goal.goal_type === 'keyword';
            const imgClass = (isFranchiseType || goal.custom_image) ? '' : 'person';
            const icon = goal.goal_type === 'keyword' ? 'fa-tags' : (isFranchiseType ? 'fa-film' : 'fa-user');
            const typeLabel = goal.goal_type === 'keyword' ? 'franchise' : goal.goal_type;

            return `
                <div class="goal-card ${isComplete ? 'complete' : ''}" data-goal-id="${goal.goal_id}">
                    <div class="goal-card-top">
                        ${imgSrc
                            ? `<img class="goal-card-img ${imgClass}" src="${imgSrc}" alt="">`
                            : `<div class="goal-card-img ${imgClass}" style="display:flex;align-items:center;justify-content:center;color:var(--steel);font-size:20px;"><i class="fas ${icon}"></i></div>`
                        }
                        <div class="goal-card-info">
                            <div class="goal-card-name">${goal.goal_name}</div>
                            <div class="goal-card-type">${typeLabel}</div>
                            <div class="goal-card-stats"><span class="watched-count">${watched}</span> / ${total} watched (${percent}%)</div>
                        </div>
                        <button class="goal-card-delete" data-goal-id="${goal.goal_id}" title="Remove goal"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill ${isComplete ? 'complete' : ''}" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach click handlers for cards
        goalsGrid.querySelectorAll('.goal-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.goal-card-delete')) return;
                openGoalModal(parseInt(card.dataset.goalId));
            });
        });

        // Attach delete handlers
        goalsGrid.querySelectorAll('.goal-card-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteGoal(parseInt(btn.dataset.goalId));
            });
        });

    } catch (err) {
        console.error('Load goals error:', err);
        goalsLoading.textContent = 'Failed to load goals.';
    }
}

// ============================================================
// DELETE GOAL
// ============================================================
async function deleteGoal(goalId) {
    if (!confirm('Remove this goal?')) return;

    try {
        await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
        loadGoals();
    } catch (err) {
        console.error('Delete goal error:', err);
    }
}

// ============================================================
// GOAL DETAIL MODAL
// ============================================================
let currentModalGoalId = null;
let currentModalIsCustom = false;
let modalSearchDebounce = null;

async function openGoalModal(goalId) {
    goalModal.classList.add('active');
    goalModalTitle.textContent = 'Loading...';
    goalModalProgressText.textContent = '';
    goalModalProgress.style.width = '0%';
    goalModalProgress.className = 'modal-progress-fill';
    goalAddAllBtn.style.display = 'none';
    goalImageBtn.style.display = 'none';
    goalImageOverlay.classList.remove('active');
    modalCustomSearch.style.display = 'none';
    modalMovieSearch.value = '';
    modalSearchResults.innerHTML = '';
    goalModalBody.innerHTML = '<div class="modal-loading">Loading movies...</div>';
    currentModalGoalId = goalId;

    try {
        const res = await fetch(`/api/goals/${goalId}/progress`);
        const data = await res.json();

        currentModalIsCustom = data.goal.goal_type === 'custom';
        goalModalTitle.textContent = data.goal.goal_name;
        goalModalProgressText.textContent = `${data.watched} / ${data.total} watched (${data.percent}%)`;
        goalModalProgress.style.width = data.percent + '%';
        if (data.percent === 100 && data.total > 0) {
            goalModalProgress.classList.add('complete');
        }

        // Show movie search and image upload for custom goals
        if (currentModalIsCustom) {
            modalCustomSearch.style.display = 'block';
            goalImageBtn.style.display = '';
            if (data.goal.custom_image) {
                goalImageBtn.innerHTML = 'GOAL IMAGE';
                goalImageBtn.classList.add('has-image');
            } else {
                goalImageBtn.innerHTML = '<i class="fas fa-camera"></i>';
                goalImageBtn.classList.remove('has-image');
            }
        }

        // Store goalId so we can refresh after modal close
        goalModalBody.dataset.goalId = goalId;

        if (data.movies.length === 0) {
            goalModalBody.innerHTML = currentModalIsCustom
                ? '<div class="modal-loading">No movies yet — search above to add movies</div>'
                : '<div class="modal-loading">No movies found</div>';
            return;
        }

        goalModalBody.innerHTML = data.movies.map(m => {
            const year = m.release_date ? new Date(m.release_date).getFullYear() : '—';
            const statusText = m.is_watched
                ? (m.user_rating !== null ? m.user_rating + '/10' : 'WATCHED')
                : 'NOT WATCHED';
            const statusClass = m.is_watched ? 'watched' : 'not-watched';

            return `
                <div class="modal-movie clickable-movie"
                     data-movie-id="${m.movie_id}"
                     data-watched-id="${m.watched_id || ''}"
                     data-is-watched="${m.is_watched}">
                    <img class="modal-movie-poster" src="${m.poster_full_url}" alt="">
                    <div class="modal-movie-info">
                        <div class="modal-movie-title">${m.movie_title}</div>
                        <div class="modal-movie-detail">${year}${m.character ? ' — ' + m.character : ''}</div>
                    </div>
                    <div class="modal-movie-status ${statusClass}">${statusText}</div>
                    ${currentModalIsCustom ? `<button class="modal-movie-remove" data-movie-id="${m.movie_id}" title="Remove from goal"><i class="fas fa-times"></i></button>` : ''}
                </div>
            `;
        }).join('');

        // Show "Add All to Watchlist" if there are unwatched, non-watchlisted movies
        const unwatchedIds = data.movies
            .filter(m => !m.is_watched && !m.in_watchlist)
            .map(m => m.movie_id);
        if (unwatchedIds.length > 0) {
            goalAddAllBtn.style.display = '';
            goalAddAllBtn.disabled = false;
            goalAddAllBtn.textContent = `ADD ALL TO WATCHLIST (${unwatchedIds.length})`;
            goalAddAllBtn.dataset.movieIds = JSON.stringify(unwatchedIds);
        } else {
            goalAddAllBtn.style.display = 'none';
        }

        // Click a movie row to open the shared rate/update modal
        goalModalBody.querySelectorAll('.clickable-movie').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.modal-movie-remove')) return;
                const isWatched = row.dataset.isWatched === 'true';
                if (isWatched) {
                    openUpdateModal(parseInt(row.dataset.watchedId));
                } else {
                    openRateModal(parseInt(row.dataset.movieId));
                }
            });
        });

        // Remove buttons for custom goals
        if (currentModalIsCustom) {
            goalModalBody.querySelectorAll('.modal-movie-remove').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const movieId = btn.dataset.movieId;
                    try {
                        await fetch(`/api/goals/${goalId}/movies/${movieId}`, { method: 'DELETE' });
                        openGoalModal(goalId);
                        loadGoals();
                    } catch (err) {
                        console.error('Remove movie error:', err);
                    }
                });
            });
        }

    } catch (err) {
        console.error('Modal error:', err);
        goalModalBody.innerHTML = '<div class="modal-loading">Failed to load</div>';
    }
}

goalModalClose.addEventListener('click', () => {
    goalModal.classList.remove('active');
});

goalModal.addEventListener('click', (e) => {
    if (e.target === goalModal) goalModal.classList.remove('active');
});

// ============================================================
// CUSTOM GOAL — IMAGE UPLOAD
// ============================================================
goalImageBtn.addEventListener('click', () => {
    const goal = existingGoals.find(g => g.goal_id === currentModalGoalId);
    const currentImage = goal?.custom_image;

    if (currentImage) {
        goalImageOverlayBody.innerHTML = `
            <img src="/uploads/goal_images/${currentImage}" class="goal-image-preview" alt="Goal Image" />
            <button type="button" class="goal-image-remove-btn" id="goal-image-remove-btn">Remove Image</button>
        `;
        document.getElementById('goal-image-remove-btn').addEventListener('click', async () => {
            try {
                await fetch(`/api/goals/${currentModalGoalId}/image`, { method: 'DELETE' });
                goal.custom_image = null;
                goalImageBtn.innerHTML = '<i class="fas fa-camera"></i>';
                goalImageBtn.classList.remove('has-image');
                goalImageOverlay.classList.remove('active');
                loadGoals();
            } catch (err) { console.error(err); }
        });
    } else {
        goalImageOverlayBody.innerHTML = `
            <div class="goal-image-dropzone" id="goal-image-dropzone">
                <p>Drop an image here or click to select</p>
                <input type="file" id="goal-image-file-input" accept="image/*" style="display:none;" />
            </div>
        `;
        const dropzone = document.getElementById('goal-image-dropzone');
        const fileInput = document.getElementById('goal-image-file-input');

        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) uploadGoalImage(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) uploadGoalImage(fileInput.files[0]);
        });
    }
    goalImageOverlay.classList.add('active');
});

async function uploadGoalImage(file) {
    const dropzone = document.getElementById('goal-image-dropzone');

    // Pre-check NSFW
    const checkForm = new FormData();
    checkForm.append('file', file);
    try {
        const checkRes = await fetch('/api/check-image', { method: 'POST', body: checkForm });
        const checkData = await checkRes.json();
        if (!checkData.safe) {
            if (dropzone) {
                dropzone.innerHTML = `<p style="color:#ff6b6b;">Image flagged as inappropriate. Please choose another image.</p>`;
            }
            return;
        }
    } catch (err) { console.error('Image check failed:', err); }

    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`/api/goals/${currentModalGoalId}/image`, { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.success) {
            const goal = existingGoals.find(g => g.goal_id === currentModalGoalId);
            if (goal) goal.custom_image = data.filename;
            goalImageBtn.innerHTML = 'GOAL IMAGE';
            goalImageBtn.classList.add('has-image');
            goalImageOverlay.classList.remove('active');
            showToast("Image uploaded");
            loadGoals();
        }
    } catch (err) { console.error('Goal image upload error:', err); }
}

goalImageClose.addEventListener('click', () => {
    goalImageOverlay.classList.remove('active');
});

// ============================================================
// CUSTOM GOAL — MOVIE SEARCH IN MODAL
// ============================================================
modalMovieSearch.addEventListener('input', () => {
    clearTimeout(modalSearchDebounce);
    const q = modalMovieSearch.value.trim();
    if (!q) {
        modalSearchResults.innerHTML = '';
        return;
    }
    modalSearchDebounce = setTimeout(() => runModalMovieSearch(q), 350);
});

async function runModalMovieSearch(q) {
    try {
        const res = await fetch(`/api/search-movies?q=${encodeURIComponent(q)}`);
        const movies = await res.json();

        if (movies.length === 0) {
            modalSearchResults.innerHTML = '<div class="search-no-results">No results found</div>';
            return;
        }

        modalSearchResults.innerHTML = movies.slice(0, 10).map(m => `
            <div class="search-result-item">
                <img class="search-result-img" src="${m.poster_full_url}" alt="">
                <div class="search-result-info">
                    <div class="search-result-name">${m.movie_title}</div>
                    <div class="search-result-detail">${m.releaseYear || ''}</div>
                </div>
                <button class="search-result-add" data-movie-id="${m.movie_id}">ADD</button>
            </div>
        `).join('');

        modalSearchResults.querySelectorAll('.search-result-add').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const movieId = btn.dataset.movieId;
                btn.textContent = '...';
                btn.disabled = true;
                try {
                    const addRes = await fetch(`/api/goals/${currentModalGoalId}/movies`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ movie_id: movieId }),
                    });
                    if (addRes.ok) {
                        btn.textContent = 'ADDED';
                        btn.classList.add('added');
                        // Refresh the modal movie list and goal cards
                        openGoalModal(currentModalGoalId);
                        loadGoals();
                    } else {
                        btn.textContent = 'ADD';
                        btn.disabled = false;
                    }
                } catch (err) {
                    console.error('Add movie to custom goal error:', err);
                    btn.textContent = 'ADD';
                    btn.disabled = false;
                }
            });
        });
    } catch (err) {
        console.error('Modal movie search error:', err);
        modalSearchResults.innerHTML = '<div class="search-no-results">Search failed</div>';
    }
}

// ============================================================
// ADD ALL TO WATCHLIST
// ============================================================
goalAddAllBtn.addEventListener('click', async () => {
    const movieIds = JSON.parse(goalAddAllBtn.dataset.movieIds || '[]');
    if (movieIds.length === 0) return;

    goalAddAllBtn.disabled = true;
    goalAddAllBtn.textContent = 'ADDING...';

    let added = 0;
    for (const movieId of movieIds) {
        try {
            const res = await fetch('/api/watchlist/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movie_id: movieId, priority_01: 0 }),
            });
            if (res.ok) added++;
        } catch (err) {
            console.error('Watchlist add error for', movieId, err);
        }
    }

    goalAddAllBtn.textContent = `ADDED ${added} TO WATCHLIST`;

    // Refresh the goal modal to show updated statuses
    const goalId = goalModalBody.dataset.goalId;
    if (goalId) {
        setTimeout(() => openGoalModal(parseInt(goalId)), 800);
    }
});

// ============================================================
// MOVIE MODAL CLOSE HANDLER — refresh goal progress after rate/update/delete
// ============================================================
window.onMovieModalClose = function (result) {
    if (result && (result.action === 'added' || result.action === 'updated' || result.action === 'deleted' || result.action === 'moved_to_watchlist' || result.action === 'watchlist_added' || result.action === 'watchlist_removed')) {
        // Refresh the currently open goal modal
        const goalId = goalModalBody.dataset.goalId;
        if (goalId) {
            openGoalModal(parseInt(goalId));
        }
        // Also refresh the goal cards
        loadGoals();
    }
};

// ============================================================
// INIT
// ============================================================
loadGoals();
