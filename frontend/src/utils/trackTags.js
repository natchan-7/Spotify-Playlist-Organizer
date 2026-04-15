const TRACK_TAGS_KEY = "trackTags";
const BLOCKED_ARTIST_NAMES = new Set(["unknown artist", "various artists"]);
const GENRE_BROAD_TAG_RULES = [
  { tag: "pop", patterns: [/\bpop\b/i] },
  { tag: "rock", patterns: [/\brock\b/i] },
  { tag: "indie", patterns: [/\bindie\b/i] },
  { tag: "hip hop", patterns: [/\bhip[\s-]?hop\b/i, /\btrap\b/i] },
  { tag: "rap", patterns: [/\brap\b/i] },
  {
    tag: "electronic",
    patterns: [
      /\belectronic\b/i,
      /\bedm\b/i,
      /\bhouse\b/i,
      /\btechno\b/i,
      /\btrance\b/i,
      /\bdnb\b/i,
      /\bdrum(?:\s|&)bass\b/i,
      /\bdrum n bass\b/i,
    ],
  },
  { tag: "jazz", patterns: [/\bjazz\b/i] },
  { tag: "classical", patterns: [/\bclassical\b/i, /\borchestral\b/i, /\bsymphon/i] },
  { tag: "folk", patterns: [/\bfolk\b/i, /\bsinger-songwriter\b/i] },
  { tag: "soul", patterns: [/\bsoul\b/i, /\br&b\b/i, /\brnb\b/i] },
  { tag: "metal", patterns: [/\bmetal\b/i] },
  { tag: "punk", patterns: [/\bpunk\b/i] },
  { tag: "latin", patterns: [/\blatin\b/i, /\breggaeton\b/i, /\bbossa\b/i, /\bsamba\b/i] },
  { tag: "anime", patterns: [/\banime\b/i] },
];
const TRACK_CONTEXT_TAG_RULES = [
  { tag: "acoustic", patterns: [/\bacoustic\b/i, /アコースティック/] },
  { tag: "live", patterns: [/\blive\b/i, /ライブ/] },
  { tag: "remix", patterns: [/\bremix\b/i, /\brework\b/i, /\bedit\b/i] },
  { tag: "instrumental", patterns: [/\binstrumental\b/i, /インスト/] },
  { tag: "piano", patterns: [/\bpiano\b/i, /ピアノ/] },
  { tag: "remaster", patterns: [/\bremaster(?:ed)?\b/i, /リマスター/] },
  { tag: "demo", patterns: [/\bdemo\b/i] },
];

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

function normalizeAutoTagValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function createAutoTagDetail(value, source) {
  const normalizedValue = normalizeAutoTagValue(value);

  if (!normalizedValue) {
    return null;
  }

  return {
    value: normalizedValue,
    source,
  };
}

function dedupeAutoTagDetails(details) {
  const uniqueDetailsByValue = new Map();

  details.forEach((detail) => {
    if (!detail?.value) {
      return;
    }

    if (!uniqueDetailsByValue.has(detail.value)) {
      uniqueDetailsByValue.set(detail.value, detail);
    }
  });

  return Array.from(uniqueDetailsByValue.values());
}

function matchRuleTags(text, rules, source) {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  return rules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
    .map((rule) => createAutoTagDetail(rule.tag, source))
    .filter(Boolean);
}

function normalizeFallbackArtistTag(name) {
  if (typeof name !== "string") {
    return "";
  }

  const normalizedName = name.trim().replace(/\s+/g, " ");

  if (!normalizedName) {
    return "";
  }

  if (BLOCKED_ARTIST_NAMES.has(normalizedName.toLowerCase())) {
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

function buildArtistFallbackTagDetails(track) {
  return dedupeAutoTagDetails(
    (track.artists || [])
      .map((artist) =>
        createAutoTagDetail(
          normalizeFallbackArtistTag(artist?.name),
          "artist-fallback"
        )
      )
      .filter(Boolean)
  );
}

function buildContextualTagDetails(track) {
  return dedupeAutoTagDetails(
    [track.name, track.album].flatMap((text) =>
      matchRuleTags(text, TRACK_CONTEXT_TAG_RULES, "track-context")
    )
  );
}

function buildGenreTagDetails(genres) {
  const normalizedGenres = normalizeGenreTags(genres);
  const directGenreDetails = normalizedGenres
    .map((genre) => createAutoTagDetail(genre, "genre"))
    .filter(Boolean);
  const broadGenreDetails = normalizedGenres.flatMap((genre) =>
    matchRuleTags(genre, GENRE_BROAD_TAG_RULES, "genre-broad")
  );

  return dedupeAutoTagDetails([...directGenreDetails, ...broadGenreDetails]);
}

function buildAutoTagDetailsFromTrack(track, artistGenresByArtistId) {
  const genres = (track.artists || []).flatMap((artist) => {
    if (!artist?.id) {
      return [];
    }

    return artistGenresByArtistId?.[artist.id] || [];
  });

  const genreTagDetails = buildGenreTagDetails(genres);
  const contextualTagDetails = buildContextualTagDetails(track);

  if (genreTagDetails.length > 0) {
    return dedupeAutoTagDetails([...genreTagDetails, ...contextualTagDetails]);
  }

  return dedupeAutoTagDetails([
    ...buildArtistFallbackTagDetails(track),
    ...contextualTagDetails,
  ]);
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
      autoTagDetails: tags.auto
        .map((value) => createAutoTagDetail(value, "stored"))
        .filter(Boolean),
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
    const generatedAutoTagDetails =
      tags.auto.length > 0
        ? tags.auto
            .map((value) => createAutoTagDetail(value, "stored"))
            .filter(Boolean)
        : buildAutoTagDetailsFromTrack(track, artistGenresByArtistId);

    return {
      ...track,
      autoTags: generatedAutoTagDetails.map((detail) => detail.value),
      autoTagDetails: generatedAutoTagDetails,
      userTags: tags.user,
    };
  });
}

export function persistGeneratedAutoTags(
  tracks,
  artistGenresByArtistId,
  trackTagsMap = getStoredTrackTagsMap()
) {
  return {
    trackTagsMap,
    updatedTrackCount: 0,
    savedAutoTagCount: 0,
    createdEntryCount: 0,
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
