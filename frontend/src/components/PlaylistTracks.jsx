/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";

function formatDuration(durationMs) {
  if (!durationMs) {
    return "0:00";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatArtists(artists) {
  if (!Array.isArray(artists) || artists.length === 0) {
    return "Unknown artist";
  }

  return artists.map((artist) => artist.name).join(", ");
}

function getTrackArtworkFallback(trackName) {
  return trackName ? trackName.slice(0, 1).toUpperCase() : "T";
}

function formatTagLabel(tag) {
  if (!tag) {
    return "";
  }

  if (/[A-Z]/.test(tag)) {
    return tag;
  }

  return tag
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function PlaylistTracks({
  genreError,
  genreStatus,
  onAddUserTag,
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
  const totalAutoTagCount = tracks.reduce(
    (count, track) => count + (track.autoTags?.length || 0),
    0
  );
  const [tagDrafts, setTagDrafts] = useState({});
  const [tagFeedback, setTagFeedback] = useState({});

  useEffect(() => {
    setTagDrafts({});
    setTagFeedback({});
  }, [selectedPlaylist?.id]);

  function getAutoTagStatusLabel() {
    if (genreStatus === "success") {
      return `Auto tags ready (${taggedTrackCount} tagged)`;
    }

    if (genreStatus === "loading") {
      return "Preparing auto tags";
    }

    if (genreStatus === "error") {
      return "Auto tags unavailable";
    }

    return "Auto tags idle";
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
      let message = "Tag could not be added.";

      if (result?.reason === "empty") {
        message = "Enter a tag before adding it.";
      } else if (result?.reason === "duplicate") {
        message = "That tag is already attached to this track.";
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
        [trackId]: result.message || "Tag could not be removed.",
      }));
      return;
    }

    setTagFeedback((currentFeedback) => ({
      ...currentFeedback,
      [trackId]: "",
    }));
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 3 / Tracks + Step 4 / Auto Tags</p>
          <h2>Playlist tracks</h2>
          {selectedPlaylist && (
            <>
              <p className="panel-subtitle">{selectedPlaylist.name}</p>
              <p className="panel-subtitle panel-subtitle-muted">
                {selectedPlaylist.totalTracks} tracks by {selectedPlaylist.ownerName}
              </p>
            </>
          )}
        </div>
        {tracksStatus === "success" && selectedPlaylist && (
          <div className="track-status-group">
            <span className="playlist-count">{tracks.length} loaded</span>
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
          <p>Select a playlist to load its tracks.</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "loading" && (
        <div className="notice">
          <p>Fetching tracks from Spotify...</p>
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
            No supported Spotify track items were returned for this playlist.
            This usually means the playlist is empty, or it only contains local
            or unavailable items.
          </p>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "success" &&
        taggedTrackCount === 0 && (
          <div className="notice">
            <p>No automatic genre tags were added to this playlist.</p>
            <p>
              Spotify did not return usable genres, and there were no artist-name
              fallback tags available for these tracks.
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
              Prepared {totalAutoTagCount} automatic genre tags across{" "}
              {taggedTrackCount} tracks.
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        genreStatus === "success" &&
        tagStorageStatus === "success" &&
        tagStorageSummary?.updatedTrackCount > 0 && (
          <div className="notice">
            <p>
              Saved {tagStorageSummary.savedAutoTagCount} automatic tags for{" "}
              {tagStorageSummary.updatedTrackCount} tracks in this browser.
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        genreStatus === "success" &&
        tagStorageStatus === "success" &&
        tagStorageSummary &&
        tagStorageSummary.updatedTrackCount === 0 &&
        taggedTrackCount > 0 && (
          <div className="notice">
            <p>Automatic tags were already stored for the tracks shown here.</p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        genreStatus === "success" &&
        tagStorageStatus === "error" &&
        tagStorageError && (
          <div className="notice error">
            <p>Automatic tags were prepared, but saving them in this browser failed.</p>
            <p>{tagStorageError}</p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "loading" && (
          <div className="notice">
            <p>Preparing automatic genre tags from the playlist artists...</p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "error" &&
        genreError && (
          <div className="notice error">
            <p>Tracks loaded, but automatic genre tags could not be prepared.</p>
            <p>{genreError}</p>
          </div>
        )}

      {selectedPlaylist && tracksStatus === "success" && tracks.length > 0 && (
        <div className="track-list">
          {tracks.map((track) => (
            <article key={track.id} className="track-row">
              <div className="track-artwork">
                {track.thumbnailUrl ? (
                  <img
                    src={track.thumbnailUrl}
                    alt={`${track.album} album art`}
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
                  <span className="track-duration">
                    {formatDuration(track.durationMs)}
                  </span>
                </div>
                <p className="track-meta">{formatArtists(track.artists)}</p>
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
                      >
                        {formatTagLabel(tag)} x
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
                    placeholder="Add a user tag"
                    aria-label={`Add a user tag for ${track.name}`}
                  />
                  <button className="user-tag-add-button" type="submit">
                    Add tag
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
