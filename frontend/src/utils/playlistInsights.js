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

export function getTopAutoTags(tracks, limit = 6) {
  const counts = new Map();

  tracks.forEach((track) => {
    dedupeTextList(track.autoTags || []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([tag, count]) => ({
      tag,
      count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.tag.localeCompare(right.tag);
    })
    .slice(0, limit);
}

export function getTopArtists(tracks, limit = 8) {
  const artistMap = new Map();

  tracks.forEach((track) => {
    dedupeTextList((track.artists || []).map((artist) => artist.id || artist.name)).forEach(
      (artistKey) => {
        const artist = (track.artists || []).find(
          (currentArtist) => (currentArtist.id || currentArtist.name) === artistKey
        );

        if (!artist?.name) {
          return;
        }

        const currentCount = artistMap.get(artistKey)?.count || 0;

        artistMap.set(artistKey, {
          id: artist.id || "",
          name: artist.name,
          spotifyUrl: artist.spotifyUrl || "",
          count: currentCount + 1,
        });
      }
    );
  });

  return Array.from(artistMap.values())
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}
