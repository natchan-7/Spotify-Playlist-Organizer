import {
  getStoredArtistGenreCache,
  saveArtistGenreCache,
} from "../utils/storage";

const SPOTIFY_API_URL = "https://api.spotify.com/v1";

function createAuthorizedHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function parseJsonSafely(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      message: text,
    };
  }
}

function createPlaylistTracksHref(playlist) {
  if (playlist.tracks?.href) {
    return playlist.tracks.href;
  }

  if (playlist.items?.href) {
    return playlist.items.href;
  }

  if (!playlist.href) {
    return "";
  }

  return playlist.href.endsWith("/tracks")
    ? playlist.href
    : `${playlist.href.replace(/\/$/, "")}/tracks`;
}

function normalizePlaylist(playlist) {
  const tracksTotalFromObject = Number(playlist.tracks?.total);
  const tracksTotalFromItemsArray = Array.isArray(playlist.items)
    ? playlist.items.length
    : Number.NaN;
  const tracksTotalFromItemsObject = Number(playlist.items?.total);
  const tracksTotalFromNestedItemsArray = Array.isArray(playlist.items?.items)
    ? playlist.items.items.length
    : Number.NaN;
  let normalizedTotalTracks = tracksTotalFromItemsArray;

  if (Number.isFinite(tracksTotalFromNestedItemsArray)) {
    normalizedTotalTracks = tracksTotalFromNestedItemsArray;
  }

  if (Number.isFinite(tracksTotalFromItemsObject)) {
    normalizedTotalTracks = tracksTotalFromItemsObject;
  }

  if (Number.isFinite(tracksTotalFromObject)) {
    normalizedTotalTracks = tracksTotalFromObject;
  }

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description || "",
    imageUrl: playlist.images?.[0]?.url || "",
    ownerId: playlist.owner?.id || "",
    ownerName: playlist.owner?.display_name || playlist.owner?.id || "Unknown",
    totalTracks: Number.isFinite(normalizedTotalTracks)
      ? normalizedTotalTracks
      : 0,
    tracksHref: createPlaylistTracksHref(playlist),
    isPublic: Boolean(playlist.public),
    isCollaborative: Boolean(playlist.collaborative),
    spotifyUrl: playlist.external_urls?.spotify || "",
  };
}

async function fetchSpotifyPage(url, accessToken, fallbackMessage) {
  const response = await fetch(url, {
    headers: createAuthorizedHeaders(accessToken),
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    let message =
      payload?.error?.message ||
      payload?.message ||
      fallbackMessage ||
      "Failed to fetch Spotify playlists.";

    if (response.status === 429) {
      message = retryAfter
        ? `Spotify rate limit reached. Wait about ${retryAfter} seconds and try again.`
        : "Spotify rate limit reached. Wait a moment and try again.";
    }

    const error = new Error(message);
    error.status = response.status;
    error.retryAfter = retryAfter ? Number(retryAfter) : null;
    throw error;
  }

  return payload;
}

async function fetchPlaylistTrackTotal(accessToken, playlist) {
  if (!playlist.tracksHref) {
    return playlist.totalTracks;
  }

  const url = new URL(playlist.tracksHref);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: createAuthorizedHeaders(accessToken),
  });

  if (!response.ok) {
    return playlist.totalTracks;
  }

  const payload = await parseJsonSafely(response);
  const totalTracks = Number(payload?.total);

  return Number.isFinite(totalTracks) ? totalTracks : playlist.totalTracks;
}

export async function fetchCurrentUserPlaylists(accessToken) {
  const playlists = [];
  let nextUrl = `${SPOTIFY_API_URL}/me/playlists?limit=50`;

  while (nextUrl) {
    const payload = await fetchSpotifyPage(
      nextUrl,
      accessToken,
      "Failed to fetch Spotify playlists."
    );
    playlists.push(...(payload.items || []).map(normalizePlaylist));
    nextUrl = payload.next;
  }

  return Promise.all(
    playlists.map(async (playlist) => {
      if (playlist.totalTracks > 0) {
        return playlist;
      }

      const totalTracks = await fetchPlaylistTrackTotal(accessToken, playlist);

      return {
        ...playlist,
        totalTracks,
      };
    })
  );
}

