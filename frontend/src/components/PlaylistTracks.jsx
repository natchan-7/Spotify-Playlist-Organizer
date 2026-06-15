/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatTagLabel } from "../utils/formatting";

function getTrackArtworkFallback(trackName) {
  return trackName ? trackName.slice(0, 1).toUpperCase() : "T";
}

function trackMatchesSearchQuery(track, query) {
  if (track.name?.toLowerCase().includes(query)) {
    return true;
  }

  return (track.artists || []).some((artist) =>
    artist?.name?.toLowerCase().includes(query)
  );
}

function trackMatchesArtist(track, artistId) {
  return (track.artists || []).some((artist) => artist?.id === artistId);
}

function ArtistNames({ artists, trackId, openArtist, onToggleArtist }) {
  if (!Array.isArray(artists) || artists.length === 0) {
    return "不明なアーティスト";
  }

  return artists.map((artist, index) => {
    const isOpen =
      openArtist?.trackId === trackId && openArtist?.artistId === artist.id;

    return (
      <span key={artist.id || artist.name || index}>
        {index > 0 ? ", " : ""}
        {artist.id ? (
          <>
            <a
              className="track-artist-link"
              href={`https://open.spotify.com/artist/${artist.id}`}
              target="_blank"
              rel="noreferrer"
            >
              {artist.name}
            </a>
            <button
              type="button"
              className="track-artist-info-button"
              onClick={() => onToggleArtist(trackId, artist.id, artist.name)}
              aria-expanded={isOpen}
              aria-label={`${artist.name} の詳細を表示`}
              title="アーティスト詳細を表示"
            >
              ⓘ
            </button>
          </>
        ) : (
          artist.name
        )}
      </span>
    );
  });
}

