/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";

function formatDuration(durationMs) {
  if (!durationMs) {
    return "0:00";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatArtists(artists) {
  if (!Array.isArray(artists) || artists.length === 0) {
    return "不明なアーティスト";
  }

  return artists.map((artist) => artist.name).join(", ");
}

function getTrackArtworkFallback(trackName) {
  return trackName ? trackName.slice(0, 1).toUpperCase() : "T";
}

function formatTagLabel(tag) {
  if (!tag) {
    return "";
  }

  if (/[A-Z]/.test(tag)) {
    return tag;
  }

  return tag
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function PlaylistTracks({
  genreError,
  genreStatus,
  onAddUserTag,
  onRemoveUserTag,
  selectedPlaylist,
  tagStorageError,
  tagStorageStatus,
  tagStorageSummary,
  tracks,
  tracksError,
  tracksStatus,
}) {
  const taggedTrackCount = tracks.filter((track) => track.autoTags?.length > 0).length;
  const userTaggedTrackCount = tracks.filter((track) => track.userTags?.length > 0).length;
  const totalAutoTagCount = tracks.reduce(
    (count, track) => count + (track.autoTags?.length || 0),
    0
  );
  const [tagDrafts, setTagDrafts] = useState({});
  const [tagFeedback, setTagFeedback] = useState({});

  useEffect(() => {
    setTagDrafts({});
    setTagFeedback({});
  }, [selectedPlaylist?.id]);

  function getAutoTagStatusLabel() {
    if (genreStatus === "success") {
      return `自動タグ準備完了（${taggedTrackCount}曲）`;
    }

    if (genreStatus === "loading") {
      return "自動タグを準備中";
    }

    if (genreStatus === "error") {
      return "自動タグを取得できません";
    }

    return "自動タグ待機中";
  }

  function updateTagDraft(trackId, value) {
    setTagDrafts((currentDrafts) => ({
      ...currentDrafts,
      [trackId]: value,
    }));
    setTagFeedback((currentFeedback) => ({
      ...currentFeedback,
      [trackId]: "",
    }));
  }

  function handleTagSubmit(event, trackId) {
    event.preventDefault();

    const result = onAddUserTag?.(trackId, tagDrafts[trackId] || "");

    if (!result?.ok) {
      let message = "タグを追加できませんでした。";

      if (result?.reason === "empty") {
        message = "タグを入力してください。";
      } else if (result?.reason === "duplicate") {
        message = "同じタグはすでに追加されています。";
      } else if (result?.reason === "storage" && result.message) {
        message = result.message;
      }

      setTagFeedback((currentFeedback) => ({
        ...currentFeedback,
        [trackId]: message,
      }));
      return;
    }

    setTagDrafts((currentDrafts) => ({
      ...currentDrafts,
      [trackId]: "",
    }));
    setTagFeedback((currentFeedback) => ({
      ...currentFeedback,
      [trackId]: "",
    }));
  }

  function handleUserTagRemove(trackId, userTag) {
    const result = onRemoveUserTag?.(trackId, userTag);

    if (!result?.ok && result?.reason === "storage") {
      setTagFeedback((currentFeedback) => ({
        ...currentFeedback,
        [trackId]: result.message || "タグを削除できませんでした。",
      }));
      return;
    }

    setTagFeedback((currentFeedback) => ({
      ...currentFeedback,
      [trackId]: "",
    }));
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">楽曲一覧</p>
          <h2>プレイリストの楽曲</h2>
          {selectedPlaylist && (
            <>
              <p className="panel-subtitle">{selectedPlaylist.name}</p>
              <p className="panel-subtitle panel-subtitle-muted">
                {selectedPlaylist.totalTracks}曲 / {selectedPlaylist.ownerName}
              </p>
            </>
          )}
        </div>
        {tracksStatus === "success" && selectedPlaylist && (
          <div className="track-status-group">
            <span className="playlist-count">{tracks.length}曲表示中</span>
            {tracks.length > 0 && (
              <span className="playlist-count playlist-count-secondary">
                {getAutoTagStatusLabel()}
              </span>
            )}
          </div>
        )}
      </div>

      {!selectedPlaylist && (
        <div className="notice">
          <p>プレイリストを選ぶと楽曲を表示できます。</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "loading" && (
        <div className="notice">
          <p>Spotify から楽曲を取得しています...</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "error" && tracksError && (
        <div className="notice error">
          <p>{tracksError}</p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "success" && tracks.length === 0 && (
        <div className="notice">
          <p>
            このプレイリストでは表示できる楽曲が見つかりませんでした。
            空のプレイリストか、ローカル曲・利用できない曲のみの可能性があります。
          </p>
        </div>
      )}

      {selectedPlaylist && tracksStatus === "success" && tracks.length > 0 && (
        <div className="creation-summary-grid track-summary-grid">
          <div className="creation-summary-card">
            <span className="creation-summary-label">表示中の楽曲</span>
            <strong>{tracks.length}曲</strong>
          </div>
          <div className="creation-summary-card">
            <span className="creation-summary-label">自動タグ付き</span>
            <strong>{taggedTrackCount}曲</strong>
          </div>
          <div className="creation-summary-card">
            <span className="creation-summary-label">手動タグ付き</span>
            <strong>{userTaggedTrackCount}曲</strong>
          </div>
        </div>
      )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "success" &&
        taggedTrackCount === 0 && (
          <div className="notice">
            <p>このプレイリストには自動タグを付けられませんでした。</p>
            <p>
              Spotify から使えるジャンル情報が返らず、アーティスト名からも補助タグを作れませんでした。
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "success" &&
        taggedTrackCount > 0 && (
          <div className="notice">
            <p>
              {taggedTrackCount}曲に合計{totalAutoTagCount}個の自動タグを用意しました。
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        genreStatus === "success" &&
        tagStorageStatus === "success" &&
        taggedTrackCount > 0 && (
          <div className="notice">
            <p>
              自動タグは Spotify の情報から都度生成しており、このブラウザには長期保存していません。
            </p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        genreStatus === "success" &&
        tagStorageStatus === "error" &&
        tagStorageError && (
          <div className="notice error">
            <p>自動タグの準備中に問題が発生しました。</p>
            <p>{tagStorageError}</p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "loading" && (
          <div className="notice">
            <p>アーティスト情報から自動タグを準備しています...</p>
          </div>
        )}

      {selectedPlaylist &&
        tracksStatus === "success" &&
        tracks.length > 0 &&
        genreStatus === "error" &&
        genreError && (
          <div className="notice error">
            <p>楽曲は読み込めましたが、自動タグを準備できませんでした。</p>
            <p>{genreError}</p>
          </div>
        )}

      {selectedPlaylist && tracksStatus === "success" && tracks.length > 0 && (
        <div className="track-list">
          {tracks.map((track) => (
            <article key={track.id} className="track-row">
              <div className="track-artwork">
                {track.thumbnailUrl ? (
                  <img
                    src={track.thumbnailUrl}
                    alt={`${track.album} のジャケット画像`}
                    loading="lazy"
                  />
                ) : (
                  <div className="track-artwork-fallback">
                    {getTrackArtworkFallback(track.name)}
                  </div>
                )}
              </div>
              <div className="track-body">
                <div className="track-title-row">
                  <h3>{track.name}</h3>
                  <span className="track-duration">
                    {formatDuration(track.durationMs)}
                  </span>
                </div>
                <p className="track-meta">{formatArtists(track.artists)}</p>
                <p className="track-meta">{track.album}</p>
                {(track.autoTags?.length > 0 || track.userTags?.length > 0) && (
                  <div className="track-tag-row">
                    {track.autoTags.map((tag) => (
                      <span key={`${track.id}-${tag}`} className="auto-tag">
                        {formatTagLabel(tag)}
                      </span>
                    ))}
                    {track.userTags.map((tag) => (
                      <button
                        key={`${track.id}-user-${tag}`}
                        className="user-tag"
                        type="button"
                        onClick={() => handleUserTagRemove(track.id, tag)}
                        aria-label={`${formatTagLabel(tag)} を削除`}
                        title={`${formatTagLabel(tag)} を削除`}
                      >
                        <span>{formatTagLabel(tag)}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}
                <form
                  className="user-tag-form"
                  onSubmit={(event) => handleTagSubmit(event, track.id)}
                >
                  <input
                    className="user-tag-input"
                    type="text"
                    value={tagDrafts[track.id] || ""}
                    onChange={(event) => updateTagDraft(track.id, event.target.value)}
                    placeholder="手動タグを追加"
                    aria-label={`${track.name} に手動タグを追加`}
                  />
                  <button className="user-tag-add-button" type="submit">
                    追加
                  </button>
                </form>
                {tagFeedback[track.id] && (
                  <p className="tag-feedback">{tagFeedback[track.id]}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PlaylistTracks;
