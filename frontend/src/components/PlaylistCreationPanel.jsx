/* eslint-disable react/prop-types */
import { useDeferredValue, useEffect, useMemo, useState } from "react";

function buildDefaultPlaylistName(selectedPlaylist, selectedTag) {
  if (!selectedPlaylist?.name || !selectedTag) {
    return "";
  }

  return `${selectedPlaylist.name} - ${selectedTag}`;
}

function formatArtists(artists) {
  if (!Array.isArray(artists) || artists.length === 0) {
    return "不明なアーティスト";
  }

  return artists.map((artist) => artist.name).join(", ");
}

function PlaylistCreationPanel({
  createdPlaylist,
  onCreatePlaylistFromTag,
  onResetPlaylistCreationState,
  playlistCreationError,
  playlistCreationStatus,
  selectedPlaylist,
  tracks,
  tracksStatus,
}) {
  const [selectedTagType, setSelectedTagType] = useState("user");
  const [selectedTagValue, setSelectedTagValue] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const [highlightedTagIndex, setHighlightedTagIndex] = useState(-1);
  const [playlistName, setPlaylistName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [formError, setFormError] = useState("");
  const [isPlaylistNameDirty, setIsPlaylistNameDirty] = useState(false);
  const deferredTagSearchQuery = useDeferredValue(tagSearchQuery);

  const availableUserTags = useMemo(
    () =>
      Array.from(
        new Set(
          tracks.flatMap((track) =>
            (track.userTags || []).filter((tag) => typeof tag === "string" && tag)
          )
        )
      ).sort((left, right) => left.localeCompare(right)),
    [tracks]
  );

  const availableAutoTags = useMemo(
    () =>
      Array.from(
        new Set(
          tracks.flatMap((track) =>
            (track.autoTags || []).filter((tag) => typeof tag === "string" && tag)
          )
        )
      ).sort((left, right) => left.localeCompare(right)),
    [tracks]
  );

  const availableArtistNames = useMemo(
    () =>
      Array.from(
        new Set(
          tracks.flatMap((track) =>
            (track.artists || [])
              .map((artist) => artist?.name)
              .filter((name) => typeof name === "string" && name)
          )
        )
      ).sort((left, right) => left.localeCompare(right, "ja")),
    [tracks]
  );

  const availableTagOptions =
    selectedTagType === "auto"
      ? availableAutoTags
      : selectedTagType === "artist"
      ? availableArtistNames
      : availableUserTags;

  const tagTrackCounts = useMemo(() => {
    const counts = new Map();

    for (const track of tracks) {
      const values =
        selectedTagType === "artist"
          ? (track.artists || []).map((artist) => artist?.name).filter(Boolean)
          : (selectedTagType === "auto" ? track.autoTags : track.userTags) || [];

      for (const value of values) {
        if (typeof value !== "string" || !value) {
          continue;
        }

        const key = value.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    return counts;
  }, [selectedTagType, tracks]);

  const filteredTagOptions = useMemo(() => {
    const normalizedQuery = deferredTagSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableTagOptions;
    }

    return availableTagOptions.filter((tag) =>
      tag.toLowerCase().includes(normalizedQuery)
    );
  }, [availableTagOptions, deferredTagSearchQuery]);

  const matchedTracks = useMemo(() => {
    if (!selectedTagValue) {
      return [];
    }

    if (selectedTagType === "artist") {
      return tracks.filter((track) =>
        (track.artists || []).some(
          (artist) => artist?.name?.toLowerCase() === selectedTagValue.toLowerCase()
        )
      );
    }

    return tracks.filter((track) =>
      (selectedTagType === "auto" ? track.autoTags : track.userTags || []).some((tag) =>
        tag.toLowerCase() === selectedTagValue.toLowerCase()
      )
    );
  }, [selectedTagType, selectedTagValue, tracks]);
  const previewTracks = matchedTracks.slice(0, 5);

  useEffect(() => {
    setSelectedTagType("user");
    setSelectedTagValue("");
    setTagSearchQuery("");
    setIsTagMenuOpen(false);
    setHighlightedTagIndex(-1);
    setPlaylistName("");
    setVisibility("private");
    setFormError("");
    setIsPlaylistNameDirty(false);
  }, [selectedPlaylist?.id]);

  useEffect(() => {
    if (availableUserTags.length > 0) {
      setSelectedTagType((currentType) =>
        currentType === "auto" || currentType === "user" || currentType === "artist"
          ? currentType
          : "user"
      );
      return;
    }

    if (availableAutoTags.length > 0) {
      setSelectedTagType((currentType) => (currentType === "artist" ? currentType : "auto"));
      return;
    }

    setSelectedTagValue("");
    setTagSearchQuery("");
  }, [availableAutoTags.length, availableUserTags.length]);

  useEffect(() => {
    if (
      selectedTagValue &&
      !availableTagOptions.some((tag) => tag.toLowerCase() === selectedTagValue.toLowerCase())
    ) {
      setSelectedTagValue("");
      setTagSearchQuery("");
    }
  }, [availableTagOptions, selectedTagValue]);

  useEffect(() => {
    if (!isTagMenuOpen || filteredTagOptions.length === 0) {
      setHighlightedTagIndex(-1);
      return;
    }

    setHighlightedTagIndex((currentIndex) => {
      if (currentIndex < 0 || currentIndex >= filteredTagOptions.length) {
        return 0;
      }

      return currentIndex;
    });
  }, [filteredTagOptions, isTagMenuOpen]);

  useEffect(() => {
    if (!selectedTagValue) {
      if (!isPlaylistNameDirty) {
        setPlaylistName("");
      }
      return;
    }

    if (!isPlaylistNameDirty) {
      setPlaylistName(buildDefaultPlaylistName(selectedPlaylist, selectedTagValue));
    }
  }, [isPlaylistNameDirty, selectedPlaylist, selectedTagValue]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedTagValue) {
      setFormError("プレイリストを作成する前にタグを選択してください。");
      return;
    }

    if (!playlistName.trim()) {
      setFormError("プレイリスト名を入力してください。");
      return;
    }

    setFormError("");

    const result = await onCreatePlaylistFromTag?.({
      sourcePlaylist: selectedPlaylist,
      tagType: selectedTagType,
      tagValue: selectedTagValue,
      playlistName,
      isPublic: visibility === "public",
    });

    if (!result?.ok) {
      if (result?.reason === "validation" || result?.reason === "scope") {
        setFormError(result?.message || "プレイリストを作成できませんでした。");
      }
    }
  }

  function updateSelectedTagType(nextTagType) {
    setSelectedTagType(nextTagType);
    setSelectedTagValue("");
    setTagSearchQuery("");
    setIsTagMenuOpen(false);
    setHighlightedTagIndex(-1);
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  function updateSelectedTagValue(nextTag) {
    setSelectedTagValue(nextTag);
    setTagSearchQuery(nextTag);
    setIsTagMenuOpen(false);
    setHighlightedTagIndex(-1);
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  function updateTagSearchQuery(nextQuery) {
    setTagSearchQuery(nextQuery);
    setIsTagMenuOpen(true);
    setHighlightedTagIndex(0);

    const exactMatch = availableTagOptions.find(
      (tag) => tag.toLowerCase() === nextQuery.trim().toLowerCase()
    );

    setSelectedTagValue(exactMatch || "");
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  function clearSelectedTag() {
    setSelectedTagValue("");
    setTagSearchQuery("");
    setIsTagMenuOpen(false);
    setHighlightedTagIndex(-1);
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  function handleTagInputKeyDown(event) {
    if (event.key === "Escape") {
      setIsTagMenuOpen(false);
      setHighlightedTagIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isTagMenuOpen) {
        setIsTagMenuOpen(true);
      }

      if (filteredTagOptions.length === 0) {
        return;
      }

      setHighlightedTagIndex((currentIndex) =>
        currentIndex < 0 || currentIndex >= filteredTagOptions.length - 1
          ? 0
          : currentIndex + 1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isTagMenuOpen) {
        setIsTagMenuOpen(true);
      }

      if (filteredTagOptions.length === 0) {
        return;
      }

      setHighlightedTagIndex((currentIndex) =>
        currentIndex <= 0 ? filteredTagOptions.length - 1 : currentIndex - 1
      );
      return;
    }

    if (event.key === "Enter" && isTagMenuOpen) {
      const highlightedTag = filteredTagOptions[highlightedTagIndex];
      const exactMatch = availableTagOptions.find(
        (tag) => tag.toLowerCase() === tagSearchQuery.trim().toLowerCase()
      );

      if (highlightedTag || exactMatch) {
        event.preventDefault();
        updateSelectedTagValue(highlightedTag || exactMatch);
      }
    }
  }

  function handleTagInputBlur() {
    window.setTimeout(() => {
      setIsTagMenuOpen(false);
    }, 120);
  }

  function updatePlaylistName(nextPlaylistName) {
    setPlaylistName(nextPlaylistName);
    setIsPlaylistNameDirty(true);
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  function updateVisibility(nextVisibility) {
    setVisibility(nextVisibility);
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">プレイリスト作成</p>
          <h2>タグで絞り込んだプレイリストを作成</h2>
          {selectedPlaylist && (
            <p className="panel-subtitle">
              {selectedPlaylist.name} に付いている自動タグ・手動タグ、またはアーティストを使って、新しいプレイリストを作成できます。
            </p>
          )}
        </div>
        {selectedPlaylist && tracksStatus === "success" && (
          <span className="playlist-count">
            {availableAutoTags.length + availableUserTags.length}件のタグ
          </span>
        )}
      </div>

      {!selectedPlaylist && (
        <div className="notice">
          <p>プレイリストを選んでから、使いたいタグを選択してください。</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus !== "success" && (
        <div className="notice">
          <p>まず楽曲を読み込んでください。</p>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        availableUserTags.length === 0 &&
        availableAutoTags.length === 0 &&
        availableArtistNames.length === 0 && (
        <div className="notice">
          <p>自動タグの準備を待つか、手動タグを追加してから作成してください。</p>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        (availableUserTags.length > 0 ||
          availableAutoTags.length > 0 ||
          availableArtistNames.length > 0) && (
        <form className="playlist-create-form" onSubmit={handleSubmit}>
          <label className="playlist-create-field">
            <span className="playlist-create-label">条件の種類</span>
            <select
              className="playlist-create-select"
              value={selectedTagType}
              onChange={(event) => updateSelectedTagType(event.target.value)}
            >
              {availableAutoTags.length > 0 && (
                <option value="auto">自動タグ</option>
              )}
              {availableUserTags.length > 0 && (
                <option value="user">手動タグ</option>
              )}
              {availableArtistNames.length > 0 && (
                <option value="artist">アーティスト</option>
              )}
            </select>
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">
              {selectedTagType === "auto"
                ? "自動タグ"
                : selectedTagType === "artist"
                ? "アーティスト"
                : "手動タグ"}
            </span>
            <div className="tag-search-field">
              <input
                className="playlist-create-input"
                type="text"
                value={tagSearchQuery}
                onChange={(event) => updateTagSearchQuery(event.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => setIsTagMenuOpen(true)}
                onBlur={handleTagInputBlur}
                placeholder={
                  selectedTagType === "auto"
                    ? "自動タグを検索"
                    : selectedTagType === "artist"
                    ? "アーティストを検索"
                    : "手動タグを検索"
                }
                aria-label={
                  selectedTagType === "auto"
                    ? "自動タグを検索"
                    : selectedTagType === "artist"
                    ? "アーティストを検索"
                    : "手動タグを検索"
                }
              />
              {(tagSearchQuery || selectedTagValue) && (
                <button
                  className="tag-search-clear-button"
                  type="button"
                  onMouseDown={clearSelectedTag}
                  aria-label="タグの検索条件をクリア"
                >
                  ×
                </button>
              )}
              {isTagMenuOpen && (
                <div className="tag-search-results">
                  {filteredTagOptions.length > 0 ? (
                    filteredTagOptions.map((tag, index) => (
                      <button
                        key={tag}
                        className={`tag-search-option${
                          tag === selectedTagValue || index === highlightedTagIndex
                            ? " tag-search-option-selected"
                            : ""
                        }`}
                        type="button"
                        onMouseDown={() => updateSelectedTagValue(tag)}
                      >
                        <span>{tag}</span>
                        <span className="tag-search-option-count">
                          {tagTrackCounts.get(tag.toLowerCase()) || 0}曲
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="tag-search-empty">一致するタグが見つかりません。</div>
                  )}
                </div>
              )}
            </div>
            <span className="playlist-create-help">
              {filteredTagOptions.length}件
              {availableTagOptions.length > filteredTagOptions.length
                ? ` / 全${availableTagOptions.length}件`
                : ""}
            </span>
            {selectedTagValue ? (
              <div className="tag-selection-summary">
                <span className="playlist-pill">選択中: {selectedTagValue}</span>
                <span className="playlist-create-help">
                  Enter で候補を確定、Esc で候補を閉じられます。
                </span>
              </div>
            ) : (
              <span className="playlist-create-help">
                候補をクリックするか、上下キーと Enter で選べます。
              </span>
            )}
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">プレイリスト名</span>
            <input
              className="playlist-create-input"
              type="text"
              value={playlistName}
              onChange={(event) => updatePlaylistName(event.target.value)}
              placeholder="新しいプレイリスト名"
            />
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">公開設定</span>
            <select
              className="playlist-create-select"
              value={visibility}
              onChange={(event) => updateVisibility(event.target.value)}
            >
              <option value="private">非公開</option>
              <option value="public">公開</option>
            </select>
          </label>

          {selectedTagValue && (
            <div className="creation-summary-grid">
              <div className="creation-summary-card">
                <span className="creation-summary-label">一致した曲数</span>
                <strong>{matchedTracks.length}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">
                  選択中の{selectedTagType === "artist" ? "アーティスト" : "タグ"}
                </span>
                <strong>{selectedTagValue}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">条件の種類</span>
                <strong>
                  {selectedTagType === "auto"
                    ? "自動タグ"
                    : selectedTagType === "artist"
                    ? "アーティスト"
                    : "手動タグ"}
                </strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">公開設定</span>
                <strong>{visibility === "public" ? "公開" : "非公開"}</strong>
              </div>
            </div>
          )}

          {selectedTagValue && matchedTracks.length > 0 && (
            <div className="playlist-preview-panel">
              <div className="playlist-preview-header">
                <div>
                  <h3>作成前プレビュー</h3>
                  <p>「{selectedTagValue}」に一致する楽曲を追加します。</p>
                </div>
                <span className="playlist-count playlist-count-secondary">
                  {matchedTracks.length}曲
                </span>
              </div>
              <div className="playlist-preview-list">
                {previewTracks.map((track) => (
                  <div key={`preview-${track.id}`} className="playlist-preview-row">
                    <strong>{track.name}</strong>
                    <span>{formatArtists(track.artists)}</span>
                  </div>
                ))}
              </div>
              {matchedTracks.length > previewTracks.length && (
                <p className="playlist-preview-more">
                  ほか {matchedTracks.length - previewTracks.length}曲も追加されます。
                </p>
              )}
            </div>
          )}

          {formError && (
            <div className="notice error">
              <p>{formError}</p>
            </div>
          )}

          {playlistCreationStatus === "error" && playlistCreationError && !formError && (
            <div className="notice error">
              <p>{playlistCreationError}</p>
            </div>
          )}

          {playlistCreationStatus === "success" && createdPlaylist && (
            <div className="notice success-notice">
              <p>
                {createdPlaylist.tagType === "artist" ? (
                  <>「{createdPlaylist.tagValue}」の楽曲から</>
                ) : (
                  <>
                    「{createdPlaylist.tagValue}」の{createdPlaylist.tagTypeLabel}タグから
                  </>
                )}
                「{createdPlaylist.name}」を作成しました。
              </p>
              <p>
                {selectedPlaylist?.name} から {createdPlaylist.addedTrackCount}曲を追加しました
                {createdPlaylist.spotifyUrl ? (
                  <>
                    .{" "}
                    <a
                      className="playlist-link"
                      href={createdPlaylist.spotifyUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Spotifyで開く
                    </a>
                  </>
                ) : (
                  "."
                )}
              </p>
            </div>
          )}

          <div className="action-row">
            <button
              className="primary-button"
              type="submit"
              disabled={
                playlistCreationStatus === "loading" ||
                !selectedTagValue ||
                matchedTracks.length === 0
              }
            >
              {playlistCreationStatus === "loading"
                ? "作成中..."
                : "プレイリストを作成"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default PlaylistCreationPanel;
