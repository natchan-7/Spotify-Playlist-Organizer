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
  }, [selectedPlaylist?.id]);

  useEffect(() => {
    if (!selectedUserTag) {
      setPlaylistName("");
      return;
    }

    setPlaylistName((currentName) =>
      currentName ? currentName : buildDefaultPlaylistName(selectedPlaylist, selectedUserTag)
    );
  }, [selectedPlaylist, selectedUserTag]);

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
      setFormError(result?.message || "Playlist creation failed.");
    }
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
              onChange={(event) => setSelectedUserTag(event.target.value)}
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
              onChange={(event) => setPlaylistName(event.target.value)}
              placeholder="New Spotify playlist name"
            />
          </label>

          <label className="playlist-create-field">
            <span className="playlist-create-label">Visibility</span>
            <select
              className="playlist-create-select"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>

          {selectedUserTag && (
            <div className="notice">
              <p>
                {matchedTracks.length} tracks currently match the user tag "{selectedUserTag}".
              </p>
            </div>
          )}

          {formError && (
            <div className="notice error">
              <p>{formError}</p>
            </div>
          )}

          {playlistCreationStatus === "error" && playlistCreationError && (
            <div className="notice error">
              <p>{playlistCreationError}</p>
            </div>
          )}

          {playlistCreationStatus === "success" && createdPlaylist && (
            <div className="notice">
              <p>
                Created "{createdPlaylist.name}" from the user tag "{createdPlaylist.userTag}".
              </p>
              <p>
                Added {createdPlaylist.addedTrackCount} tracks
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
