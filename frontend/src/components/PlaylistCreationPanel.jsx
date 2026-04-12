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
    setTagSearchQuery(selectedTagValue);
  }, [selectedTagValue]);

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
      setFormError("Select an auto tag or user tag before creating a playlist.");
      return;
    }

    if (!playlistName.trim()) {
      setFormError("Enter a playlist name before creating it.");
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
        setFormError(result?.message || "Playlist creation failed.");
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
          <p className="eyebrow">Step 8 / Create Playlist</p>
          <h2>Create a filtered Spotify playlist</h2>
          {selectedPlaylist && (
            <p className="panel-subtitle">
              Build a new playlist from the automatic or user tags attached to {selectedPlaylist.name}.
            </p>
          )}
        </div>
        {selectedPlaylist && tracksStatus === "success" && (
          <span className="playlist-count">
            {availableAutoTags.length + availableUserTags.length} tags ready
          </span>
        )}
      </div>

      {!selectedPlaylist && (
        <div className="notice">
          <p>Select a playlist first, then choose an automatic or user tag.</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus !== "success" && (
        <div className="notice">
          <p>Load tracks before creating a filtered playlist.</p>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        availableUserTags.length === 0 &&
        availableAutoTags.length === 0 && (
        <div className="notice">
          <p>Wait for automatic tags or add a user tag to a track before creating a playlist.</p>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        (availableUserTags.length > 0 || availableAutoTags.length > 0) && (
        <form className="playlist-create-form" onSubmit={handleSubmit}>
          <label className="playlist-create-field">
            <span className="playlist-create-label">Tag source</span>
            <select
              className="playlist-create-select"
              value={selectedTagType}
              onChange={(event) => updateSelectedTagType(event.target.value)}
            >
              {availableAutoTags.length > 0 && (
                <option value="auto">Automatic tags</option>
              )}
              {availableUserTags.length > 0 && (
                <option value="user">User tags</option>
              )}
            </select>
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">
              {selectedTagType === "auto" ? "Automatic tag" : "User tag"}
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
                    ? "Search automatic tags"
                    : "Search user tags"
                }
                aria-label={
                  selectedTagType === "auto"
                    ? "Search automatic tags"
                    : "Search user tags"
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
                    <div className="tag-search-empty">No matching tags found.</div>
                  )}
                </div>
              )}
            </div>
            <span className="playlist-create-help">
              {filteredTagOptions.length} match{filteredTagOptions.length === 1 ? "" : "es"}
              {availableTagOptions.length > filteredTagOptions.length
                ? ` out of ${availableTagOptions.length}`
                : ""}
            </span>
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">Playlist name</span>
            <input
              className="playlist-create-input"
              type="text"
              value={playlistName}
              onChange={(event) => updatePlaylistName(event.target.value)}
              placeholder="New Spotify playlist name"
            />
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">Visibility</span>
            <select
              className="playlist-create-select"
              value={visibility}
              onChange={(event) => updateVisibility(event.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>

          {selectedTagValue && (
            <div className="creation-summary-grid">
              <div className="creation-summary-card">
                <span className="creation-summary-label">Matching tracks</span>
                <strong>{matchedTracks.length}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">Selected tag</span>
                <strong>{selectedTagValue}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">Tag source</span>
                <strong>{selectedTagType === "auto" ? "Automatic" : "User"}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">Visibility</span>
                <strong>{visibility}</strong>
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
                Created "{createdPlaylist.name}" from the {createdPlaylist.tagTypeLabel} tag "{createdPlaylist.tagValue}".
              </p>
              <p>
                Added {createdPlaylist.addedTrackCount} tracks from {selectedPlaylist?.name}
                {createdPlaylist.spotifyUrl ? (
                  <>
                    .{" "}
                    <a
                      className="playlist-link"
                      href={createdPlaylist.spotifyUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open in Spotify
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
                ? "Creating playlist..."
                : "Create playlist"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default PlaylistCreationPanel;