export async function fetchCurrentUserProfile(accessToken) {
  const payload = await fetchSpotifyPage(
    `${SPOTIFY_API_URL}/me`,
    accessToken,
    "Failed to fetch the current Spotify user profile."
  );

  return {
    id: payload.id || "",
    displayName: payload.display_name || payload.id || "Unknown",
    country: payload.country || "",
  };
}

function normalizeTrackItem(item) {
  const track = item?.item || item?.track;

  if (!track) {
    return null;
  }

  if (item?.is_local || track.is_local) {
    return null;
  }

  if (track.type && track.type !== "track") {
    return null;
  }

  let normalizedId = track.id || track.uri;

  if (!normalizedId) {
    normalizedId = [
      track.name,
      item?.added_at,
      track.artists?.map((artist) => artist.name).join("-"),
    ]
      .filter(Boolean)
      .join("-");
  }

  return {
    id: normalizedId,
    uri: track.uri || "",
    name: track.name,
    album: track.album?.name || "",
    durationMs: Number(track.duration_ms) || 0,
    thumbnailUrl: track.album?.images?.[0]?.url || "",
    artists: (track.artists || []).map((artist) => ({
      id: artist.id,
      name: artist.name,
    })),
    autoTags: [],
    userTags: [],
  };
}

function getPlaylistTracksUrl(playlist) {
  if (playlist.tracksHref) {
    return playlist.tracksHref;
  }

  if (!playlist.id) {
    return "";
  }

  return `${SPOTIFY_API_URL}/playlists/${playlist.id}/tracks`;
}

export async function fetchPlaylistTracks(accessToken, playlist, market) {
  const tracks = [];
  const baseUrl = getPlaylistTracksUrl(playlist);

  if (!baseUrl) {
    return tracks;
  }

  let nextUrl = baseUrl;

  while (nextUrl) {
    const url = new URL(nextUrl);
    url.searchParams.set("limit", "100");
    url.searchParams.set("additional_types", "track");

    if (market) {
      url.searchParams.set("market", market);
    }

    const payload = await fetchSpotifyPage(
      url.toString(),
      accessToken,
      "Failed to fetch Spotify playlist tracks."
    );

    const normalized = (payload.items || [])
      .map(normalizeTrackItem)
      .filter(Boolean);

    tracks.push(...normalized);
    nextUrl = payload.next;
  }

  return tracks;
}

function createArtistGenresMap(artists) {
  return Object.fromEntries(
    artists
      .filter((artist) => artist?.id)
      .map((artist) => [artist.id, Array.isArray(artist.genres) ? artist.genres : []])
  );
}

function createArtistGenreCacheEntries(artistGenresByArtistId, cachedAt = Date.now()) {
  return Object.fromEntries(
    Object.entries(artistGenresByArtistId).map(([artistId, genres]) => [
      artistId,
      {
        genres: Array.isArray(genres) ? genres : [],
        cachedAt,
      },
    ])
  );
}

function mergeArtistGenreCacheEntries(artistGenreCache, artistGenresByArtistId) {
  return {
    ...artistGenreCache,
    ...createArtistGenreCacheEntries(artistGenresByArtistId),
  };
}

function splitArtistIdsByCache(artistIds, artistGenreCache) {
  const cachedArtistGenresByArtistId = {};
  const missingArtistIds = [];

  artistIds.forEach((artistId) => {
    const cachedEntry = artistGenreCache?.[artistId];

    if (cachedEntry && Array.isArray(cachedEntry.genres)) {
      cachedArtistGenresByArtistId[artistId] = cachedEntry.genres;
      return;
    }

    missingArtistIds.push(artistId);
  });

  return {
    cachedArtistGenresByArtistId,
    missingArtistIds,
  };
}

