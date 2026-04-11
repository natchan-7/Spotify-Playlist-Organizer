/* eslint-disable react/prop-types */

function decodeDescription(description) {
  if (!description) {
    return "";
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = description;
  return textarea.value;
}

function getVisibilityLabel(playlist) {
  if (playlist.isCollaborative) {
    return "Collaborative";
  }

  return playlist.isPublic ? "Public" : "Private";
}

function canViewPlaylistTracks(playlist, currentUserId) {
  if (playlist.isCollaborative) {
    return true;
  }

  if (!currentUserId) {
    return true;
  }

  return playlist.ownerId === currentUserId;
}

function PlaylistCollection({
  playlists,
  playlistsError,
  playlistsStatus,
  currentUserId,
  onSelectPlaylist,
  selectedPlaylistId,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Step 2 / Playlists</p>
          <h2>Your Spotify playlists</h2>
        </div>
        {playlistsStatus === "success" && (
          <span className="playlist-count">{playlists.length} loaded</span>
        )}
      </div>

      {playlistsStatus === "idle" && (
        <div className="notice">
          <p>Log in to load your Spotify playlists.</p>
        </div>
      )}

      {playlistsStatus === "loading" && (
        <div className="notice">
          <p>Fetching playlists from Spotify...</p>
        </div>
      )}

      {playlistsStatus === "error" && playlistsError && (
        <div className="notice error">
          <p>{playlistsError}</p>
        </div>
      )}

      {playlistsStatus === "success" && playlists.length === 0 && (
        <div className="notice">
          <p>No playlists were returned for this Spotify account yet.</p>
        </div>
      )}

      {playlistsStatus === "success" && playlists.length > 0 && (
        <div className="playlist-grid">
          {playlists.map((playlist) => {
            const isSelected = playlist.id === selectedPlaylistId;
            const canViewTracks = canViewPlaylistTracks(playlist, currentUserId);

            return (
              <article
                key={playlist.id}
                className={isSelected ? "playlist-card playlist-card-selected" : "playlist-card"}
              >
                <div className="playlist-artwork">
                  {playlist.imageUrl ? (
                    <img
                      src={playlist.imageUrl}
                      alt={`${playlist.name} cover art`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="playlist-artwork-fallback">
                      {playlist.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="playlist-card-body">
                  <div className="playlist-card-top">
                    <h3>{playlist.name}</h3>
                    <span className="playlist-pill">{getVisibilityLabel(playlist)}</span>
                  </div>
                  <p className="playlist-meta">
                    {playlist.totalTracks} tracks by {playlist.ownerName}
                  </p>
                  {playlist.description && (
                    <p className="playlist-description">
                      {decodeDescription(playlist.description)}
                    </p>
                  )}
                  {!canViewTracks && (
                    <p className="playlist-helper">
                      Spotify only returns tracks for playlists you own or collaborate on.
                    </p>
                  )}
                  <div className="playlist-card-footer">
                    {playlist.spotifyUrl ? (
                      <a
                        className="playlist-link"
                        href={playlist.spotifyUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open in Spotify
                      </a>
                    ) : (
                      <span className="playlist-link disabled">Spotify link unavailable</span>
                    )}
                    <button
                      className="playlist-select-button"
                      type="button"
                      onClick={() => onSelectPlaylist?.(playlist.id)}
                      disabled={isSelected || !canViewTracks}
                    >
                      {isSelected
                        ? "Selected"
                        : canViewTracks
                          ? "View tracks"
                          : "Unavailable"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default PlaylistCollection;
