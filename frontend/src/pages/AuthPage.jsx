import React from "react";
import AuthStatusCard from "../components/AuthStatusCard";
import PlaylistCollection from "../components/PlaylistCollection";

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
        />
      </div>
    </main>
  );
}

export default AuthPage;
