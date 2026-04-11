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

function createTrackDiagnostics(market) {
  return {
    market: market || "(none)",
    pagesFetched: 0,
    rawItems: 0,
    normalizedTracks: 0,
    nullTrackItems: 0,
    localTrackItems: 0,
    unsupportedTypeItems: 0,
    fallbackIdItems: 0,
  };
}

function normalizeTrackItem(item, diagnostics) {
  const track = item?.track;

  if (!track) {
    diagnostics.nullTrackItems += 1;
    return null;
  }

  if (item?.is_local || track.is_local) {
    diagnostics.localTrackItems += 1;
    return null;
  }

  if (track.type && track.type !== "track") {
    diagnostics.unsupportedTypeItems += 1;
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

    diagnostics.fallbackIdItems += 1;
  }

  diagnostics.normalizedTracks += 1;

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
  const diagnostics = createTrackDiagnostics(market);

  if (!baseUrl) {
    return {
      tracks,
      diagnostics,
    };
  }

  let nextUrl = baseUrl;

  while (nextUrl) {
    diagnostics.pagesFetched += 1;
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

    diagnostics.rawItems += (payload.items || []).length;

    const normalized = (payload.items || [])
      .map((item) => normalizeTrackItem(item, diagnostics))
      .filter(Boolean);

    tracks.push(...normalized);
    nextUrl = payload.next;
  }

  return {
    tracks,
    diagnostics,
  };
}
