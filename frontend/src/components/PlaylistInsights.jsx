/* eslint-disable react/prop-types */
import { formatTagLabel } from "../utils/formatting";
import { aggregateAutoTags, aggregateTopArtists } from "../utils/playlistInsights";

const INSIGHTS_LIMIT = 8;

function PlaylistInsights({ genreStatus, selectedPlaylist, tracks, tracksStatus }) {
  if (!selectedPlaylist || tracksStatus !== "success" || tracks.length === 0) {
    return null;
  }

  const topGenres = aggregateAutoTags(tracks, INSIGHTS_LIMIT);
  const topArtists = aggregateTopArtists(tracks, INSIGHTS_LIMIT);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">プレイリスト傾向</p>
          <h2>ジャンルとアーティストの集計</h2>
        </div>
      </div>

      {genreStatus === "loading" && (
        <div className="notice">
          <p>自動タグを準備中のため、ジャンル集計はまだ表示できません。</p>
        </div>
      )}

      {genreStatus === "success" && topGenres.length === 0 && (
        <div className="notice">
          <p>このプレイリストでは集計できるジャンル・タグが見つかりませんでした。</p>
        </div>
      )}

      {(topGenres.length > 0 || topArtists.length > 0) && (
        <div className="insights-grid">
          {topGenres.length > 0 && (
            <div className="insights-card">
              <h3>主なジャンル・タグ</h3>
              <ul className="insights-list">
                {topGenres.map(({ tag, trackCount }) => (
                  <li key={tag} className="insights-list-item">
                    <span className="auto-tag">{formatTagLabel(tag)}</span>
                    <span className="insights-count">{trackCount}曲</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topArtists.length > 0 && (
            <div className="insights-card">
              <h3>主要アーティスト</h3>
              <ul className="insights-list">
                {topArtists.map((artist) => (
                  <li key={artist.id || artist.name} className="insights-list-item">
                    {artist.id ? (
                      <a
                        className="insights-artist-link"
                        href={`https://open.spotify.com/artist/${artist.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {artist.name}
                      </a>
                    ) : (
                      <span>{artist.name}</span>
                    )}
                    <span className="insights-count">{artist.trackCount}曲</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default PlaylistInsights;
