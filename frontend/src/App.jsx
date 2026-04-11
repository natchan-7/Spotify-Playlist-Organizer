
import React, { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import { fetchCurrentUserPlaylists } from "./services/spotifyApi";
import {
  beginSpotifyLogin,
  clearSpotifySession,
  exchangeCodeForToken,
  getSpotifyRedirectUri,
  getSpotifySession,
  hasAuthCallbackParams,
} from "./services/spotifyAuth";

function App() {
  const [session, setSession] = useState(() => getSpotifySession());
  const [authStatus, setAuthStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [playlistsStatus, setPlaylistsStatus] = useState("idle");
  const [playlistsError, setPlaylistsError] = useState("");

  useEffect(() => {
    if (!hasAuthCallbackParams()) {
      return;
    }

    let ignore = false;

    async function completeLogin() {
      setAuthStatus("loading");
      setErrorMessage("");

      try {
        const nextSession = await exchangeCodeForToken();

        if (!ignore) {
          setSession(nextSession);
          setAuthStatus("success");
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Spotify login failed.";
          setErrorMessage(message);
          setAuthStatus("error");
        }
      }
    }

    completeLogin();

    return () => {
      ignore = true;
    };
  }, []);

  function handleLogout() {
    clearSpotifySession();
    setSession(null);
    setAuthStatus("idle");
    setErrorMessage("");
    setPlaylists([]);
    setPlaylistsStatus("idle");
    setPlaylistsError("");
  }

  async function handleLogin() {
    setAuthStatus("loading");
    setErrorMessage("");

    try {
      await beginSpotifyLogin();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Spotify login failed.";
      setErrorMessage(message);
      setAuthStatus("error");
    }
  }

  useEffect(() => {
    if (!session?.accessToken) {
      setPlaylists([]);
      setPlaylistsStatus("idle");
      setPlaylistsError("");
      return;
    }

    let ignore = false;

    async function loadPlaylists() {
      setPlaylistsStatus("loading");
      setPlaylistsError("");

      try {
        const nextPlaylists = await fetchCurrentUserPlaylists(session.accessToken);

        if (!ignore) {
          setPlaylists(nextPlaylists);
          setPlaylistsStatus("success");
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch Spotify playlists.";
          setPlaylists([]);
          setPlaylistsError(message);
          setPlaylistsStatus("error");
        }
      }
    }

    loadPlaylists();

    return () => {
      ignore = true;
    };
  }, [session]);

  return (
    <AuthPage
      authStatus={authStatus}
      errorMessage={errorMessage}
      isAuthenticated={Boolean(session?.accessToken)}
      onLogin={handleLogin}
      onLogout={handleLogout}
      playlists={playlists}
      playlistsCount={playlists.length}
      playlistsError={playlistsError}
      playlistsStatus={playlistsStatus}
      redirectUri={getSpotifyRedirectUri()}
      session={session}
    />
  );
}

export default App;
