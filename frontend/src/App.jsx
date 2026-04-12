import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import {
  addTracksToPlaylist,
  createPlaylist,
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
  clearStoredArtistGenreCache,
  getStoredArtistGenreCache,
} from "./utils/storage";
import {
  addUserTagToTrack,
  clearStoredTrackTags,
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
    return "Spotify のログイン期限が切れました。もう一度ログインしてください。";
  }

  if (status === 403) {
    return (
      forbiddenMessage ||
      "Spotify からアクセスを拒否されました。ログアウトして再ログインし、Spotify アプリ設定のアクセス権も確認してください。"
    );
  }

  if (status === 429) {
    if (typeof error.retryAfter === "number" && Number.isFinite(error.retryAfter)) {
      return `Spotify のアクセス上限に達しました。約 ${error.retryAfter} 秒待ってからもう一度試してください。`;
    }

    return "Spotify のアクセス上限に達しました。少し待ってからもう一度試してください。";
  }

  return error.message || fallbackMessage;
}

function hasSpotifyScope(session, requiredScope) {
  if (!requiredScope) {
    return true;
  }

  const scopeValue = typeof session?.scope === "string" ? session.scope : "";
  return scopeValue.split(/\s+/).includes(requiredScope);
}

function createBrowserDataSummary() {
  const artistGenreCache = getStoredArtistGenreCache();
  const trackTagsMap = getStoredTrackTagsMap();
  const trackTagEntries = Object.values(trackTagsMap).filter(
    (entry) => entry && typeof entry === "object"
  );

  return {
    artistGenreCacheCount: Object.keys(artistGenreCache).length,
    trackTagEntryCount: Object.keys(trackTagsMap).length,
    autoTagEntryCount: trackTagEntries.filter(
      (entry) => Array.isArray(entry.auto) && entry.auto.length > 0
    ).length,
    userTagEntryCount: trackTagEntries.filter(
      (entry) => Array.isArray(entry.user) && entry.user.length > 0
    ).length,
  };
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
  const [playlistCreationStatus, setPlaylistCreationStatus] = useState("idle");
  const [playlistCreationError, setPlaylistCreationError] = useState("");
  const [createdPlaylist, setCreatedPlaylist] = useState(null);
  const [artistGenresByArtistId, setArtistGenresByArtistId] = useState({});
  const [browserDataNotice, setBrowserDataNotice] = useState("");
  const redirectUri = getSpotifyRedirectUri();

  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedPlaylistId) || null;
  const browserDataSummary = createBrowserDataSummary();

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
            error instanceof Error ? error.message : "Spotify へのログインに失敗しました。";
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
    setPlaylistCreationStatus("idle");
    setPlaylistCreationError("");
    setCreatedPlaylist(null);
    setArtistGenresByArtistId({});
    setBrowserDataNotice("");
  }

  async function handleLogin() {
    setAuthStatus("loading");
    setErrorMessage("");

    try {
      await beginSpotifyLogin();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Spotify へのログインに失敗しました。";
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
      setPlaylistCreationStatus("idle");
      setPlaylistCreationError("");
      setCreatedPlaylist(null);
      setArtistGenresByArtistId({});
      setBrowserDataNotice("");
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
            "Spotify のプレイリストを取得できませんでした。"
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
      setPlaylistCreationStatus("idle");
      setPlaylistCreationError("");
      setCreatedPlaylist(null);
      setArtistGenresByArtistId({});
      setBrowserDataNotice("");
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
      setPlaylistCreationStatus("idle");
      setPlaylistCreationError("");
      setCreatedPlaylist(null);
      setArtistGenresByArtistId({});
      setBrowserDataNotice("");

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
            "プレイリストの楽曲を取得できませんでした。",
            "Spotify では、自分が所有しているか共同編集しているプレイリストのみ楽曲を取得できます。"
          );
          setTracks([]);
          setTracksError(message);
          setTracksStatus("error");
          setGenreStatus("idle");
          setGenreError("");
          setTagStorageStatus("idle");
          setTagStorageError("");
          setTagStorageSummary(null);
          setPlaylistCreationStatus("idle");
          setPlaylistCreationError("");
          setCreatedPlaylist(null);
          setArtistGenresByArtistId({});
          setBrowserDataNotice("");
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
      setArtistGenresByArtistId({});
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
      setArtistGenresByArtistId({});
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
          setArtistGenresByArtistId(artistGenresByArtistId);

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
                : "自動タグをブラウザに保存できませんでした。";
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
          setArtistGenresByArtistId({});
          const message = getSpotifyApiErrorMessage(
            error,
            "アーティスト情報を取得できませんでした。",
            "アーティスト情報の取得を Spotify に拒否されました。楽曲表示はできますが、現在のセッションまたはアプリ設定では追加情報を取得できません。"
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
      setBrowserDataNotice(`手動タグ「${userTag.trim()}」をこのブラウザに保存しました。`);

      return result;
    } catch (error) {
      return {
        ok: false,
        reason: "storage",
        message:
          error instanceof Error
            ? error.message
            : "手動タグをブラウザに保存できませんでした。",
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
      setBrowserDataNotice(`手動タグ「${userTag}」をこのブラウザから削除しました。`);

      return result;
    } catch (error) {
      return {
        ok: false,
        reason: "storage",
        message:
          error instanceof Error
            ? error.message
            : "このタグのブラウザ保存データを更新できませんでした。",
      };
    }
  }

  async function handleCreatePlaylistFromTag({
    sourcePlaylist,
    tagType,
    tagValue,
    playlistName,
    isPublic,
  }) {
    if (!session?.accessToken) {
      return {
        ok: false,
        reason: "auth",
        message: "Spotify のログイン期限が切れました。もう一度ログインしてください。",
      };
    }

    const normalizedTagType = tagType === "auto" ? "auto" : "user";
    const normalizedTag = typeof tagValue === "string" ? tagValue.trim() : "";
    const normalizedPlaylistName =
      typeof playlistName === "string" ? playlistName.trim() : "";
    const requiredScope = isPublic
      ? "playlist-modify-public"
      : "playlist-modify-private";

    if (!sourcePlaylist?.id || !normalizedTag || !normalizedPlaylistName) {
      return {
        ok: false,
        reason: "validation",
        message: "元のプレイリスト、タグ、プレイリスト名はすべて入力が必要です。",
      };
    }

    if (!hasSpotifyScope(session, requiredScope)) {
      return {
        ok: false,
        reason: "scope",
        message: `現在の Spotify セッションには ${requiredScope} 権限がありません。ログアウトして再ログインしてから作成してください。`,
      };
    }

    const matchingTracks = tracks.filter((track) =>
      (normalizedTagType === "auto" ? track.autoTags : track.userTags || []).some(
        (tag) => tag.toLowerCase() === normalizedTag.toLowerCase()
      )
    );
    const matchingUris = matchingTracks
      .map((track) => track.uri)
      .filter(Boolean);

    if (matchingUris.length === 0) {
      return {
        ok: false,
        reason: "empty",
        message: "このタグに一致する Spotify 楽曲がまだありません。",
      };
    }

    setPlaylistCreationStatus("loading");
    setPlaylistCreationError("");
    setCreatedPlaylist(null);

    try {
      const nextPlaylist = await createPlaylist(session.accessToken, {
        name: normalizedPlaylistName,
        description: `「${sourcePlaylist.name}」から ${normalizedTagType === "auto" ? "自動" : "手動"}タグ「${normalizedTag}」で作成`,
        isPublic,
      });

      await addTracksToPlaylist(
        session.accessToken,
        nextPlaylist.id,
        matchingUris
      );

      const summary = {
        ...nextPlaylist,
        matchedTrackCount: matchingTracks.length,
        addedTrackCount: matchingUris.length,
        tagType: normalizedTagType,
        tagTypeLabel: normalizedTagType === "auto" ? "自動" : "手動",
        tagValue: normalizedTag,
      };

      setCreatedPlaylist(summary);
      setPlaylistCreationStatus("success");

      return {
        ok: true,
        playlist: summary,
      };
    } catch (error) {
      const message = getSpotifyApiErrorMessage(
        error,
        "このタグから Spotify プレイリストを作成できませんでした。",
        "プレイリスト作成を Spotify に拒否されました。ログアウトして再ログインし、Spotify アプリ設定でこのアカウントが許可されているか確認してください。"
      );
      setPlaylistCreationError(message);
      setPlaylistCreationStatus("error");
      setCreatedPlaylist(null);

      return {
        ok: false,
        reason: "request",
        message,
      };
    }
  }

  function handleResetPlaylistCreationState() {
    setPlaylistCreationStatus("idle");
    setPlaylistCreationError("");
    setCreatedPlaylist(null);
  }

  function handleClearArtistGenreCache() {
    clearStoredArtistGenreCache();
    setGenreStatus("idle");
    setGenreError("");
    setBrowserDataNotice(
      "アーティスト情報キャッシュを削除しました。次にプレイリストを開くと最新情報を取得します。"
    );
  }

  function handleClearStoredTrackTags() {
    clearStoredTrackTags();
    setTracks(mergeAutoTagsIntoTracks(rawTracks, artistGenresByArtistId, {}));
    setTagStorageStatus("idle");
    setTagStorageError("");
    setTagStorageSummary(null);
    setPlaylistCreationStatus("idle");
    setPlaylistCreationError("");
    setCreatedPlaylist(null);
    setBrowserDataNotice(
      "このブラウザに保存されていたタグを削除しました。手動タグもローカル保存から消去されました。"
    );
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
      playlistCreationStatus={playlistCreationStatus}
      playlistCreationError={playlistCreationError}
      createdPlaylist={createdPlaylist}
      browserDataSummary={browserDataSummary}
      browserDataNotice={browserDataNotice}
      onClearArtistGenreCache={handleClearArtistGenreCache}
      onClearStoredTrackTags={handleClearStoredTrackTags}
      onCreatePlaylistFromTag={handleCreatePlaylistFromTag}
      onResetPlaylistCreationState={handleResetPlaylistCreationState}
      onAddUserTag={handleAddUserTag}
      onRemoveUserTag={handleRemoveUserTag}
      onSelectPlaylist={handleSelectPlaylist}
    />
  );
}

export default App;
