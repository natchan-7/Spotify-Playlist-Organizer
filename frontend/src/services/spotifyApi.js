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
    throw new Error(message);
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

function normalizeTrackItem(item) {
  const track = item?.track;

  if (!track || item?.is_local || track.is_local) {
    return null;
  }

  if (!track.id) {
    return null;
  }

  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    album: track.album?.name || "",
    durationMs: Number(track.duration_ms) || 0,
    thumbnailUrl: track.album?.images?.[track.album.images.length - 1]?.url || "",
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

export async function fetchPlaylistTracks(accessToken, playlist) {
  const tracks = [];
  const baseUrl = getPlaylistTracksUrl(playlist);

  if (!baseUrl) {
    return tracks;
  }

  let nextUrl = baseUrl;

  while (nextUrl) {
    const url = new URL(nextUrl);
    url.searchParams.set("limit", "100");

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
