function formatExpiry(expiresAt) {
  if (!expiresAt) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}

function AuthStatusCard({
  authStatus,
  errorMessage,
  isAuthenticated,
  onLogin,
  playlistsStatus,
  session,
  onLogout,
}) {
  const hasConfig = Boolean(import.meta.env.VITE_SPOTIFY_CLIENT_ID);

  return (
    <section className="auth-card">
      <p className="eyebrow">Step 1 / Spotify OAuth</p>
      <h1>Spotify Playlist Organizer</h1>
      <p className="lead">
        Start with Spotify login so the next step can fetch and display playlists.
      </p>

      {!hasConfig && (
        <div className="notice error">
          <strong>Configuration required.</strong>
          <p>
            Set <code>VITE_SPOTIFY_CLIENT_ID</code> in <code>frontend/.env</code>.
          </p>
        </div>
      )}

      {authStatus === "loading" && (
        <div className="notice">
          <p>Completing Spotify authentication...</p>
        </div>
      )}

      {authStatus === "error" && errorMessage && (
        <div className="notice error">
          <p>{errorMessage}</p>
        </div>
      )}

      {isAuthenticated ? (
        <div className="session-panel">
          <div className="session-row">
            <span className="label">Status</span>
            <span className="value success">Authenticated</span>
          </div>
          <div className="session-row">
            <span className="label">Token expires</span>
            <span className="value">{formatExpiry(session?.expiresAt)}</span>
          </div>
          <div className="session-row">
            <span className="label">Playlist fetch</span>
            <span className="value">{playlistsStatus}</span>
          </div>
          <div className="action-row">
            <button className="secondary-button" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
          <p className="helper">
            The next step will use this access token to fetch playlists.
          </p>
        </div>
      ) : (
        <div className="action-row">
          <button
            className="primary-button"
            type="button"
            onClick={onLogin}
            disabled={!hasConfig || authStatus === "loading"}
          >
            Login with Spotify
          </button>
        </div>
      )}
    </section>
  );
}

export default AuthStatusCard;
