// ============================================================================
//  SERVER.JS — TrueReview (HTML VERSION, NO EJS)
// ============================================================================

import express from "express";
import session from "express-session";
import path from "path";
import multer from "multer";
import pg from "pg";
import bcrypt from "bcrypt";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// ----------------------------------------------------
// Path Fix (ESM)
// ----------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------
// TMDb API Configuration
// ----------------------------------------------------
const TMDB_API_KEY = "9ca5e832beb93b3371c78a5fbc2280dc";

// ----------------------------------------------------
// Express Setup
// ----------------------------------------------------
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ----------------------------------------------------
// Static Files
// ----------------------------------------------------
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/views", express.static(path.join(__dirname, "views")));
app.use("/TrueReview_logo", express.static(path.join(__dirname, "TrueReview_logo")));

// ----------------------------------------------------
// Sessions
// ----------------------------------------------------
app.use(
  session({
    secret: "truereview_secret_123",
    resave: false,
    saveUninitialized: false,
  })
);

// ----------------------------------------------------
// PostgreSQL Setup
// ----------------------------------------------------
const db = new pg.Pool({
  connectionString:
    "postgresql://truereview_admin:TrNMyIlmWQqxTBtiownOkjAPiNGT6bK6@dpg-d4qhtuh5pdvs738o9d90-a.oregon-postgres.render.com/truereview",
  ssl: { rejectUnauthorized: false },
});

// ----------------------------------------------------
// Multer (File Uploads)
// ----------------------------------------------------
const profilePicStorage = multer.diskStorage({
  destination: "./uploads/profile_pictures",
  filename: (req, file, cb) => {
    cb(
      null,
      `pfp_${req.session.user_id}_${Date.now()}${path.extname(
        file.originalname
      )}`
    );
  },
});

const backgroundStorage = multer.diskStorage({
  destination: "./uploads/profile_backgrounds",
  filename: (req, file, cb) => {
    cb(
      null,
      `bg_${req.session.user_id}_${Date.now()}${path.extname(
        file.originalname
      )}`
    );
  },
});

const uploadProfilePic = multer({ storage: profilePicStorage });
const uploadBackground = multer({ storage: backgroundStorage });

// ----------------------------------------------------
// Auth Middleware
// ----------------------------------------------------
function requireLogin(req, res, next) {
  if (!req.session.user_id) return res.redirect("/login");
  next();
}

// ----------------------------------------------------
// Email Validation Function
// ----------------------------------------------------
function isValidEmail(email) {
  return email && email.includes("@") && email.includes(".com");
}

// ============================================================================
// ROUTES — HTML PAGES
// ============================================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views/signup.html"));
});

