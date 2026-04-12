/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";

function buildDefaultPlaylistName(selectedPlaylist, selectedTag) {
  if (!selectedPlaylist?.name || !selectedTag) {
    return "";
  }

  return `${selectedPlaylist.name} - ${selectedTag}`;
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
  const [playlistName, setPlaylistName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [formError, setFormError] = useState("");
  const [isPlaylistNameDirty, setIsPlaylistNameDirty] = useState(false);

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

  const availableTagOptions =
    selectedTagType === "auto" ? availableAutoTags : availableUserTags;
  const filteredTagOptions = useMemo(() => {
    const normalizedQuery = tagSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableTagOptions;
    }

    return availableTagOptions.filter((tag) =>
      tag.toLowerCase().includes(normalizedQuery)
    );
  }, [availableTagOptions, tagSearchQuery]);

  const matchedTracks = useMemo(() => {
    if (!selectedTagValue) {
      return [];
    }

    return tracks.filter((track) =>
      (selectedTagType === "auto" ? track.autoTags : track.userTags || []).some((tag) =>
        tag.toLowerCase() === selectedTagValue.toLowerCase()
      )
    );
  }, [selectedTagType, selectedTagValue, tracks]);

  useEffect(() => {
    setSelectedTagType("user");
    setSelectedTagValue("");
    setTagSearchQuery("");
    setIsTagMenuOpen(false);
    setPlaylistName("");
    setVisibility("private");
    setFormError("");
    setIsPlaylistNameDirty(false);
  }, [selectedPlaylist?.id]);

  useEffect(() => {
    if (availableUserTags.length > 0) {
      setSelectedTagType((currentType) =>
        currentType === "auto" || currentType === "user" ? currentType : "user"
      );
      return;
    }

    if (availableAutoTags.length > 0) {
      setSelectedTagType("auto");
      return;
    }

    setSelectedTagValue("");
  }, [availableAutoTags.length, availableUserTags.length]);

  useEffect(() => {
    if (availableTagOptions.length === 0) {
      setSelectedTagValue("");
      setTagSearchQuery("");
      return;
    }

    setSelectedTagValue((currentTag) =>
      currentTag && availableTagOptions.includes(currentTag)
        ? currentTag
        : availableTagOptions[0]
    );
  }, [availableTagOptions]);

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
    setIsTagMenuOpen(false);
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  function updateSelectedTagValue(nextTag) {
    setSelectedTagValue(nextTag);
    setTagSearchQuery(nextTag);
    setIsTagMenuOpen(false);
    setFormError("");
    onResetPlaylistCreationState?.();
  }

  function updateTagSearchQuery(nextQuery) {
    setTagSearchQuery(nextQuery);
    setIsTagMenuOpen(true);

    const exactMatch = availableTagOptions.find(
      (tag) => tag.toLowerCase() === nextQuery.trim().toLowerCase()
    );

    setSelectedTagValue(exactMatch || "");
    setFormError("");
    onResetPlaylistCreationState?.();
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
              {selectedPlaylist.name} に付いている自動タグまたは手動タグを使って、新しいプレイリストを作成できます。
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
        availableAutoTags.length === 0 && (
        <div className="notice">
          <p>自動タグの準備を待つか、手動タグを追加してから作成してください。</p>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        (availableUserTags.length > 0 || availableAutoTags.length > 0) && (
        <form className="playlist-create-form" onSubmit={handleSubmit}>
          <label className="playlist-create-field">
            <span className="playlist-create-label">タグの種類</span>
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
            </select>
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">
              {selectedTagType === "auto" ? "自動タグ" : "手動タグ"}
            </span>
            <div className="tag-search-field">
              <input
                className="playlist-create-input"
                type="text"
                value={tagSearchQuery}
                onChange={(event) => updateTagSearchQuery(event.target.value)}
                onFocus={() => setIsTagMenuOpen(true)}
                onBlur={handleTagInputBlur}
                placeholder={
                  selectedTagType === "auto"
                    ? "自動タグを検索"
                    : "手動タグを検索"
                }
                aria-label={
                  selectedTagType === "auto"
                    ? "自動タグを検索"
                    : "手動タグを検索"
                }
              />
              {isTagMenuOpen && (
                <div className="tag-search-results">
                  {filteredTagOptions.length > 0 ? (
                    filteredTagOptions.map((tag) => (
                      <button
                        key={tag}
                        className={`tag-search-option${
                          tag === selectedTagValue ? " tag-search-option-selected" : ""
                        }`}
                        type="button"
                        onMouseDown={() => updateSelectedTagValue(tag)}
                      >
                        {tag}
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
                <span className="creation-summary-label">選択中のタグ</span>
                <strong>{selectedTagValue}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">タグの種類</span>
                <strong>{selectedTagType === "auto" ? "自動" : "手動"}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">公開設定</span>
                <strong>{visibility === "public" ? "公開" : "非公開"}</strong>
              </div>
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
                「{createdPlaylist.tagValue}」の{createdPlaylist.tagTypeLabel}タグから
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
