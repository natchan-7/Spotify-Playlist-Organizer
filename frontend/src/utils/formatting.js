export function formatDuration(durationMs) {
  if (!durationMs) {
    return "0:00";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTagLabel(tag) {
  if (!tag) {
    return "";
  }

  if (/[A-Z]/.test(tag)) {
    return tag;
  }

  return tag
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}