async function fetchSingleArtistGenres(accessToken, artistId) {
  const payload = await fetchSpotifyPage(
    `${SPOTIFY_API_URL}/artists/${artistId}`,
    accessToken,
    "Failed to fetch Spotify artist genres."
  );

  return {
    [artistId]: Array.isArray(payload.genres) ? payload.genres : [],
  };
}

async function fetchArtistGenresInChunks(accessToken, artistIds, artistGenreCache) {
  const artistGenresByArtistId = {};
  let nextArtistGenreCache = { ...artistGenreCache };

  for (let index = 0; index < artistIds.length; index += 50) {
    const chunk = artistIds.slice(index, index + 50);
    const url = new URL(`${SPOTIFY_API_URL}/artists`);

    url.searchParams.set("ids", chunk.join(","));

    try {
      const payload = await fetchSpotifyPage(
        url.toString(),
        accessToken,
        "Failed to fetch Spotify artist genres."
      );
      const chunkArtistGenresByArtistId = createArtistGenresMap(payload.artists || []);

      Object.assign(
        artistGenresByArtistId,
        chunkArtistGenresByArtistId
      );
      nextArtistGenreCache = mergeArtistGenreCacheEntries(
        nextArtistGenreCache,
        chunkArtistGenresByArtistId
      );
      saveArtistGenreCache(nextArtistGenreCache);
    } catch (error) {
      if (error instanceof Error && error.status === 403) {
        const individualArtistGenresByArtistId =
          await fetchArtistGenresIndividually(
            accessToken,
            chunk,
            nextArtistGenreCache
          );

        Object.assign(
          artistGenresByArtistId,
          individualArtistGenresByArtistId
        );
        nextArtistGenreCache = mergeArtistGenreCacheEntries(
          nextArtistGenreCache,
          individualArtistGenresByArtistId
        );
        continue;
      }

      throw error;
    }
  }

  return artistGenresByArtistId;
}

async function fetchArtistGenresIndividually(accessToken, artistIds, artistGenreCache) {
  const artistGenresByArtistId = {};
  let nextArtistGenreCache = { ...artistGenreCache };

  for (const artistId of artistIds) {
    try {
      const singleArtistGenresByArtistId = await fetchSingleArtistGenres(
        accessToken,
        artistId
      );
      Object.assign(artistGenresByArtistId, singleArtistGenresByArtistId);
      nextArtistGenreCache = mergeArtistGenreCacheEntries(
        nextArtistGenreCache,
        singleArtistGenresByArtistId
      );
      saveArtistGenreCache(nextArtistGenreCache);
    } catch (error) {
      if (error instanceof Error && error.status === 403) {
        const emptyArtistGenresByArtistId = {
          [artistId]: [],
        };

        Object.assign(artistGenresByArtistId, emptyArtistGenresByArtistId);
        nextArtistGenreCache = mergeArtistGenreCacheEntries(
          nextArtistGenreCache,
          emptyArtistGenresByArtistId
        );
        saveArtistGenreCache(nextArtistGenreCache);
        continue;
      }

      throw error;
    }
  }

  return artistGenresByArtistId;
}

export async function fetchArtistGenres(accessToken, artistIds) {
  const normalizedArtistIds = Array.from(
    new Set(artistIds.filter((artistId) => typeof artistId === "string" && artistId))
  );

  if (normalizedArtistIds.length === 0) {
    return {};
  }

  const artistGenreCache = getStoredArtistGenreCache();
  const { cachedArtistGenresByArtistId, missingArtistIds } = splitArtistIdsByCache(
    normalizedArtistIds,
    artistGenreCache
  );

  if (missingArtistIds.length === 0) {
    return cachedArtistGenresByArtistId;
  }

  const fetchedArtistGenresByArtistId = await fetchArtistGenresInChunks(
    accessToken,
    missingArtistIds,
    artistGenreCache
  );

  return {
    ...cachedArtistGenresByArtistId,
    ...fetchedArtistGenresByArtistId,
  };
}
