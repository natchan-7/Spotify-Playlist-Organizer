const PKCE_VERIFIER_KEY = "spotify_pkce_code_verifier";
const PKCE_STATE_KEY = "spotify_pkce_state";
const PKCE_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

function getRandomValues(length) {
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  return values;
}

function randomString(length) {
  const values = getRandomValues(length);
  let result = "";

  for (let index = 0; index < values.length; index += 1) {
    result += PKCE_CHARSET[values[index] % PKCE_CHARSET.length];
  }

  return result;
}

function toBase64Url(uint8Array) {
  const binaryString = Array.from(uint8Array, (charCode) =>
    String.fromCharCode(charCode)
  ).join("");

  return btoa(binaryString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createCodeVerifier() {
  return randomString(64);
}

export async function createCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

export function createState() {
  return randomString(24);
}

export function storeCodeVerifier(verifier) {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
}

export function getStoredCodeVerifier() {
  return sessionStorage.getItem(PKCE_VERIFIER_KEY);
}

export function clearCodeVerifier() {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
}

export function storePendingAuthState(state) {
  sessionStorage.setItem(PKCE_STATE_KEY, state);
}

export function validateStoredAuthState(state) {
  return sessionStorage.getItem(PKCE_STATE_KEY) === state;
}

export function removeStoredAuthState() {
  sessionStorage.removeItem(PKCE_STATE_KEY);
}
