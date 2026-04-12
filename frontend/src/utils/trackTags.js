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

function normalizeUserTagInput(userTag) {
  if (typeof userTag !== "string") {
    return "";
  }

  return userTag.trim().replace(/\s+/g, " ");
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

export function clearStoredTrackTags() {
  localStorage.removeItem(TRACK_TAGS_KEY);
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

export function persistGeneratedAutoTags(
  tracks,
  artistGenresByArtistId,
  trackTagsMap = getStoredTrackTagsMap()
) {
  const nextTrackTagsMap = { ...trackTagsMap };
  let updatedTrackCount = 0;
  let savedAutoTagCount = 0;
  let createdEntryCount = 0;

  tracks.forEach((track) => {
    const tags = getTrackTags(track.id, nextTrackTagsMap);

    if (tags.auto.length > 0) {
      return;
    }

    const generatedAutoTags = buildAutoTagsFromArtistGenres(
      track,
      artistGenresByArtistId
    );

    if (generatedAutoTags.length === 0) {
      return;
    }

    if (!nextTrackTagsMap[track.id]) {
      createdEntryCount += 1;
    }

    nextTrackTagsMap[track.id] = {
      auto: generatedAutoTags,
      user: tags.user,
    };
    updatedTrackCount += 1;
    savedAutoTagCount += generatedAutoTags.length;
  });

  if (updatedTrackCount > 0) {
    saveTrackTagsMap(nextTrackTagsMap);
  }

  return {
    trackTagsMap: nextTrackTagsMap,
    updatedTrackCount,
    savedAutoTagCount,
    createdEntryCount,
  };
}

export function addUserTagToTrack(
  trackId,
  userTag,
  fallbackAutoTags = [],
  trackTagsMap = getStoredTrackTagsMap()
) {
  const normalizedUserTag = normalizeUserTagInput(userTag);

  if (!normalizedUserTag) {
    return {
      ok: false,
      reason: "empty",
      trackTagsMap,
    };
  }

  const tags = getTrackTags(trackId, trackTagsMap);
  const alreadyExists = tags.user.some(
    (tag) => tag.toLowerCase() === normalizedUserTag.toLowerCase()
  );

  if (alreadyExists) {
    return {
      ok: false,
      reason: "duplicate",
      trackTagsMap,
    };
  }

  const nextTrackTagsMap = {
    ...trackTagsMap,
    [trackId]: {
      auto: tags.auto.length > 0 ? tags.auto : dedupeTextList(fallbackAutoTags),
      user: [...tags.user, normalizedUserTag],
    },
  };

  saveTrackTagsMap(nextTrackTagsMap);

  return {
    ok: true,
    trackTagsMap: nextTrackTagsMap,
    userTags: nextTrackTagsMap[trackId].user,
    autoTags: nextTrackTagsMap[trackId].auto,
  };
}

export function removeUserTagFromTrack(
  trackId,
  userTag,
  fallbackAutoTags = [],
  trackTagsMap = getStoredTrackTagsMap()
) {
  const normalizedUserTag = normalizeUserTagInput(userTag);

  if (!normalizedUserTag) {
    return {
      ok: false,
      reason: "empty",
      trackTagsMap,
    };
  }

  const tags = getTrackTags(trackId, trackTagsMap);
  const nextUserTags = tags.user.filter(
    (tag) => tag.toLowerCase() !== normalizedUserTag.toLowerCase()
  );

  if (nextUserTags.length === tags.user.length) {
    return {
      ok: false,
      reason: "missing",
      trackTagsMap,
    };
  }

  const nextAutoTags =
    tags.auto.length > 0 ? tags.auto : dedupeTextList(fallbackAutoTags);
  const nextTrackTagsMap = { ...trackTagsMap };

  if (nextAutoTags.length === 0 && nextUserTags.length === 0) {
    delete nextTrackTagsMap[trackId];
  } else {
    nextTrackTagsMap[trackId] = {
      auto: nextAutoTags,
      user: nextUserTags,
    };
  }

  saveTrackTagsMap(nextTrackTagsMap);

  return {
    ok: true,
    trackTagsMap: nextTrackTagsMap,
    userTags: nextUserTags,
    autoTags: nextAutoTags,
  };
}
