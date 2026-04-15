const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const MAX_RATE_LIMIT_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
let shouldFetchArtistGenresIndividually = false;

function createAuthorizedHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function sleep(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function getRateLimitDelayMs(response, retryCount) {
  const retryAfterSeconds = Number(response.headers.get("Retry-After"));

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return BASE_BACKOFF_MS * 2 ** retryCount;
}

async function fetchWithSpotifyBackoff(url, options) {
  let attempt = 0;

  while (true) {
    const response = await fetch(url, options);

    if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
      return response;
    }

    await sleep(getRateLimitDelayMs(response, attempt));
    attempt += 1;
  }
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

function createSpotifyApiError(response, payload, fallbackMessage) {
  const retryAfter = response.headers.get("Retry-After");
  let message =
    payload?.error?.message ||
    payload?.message ||
    fallbackMessage ||
    "Spotify のリクエストに失敗しました。";

  if (response.status === 429) {
    message = retryAfter
      ? `Spotify のアクセス上限に達しました。約 ${retryAfter} 秒待ってからもう一度試してください。`
      : "Spotify のアクセス上限に達しました。少し待ってからもう一度試してください。";
  }

  const error = new Error(message);
  error.status = response.status;
  error.retryAfter = retryAfter ? Number(retryAfter) : null;
  return error;
}

async function fetchSpotifyPage(url, accessToken, fallbackMessage, options = {}) {
  const response = await fetchWithSpotifyBackoff(url, {
    ...options,
    headers: {
      ...createAuthorizedHeaders(accessToken),
      ...(options.headers || {}),
    },
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw createSpotifyApiError(response, payload, fallbackMessage);
  }

  return payload;
}

function createPlaylistItemsHref(playlist) {
  if (playlist.items?.href) {
    return playlist.items.href;
  }

  if (playlist.tracks?.href) {
    return playlist.tracks.href;
  }

  if (!playlist.href) {
    return "";
  }

  return playlist.href.endsWith("/items")
    ? playlist.href
    : `${playlist.href.replace(/\/$/, "")}/items`;
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
    ownerName: playlist.owner?.display_name || playlist.owner?.id || "不明",
    totalTracks: Number.isFinite(normalizedTotalTracks)
      ? normalizedTotalTracks
      : 0,
    tracksHref: createPlaylistItemsHref(playlist),
    isPublic: Boolean(playlist.public),
    isCollaborative: Boolean(playlist.collaborative),
    spotifyUrl: playlist.external_urls?.spotify || "",
  };
}

async function fetchPlaylistItemsTotal(accessToken, playlist) {
  if (!playlist.tracksHref) {
    return playlist.totalTracks;
  }

  try {
    const url = new URL(playlist.tracksHref);
    url.searchParams.set("limit", "1");
    const payload = await fetchSpotifyPage(
      url.toString(),
      accessToken,
      "プレイリスト件数を取得できませんでした。"
    );
    const totalTracks = Number(payload?.total);
    return Number.isFinite(totalTracks) ? totalTracks : playlist.totalTracks;
  } catch (error) {
    return playlist.totalTracks;
  }
}

export async function fetchCurrentUserPlaylists(accessToken) {
  const playlists = [];
  let nextUrl = `${SPOTIFY_API_URL}/me/playlists?limit=50`;

  while (nextUrl) {
    const payload = await fetchSpotifyPage(
      nextUrl,
      accessToken,
      "Spotify のプレイリストを取得できませんでした。"
    );
    playlists.push(...(payload.items || []).map(normalizePlaylist));
    nextUrl = payload.next;
  }

  return Promise.all(
    playlists.map(async (playlist) => {
      if (playlist.totalTracks > 0) {
        return playlist;
      }

      const totalTracks = await fetchPlaylistItemsTotal(accessToken, playlist);

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
    "Spotify のユーザー情報を取得できませんでした。"
  );

  return {
    id: payload.id || "",
    displayName: payload.display_name || payload.id || "不明",
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
      spotifyUrl:
        artist.external_urls?.spotify ||
        (artist.id ? `https://open.spotify.com/artist/${artist.id}` : ""),
    })),
    autoTags: [],
    userTags: [],
  };
}

