/* eslint-disable react/prop-types */

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

function PlaylistTracks({
  selectedPlaylist,
  tracks,
  tracksError,
  tracksStatus,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 3 / Tracks</p>
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
          <span className="playlist-count">{tracks.length} loaded</span>
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
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PlaylistTracks;
