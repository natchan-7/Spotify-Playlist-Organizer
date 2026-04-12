/* eslint-disable react/prop-types */

function BrowserDataPanel({
  browserDataNotice,
  browserDataSummary,
  isAuthenticated,
  onClearArtistGenreCache,
  onClearStoredTrackTags,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">ブラウザデータ</p>
          <h2>保存データの管理</h2>
          <p className="panel-subtitle">
            このブラウザに保存されているタグやアーティスト情報を確認できます。
          </p>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="notice">
          <p>ログインすると、このアプリの保存データを確認できます。</p>
        </div>
      )}

      {isAuthenticated && (
        <>
          <div className="creation-summary-grid">
            <div className="creation-summary-card">
              <span className="creation-summary-label">アーティスト情報キャッシュ</span>
              <strong>{browserDataSummary.artistGenreCacheCount}</strong>
            </div>
            <div className="creation-summary-card">
              <span className="creation-summary-label">保存済み楽曲データ</span>
              <strong>{browserDataSummary.trackTagEntryCount}</strong>
            </div>
            <div className="creation-summary-card">
              <span className="creation-summary-label">自動タグ付き楽曲</span>
              <strong>{browserDataSummary.autoTagEntryCount}</strong>
            </div>
            <div className="creation-summary-card">
              <span className="creation-summary-label">手動タグ付き楽曲</span>
              <strong>{browserDataSummary.userTagEntryCount}</strong>
            </div>
          </div>

          {browserDataNotice && (
            <div className="notice">
              <p>{browserDataNotice}</p>
            </div>
          )}

          <div className="action-row">
            <button
              className="secondary-button"
              type="button"
              onClick={onClearArtistGenreCache}
            >
              アーティスト情報キャッシュを削除
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onClearStoredTrackTags}
            >
              保存済みタグを削除
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default BrowserDataPanel;
