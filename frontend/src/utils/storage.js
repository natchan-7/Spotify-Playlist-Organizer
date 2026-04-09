const SPOTIFY_SESSION_KEY = "spotifySession";

export function saveSpotifySession(session) {
  localStorage.setItem(SPOTIFY_SESSION_KEY, JSON.stringify(session));
}

export function getStoredSpotifySession() {
  const value = localStorage.getItem(SPOTIFY_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    clearStoredSpotifySession();
    return null;
  }
}

export function clearStoredSpotifySession() {
  localStorage.removeItem(SPOTIFY_SESSION_KEY);
}
