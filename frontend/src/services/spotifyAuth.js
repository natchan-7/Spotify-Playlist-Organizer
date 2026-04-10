import {
  clearCodeVerifier,
  createCodeChallenge,
  createCodeVerifier,
  createState,
  getStoredCodeVerifier,
  removeStoredAuthState,
  storeCodeVerifier,
  storePendingAuthState,
  validateStoredAuthState,
} from "../utils/pkce";
import {
  clearStoredSpotifySession,
  getStoredSpotifySession,
  saveSpotifySession,
} from "../utils/storage";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
].join(" ");

function getClientId() {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID;
}

function getRedirectUri() {
  return (
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
    window.location.origin + window.location.pathname
  );
}

function ensureAuthConfig() {
  const clientId = getClientId();

  if (!clientId) {
    throw new Error("Missing VITE_SPOTIFY_CLIENT_ID.");
  }

  return {
    clientId,
    redirectUri: getRedirectUri(),
  };
}

export async function beginSpotifyLogin() {
  const { clientId, redirectUri } = ensureAuthConfig();
  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  const state = createState();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
    state,
  });

  storeCodeVerifier(verifier);
  storePendingAuthState(state);
  window.location.assign(
    `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`
  );
}

export function hasAuthCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("error");
}

function clearAuthQueryParams() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export async function exchangeCodeForToken() {
  const { clientId, redirectUri } = ensureAuthConfig();
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  if (error) {
    clearAuthQueryParams();
    clearCodeVerifier();
    removeStoredAuthState();
    throw new Error(`Spotify authorization failed: ${error}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const verifier = getStoredCodeVerifier();

  if (!code || !state || !verifier) {
    clearAuthQueryParams();
    throw new Error("Missing OAuth callback data.");
  }

  if (!validateStoredAuthState(state)) {
    clearAuthQueryParams();
    clearCodeVerifier();
    removeStoredAuthState();
    throw new Error("Invalid OAuth state.");
  }

  // Consume the callback immediately so React StrictMode does not retry the
  // same authorization code during the development-only remount cycle.
  clearAuthQueryParams();
  clearCodeVerifier();
  removeStoredAuthState();

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error_description || payload?.error || "Token exchange failed.";
    throw new Error(message);
  }

  const session = {
    accessToken: payload.access_token,
    tokenType: payload.token_type,
    scope: payload.scope,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  saveSpotifySession(session);
  return session;
}

export function getSpotifySession() {
  const session = getStoredSpotifySession();

  if (!session?.accessToken) {
    return null;
  }

  if (session.expiresAt && Date.now() >= session.expiresAt) {
    clearStoredSpotifySession();
    return null;
  }

  return session;
}

export function clearSpotifySession() {
  clearStoredSpotifySession();
  clearCodeVerifier();
  removeStoredAuthState();
}
