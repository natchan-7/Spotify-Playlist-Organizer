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
    return "共同編集";
  }

  return playlist.isPublic ? "公開" : "非公開";
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
          <p className="eyebrow">プレイリスト一覧</p>
          <h2>あなたのSpotifyプレイリスト</h2>
        </div>
        {playlistsStatus === "success" && (
          <span className="playlist-count">{playlists.length}件</span>
        )}
      </div>

      {playlistsStatus === "idle" && (
        <div className="notice">
          <p>ログインするとプレイリストを読み込めます。</p>
        </div>
      )}

      {playlistsStatus === "loading" && (
        <div className="notice">
          <p>Spotify からプレイリストを取得しています...</p>
        </div>
      )}

      {playlistsStatus === "error" && playlistsError && (
        <div className="notice error">
          <p>{playlistsError}</p>
        </div>
      )}

      {playlistsStatus === "success" && playlists.length === 0 && (
        <div className="notice">
          <p>この Spotify アカウントには、まだプレイリストがありません。</p>
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
                      alt={`${playlist.name} のカバー画像`}
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
                    {playlist.totalTracks}曲 / {playlist.ownerName}
                  </p>
                  {playlist.description && (
                    <p className="playlist-description">
                      {decodeDescription(playlist.description)}
                    </p>
                  )}
                  {!canViewTracks && (
                    <p className="playlist-helper">
                      自分が所有しているか共同編集しているプレイリストのみ楽曲を表示できます。
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
                        Spotifyで開く
                      </a>
                    ) : (
                      <span className="playlist-link disabled">Spotifyリンクなし</span>
                    )}
                    <button
                      className="playlist-select-button"
                      type="button"
                      onClick={() => onSelectPlaylist?.(playlist.id)}
                      disabled={isSelected || !canViewTracks}
                    >
                      {isSelected
                        ? "選択中"
                        : canViewTracks
                          ? "曲を見る"
                          : "利用不可"}
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
