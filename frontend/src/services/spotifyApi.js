const SPOTIFY_API_URL = "https://api.spotify.com/v1";

function createAuthorizedHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
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
  const payload = await response.json();

  if (!response.ok) {
    const message =
      payload?.error?.message || fallbackMessage || "Failed to fetch Spotify playlists.";
    const error = new Error(message);
    error.status = response.status;
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

  const payload = await response.json();
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

async function fetchArtistGenresInChunks(accessToken, artistIds) {
  const artistGenresByArtistId = {};

  for (let index = 0; index < artistIds.length; index += 50) {
    const chunk = artistIds.slice(index, index + 50);
    const url = new URL(`${SPOTIFY_API_URL}/artists`);

    url.searchParams.set("ids", chunk.join(","));

    const payload = await fetchSpotifyPage(
      url.toString(),
      accessToken,
      "Failed to fetch Spotify artist genres."
    );

    Object.assign(
      artistGenresByArtistId,
      createArtistGenresMap(payload.artists || [])
    );
  }

  return artistGenresByArtistId;
}

async function fetchArtistGenresIndividually(accessToken, artistIds) {
  const artistGenresByArtistId = {};

  for (const artistId of artistIds) {
    Object.assign(
      artistGenresByArtistId,
      await fetchSingleArtistGenres(accessToken, artistId)
    );
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

  try {
    return await fetchArtistGenresInChunks(accessToken, normalizedArtistIds);
  } catch (error) {
    if (error instanceof Error && error.status === 403) {
      return fetchArtistGenresIndividually(accessToken, normalizedArtistIds);
    }

    throw error;
  }
}
