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
  getValidSpotifySession,
  hasAuthCallbackParams,
} from "./services/spotifyAuth";
import {
  clearStoredArtistGenreCache,
} from "./utils/storage";
import {
  addUserTagToTrack,
  clearStoredTrackTags,
  exportTrackTagsAsJson,
  getStoredTrackTagsMap,
  importTrackTagsFromJson,
  mergeAutoTagsIntoTracks,
  mergeTrackTagsIntoTracks,
  removeUserTagFromTrack,
} from "./utils/trackTags";
import {
  createBrowserDataSummary,
  createMissingSessionError,
  getMarketFromBrowser,
  getSpotifyApiErrorMessage,
  hasSpotifyScope,
} from "./utils/appHelpers";

function App() {
  const repositoryUrl = "https://github.com/natchan-7/Spotify-Playlist-Organizer";
  const readmeUrl = `${repositoryUrl}#readme`;
  const [session, setSession] = useState(null);
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

  async function ensureSession() {
    const nextSession = await getValidSpotifySession();

    if (!nextSession?.accessToken) {
      setSession(null);
      return null;
    }

    setSession((currentSession) => {
      if (
        currentSession?.accessToken === nextSession.accessToken &&
        currentSession?.refreshToken === nextSession.refreshToken &&
        currentSession?.expiresAt === nextSession.expiresAt &&
        currentSession?.scope === nextSession.scope
      ) {
        return currentSession;
      }

      return nextSession;
    });

    return nextSession;
  }

  useEffect(() => {
    if (hasAuthCallbackParams()) {
      return;
    }

    let ignore = false;

    async function hydrateSession() {
      try {
        const nextSession = await getValidSpotifySession();

        if (!ignore) {
          setSession(nextSession);
        }
      } catch (error) {
        if (!ignore) {
          clearSpotifySession();
          setSession(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Spotify セッションを復元できませんでした。"
          );
          setAuthStatus("error");
        }
      }
    }

    hydrateSession();

    return () => {
      ignore = true;
    };
  }, []);

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
        const activeSession = await ensureSession();

        if (!activeSession?.accessToken) {
          throw createMissingSessionError();
        }

        const [profileResult, playlistsResult] = await Promise.allSettled([
          fetchCurrentUserProfile(activeSession.accessToken),
          fetchCurrentUserPlaylists(activeSession.accessToken),
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
        const activeSession = await ensureSession();

        if (!activeSession?.accessToken) {
          throw createMissingSessionError();
        }

        const nextTracks = await fetchPlaylistTracks(
          activeSession.accessToken,
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
        const activeSession = await ensureSession();

        if (!activeSession?.accessToken) {
          throw createMissingSessionError();
        }

        const artistGenresByArtistId = await fetchArtistGenres(
          activeSession.accessToken,
          artistIds
        );

        if (!ignore) {
          const nextTrackTagsMap = getStoredTrackTagsMap();
          setArtistGenresByArtistId(artistGenresByArtistId);
          setTagStorageStatus("success");
          setTagStorageError("");
          setTagStorageSummary({
            updatedTrackCount: 0,
            savedAutoTagCount: 0,
            createdEntryCount: 0,
          });

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
    let activeSession;

    try {
      activeSession = await ensureSession();
    } catch (error) {
      return {
        ok: false,
        reason: "auth",
        message:
          error instanceof Error
            ? error.message
            : "Spotify のログイン期限が切れました。もう一度ログインしてください。",
      };
    }

    if (!activeSession?.accessToken) {
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

    if (!hasSpotifyScope(activeSession, requiredScope)) {
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
      const nextPlaylist = await createPlaylist(activeSession.accessToken, {
        name: normalizedPlaylistName,
        description: `「${sourcePlaylist.name}」から ${normalizedTagType === "auto" ? "自動" : "手動"}タグ「${normalizedTag}」で作成`,
        isPublic,
      });

      await addTracksToPlaylist(
        activeSession.accessToken,
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
      "このブラウザに残っていたアーティスト情報キャッシュを削除しました。"
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
      "このブラウザに保存されていた手動タグを削除しました。"
    );
  }

  function handleExportTrackTags() {
    const trackTagsMap = getStoredTrackTagsMap();

    if (Object.keys(trackTagsMap).length === 0) {
      setBrowserDataNotice("エクスポートできる手動タグがありません。");
      return;
    }

    const json = exportTrackTagsAsJson(trackTagsMap);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `spotify-playlist-organizer-tags-${today}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setBrowserDataNotice("手動タグを JSON ファイルとして書き出しました。");
  }

  function handleImportTrackTags(jsonText) {
    const result = importTrackTagsFromJson(jsonText);

    if (!result.ok) {
      const message =
        result.reason === "parse"
          ? "選択したファイルを JSON として読み込めませんでした。"
          : "ファイルから読み込める手動タグが見つかりませんでした。";

      setBrowserDataNotice(message);
      return;
    }

    setTracks(
      mergeAutoTagsIntoTracks(rawTracks, artistGenresByArtistId, result.trackTagsMap)
    );

    setBrowserDataNotice(
      result.addedTagCount > 0
        ? `${result.importedTrackCount}曲分のタグ情報を読み込み、${result.addedTagCount}件の手動タグを追加しました。`
        : "ファイルを読み込みましたが、既存のタグと重複していたため新しく追加されたタグはありませんでした。"
    );
  }

  return (
    <AuthPage
      authStatus={authStatus}
      readmeUrl={readmeUrl}
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
      onExportTrackTags={handleExportTrackTags}
      onImportTrackTags={handleImportTrackTags}
      onCreatePlaylistFromTag={handleCreatePlaylistFromTag}
      onResetPlaylistCreationState={handleResetPlaylistCreationState}
      onAddUserTag={handleAddUserTag}
      onRemoveUserTag={handleRemoveUserTag}
      onSelectPlaylist={handleSelectPlaylist}
    />
  );
}

export default App;