function PlaylistTracks({
  artistDetails,
  artistDetailsError,
  artistDetailsId,
  artistDetailsStatus,
  genreError,
  genreStatus,
  onAddUserTag,
  onFetchArtistDetails,
  onRemoveUserTag,
  selectedPlaylist,
  tagStorageError,
  tagStorageStatus,
  tagStorageSummary,
  tracks,
  tracksError,
  tracksStatus,
}) {
  const taggedTrackCount = tracks.filter((track) => track.autoTags?.length > 0).length;
  const userTaggedTrackCount = tracks.filter((track) => track.userTags?.length > 0).length;
  const totalAutoTagCount = tracks.reduce(
    (count, track) => count + (track.autoTags?.length || 0),
    0
  );
  const [tagDrafts, setTagDrafts] = useState({});
  const [tagFeedback, setTagFeedback] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [selectedTrackIds, setSelectedTrackIds] = useState(() => new Set());
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [bulkTagFeedback, setBulkTagFeedback] = useState("");
  const [openArtist, setOpenArtist] = useState(null);

  useEffect(() => {
    setTagDrafts({});
    setTagFeedback({});
    setSearchQuery("");
    setSelectedArtistId("");
    setSortOrder("default");
    setSelectedTrackIds(new Set());
    setBulkTagDraft("");
    setBulkTagFeedback("");
    setOpenArtist(null);
  }, [selectedPlaylist?.id]);

  const availableArtists = useMemo(() => {
    const artistsById = new Map();

    for (const track of tracks) {
      for (const artist of track.artists || []) {
        if (artist?.id && !artistsById.has(artist.id)) {
          artistsById.set(artist.id, artist.name || artist.id);
        }
      }
    }

    return Array.from(artistsById, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "ja")
    );
  }, [tracks]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isFiltered = Boolean(normalizedSearchQuery) || Boolean(selectedArtistId);
  const filteredTracks = tracks.filter((track) => {
    if (normalizedSearchQuery && !trackMatchesSearchQuery(track, normalizedSearchQuery)) {
      return false;
    }

    if (selectedArtistId && !trackMatchesArtist(track, selectedArtistId)) {
      return false;
    }

    return true;
  });

  const sortedTracks = useMemo(() => {
    if (sortOrder === "popularity-desc") {
      return [...filteredTracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    if (sortOrder === "popularity-asc") {
      return [...filteredTracks].sort((a, b) => (a.popularity || 0) - (b.popularity || 0));
    }

    return filteredTracks;
  }, [filteredTracks, sortOrder]);

  const allVisibleSelected =
    sortedTracks.length > 0 &&
    sortedTracks.every((track) => selectedTrackIds.has(track.id));

  function toggleTrackSelection(trackId) {
    setSelectedTrackIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(trackId)) {
        nextSelection.delete(trackId);
      } else {
        nextSelection.add(trackId);
      }

      return nextSelection;
    });
    setBulkTagFeedback("");
  }

  function toggleSelectAllVisible() {
    setSelectedTrackIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      for (const track of sortedTracks) {
        if (allVisibleSelected) {
          nextSelection.delete(track.id);
        } else {
          nextSelection.add(track.id);
        }
      }

      return nextSelection;
    });
    setBulkTagFeedback("");
  }

  function clearSelection() {
    setSelectedTrackIds(new Set());
    setBulkTagFeedback("");
  }

  function handleBulkTagSubmit(event) {
    event.preventDefault();

    const trimmedTag = bulkTagDraft.trim();

    if (!trimmedTag) {
      setBulkTagFeedback("タグを入力してください。");
      return;
    }

    let addedCount = 0;
    let duplicateCount = 0;
    let errorMessage = "";

    for (const trackId of selectedTrackIds) {
      const result = onAddUserTag?.(trackId, trimmedTag);

      if (result?.ok) {
        addedCount += 1;
      } else if (result?.reason === "duplicate") {
        duplicateCount += 1;
      } else if (result?.reason === "storage") {
        errorMessage = result.message || "手動タグをブラウザに保存できませんでした。";
        break;
      }
    }

    if (errorMessage) {
      setBulkTagFeedback(errorMessage);
      return;
    }

    let message = `選択した${selectedTrackIds.size}曲のうち${addedCount}曲に手動タグ「${formatTagLabel(trimmedTag)}」を追加しました。`;

    if (duplicateCount > 0) {
      message += `（${duplicateCount}曲は追加済みでした）`;
    }

    setBulkTagFeedback(message);
    setBulkTagDraft("");
  }

  function getAutoTagStatusLabel() {
    if (genreStatus === "success") {
      return `自動タグ準備完了（${taggedTrackCount}曲）`;
    }

    if (genreStatus === "loading") {
      return "自動タグを準備中";
    }

    if (genreStatus === "error") {
      return "自動タグを取得できません";
    }

    return "自動タグ待機中";
  }

  function updateTagDraft(trackId, value) {
    setTagDrafts((currentDrafts) => ({
      ...currentDrafts,
      [trackId]: value,
    }));
    setTagFeedback((currentFeedback) => ({
      ...currentFeedback,
      [trackId]: "",
    }));
  }

  function handleTagSubmit(event, trackId) {
    event.preventDefault();

    const result = onAddUserTag?.(trackId, tagDrafts[trackId] || "");

    if (!result?.ok) {
      let message = "タグを追加できませんでした。";

      if (result?.reason === "empty") {
        message = "タグを入力してください。";
      } else if (result?.reason === "duplicate") {
        message = "同じタグはすでに追加されています。";
      } else if (result?.reason === "storage" && result.message) {
        message = result.message;
      }

      setTagFeedback((currentFeedback) => ({
        ...currentFeedback,
        [trackId]: message,
      }));
      return;
    }

    setTagDrafts((currentDrafts) => ({
      ...currentDrafts,
      [trackId]: "",
    }));
    setTagFeedback((currentFeedback) => ({
      ...currentFeedback,
      [trackId]: "",
    }));
  }

  function handleUserTagRemove(trackId, userTag) {
    const result = onRemoveUserTag?.(trackId, userTag);

    if (!result?.ok && result?.reason === "storage") {
      setTagFeedback((currentFeedback) => ({
        ...currentFeedback,
        [trackId]: result.message || "タグを削除できませんでした。",
      }));
      return;
    }

    setTagFeedback((currentFeedback) => ({
      ...currentFeedback,
      [trackId]: "",
    }));
  }

  function toggleArtistDetails(trackId, artistId) {
    if (openArtist?.trackId === trackId && openArtist?.artistId === artistId) {
      setOpenArtist(null);
      return;
    }

    setOpenArtist({ trackId, artistId });
    onFetchArtistDetails?.(artistId);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">楽曲一覧</p>
          <h2>プレイリストの楽曲</h2>
          {selectedPlaylist && (
            <>
              <p className="panel-subtitle">{selectedPlaylist.name}</p>
              <p className="panel-subtitle panel-subtitle-muted">
                {selectedPlaylist.totalTracks}曲 / {selectedPlaylist.ownerName}
              </p>
            </>
          )}
        </div>
        {tracksStatus === "success" && selectedPlaylist && (
          <div className="track-status-group">
            <span className="playlist-count">
              {isFiltered
                ? `${filteredTracks.length} / ${tracks.length}曲表示中`
                : `${tracks.length}曲表示中`}
            </span>
            {tracks.length > 0 && (
              <span className="playlist-count playlist-count-secondary">
                {getAutoTagStatusLabel()}
              </span>
            )}
          </div>
        )}
      </div>

      {!selectedPlaylist && (
        <div className="notice">
          <p>プレイリストを選ぶと楽曲を表示できます。</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "loading" && (
        <div className="notice">
          <p>Spotify から楽曲を取得しています...</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "error" && tracksError && (
        <div className="notice error">
          <p>{tracksError}</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "success" && tracks.length === 0 && (
        <div className="notice">
          <p>
            このプレイリストでは表示できる楽曲が見つかりませんでした。
            空のプレイリストか、ローカル曲・利用できない曲のみの可能性があります。
          </p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "success" && tracks.length > 0 && (
        <div className="creation-summary-grid track-summary-grid">
          <div className="creation-summary-card">
            <span className="creation-summary-label">表示中の楽曲</span>
            <strong>{tracks.length}曲</strong>
          </div>
          <div className="creation-summary-card">
            <span className="creation-summary-label">自動タグ付き</span>
            <strong>{taggedTrackCount}曲</strong>
          </div>
          <div className="creation-summary-card">
            <span className="creation-summary-label">手動タグ付き</span>
            <strong>{userTaggedTrackCount}曲</strong>
          </div>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "success" &&
        taggedTrackCount === 0 && (
          <div className="notice">
            <p>このプレイリストには自動タグを付けられませんでした。</p>
            <p>
              Spotify から使えるジャンル情報が返らず、アーティスト名や曲名・アルバム名のパターンからも補助タグを作れませんでした。
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "success" &&
        taggedTrackCount > 0 && (
          <div className="notice">
            <p>
              {taggedTrackCount}曲に合計{totalAutoTagCount}個の自動タグを用意しました。
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        genreStatus === "success" &&
        tagStorageStatus === "success" &&
        taggedTrackCount > 0 && (
          <div className="notice">
            <p>
              自動タグは Spotify の情報から都度生成しており、このブラウザには長期保存していません。
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        genreStatus === "success" &&
        tagStorageStatus === "error" &&
        tagStorageError && (
          <div className="notice error">
            <p>自動タグの準備中に問題が発生しました。</p>
            <p>{tagStorageError}</p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "loading" && (
          <div className="notice">
            <p>アーティスト情報から自動タグを準備しています...</p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "error" &&
        genreError && (
          <div className="notice error">
            <p>楽曲は読み込めましたが、自動タグを準備できませんでした。</p>
            <p>{genreError}</p>
          </div>
        )}

      {selectedPlaylist && tracksStatus === "success" && tracks.length > 0 && (
        <div className="track-filter-row">
          <div className="track-search-field tag-search-field">
            <input
              className="playlist-create-input"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="曲名・アーティスト名で検索"
              aria-label="楽曲を曲名またはアーティスト名で検索"
            />
            {searchQuery && (
              <button
                className="tag-search-clear-button"
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="検索条件をクリア"
              >
                ×
              </button>
            )}
          </div>
          {availableArtists.length > 0 && (
            <select
              className="playlist-create-select track-artist-filter"
              value={selectedArtistId}
              onChange={(event) => setSelectedArtistId(event.target.value)}
              aria-label="アーティストで楽曲を絞り込む"
            >
              <option value="">すべてのアーティスト</option>
              {availableArtists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          )}
          <select
            className="playlist-create-select track-sort-select"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label="楽曲の並び順"
          >
            <option value="default">標準の順序</option>
            <option value="popularity-desc">人気度が高い順</option>
            <option value="popularity-asc">人気度が低い順</option>
          </select>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        filteredTracks.length === 0 && (
          <div className="notice">
            <p>検索条件に一致する楽曲が見つかりませんでした。</p>
          </div>
        )}

      {selectedPlaylist && tracksStatus === "success" && filteredTracks.length > 0 && (
        <div className="track-bulk-bar">
          <label className="track-bulk-select-all">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              aria-label="表示中の曲をすべて選択"
            />
            <span>表示中の{sortedTracks.length}曲をすべて選択</span>
          </label>

          {selectedTrackIds.size > 0 && (
            <form className="track-bulk-tag-form" onSubmit={handleBulkTagSubmit}>
              <span className="track-bulk-count">{selectedTrackIds.size}曲を選択中</span>
              <input
                className="user-tag-input"
                type="text"
                value={bulkTagDraft}
                onChange={(event) => {
                  setBulkTagDraft(event.target.value);
                  setBulkTagFeedback("");
                }}
                placeholder="選択した曲に追加する手動タグ"
                aria-label="選択した曲に追加する手動タグ"
              />
              <button className="user-tag-add-button" type="submit">
                選択した曲に追加
              </button>
              <button
                className="secondary-button track-bulk-clear-button"
                type="button"
                onClick={clearSelection}
              >
                選択を解除
              </button>
            </form>
          )}

          {bulkTagFeedback && <p className="tag-feedback">{bulkTagFeedback}</p>}
        </div>
      )}

      {selectedPlaylist && tracksStatus === "success" && filteredTracks.length > 0 && (
        <div className="track-list">
          {sortedTracks.map((track) => (
            <article key={track.id} className="track-row">
              <label className="track-select">
                <input
                  type="checkbox"
                  checked={selectedTrackIds.has(track.id)}
                  onChange={() => toggleTrackSelection(track.id)}
                  aria-label={`${track.name} を選択`}
                />
              </label>
              <div className="track-artwork">
                {track.thumbnailUrl ? (
                  <img
                    src={track.thumbnailUrl}
                    alt={`${track.album} のジャケット画像`}
                    loading="lazy"
                  />
                ) : (
                  <div className="track-artwork-fallback">
                    {getTrackArtworkFallback(track.name)}
                  </div>
                )}
              </div>
              <div className="track-body">
                <div className="track-title-row">
                  <h3>{track.name}</h3>
                  <div className="track-title-meta">
                    <span
                      className="track-popularity-badge"
                      title="Spotify 上の人気度（0〜100）"
                    >
                      人気度 {track.popularity}
                    </span>
                    <span className="track-duration">
                      {formatDuration(track.durationMs)}
                    </span>
                  </div>
                </div>
                <p className="track-meta">
                  <ArtistNames
                    artists={track.artists}
                    trackId={track.id}
                    openArtist={openArtist}
                    onToggleArtist={toggleArtistDetails}
                  />
                </p>
                {openArtist?.trackId === track.id && (
                  <div className="artist-popover" role="dialog">
                    {(artistDetailsId !== openArtist.artistId ||
                      artistDetailsStatus === "loading") && (
                      <p>アーティスト情報を取得しています...</p>
                    )}
                    {artistDetailsId === openArtist.artistId &&
                      artistDetailsStatus === "error" && (
                        <p className="artist-popover-error">{artistDetailsError}</p>
                      )}
                    {artistDetailsId === openArtist.artistId &&
                      artistDetailsStatus === "success" &&
                      artistDetails && (
                        <div className="artist-popover-content">
                          {artistDetails.imageUrl && (
                            <img
                              className="artist-popover-image"
                              src={artistDetails.imageUrl}
                              alt={`${artistDetails.name} の画像`}
                              loading="lazy"
                            />
                          )}
                          <div className="artist-popover-info">
                            <strong>{artistDetails.name}</strong>
                            {artistDetails.genres.length > 0 && (
                              <p className="track-meta">
                                {artistDetails.genres.map(formatTagLabel).join(", ")}
                              </p>
                            )}
                            <p className="track-meta">
                              人気度 {artistDetails.popularity} / フォロワー{" "}
                              {artistDetails.followers.toLocaleString("ja-JP")}人
                            </p>
                            {artistDetails.spotifyUrl && (
                              <a
                                className="track-artist-link"
                                href={artistDetails.spotifyUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Spotify で見る
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    <button
                      type="button"
                      className="artist-popover-close"
                      onClick={() => setOpenArtist(null)}
                      aria-label="アーティスト詳細を閉じる"
                    >
                      ×
                    </button>
                  </div>
                )}
                <p className="track-meta">{track.album}</p>
                {(track.autoTags?.length > 0 || track.userTags?.length > 0) && (
                  <div className="track-tag-row">
                    {track.autoTags.map((tag) => (
                      <span key={`${track.id}-${tag}`} className="auto-tag">
                        {formatTagLabel(tag)}
                      </span>
                    ))}
                    {track.userTags.map((tag) => (
                      <button
                        key={`${track.id}-user-${tag}`}
                        className="user-tag"
                        type="button"
                        onClick={() => handleUserTagRemove(track.id, tag)}
                        aria-label={`${formatTagLabel(tag)} を削除`}
                        title={`${formatTagLabel(tag)} を削除`}
                      >
                        <span>{formatTagLabel(tag)}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}
                <form
                  className="user-tag-form"
                  onSubmit={(event) => handleTagSubmit(event, track.id)}
                >
                  <input
                    className="user-tag-input"
                    type="text"
                    value={tagDrafts[track.id] || ""}
                    onChange={(event) => updateTagDraft(track.id, event.target.value)}
                    placeholder="手動タグを追加"
                    aria-label={`${track.name} に手動タグを追加`}
                  />
                  <button className="user-tag-add-button" type="submit">
                    追加
                  </button>
                </form>
                {tagFeedback[track.id] && (
                  <p className="tag-feedback">{tagFeedback[track.id]}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PlaylistTracks;