function getPlaylistItemsUrl(playlist) {
  if (playlist.tracksHref) {
    return playlist.tracksHref;
  }

  if (!playlist.id) {
    return "";
  }

  return `${SPOTIFY_API_URL}/playlists/${playlist.id}/items`;
}

export async function fetchPlaylistTracks(accessToken, playlist, market) {
  const tracks = [];
  const baseUrl = getPlaylistItemsUrl(playlist);

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
      "プレイリストの楽曲を取得できませんでした。"
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

async function fetchArtistGenresIndividually(accessToken, artistIds) {
  const artistGenresByArtistId = {};

  for (const artistId of artistIds) {
    try {
      const payload = await fetchSpotifyPage(
        `${SPOTIFY_API_URL}/artists/${artistId}`,
        accessToken,
        "アーティスト情報を取得できませんでした。"
      );

      artistGenresByArtistId[artistId] = Array.isArray(payload?.genres)
        ? payload.genres
        : [];
    } catch (error) {
      if (error instanceof Error && error.status === 403) {
        artistGenresByArtistId[artistId] = [];
        continue;
      }

      throw error;
    }
  }

  return artistGenresByArtistId;
}

async function fetchArtistGenresInChunks(accessToken, artistIds) {
  const artistGenresByArtistId = {};

  for (let index = 0; index < artistIds.length; index += 50) {
    const chunk = artistIds.slice(index, index + 50);

    if (shouldFetchArtistGenresIndividually) {
      Object.assign(
        artistGenresByArtistId,
        await fetchArtistGenresIndividually(accessToken, chunk)
      );
      continue;
    }

    const url = new URL(`${SPOTIFY_API_URL}/artists`);

    url.searchParams.set("ids", chunk.join(","));

    try {
      const payload = await fetchSpotifyPage(
        url.toString(),
        accessToken,
        "アーティスト情報を取得できませんでした。"
      );
      Object.assign(
        artistGenresByArtistId,
        createArtistGenresMap(payload.artists || [])
      );
    } catch (error) {
      if (error instanceof Error && error.status === 403) {
        shouldFetchArtistGenresIndividually = true;
        Object.assign(
          artistGenresByArtistId,
          await fetchArtistGenresIndividually(accessToken, chunk)
        );
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

  return fetchArtistGenresInChunks(accessToken, normalizedArtistIds);
}

async function postSpotifyJson(url, accessToken, body, fallbackMessage) {
  return fetchSpotifyPage(url, accessToken, fallbackMessage, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function postSpotifyWithoutJsonBody(url, accessToken, fallbackMessage) {
  return fetchSpotifyPage(url, accessToken, fallbackMessage, {
    method: "POST",
  });
}

export async function createPlaylist(accessToken, details) {
  const payload = await postSpotifyJson(
    `${SPOTIFY_API_URL}/me/playlists`,
    accessToken,
    {
      name: details.name,
      description: details.description || "",
      public: Boolean(details.isPublic),
    },
    "Spotify プレイリストを作成できませんでした。"
  );

  return {
    id: payload.id,
    name: payload.name || details.name,
    spotifyUrl: payload.external_urls?.spotify || "",
  };
}

export async function addTracksToPlaylist(accessToken, playlistId, uris) {
  const normalizedUris = uris.filter((uri) => typeof uri === "string" && uri);

  for (let index = 0; index < normalizedUris.length; index += 100) {
    const chunk = normalizedUris.slice(index, index + 100);
    const url = new URL(`${SPOTIFY_API_URL}/playlists/${playlistId}/items`);

    url.searchParams.set("uris", chunk.join(","));

    await postSpotifyWithoutJsonBody(
      url.toString(),
      accessToken,
      "Spotify プレイリストに楽曲を追加できませんでした。"
    );
  }
}
