const TRACK_TAGS_KEY = "trackTags";

function createEmptyTags() {
  return {
    auto: [],
    user: [],
  };
}

function sanitizeTrackTagsMap(trackTagsMap) {
  if (!trackTagsMap || typeof trackTagsMap !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(trackTagsMap)
      .map(([trackId, tags]) => {
        if (!trackId || !tags || typeof tags !== "object") {
          return null;
        }

        const userTags = Array.isArray(tags.user) ? dedupeTextList(tags.user) : [];

        if (userTags.length === 0) {
          return null;
        }

        return [
          trackId,
          {
            auto: [],
            user: userTags,
          },
        ];
      })
      .filter(Boolean)
  );
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

function normalizeFallbackArtistTag(name) {
  if (typeof name !== "string") {
    return "";
  }

  const normalizedName = name.trim().replace(/\s+/g, " ");

  if (!normalizedName) {
    return "";
  }

  const blockedNames = new Set(["unknown artist", "various artists"]);

  if (blockedNames.has(normalizedName.toLowerCase())) {
    return "";
  }

  return normalizedName;
}

function normalizeUserTagInput(userTag) {
  if (typeof userTag !== "string") {
    return "";
  }

  return userTag.trim().replace(/\s+/g, " ");
}

const TRACK_PATTERN_TAG_RULES = [
  { pattern: /\blive\b/i, tag: "live" },
  { pattern: /\bunplugged\b/i, tag: "unplugged" },
  { pattern: /\bremix\b/i, tag: "remix" },
  { pattern: /\bacoustic\b/i, tag: "acoustic" },
  { pattern: /\binstrumental\b/i, tag: "instrumental" },
  { pattern: /\bkaraoke\b/i, tag: "karaoke" },
  { pattern: /\bcover\b/i, tag: "cover" },
  { pattern: /\bdemo\b/i, tag: "demo" },
  { pattern: /\bremaster(ed)?\b/i, tag: "remastered" },
  { pattern: /\bsoundtrack\b/i, tag: "soundtrack" },
  { pattern: /\bextended\b/i, tag: "extended" },
];

function buildPatternTagsFromTrack(track) {
  const haystack = `${track.name || ""} ${track.album || ""}`;

  return TRACK_PATTERN_TAG_RULES.filter(({ pattern }) => pattern.test(haystack)).map(
    ({ tag }) => tag
  );
}

function buildAutoTagsForTrack(track, artistGenresByArtistId) {
  const genres = (track.artists || []).flatMap((artist) => {
    if (!artist?.id) {
      return [];
    }

    return artistGenresByArtistId?.[artist.id] || [];
  });

  const normalizedGenres = normalizeGenreTags(genres);
  const patternTags = buildPatternTagsFromTrack(track);

  if (normalizedGenres.length > 0) {
    return dedupeTextList([...normalizedGenres, ...patternTags]);
  }

  const fallbackArtistTags = dedupeTextList(
    (track.artists || []).map((artist) => normalizeFallbackArtistTag(artist?.name))
  );

  return dedupeTextList([...fallbackArtistTags, ...patternTags]);
}

export function getStoredTrackTagsMap() {
  const value = localStorage.getItem(TRACK_TAGS_KEY);

  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    const normalized = sanitizeTrackTagsMap(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      saveTrackTagsMap(normalized);
    }

    return normalized;
  } catch (error) {
    localStorage.removeItem(TRACK_TAGS_KEY);
    return {};
  }
}

export function saveTrackTagsMap(trackTagsMap) {
  const normalized = sanitizeTrackTagsMap(trackTagsMap);

  if (Object.keys(normalized).length === 0) {
    clearStoredTrackTags();
    return;
  }

  localStorage.setItem(TRACK_TAGS_KEY, JSON.stringify(normalized));
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
        : buildAutoTagsForTrack(track, artistGenresByArtistId);

    return {
      ...track,
      autoTags: generatedAutoTags,
      userTags: tags.user,
    };
  });
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
      auto: [],
      user: [...tags.user, normalizedUserTag],
    },
  };

  saveTrackTagsMap(nextTrackTagsMap);

  return {
    ok: true,
    trackTagsMap: nextTrackTagsMap,
    userTags: nextTrackTagsMap[trackId].user,
    autoTags: dedupeTextList(fallbackAutoTags),
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

  const nextAutoTags = dedupeTextList(fallbackAutoTags);
  const nextTrackTagsMap = { ...trackTagsMap };

  if (nextUserTags.length === 0) {
    delete nextTrackTagsMap[trackId];
  } else {
    nextTrackTagsMap[trackId] = {
      auto: [],
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
