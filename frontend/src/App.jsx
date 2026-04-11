
import { useEffect, useMemo, useState } from "react";
import AuthPage from "./pages/AuthPage";
import { fetchCurrentUserPlaylists, fetchPlaylistTracks } from "./services/spotifyApi";
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [tracksStatus, setTracksStatus] = useState("idle");
  const [tracksError, setTracksError] = useState("");

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId]
  );

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
    setSelectedPlaylistId(null);
    setTracks([]);
    setTracksStatus("idle");
    setTracksError("");
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
      setSelectedPlaylistId(null);
      setTracks([]);
      setTracksStatus("idle");
      setTracksError("");
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

  useEffect(() => {
    if (!session?.accessToken || !selectedPlaylist) {
      setTracks([]);
      setTracksStatus("idle");
      setTracksError("");
      return;
    }

    let ignore = false;

    async function loadTracks() {
      setTracksStatus("loading");
      setTracksError("");

      try {
        const nextTracks = await fetchPlaylistTracks(
          session.accessToken,
          selectedPlaylist
        );

        if (!ignore) {
          setTracks(nextTracks);
          setTracksStatus("success");
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch Spotify playlist tracks.";
          setTracks([]);
          setTracksError(message);
          setTracksStatus("error");
        }
      }
    }

    loadTracks();

    return () => {
      ignore = true;
    };
  }, [session, selectedPlaylist]);

  function handleSelectPlaylist(playlistId) {
    setSelectedPlaylistId(playlistId);
  }

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
      selectedPlaylist={selectedPlaylist}
      tracks={tracks}
      tracksError={tracksError}
      tracksStatus={tracksStatus}
      onSelectPlaylist={handleSelectPlaylist}
    />
  );
}

export default App;
