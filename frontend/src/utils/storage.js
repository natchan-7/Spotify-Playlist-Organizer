const SPOTIFY_SESSION_KEY = "spotifySession";
const ARTIST_GENRE_CACHE_KEY = "artistGenreCache";

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
  if (!session || typeof session !== "object") {
    clearStoredSpotifySession();
    return;
  }

  const normalizedSession = {
    accessToken: typeof session.accessToken === "string" ? session.accessToken : "",
    refreshToken: typeof session.refreshToken === "string" ? session.refreshToken : "",
    tokenType: typeof session.tokenType === "string" ? session.tokenType : "",
    scope: typeof session.scope === "string" ? session.scope : "",
    expiresAt: Number.isFinite(session.expiresAt) ? session.expiresAt : 0,
  };

  localStorage.setItem(SPOTIFY_SESSION_KEY, JSON.stringify(normalizedSession));
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

export function clearStoredArtistGenreCache() {
  localStorage.removeItem(ARTIST_GENRE_CACHE_KEY);
}
