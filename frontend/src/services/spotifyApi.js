const SPOTIFY_API_URL = "https://api.spotify.com/v1";

function createAuthorizedHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function normalizePlaylist(playlist) {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    imageUrl: playlist.images?.[0]?.url || "",
    ownerName: playlist.owner?.display_name || playlist.owner?.id || "Unknown",
    totalTracks: playlist.tracks?.total || 0,
    isPublic: Boolean(playlist.public),
    isCollaborative: Boolean(playlist.collaborative),
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

  return (payload.items || []).map(normalizePlaylist);
}
