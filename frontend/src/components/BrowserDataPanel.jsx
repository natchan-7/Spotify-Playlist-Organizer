/* eslint-disable react/prop-types */
import { useRef } from "react";

function BrowserDataPanel({
  browserDataNotice,
  browserDataSummary,
  isAuthenticated,
  onClearArtistGenreCache,
  onClearStoredTrackTags,
  onExportTrackTags,
  onImportTrackTags,
}) {
  const importInputRef = useRef(null);

  function handleImportFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImportTrackTags?.(reader.result);
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">ブラウザデータ</p>
          <h2>保存データの管理</h2>
          <p className="panel-subtitle">
            このブラウザに保存されている手動タグや旧キャッシュを確認できます。
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
              <span className="creation-summary-label">保存済みタグデータ</span>
              <strong>{browserDataSummary.trackTagEntryCount}</strong>
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
              旧アーティストキャッシュを削除
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onClearStoredTrackTags}
            >
              保存済み手動タグを削除
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onExportTrackTags}
              disabled={browserDataSummary.userTagEntryCount === 0}
            >
              手動タグをエクスポート
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => importInputRef.current?.click()}
            >
              手動タグをインポート
            </button>
            <input
              ref={importInputRef}
              className="visually-hidden-file-input"
              type="file"
              accept="application/json"
              onChange={handleImportFileChange}
            />
          </div>
        </>
      )}
    </section>
  );
}

export default BrowserDataPanel;
