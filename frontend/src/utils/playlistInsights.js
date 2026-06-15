export function aggregateAutoTags(tracks, limit = 10) {
  const counts = new Map();

  for (const track of tracks) {
    for (const tag of track.autoTags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, trackCount]) => ({ tag, trackCount }))
    .sort((a, b) => b.trackCount - a.trackCount || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function aggregateTopArtists(tracks, limit = 10) {
  const artistsById = new Map();

  for (const track of tracks) {
    for (const artist of track.artists || []) {
      if (!artist?.name) {
        continue;
      }

      const key = artist.id || artist.name;
      const existing = artistsById.get(key);

      if (existing) {
        existing.trackCount += 1;
        continue;
      }

      artistsById.set(key, {
        id: artist.id || "",
        name: artist.name,
        trackCount: 1,
      });
    }
  }

  return Array.from(artistsById.values())
    .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}
