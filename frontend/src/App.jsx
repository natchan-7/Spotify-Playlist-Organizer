import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import {
  fetchArtistGenres,
  fetchCurrentUserPlaylists,
  fetchCurrentUserProfile,
  fetchPlaylistTracks,
} from "./services/spotifyApi";
import {
  beginSpotifyLogin,
  clearSpotifySession,
  exchangeCodeForToken,
  getSpotifyRedirectUri,
  getSpotifySession,
  hasAuthCallbackParams,
} from "./services/spotifyAuth";
import {
  addUserTagToTrack,
  getStoredTrackTagsMap,
  mergeAutoTagsIntoTracks,
  mergeTrackTagsIntoTracks,
  persistGeneratedAutoTags,
  removeUserTagFromTrack,
} from "./utils/trackTags";

function getSpotifyApiErrorMessage(error, fallbackMessage, forbiddenMessage) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = error.status;

  if (status === 401) {
    return "Spotify session expired. Please log in again.";
  }

  if (status === 403) {
    return (
      forbiddenMessage ||
      "Spotify returned Forbidden. Log out and log in again, then confirm your Spotify app user access."
    );
  }

  if (status === 429) {
    if (typeof error.retryAfter === "number" && Number.isFinite(error.retryAfter)) {
      return `Spotify rate limit reached. Wait about ${error.retryAfter} seconds and try again.`;
    }

    return "Spotify rate limit reached. Wait a moment and try again.";
  }

  return error.message || fallbackMessage;
}

function getMarketFromBrowser() {
  const runtimeLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  const locales = [runtimeLocale, navigator.language, ...(navigator.languages || [])].filter(Boolean);

  for (const locale of locales) {
    if (typeof Intl.Locale === "function") {
      try {
        const expandedLocale = new Intl.Locale(locale).maximize();

        if (expandedLocale.region && /^[A-Z]{2}$/i.test(expandedLocale.region)) {
          return expandedLocale.region.toUpperCase();
        }
      } catch (error) {
        // Ignore locale parsing issues and continue with the simpler fallback.
      }
    }

    const parts = locale.split("-");

    if (parts.length > 1 && /^[A-Z]{2}$/i.test(parts[1])) {
      return parts[1].toUpperCase();
    }
  }

  return "";
}

