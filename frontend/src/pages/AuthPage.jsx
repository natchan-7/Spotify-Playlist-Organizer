/* eslint-disable react/prop-types */
import AuthStatusCard from "../components/AuthStatusCard";
import PlaylistCollection from "../components/PlaylistCollection";
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
          tracksError={props.tracksError}
          tracksStatus={props.tracksStatus}
        />
      </div>
    </main>
  );
}

export default AuthPage;