// SIGNUP - CREATE NEW ACCOUNT
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  // Validate email format
  if (!isValidEmail(email)) {
    return res.redirect("/signup?error=invalid_email");
  }

  try {
    // Check if email already exists
    const emailCheck = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.redirect("/signup?error=email_exists");
    }

    // Check if username already exists
    const usernameCheck = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    if (usernameCheck.rows.length > 0) {
      return res.redirect("/signup?error=username_exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const sql = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING user_id
    `;
    const result = await db.query(sql, [username, email, hashedPassword]);

    // Log the user in
    req.session.user_id = result.rows[0].user_id;
    res.redirect("/welcome");
  } catch (error) {
    console.error("Signup error:", error);
    res.redirect("/signup?error=server_error");
  }
});

// LOGIN USING EMAIL + PASSWORD
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  if (!isValidEmail(email)) {
    return res.redirect("/login?error=invalid_email");
  }

  // Query user by email only
  const sql = `
    SELECT * FROM users
    WHERE email = $1
  `;

  const result = await db.query(sql, [email]);

  if (result.rows.length === 0) {
    return res.redirect("/login?error=1");
  }

  const user = result.rows[0];

  // Compare hashed password
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return res.redirect("/login?error=1");
  }

  req.session.user_id = user.user_id;
  console.log(`[LOGIN] User logged in - ID: ${user.user_id}, Username: ${user.username}, Email: ${email}`);
  res.redirect("/welcome");
});

app.post("/logout", (req, res) => {
  const user_id = req.session.user_id;
  console.log(`[LOGOUT] User logged out - ID: ${user_id}`);
  req.session.destroy(() => res.redirect("/"));
});

app.get("/welcome", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/welcome.html"));
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/dashboard.html"));
});

app.get("/watched", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/watched.html"));
});

app.get("/edit-profile", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/edit_profile.html"));
});

app.get("/change-password", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/change_password.html"));
});

app.get("/rate-movie/:movie_id", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/rate_movie.html"));
});

app.get("/update-movie/:watched_id", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/update_movie.html"));
});

app.get("/quiz", (req, res) => {
  res.sendFile(path.join(__dirname, "views/quiz.html"));
});

// ============================================================================
// API — DASHBOARD DATA
// ============================================================================
// Get username only (for header tab) - doesn't update popcorn kernels session
app.get("/api/user/username", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;
  const result = await db.query("SELECT username FROM users WHERE user_id = $1", [user_id]);
  res.json({ username: result.rows[0].username });
});

app.get("/api/dashboard", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;

  const userQ = `
    SELECT user_id, username, title, bio, profile_picture, profile_background_photo, favorite_movie, popcorn_kernels
    FROM users WHERE user_id = $1
  `;
  const user = (await db.query(userQ, [user_id])).rows[0];

  // Calculate popcorn kernels delta
  const currentKernels = user.popcorn_kernels || 0;
  const lastViewedKernels = req.session.last_viewed_popcorn_kernels || currentKernels;
  const kernelsDelta = currentKernels - lastViewedKernels;

  // Update session with current value for next visit
  req.session.last_viewed_popcorn_kernels = currentKernels;

  const followQ = `
    SELECT
      (SELECT COUNT(*) FROM user_follows WHERE following_id = $1) AS follower_count,
      (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) AS following_count
  `;
  const follow = (await db.query(followQ, [user_id])).rows[0] || {
    follower_count: 0,
    following_count: 0,
  };

  // Calculate follower/following deltas
  const currentFollowerCount = parseInt(follow.follower_count) || 0;
  const currentFollowingCount = parseInt(follow.following_count) || 0;
  const lastViewedFollowerCount = req.session.last_viewed_follower_count || currentFollowerCount;
  const lastViewedFollowingCount = req.session.last_viewed_following_count || currentFollowingCount;
  const followerDelta = currentFollowerCount - lastViewedFollowerCount;
  const followingDelta = currentFollowingCount - lastViewedFollowingCount;

  // Only update session if not a polling request
  const updateSession = req.query.updateSession !== 'false';
  if (updateSession) {
    req.session.last_viewed_follower_count = currentFollowerCount;
    req.session.last_viewed_following_count = currentFollowingCount;
  }

  const statsQ = `
    SELECT COUNT(*) AS total_movies,
           ROUND(AVG(user_rating)::numeric, 2) AS avg_rating,
           COUNT(CASE WHEN user_rating::numeric = 10.0 THEN 1 END) AS ten_star_count
    FROM watched_list
    WHERE user_id = $1
  `;
  const stats = (await db.query(statsQ, [user_id])).rows[0];

  // Calculate 10/10 rating delta
  const currentTenStarCount = parseInt(stats.ten_star_count) || 0;
  const lastViewedTenStarCount = req.session.last_viewed_ten_star_count || currentTenStarCount;
  const tenStarDelta = currentTenStarCount - lastViewedTenStarCount;

  // Update session with current value for next visit
  req.session.last_viewed_ten_star_count = currentTenStarCount;

  const favQ = `
    SELECT wl.watched_id, wl.user_rating, am.movie_title, am.poster_full_url
    FROM users u
    JOIN watched_list wl ON u.user_id = wl.user_id
    JOIN all_movies am ON am.movie_id = wl.movie_id
    WHERE u.user_id = $1
    AND wl.movie_id = u.favorite_movie
  `;
  const fav = await db.query(favQ, [user_id]);
  const favorite = fav.rows.length ? fav.rows[0] : null;

  const lastQ = `
    SELECT wl.watched_id, wl.user_rating, am.movie_title, am.poster_full_url
    FROM watched_list wl
    JOIN all_movies am ON wl.movie_id = am.movie_id
    WHERE wl.user_id = $1
    ORDER BY wl.watched_id DESC LIMIT 1
  `;
  const last = (await db.query(lastQ, [user_id])).rows[0];

  res.json({
    user,
    follower_count: follow.follower_count,
    following_count: follow.following_count,
    follower_delta: followerDelta,
    following_delta: followingDelta,
    total_movies: stats.total_movies,
    avg_rating: stats.avg_rating,
    ten_star_count: stats.ten_star_count,
    ten_star_delta: tenStarDelta,
    favorite,
    last,
    popcorn_kernels_delta: kernelsDelta,
  });
});

// ============================================================================
// API — WATCHED LIST DATA
// ============================================================================
app.get("/api/watched", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;

  const sql = `
    SELECT wl.watched_id, wl.user_rating, am.movie_id, am.movie_title, am.poster_full_url, am.movie_release_date
    FROM watched_list wl
    JOIN all_movies am ON wl.movie_id = am.movie_id
    WHERE wl.user_id = $1
    ORDER BY wl.watched_id DESC
  `;

  const result = await db.query(sql, [user_id]);
  res.json(result.rows);
});

// Get single watched entry by ID
app.get("/api/watched/:watched_id", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;
  const watched_id = req.params.watched_id;

  const sql = `
    SELECT wl.watched_id, wl.user_rating, wl.review,
           am.movie_title, am.poster_full_url, am.movie_release_date
    FROM watched_list wl
    JOIN all_movies am ON wl.movie_id = am.movie_id
    WHERE wl.user_id = $1 AND wl.watched_id = $2
  `;

  const result = await db.query(sql, [user_id, watched_id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Watched entry not found" });
  }

  const data = result.rows[0];
  const releaseDate = new Date(data.movie_release_date);

  res.json({
    ...data,
    releaseYear: releaseDate.getFullYear()
  });
});

// ============================================================================
// ⭐⭐⭐ PROFILE IMAGE UPLOAD ROUTES
// ============================================================================

/* ---------------- PROFILE PICTURE ---------------- */
app.post("/api/upload/profile-picture", requireLogin, uploadProfilePic.single("file"), async (req, res) => {
  const user_id = req.session.user_id;
  const filename = req.file.filename;

  await db.query(
    `UPDATE users SET profile_picture = $1 WHERE user_id = $2`,
    [filename, user_id]
  );

  res.json({ success: true, filename });
});

/* ---------------- BACKGROUND PHOTO ---------------- */
app.post("/api/upload/background", requireLogin, uploadBackground.single("file"), async (req, res) => {
  const user_id = req.session.user_id;
  const filename = req.file.filename;

  await db.query(
    `UPDATE users SET profile_background_photo = $1 WHERE user_id = $2`,
    [filename, user_id]
  );

  res.json({ success: true, filename });
});

// ============================================================================
// PROFILE UPDATE
// ============================================================================

app.post("/update-profile", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;
  const { username, title, bio, favorite_movie } = req.body;

  const sql = `
    UPDATE users
    SET username = $1, title = $2, bio = $3, favorite_movie = $4
    WHERE user_id = $5
  `;

  await db.query(sql, [
    username,
    title || null,
    bio || null,
    favorite_movie || null,
    user_id
  ]);

  res.redirect("/dashboard");
});

// CHANGE PASSWORD
app.post("/change-password", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;
  const { currentPassword, newPassword } = req.body;

  try {
    // Get current user's hashed password
    const result = await db.query("SELECT password FROM users WHERE user_id = $1", [user_id]);

    if (result.rows.length === 0) {
      return res.redirect("/change-password?error=server_error");
    }

    const user = result.rows[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.redirect("/change-password?error=wrong_password");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await db.query(
      "UPDATE users SET password = $1 WHERE user_id = $2",
      [hashedPassword, user_id]
    );

    res.redirect("/change-password?success=1");
  } catch (error) {
    console.error("Change password error:", error);
    res.redirect("/change-password?error=server_error");
  }
});

// ============================================================================
// MOVIES
// ============================================================================

// Serve Add Movie Page
app.get("/add-movie", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/add_movies.html"));
});

// Serve Search Page (same as add movie)
app.get("/search", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/add_movies.html"));
});

// SEARCH MOVIES - Using TMDb API
app.get("/api/search-movies", requireLogin, async (req, res) => {
  const q = req.query.q || "";
  const user_id = req.session.user_id;

  // If query is empty, return empty results
  if (!q.trim()) {
    return res.json([]);
  }

  try {
    // Call TMDb search API
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&include_adult=false`;
    const response = await fetch(tmdbUrl);
    const data = await response.json();

    // Transform TMDb results to match our format
    // Filter out movies without posters and adult content
    const movies = data.results
      .filter((movie) => movie.poster_path && !movie.adult)
      .slice(0, 50)
      .map((movie) => {
        const releaseDate = movie.release_date ? new Date(movie.release_date) : null;
        const posterUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

        return {
          movie_id: movie.id,
          movie_title: movie.title,
          poster_full_url: posterUrl,
          movie_release_date: movie.release_date || null,
          releaseYear: releaseDate ? releaseDate.getFullYear() : null,
          isCurrentYear: releaseDate ? releaseDate.getFullYear() === new Date().getFullYear() : false,
          fullReleaseDate: releaseDate ? releaseDate.toLocaleDateString() : "Unknown",
        };
      });

    // Check which movies the user has already watched
    if (movies.length > 0) {
      const movieIds = movies.map(m => m.movie_id);
      const watchedQuery = `
        SELECT movie_id, watched_id
        FROM watched_list
        WHERE user_id = $1 AND movie_id = ANY($2)
      `;
      const watchedResult = await db.query(watchedQuery, [user_id, movieIds]);

      // Create a map with both number and string keys to handle type mismatches
      const watchedMap = new Map();
      watchedResult.rows.forEach(row => {
        watchedMap.set(row.movie_id, row.watched_id);
        watchedMap.set(String(row.movie_id), row.watched_id);
        watchedMap.set(Number(row.movie_id), row.watched_id);
      });

      // Add isWatched and watched_id properties to each movie
      movies.forEach(movie => {
        const watchedId = watchedMap.get(movie.movie_id) || watchedMap.get(String(movie.movie_id)) || watchedMap.get(Number(movie.movie_id));
        if (watchedId) {
          movie.isWatched = true;
          movie.watched_id = watchedId;
        } else {
          movie.isWatched = false;
        }
      });
    }

    res.json(movies);
  } catch (error) {
    console.error("TMDb search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET single movie details (for rate_movie page)
// Checks database first, if not found, fetches from TMDb and inserts
app.get("/api/movie/:movie_id", requireLogin, async (req, res) => {
  const movie_id = req.params.movie_id;

  try {
    // Check if movie exists in database
    const checkSql = `
      SELECT movie_id, movie_title, poster_full_url, movie_release_date
      FROM all_movies
      WHERE movie_id = $1
    `;
    const result = await db.query(checkSql, [movie_id]);

    let movie;

    if (result.rows.length === 0) {
      // Movie not in database, fetch from TMDb
      console.log(`Movie ${movie_id} not found in database, fetching from TMDb...`);

      const tmdbUrl = `https://api.themoviedb.org/3/movie/${movie_id}?api_key=${TMDB_API_KEY}`;
      const response = await fetch(tmdbUrl);

      if (!response.ok) {
        return res.status(404).json({ error: "Movie not found on TMDb" });
      }

      const tmdbMovie = await response.json();

      const posterUrl = tmdbMovie.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        : null;

      // Insert movie into database
      const insertSql = `
        INSERT INTO all_movies (movie_id, movie_title, poster_full_url, movie_release_date)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (movie_id) DO NOTHING
        RETURNING *
      `;

      await db.query(insertSql, [
        tmdbMovie.id,
        tmdbMovie.title,
        posterUrl,
        tmdbMovie.release_date || null
      ]);

      movie = {
        movie_id: tmdbMovie.id,
        movie_title: tmdbMovie.title,
        poster_full_url: posterUrl,
        movie_release_date: tmdbMovie.release_date || null
      };

      console.log(`Movie ${movie_id} added to database`);
    } else {
      movie = result.rows[0];
    }

    const releaseDate = movie.movie_release_date ? new Date(movie.movie_release_date) : null;

    res.json({
      ...movie,
      releaseYear: releaseDate ? releaseDate.getFullYear() : null
    });
  } catch (error) {
    console.error("Error fetching movie:", error);
    res.status(500).json({ error: "Failed to fetch movie" });
  }
});

// ADD movie to watched list
app.post("/add-movie/:movie_id", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;
  const movie_id = req.params.movie_id;
  const { rating, review } = req.body;

  const sql = `
    INSERT INTO watched_list (user_id, movie_id, user_rating, review)
    VALUES ($1, $2, $3, $4)
  `;

  await db.query(sql, [user_id, movie_id, rating, review || null]);

  // Update popcorn kernels: +1 for adding a movie
  let kernelsToAdd = 1;

  // +5 additional if a review is provided
  if (review && review.trim() !== '') {
    kernelsToAdd += 5;
  }

  await db.query(
    `UPDATE users SET popcorn_kernels = COALESCE(popcorn_kernels, 0) + $1 WHERE user_id = $2`,
    [kernelsToAdd, user_id]
  );

  console.log(`[MOVIE ADDED] User ${user_id} added movie ${movie_id} - Rating: ${rating}, Has Review: ${!!(review && review.trim())}, Kernels +${kernelsToAdd}`);

  res.redirect("/watched");
});

// UPDATE existing watched entry
app.post("/update-movie/:watched_id", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;
  const watched_id = req.params.watched_id;
  const { rating, review } = req.body;

  // First, get the current review status
  const checkSql = `
    SELECT review FROM watched_list
    WHERE watched_id = $1 AND user_id = $2
  `;
  const currentEntry = await db.query(checkSql, [watched_id, user_id]);

  if (currentEntry.rows.length === 0) {
    return res.status(404).send("Entry not found");
  }

  const oldReview = currentEntry.rows[0].review;
  const hadReview = oldReview && oldReview.trim() !== '';
  const nowHasReview = review && review.trim() !== '';

  // Update the movie entry
  const sql = `
    UPDATE watched_list
    SET user_rating = $1, review = $2
    WHERE watched_id = $3 AND user_id = $4
  `;

  await db.query(sql, [rating, review || null, watched_id, user_id]);

  console.log(`[MOVIE UPDATED] User ${user_id} updated watched_id ${watched_id} - Rating: ${rating}, Had Review: ${hadReview}, Now Has Review: ${nowHasReview}`);

  // Award +5 kernels if a review is being added for the first time
  if (!hadReview && nowHasReview) {
    console.log(`[POPCORN KERNELS] User ${user_id} adding review for first time on watched_id ${watched_id} - awarding +5 kernels`);
    await db.query(
      `UPDATE users SET popcorn_kernels = COALESCE(popcorn_kernels, 0) + 5 WHERE user_id = $1`,
      [user_id]
    );
  }
  // Subtract -5 kernels if a review is being removed
  else if (hadReview && !nowHasReview) {
    console.log(`[POPCORN KERNELS] User ${user_id} removing review on watched_id ${watched_id} - subtracting 5 kernels`);
    await db.query(
      `UPDATE users SET popcorn_kernels = GREATEST(COALESCE(popcorn_kernels, 0) - 5, 0) WHERE user_id = $1`,
      [user_id]
    );
  }

  res.redirect("/watched");
});

// DELETE watched entry
app.post("/delete-movie/:watched_id", requireLogin, async (req, res) => {
  const user_id = req.session.user_id;
  const watched_id = req.params.watched_id;

  // First, get the entry to check if it has a review
  const checkSql = `
    SELECT review FROM watched_list
    WHERE watched_id = $1 AND user_id = $2
  `;
  const entry = await db.query(checkSql, [watched_id, user_id]);

  if (entry.rows.length === 0) {
    return res.status(404).send("Entry not found");
  }

  const hasReview = entry.rows[0].review && entry.rows[0].review.trim() !== '';

  // Calculate kernels to subtract: -1 for movie, -5 for review if exists
  let kernelsToSubtract = 1;
  if (hasReview) {
    kernelsToSubtract += 5; // Total: -6
  }

  // Delete the movie entry
  const deleteSql = `
    DELETE FROM watched_list
    WHERE watched_id = $1 AND user_id = $2
  `;
  await db.query(deleteSql, [watched_id, user_id]);

  // Subtract kernels from user
  await db.query(
    `UPDATE users SET popcorn_kernels = GREATEST(COALESCE(popcorn_kernels, 0) - $1, 0) WHERE user_id = $2`,
    [kernelsToSubtract, user_id]
  );

  console.log(`[MOVIE DELETED] User ${user_id} deleted watched_id ${watched_id} - Had Review: ${hasReview}, Kernels -${kernelsToSubtract}`);

  res.redirect("/watched");
});

// More movie routes … (unchanged)

// ============================================================================
// FOLLOWERS / FOLLOWING
// ============================================================================

// Get list of users who follow a specific user
app.get("/api/user/:user_id/followers", requireLogin, async (req, res) => {
  const target_user_id = req.params.user_id;
  const current_user_id = req.session.user_id;

  console.log(`[FOLLOWERS] Fetching followers for user ${target_user_id}, current user: ${current_user_id}`);

  try {
    const sql = `
      SELECT
        u.user_id,
        u.username,
        u.profile_picture,
        EXISTS(
          SELECT 1 FROM user_follows
          WHERE follower_id = $1 AND following_id = u.user_id
        ) as is_following
      FROM user_follows uf
      JOIN users u ON uf.follower_id = u.user_id
      WHERE uf.following_id = $2
      ORDER BY u.username ASC
    `;
    const result = await db.query(sql, [current_user_id, target_user_id]);
    console.log(`[FOLLOWERS] Found ${result.rows.length} followers`);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching followers:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch followers", details: error.message });
  }
});

// Get list of users that a specific user follows
app.get("/api/user/:user_id/following", requireLogin, async (req, res) => {
  const target_user_id = req.params.user_id;
  const current_user_id = req.session.user_id;

  console.log(`[FOLLOWING] Fetching following for user ${target_user_id}, current user: ${current_user_id}`);

  try {
    const sql = `
      SELECT
        u.user_id,
        u.username,
        u.profile_picture,
        EXISTS(
          SELECT 1 FROM user_follows
          WHERE follower_id = $1 AND following_id = u.user_id
        ) as is_following
      FROM user_follows uf
      JOIN users u ON uf.following_id = u.user_id
      WHERE uf.follower_id = $2
      ORDER BY u.username ASC
    `;
    const result = await db.query(sql, [current_user_id, target_user_id]);
    console.log(`[FOLLOWING] Found ${result.rows.length} users`);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching following:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch following", details: error.message });
  }
});

// Follow a user
app.post("/api/user/follow/:user_id", requireLogin, async (req, res) => {
  const follower_id = req.session.user_id;
  const following_id = req.params.user_id;

  // Prevent self-follow
  if (follower_id === parseInt(following_id)) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    const sql = `
      INSERT INTO user_follows (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    await db.query(sql, [follower_id, following_id]);
    console.log(`[FOLLOW] User ${follower_id} followed user ${following_id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

// Unfollow a user
app.post("/api/user/unfollow/:user_id", requireLogin, async (req, res) => {
  const follower_id = req.session.user_id;
  const following_id = req.params.user_id;

  try {
    const sql = `
      DELETE FROM user_follows
      WHERE follower_id = $1 AND following_id = $2
    `;
    await db.query(sql, [follower_id, following_id]);
    console.log(`[UNFOLLOW] User ${follower_id} unfollowed user ${following_id}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`TrueReview running at http://localhost:${PORT}`)
);