function App() {
  const [session, setSession] = useState(() => getSpotifySession());
  const [authStatus, setAuthStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [playlistsStatus, setPlaylistsStatus] = useState("idle");
  const [playlistsError, setPlaylistsError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserMarket, setCurrentUserMarket] = useState(() => getMarketFromBrowser());
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [rawTracks, setRawTracks] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [tracksStatus, setTracksStatus] = useState("idle");
  const [tracksError, setTracksError] = useState("");
  const [genreStatus, setGenreStatus] = useState("idle");
  const [genreError, setGenreError] = useState("");
  const [tagStorageStatus, setTagStorageStatus] = useState("idle");
  const [tagStorageError, setTagStorageError] = useState("");
  const [tagStorageSummary, setTagStorageSummary] = useState(null);
  const redirectUri = getSpotifyRedirectUri();

  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedPlaylistId) || null;

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
    setCurrentUserId("");
    setCurrentUserMarket(getMarketFromBrowser());
    setSelectedPlaylistId(null);
    setRawTracks([]);
    setTracks([]);
    setTracksStatus("idle");
    setTracksError("");
    setGenreStatus("idle");
    setGenreError("");
    setTagStorageStatus("idle");
    setTagStorageError("");
    setTagStorageSummary(null);
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
      setCurrentUserId("");
      setCurrentUserMarket(getMarketFromBrowser());
      setSelectedPlaylistId(null);
      setRawTracks([]);
      setTracks([]);
      setTracksStatus("idle");
      setTracksError("");
      setGenreStatus("idle");
      setGenreError("");
      setTagStorageStatus("idle");
      setTagStorageError("");
      setTagStorageSummary(null);
      return;
    }

    let ignore = false;

    async function loadPlaylists() {
      setPlaylistsStatus("loading");
      setPlaylistsError("");

      try {
        const [profileResult, playlistsResult] = await Promise.allSettled([
          fetchCurrentUserProfile(session.accessToken),
          fetchCurrentUserPlaylists(session.accessToken),
        ]);

        if (playlistsResult.status !== "fulfilled") {
          throw playlistsResult.reason;
        }

        if (!ignore) {
          if (profileResult.status === "fulfilled") {
            setCurrentUserId(profileResult.value.id);
            setCurrentUserMarket(profileResult.value.country || getMarketFromBrowser());
          } else {
            setCurrentUserId("");
            setCurrentUserMarket(getMarketFromBrowser());
          }

          setPlaylists(playlistsResult.value);
          setPlaylistsStatus("success");
        }
      } catch (error) {
        if (!ignore) {
          const message = getSpotifyApiErrorMessage(
            error,
            "Failed to fetch Spotify playlists."
          );
          setPlaylists([]);
          setPlaylistsError(message);
          setPlaylistsStatus("error");
          setCurrentUserId("");
          setCurrentUserMarket(getMarketFromBrowser());
        }
      }
    }

    loadPlaylists();

    return () => {
      ignore = true;
    };
  }, [session]);

  useEffect(() => {
    if (!selectedPlaylistId) {
      return;
    }

    const hasSelectedPlaylist = playlists.some(
      (playlist) => playlist.id === selectedPlaylistId
    );

    if (!hasSelectedPlaylist) {
      setSelectedPlaylistId(null);
    }
  }, [playlists, selectedPlaylistId]);

  useEffect(() => {
    if (!session?.accessToken || !selectedPlaylist) {
      setRawTracks([]);
      setTracks([]);
      setTracksStatus("idle");
      setTracksError("");
      setGenreStatus("idle");
      setGenreError("");
      setTagStorageStatus("idle");
      setTagStorageError("");
      setTagStorageSummary(null);
      return;
    }

    let ignore = false;

    async function loadTracks() {
      setTracksStatus("loading");
      setTracksError("");
      setGenreStatus("idle");
      setGenreError("");
      setTagStorageStatus("idle");
      setTagStorageError("");
      setTagStorageSummary(null);

      try {
        const nextTracks = await fetchPlaylistTracks(
          session.accessToken,
          selectedPlaylist,
          currentUserMarket
        );

        if (!ignore) {
          setRawTracks(nextTracks);
          setTracks(mergeTrackTagsIntoTracks(nextTracks));
          setTracksStatus("success");
        }
      } catch (error) {
        if (!ignore) {
          setRawTracks([]);
          const message = getSpotifyApiErrorMessage(
            error,
            "Failed to fetch Spotify playlist tracks.",
            "Spotify returned Forbidden. Spotify only returns playlist items for playlists you own or collaborate on."
          );
          setTracks([]);
          setTracksError(message);
          setTracksStatus("error");
          setGenreStatus("idle");
          setGenreError("");
          setTagStorageStatus("idle");
          setTagStorageError("");
          setTagStorageSummary(null);
        }
      }
    }

    loadTracks();

    return () => {
      ignore = true;
    };
  }, [session, selectedPlaylist, currentUserMarket]);

  useEffect(() => {
    if (!session?.accessToken || !selectedPlaylist || tracksStatus !== "success") {
      setGenreStatus("idle");
      setGenreError("");
      setTagStorageStatus("idle");
      setTagStorageError("");
      setTagStorageSummary(null);
      return;
    }

    if (rawTracks.length === 0) {
      setGenreStatus("success");
      setGenreError("");
      setTagStorageStatus("success");
      setTagStorageError("");
      setTagStorageSummary({
        updatedTrackCount: 0,
        savedAutoTagCount: 0,
        createdEntryCount: 0,
      });
      return;
    }

    const artistIds = Array.from(
      new Set(
        rawTracks.flatMap((track) =>
          (track.artists || [])
            .map((artist) => artist.id)
            .filter(Boolean)
        )
      )
    );

    if (artistIds.length === 0) {
      const storedTrackTagsMap = getStoredTrackTagsMap();

      setTracks(mergeAutoTagsIntoTracks(rawTracks, {}, storedTrackTagsMap));
      setGenreStatus("success");
      setGenreError("");
      setTagStorageStatus("success");
      setTagStorageError("");
      setTagStorageSummary({
        updatedTrackCount: 0,
        savedAutoTagCount: 0,
        createdEntryCount: 0,
      });
      return;
    }

    let ignore = false;

    async function loadGenres() {
      setGenreStatus("loading");
      setGenreError("");

      try {
        const artistGenresByArtistId = await fetchArtistGenres(
          session.accessToken,
          artistIds
        );

        if (!ignore) {
          let nextTrackTagsMap = getStoredTrackTagsMap();

          try {
            const persistenceResult = persistGeneratedAutoTags(
              rawTracks,
              artistGenresByArtistId,
              nextTrackTagsMap
            );

            nextTrackTagsMap = persistenceResult.trackTagsMap;
            setTagStorageStatus("success");
            setTagStorageError("");
            setTagStorageSummary({
              updatedTrackCount: persistenceResult.updatedTrackCount,
              savedAutoTagCount: persistenceResult.savedAutoTagCount,
              createdEntryCount: persistenceResult.createdEntryCount,
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to save automatic tags in browser storage.";
            setTagStorageStatus("error");
            setTagStorageError(message);
            setTagStorageSummary(null);
          }

          setTracks(
            mergeAutoTagsIntoTracks(rawTracks, artistGenresByArtistId, nextTrackTagsMap)
          );
          setGenreStatus("success");
        }
      } catch (error) {
        if (!ignore) {
          const message = getSpotifyApiErrorMessage(
            error,
            "Failed to fetch Spotify artist genres.",
            "Spotify returned Forbidden while fetching artist genres. This app can still show tracks, but Spotify is rejecting artist metadata for the current session or app settings."
          );
          setTracks(mergeTrackTagsIntoTracks(rawTracks));
          setGenreError(message);
          setGenreStatus("error");
          setTagStorageStatus("idle");
          setTagStorageError("");
          setTagStorageSummary(null);
        }
      }
    }

    loadGenres();

    return () => {
      ignore = true;
    };
  }, [session, selectedPlaylist, tracksStatus, rawTracks]);

  function handleSelectPlaylist(playlistId) {
    setSelectedPlaylistId(playlistId);
  }

  function handleAddUserTag(trackId, userTag) {
    const currentTrack = tracks.find((track) => track.id === trackId);

    if (!currentTrack) {
      return { ok: false, reason: "missing" };
    }

    try {
      const result = addUserTagToTrack(
        trackId,
        userTag,
        currentTrack.autoTags,
        getStoredTrackTagsMap()
      );

      if (!result.ok) {
        return result;
      }

      setTracks((currentTracks) =>
        currentTracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                autoTags: result.autoTags,
                userTags: result.userTags,
              }
            : track
        )
      );

      return result;
    } catch (error) {
      return {
        ok: false,
        reason: "storage",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save the user tag in browser storage.",
      };
    }
  }

  function handleRemoveUserTag(trackId, userTag) {
    const currentTrack = tracks.find((track) => track.id === trackId);

    if (!currentTrack) {
      return { ok: false, reason: "missing" };
    }

    try {
      const result = removeUserTagFromTrack(
        trackId,
        userTag,
        currentTrack.autoTags,
        getStoredTrackTagsMap()
      );

      if (!result.ok) {
        return result;
      }

      setTracks((currentTracks) =>
        currentTracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                autoTags: result.autoTags,
                userTags: result.userTags,
              }
            : track
        )
      );

      return result;
    } catch (error) {
      return {
        ok: false,
        reason: "storage",
        message:
          error instanceof Error
            ? error.message
            : "Failed to update browser storage for this tag.",
      };
    }
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
      currentUserId={currentUserId}
      redirectUri={redirectUri}
      session={session}
      selectedPlaylist={selectedPlaylist}
      genreError={genreError}
      genreStatus={genreStatus}
      tagStorageError={tagStorageError}
      tagStorageStatus={tagStorageStatus}
      tagStorageSummary={tagStorageSummary}
      tracks={tracks}
      tracksError={tracksError}
      tracksStatus={tracksStatus}
      onAddUserTag={handleAddUserTag}
      onRemoveUserTag={handleRemoveUserTag}
      onSelectPlaylist={handleSelectPlaylist}
    />
  );
}

export default App;
