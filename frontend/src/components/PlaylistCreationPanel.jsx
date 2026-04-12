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
  onCreatePlaylistFromUserTag,
  onResetPlaylistCreationState,
  playlistCreationError,
  playlistCreationStatus,
  selectedPlaylist,
  tracks,
  tracksStatus,
}) {
  const [selectedUserTag, setSelectedUserTag] = useState("");
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

  const matchedTracks = useMemo(() => {
    if (!selectedUserTag) {
      return [];
    }

    return tracks.filter((track) =>
      (track.userTags || []).some(
        (tag) => tag.toLowerCase() === selectedUserTag.toLowerCase()
      )
    );
  }, [selectedUserTag, tracks]);

  useEffect(() => {
    setSelectedUserTag("");
    setPlaylistName("");
    setVisibility("private");
    setFormError("");
    setIsPlaylistNameDirty(false);
  }, [selectedPlaylist?.id]);

  useEffect(() => {
    if (availableUserTags.length === 0) {
      setSelectedUserTag("");
      return;
    }

    setSelectedUserTag((currentTag) =>
      currentTag && availableUserTags.includes(currentTag)
        ? currentTag
        : availableUserTags[0]
    );
  }, [availableUserTags]);

  useEffect(() => {
    if (!selectedUserTag) {
      if (!isPlaylistNameDirty) {
        setPlaylistName("");
      }
      return;
    }

    if (!isPlaylistNameDirty) {
      setPlaylistName(buildDefaultPlaylistName(selectedPlaylist, selectedUserTag));
    }
  }, [isPlaylistNameDirty, selectedPlaylist, selectedUserTag]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedUserTag) {
      setFormError("Select a user tag before creating a playlist.");
      return;
    }

    if (!playlistName.trim()) {
      setFormError("Enter a playlist name before creating it.");
      return;
    }

    setFormError("");

    const result = await onCreatePlaylistFromUserTag?.({
      sourcePlaylist: selectedPlaylist,
      userTag: selectedUserTag,
      playlistName,
      isPublic: visibility === "public",
    });

    if (!result?.ok) {
      if (result?.reason === "validation" || result?.reason === "scope") {
        setFormError(result?.message || "Playlist creation failed.");
      }
    }
  }

  function updateSelectedUserTag(nextTag) {
    setSelectedUserTag(nextTag);
    setFormError("");
    onResetPlaylistCreationState?.();
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
              Build a new playlist from the user tags attached to {selectedPlaylist.name}.
            </p>
          )}
        </div>
        {selectedPlaylist && tracksStatus === "success" && (
          <span className="playlist-count">
            {availableUserTags.length} user tags
          </span>
        )}
      </div>

      {!selectedPlaylist && (
        <div className="notice">
          <p>Select a playlist first, then add user tags to its tracks.</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus !== "success" && (
        <div className="notice">
          <p>Load tracks before creating a filtered playlist.</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "success" && availableUserTags.length === 0 && (
        <div className="notice">
          <p>Add at least one user tag to a track before creating a playlist.</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "success" && availableUserTags.length > 0 && (
        <form className="playlist-create-form" onSubmit={handleSubmit}>
          <label className="playlist-create-field">
            <span className="playlist-create-label">User tag</span>
            <select
              className="playlist-create-select"
              value={selectedUserTag}
              onChange={(event) => updateSelectedUserTag(event.target.value)}
            >
              <option value="">Select a user tag</option>
              {availableUserTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
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

          {selectedUserTag && (
            <div className="creation-summary-grid">
              <div className="creation-summary-card">
                <span className="creation-summary-label">Matching tracks</span>
                <strong>{matchedTracks.length}</strong>
              </div>
              <div className="creation-summary-card">
                <span className="creation-summary-label">Selected tag</span>
                <strong>{selectedUserTag}</strong>
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
                Created "{createdPlaylist.name}" from the user tag "{createdPlaylist.userTag}".
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
                !selectedUserTag ||
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
