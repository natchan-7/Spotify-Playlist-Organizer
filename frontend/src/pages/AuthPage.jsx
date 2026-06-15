/* eslint-disable react/prop-types */
import AuthStatusCard from "../components/AuthStatusCard";
import BrowserDataPanel from "../components/BrowserDataPanel";
import PlaylistCollection from "../components/PlaylistCollection";
import PlaylistCreationPanel from "../components/PlaylistCreationPanel";
import PlaylistInsights from "../components/PlaylistInsights";
import PlaylistTracks from "../components/PlaylistTracks";

function AuthPage(props) {
  return (
    <main className="page-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />
      <div className="content-stack">
        <AuthStatusCard {...props} />
        <PlaylistCollection
          playlists={props.playlists}
          playlistsError={props.playlistsError}
          playlistsStatus={props.playlistsStatus}
          currentUserId={props.currentUserId}
          onSelectPlaylist={props.onSelectPlaylist}
          selectedPlaylistId={props.selectedPlaylist?.id || null}
        />
        <PlaylistTracks
          selectedPlaylist={props.selectedPlaylist}
          tracks={props.tracks}
          genreError={props.genreError}
          genreStatus={props.genreStatus}
          tagStorageError={props.tagStorageError}
          tagStorageStatus={props.tagStorageStatus}
          tagStorageSummary={props.tagStorageSummary}
          tracksError={props.tracksError}
          tracksStatus={props.tracksStatus}
          onAddUserTag={props.onAddUserTag}
          onRemoveUserTag={props.onRemoveUserTag}
        />
        <PlaylistInsights
          genreStatus={props.genreStatus}
          selectedPlaylist={props.selectedPlaylist}
          tracks={props.tracks}
          tracksStatus={props.tracksStatus}
        />
        <PlaylistCreationPanel
          createdPlaylist={props.createdPlaylist}
          onCreatePlaylistFromTag={props.onCreatePlaylistFromTag}
          onResetPlaylistCreationState={props.onResetPlaylistCreationState}
          playlistCreationError={props.playlistCreationError}
          playlistCreationStatus={props.playlistCreationStatus}
          selectedPlaylist={props.selectedPlaylist}
          tracks={props.tracks}
          tracksStatus={props.tracksStatus}
        />
        <BrowserDataPanel
          browserDataNotice={props.browserDataNotice}
          browserDataSummary={props.browserDataSummary}
          isAuthenticated={props.isAuthenticated}
          onClearArtistGenreCache={props.onClearArtistGenreCache}
          onClearStoredTrackTags={props.onClearStoredTrackTags}
          onExportTrackTags={props.onExportTrackTags}
          onImportTrackTags={props.onImportTrackTags}
        />
      </div>
    </main>
  );
}

export default AuthPage;
