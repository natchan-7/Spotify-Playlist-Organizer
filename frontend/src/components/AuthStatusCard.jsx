import React from "react";

function formatExpiry(expiresAt) {
  if (!expiresAt) {
    return "不明";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}

function AuthStatusCard({
  authStatus,
  errorMessage,
  isAuthenticated,
  onLogin,
  playlistsCount,
  playlistsStatus,
  redirectUri,
  session,
  onLogout,
}) {
  const hasConfig = Boolean(import.meta.env.VITE_SPOTIFY_CLIENT_ID);

  function getPlaylistStatusLabel() {
    if (playlistsStatus === "success") {
      return `${playlistsCount}件読み込み済み`;
    }

    if (playlistsStatus === "loading") {
      return "読み込み中";
    }

    if (playlistsStatus === "error") {
      return "エラー";
    }

    return "待機中";
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Spotifyログイン</p>
      <h1>Spotify Playlist Organizer</h1>
      <p className="lead">
        Spotify にログインすると、プレイリストの取得・タグ整理・新しいプレイリスト作成ができます。
      </p>
      <p className="helper redirect-helper">
        リダイレクトURI: <code>{redirectUri}</code>
      </p>

      {!hasConfig && (
        <div className="notice error">
          <strong>設定が必要です。</strong>
          <p>
            ローカルでは <code>frontend/.env</code> に <code>VITE_SPOTIFY_CLIENT_ID</code> を設定してください。
            Cloudflare に公開している場合は、Worker Build Variables に追加してください。
          </p>
        </div>
      )}

      {authStatus === "loading" && (
        <div className="notice">
          <p>Spotify 認証を完了しています...</p>
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
            <span className="label">状態</span>
            <span className="value success">ログイン済み</span>
          </div>
          <div className="session-row">
            <span className="label">有効期限</span>
            <span className="value">{formatExpiry(session?.expiresAt)}</span>
          </div>
          <div className="session-row">
            <span className="label">プレイリスト取得</span>
            <span className="value">{getPlaylistStatusLabel()}</span>
          </div>
          <div className="action-row">
            <button className="secondary-button" type="button" onClick={onLogout}>
              ログアウト
            </button>
          </div>
          <p className="helper">
            このログイン情報を使ってプレイリストや楽曲を取得します。
          </p>
          <p className="helper">
            Spotify アプリ設定には、このリダイレクトURIを登録したままにしてください。
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
            Spotifyでログイン
          </button>
        </div>
      )}
    </section>
  );
}

export default AuthStatusCard;
