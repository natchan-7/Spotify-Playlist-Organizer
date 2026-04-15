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
  "user-read-private",
].join(" ");
const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;

async function parseJsonSafely(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      message: text,
    };
  }
}

function getClientId() {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID;
}

function normalizeRedirectUri(value) {
  const url = new URL(value, window.location.origin);
  url.search = "";
  url.hash = "";

  if (!url.pathname) {
    url.pathname = "/";
  }

  return url.toString();
}

function isLoopbackRedirect(url) {
  return url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1";
}

function validateRedirectUri(redirectUri) {
  const url = new URL(redirectUri);

  if (redirectUri.includes("*")) {
    throw new Error("Spotify のリダイレクトURIにワイルドカードは使用できません。");
  }

  if (url.hostname === "localhost") {
    throw new Error(
      "Spotify のリダイレクトURIに http://localhost は使用できません。http://127.0.0.1 を使ってください。"
    );
  }

  if (url.protocol === "https:") {
    return redirectUri;
  }

  if (url.protocol === "http:" && isLoopbackRedirect(url)) {
    return redirectUri;
  }

  throw new Error(
    "Spotify のリダイレクトURIは HTTPS を使用してください。ローカル開発時のみ http://127.0.0.1 が使用できます。"
  );
}

export function getSpotifyRedirectUri() {
  const configuredRedirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

  if (configuredRedirectUri) {
    return validateRedirectUri(normalizeRedirectUri(configuredRedirectUri));
  }

  return validateRedirectUri(
    normalizeRedirectUri(window.location.origin + window.location.pathname)
  );
}

function ensureAuthConfig() {
  const clientId = getClientId();

  if (!clientId) {
    throw new Error("VITE_SPOTIFY_CLIENT_ID が設定されていません。");
  }

  return {
    clientId,
    redirectUri: getSpotifyRedirectUri(),
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
    throw new Error(`Spotify 認証に失敗しました: ${error}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const verifier = getStoredCodeVerifier();

  if (!code || !state || !verifier) {
    clearAuthQueryParams();
    throw new Error("OAuth コールバックに必要な情報が不足しています。");
  }

  if (!validateStoredAuthState(state)) {
    clearAuthQueryParams();
    clearCodeVerifier();
    removeStoredAuthState();
    throw new Error("OAuth の state が一致しません。");
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

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      payload?.error_description ||
      payload?.error ||
      payload?.message ||
      "トークンの取得に失敗しました。";
    throw new Error(message);
  }

  const session = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || "",
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

  return session;
}

export async function refreshSpotifySession(
  currentSession = getStoredSpotifySession()
) {
  if (!currentSession?.refreshToken) {
    clearStoredSpotifySession();
    return null;
  }

  const { clientId } = ensureAuthConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: currentSession.refreshToken,
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    clearStoredSpotifySession();
    const message =
      payload?.error_description ||
      payload?.error ||
      payload?.message ||
      "Spotify セッションの更新に失敗しました。";
    throw new Error(message);
  }

  const refreshedSession = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || currentSession.refreshToken,
    tokenType: payload.token_type || currentSession.tokenType,
    scope: payload.scope || currentSession.scope,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  saveSpotifySession(refreshedSession);
  return refreshedSession;
}

export async function getValidSpotifySession() {
  const session = getStoredSpotifySession();

  if (!session?.accessToken) {
    return null;
  }

  if (
    Number.isFinite(session.expiresAt) &&
    Date.now() < session.expiresAt - TOKEN_EXPIRY_SKEW_MS
  ) {
    return session;
  }

  return refreshSpotifySession(session);
}

export function clearSpotifySession() {
  clearStoredSpotifySession();
  clearCodeVerifier();
  removeStoredAuthState();
}
