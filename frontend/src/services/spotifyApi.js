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
  const normalizedTotalTracks = Number.isFinite(tracksTotalFromObject)
    ? tracksTotalFromObject
    : Number.isFinite(tracksTotalFromItemsObject)
      ? tracksTotalFromItemsObject
      : Number.isFinite(tracksTotalFromNestedItemsArray)
        ? tracksTotalFromNestedItemsArray
        : tracksTotalFromItemsArray;
  const hasTracksObject = Boolean(playlist.tracks);
  const hasItemsObject = Boolean(playlist.items);
  const rawTracksTotal = hasTracksObject
    ? playlist.tracks?.total
    : Number.isFinite(tracksTotalFromItemsObject)
      ? playlist.items?.total
      : Number.isFinite(tracksTotalFromNestedItemsArray)
        ? tracksTotalFromNestedItemsArray
        : tracksTotalFromItemsArray;
  const rawTracksShape = hasTracksObject
    ? JSON.stringify({
        href: playlist.tracks.href,
        total: playlist.tracks.total,
      })
    : hasItemsObject
      ? JSON.stringify({
          type: Array.isArray(playlist.items) ? "array" : typeof playlist.items,
          href: playlist.items?.href,
          total: playlist.items?.total,
          nestedItemsLength: Array.isArray(playlist.items?.items)
            ? playlist.items.items.length
            : null,
        })
      : "undefined";
  const trackCountSource = hasTracksObject
    ? "tracks-object"
    : Number.isFinite(tracksTotalFromItemsObject)
      ? "items-total"
      : Number.isFinite(tracksTotalFromNestedItemsArray)
        ? "items-nested-array"
        : Array.isArray(playlist.items)
          ? "items-array"
          : "unknown";
  const trackCountStatus = hasTracksObject
    ? "ok"
    : trackCountSource === "unknown"
      ? "missing-track-total"
      : "derived-from-items";

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    imageUrl: playlist.images?.[0]?.url || "",
    ownerName: playlist.owner?.display_name || playlist.owner?.id || "Unknown",
    totalTracks: Number.isFinite(normalizedTotalTracks)
      ? normalizedTotalTracks
      : 0,
    tracksHref: createPlaylistTracksHref(playlist),
    trackCountSource,
    isPublic: Boolean(playlist.public),
    isCollaborative: Boolean(playlist.collaborative),
  };
}

async function fetchPlaylistTrackTotal(accessToken, playlist) {
  if (!playlist.tracksHref) {
    return {
      totalTracks: playlist.totalTracks,
      trackCountSource: "missing-href",
    };
  }

  const url = new URL(playlist.tracksHref);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: createAuthorizedHeaders(accessToken),
  });

  if (!response.ok) {
    return {
      totalTracks: playlist.totalTracks,
      trackCountSource: "fallback-failed",
    };
  }

  const payload = await response.json();
  const totalTracks = Number(payload?.total);

  return {
    totalTracks: Number.isFinite(totalTracks) ? totalTracks : playlist.totalTracks,
    trackCountSource: "fallback-success",
  };
}

export async function fetchCurrentUserPlaylists(accessToken) {
  const response = await fetch(`${SPOTIFY_API_URL}/me/playlists?limit=50`, {
    headers: createAuthorizedHeaders(accessToken),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      payload?.error?.message || "Failed to fetch Spotify playlists.";
    throw new Error(message);
  }

  const playlists = (payload.items || []).map(normalizePlaylist);

  return Promise.all(
    playlists.map(async (playlist) => {
      if (playlist.totalTracks > 0) {
        return playlist;
      }

      const fallbackResult = await fetchPlaylistTrackTotal(accessToken, playlist);

      return {
        ...playlist,
        totalTracks: fallbackResult.totalTracks,
        trackCountSource: fallbackResult.trackCountSource,
      };
    })
  );
}
