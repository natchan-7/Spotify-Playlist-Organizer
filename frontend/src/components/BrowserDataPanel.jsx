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
          <p className="eyebrow">Step 9 / Browser Data</p>
          <h2>Manage cached browser data</h2>
          <p className="panel-subtitle">
            Review what this browser has stored for tags and artist genre lookups.
          </p>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="notice">
          <p>Log in before managing this app's saved Spotify data.</p>
        </div>
      )}

      {isAuthenticated && (
        <>
          <div className="creation-summary-grid">
            <div className="creation-summary-card">
              <span className="creation-summary-label">Artist genre cache</span>
              <strong>{browserDataSummary.artistGenreCacheCount}</strong>
            </div>
            <div className="creation-summary-card">
              <span className="creation-summary-label">Saved track entries</span>
              <strong>{browserDataSummary.trackTagEntryCount}</strong>
            </div>
            <div className="creation-summary-card">
              <span className="creation-summary-label">Auto-tag entries</span>
              <strong>{browserDataSummary.autoTagEntryCount}</strong>
            </div>
            <div className="creation-summary-card">
              <span className="creation-summary-label">User-tag entries</span>
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
              Clear genre cache
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onClearStoredTrackTags}
            >
              Clear saved tags
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default BrowserDataPanel;
