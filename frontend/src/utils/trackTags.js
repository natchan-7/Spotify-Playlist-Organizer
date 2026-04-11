const TRACK_TAGS_KEY = "trackTags";

function createEmptyTags() {
  return {
    auto: [],
    user: [],
  };
}

function dedupeTextList(values) {
  return Array.from(
    new Set(
      values
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function normalizeGenreTags(genres) {
  return dedupeTextList(
    genres.map((genre) => (typeof genre === "string" ? genre.toLowerCase() : genre))
  );
}

function buildAutoTagsFromArtistGenres(track, artistGenresByArtistId) {
  const genres = (track.artists || []).flatMap((artist) => {
    if (!artist?.id) {
      return [];
    }

    return artistGenresByArtistId?.[artist.id] || [];
  });

  return normalizeGenreTags(genres);
}

export function getStoredTrackTagsMap() {
  const value = localStorage.getItem(TRACK_TAGS_KEY);

  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    localStorage.removeItem(TRACK_TAGS_KEY);
    return {};
  }
}

export function saveTrackTagsMap(trackTagsMap) {
  localStorage.setItem(TRACK_TAGS_KEY, JSON.stringify(trackTagsMap));
}

export function getTrackTags(trackId, trackTagsMap = getStoredTrackTagsMap()) {
  const tags = trackTagsMap?.[trackId];

  if (!tags || typeof tags !== "object") {
    return createEmptyTags();
  }

  return {
    auto: Array.isArray(tags.auto) ? dedupeTextList(tags.auto) : [],
    user: Array.isArray(tags.user) ? dedupeTextList(tags.user) : [],
  };
}

export function mergeTrackTagsIntoTracks(
  tracks,
  trackTagsMap = getStoredTrackTagsMap()
) {
  return tracks.map((track) => {
    const tags = getTrackTags(track.id, trackTagsMap);

    return {
      ...track,
      autoTags: tags.auto,
      userTags: tags.user,
    };
  });
}

export function mergeAutoTagsIntoTracks(
  tracks,
  artistGenresByArtistId,
  trackTagsMap = getStoredTrackTagsMap()
) {
  return tracks.map((track) => {
    const tags = getTrackTags(track.id, trackTagsMap);
    const generatedAutoTags =
      tags.auto.length > 0
        ? tags.auto
        : buildAutoTagsFromArtistGenres(track, artistGenresByArtistId);

    return {
      ...track,
      autoTags: generatedAutoTags,
      userTags: tags.user,
    };
  });
}
