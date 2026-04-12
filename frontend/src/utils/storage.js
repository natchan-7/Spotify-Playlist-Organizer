const SPOTIFY_SESSION_KEY = "spotifySession";
const ARTIST_GENRE_CACHE_KEY = "artistGenreCache";
const ARTIST_GENRE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function parseStoredValue(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export function saveSpotifySession(session) {
  localStorage.setItem(SPOTIFY_SESSION_KEY, JSON.stringify(session));
}

export function getStoredSpotifySession() {
  const parsed = parseStoredValue(localStorage.getItem(SPOTIFY_SESSION_KEY));

  if (!parsed) {
    clearStoredSpotifySession();
    return null;
  }

  return parsed;
}

export function clearStoredSpotifySession() {
  localStorage.removeItem(SPOTIFY_SESSION_KEY);
}

export function getStoredArtistGenreCache() {
  const parsed = parseStoredValue(localStorage.getItem(ARTIST_GENRE_CACHE_KEY));

  if (!parsed || typeof parsed !== "object") {
    localStorage.removeItem(ARTIST_GENRE_CACHE_KEY);
    return {};
  }

  const now = Date.now();
  const activeEntries = Object.entries(parsed).filter(([artistId, entry]) => {
    if (!artistId || !entry || typeof entry !== "object") {
      return false;
    }

    if (!Array.isArray(entry.genres)) {
      return false;
    }

    if (!Number.isFinite(entry.cachedAt)) {
      return false;
    }

    return now - entry.cachedAt < ARTIST_GENRE_CACHE_TTL_MS;
  });

  const normalizedCache = Object.fromEntries(activeEntries);

  if (activeEntries.length !== Object.keys(parsed).length) {
    localStorage.setItem(
      ARTIST_GENRE_CACHE_KEY,
      JSON.stringify(normalizedCache)
    );
  }

  return normalizedCache;
}

export function saveArtistGenreCache(cache) {
  localStorage.setItem(ARTIST_GENRE_CACHE_KEY, JSON.stringify(cache));
}

export function clearStoredArtistGenreCache() {
  localStorage.removeItem(ARTIST_GENRE_CACHE_KEY);
}
