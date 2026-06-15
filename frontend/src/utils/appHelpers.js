import { getStoredTrackTagsMap } from "./trackTags";

export function getSpotifyApiErrorMessage(error, fallbackMessage, forbiddenMessage) {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = error.status;

  if (status === 401) {
    return "Spotify のログイン期限が切れました。もう一度ログインしてください。";
  }

  if (status === 403) {
    return (
      forbiddenMessage ||
      "Spotify からアクセスを拒否されました。ログアウトして再ログインし、Spotify アプリ設定のアクセス権も確認してください。"
    );
  }

  if (status === 404) {
    return "対象のプレイリストや情報が Spotify 上に見つかりませんでした。削除されたか、アクセスできない可能性があります。";
  }

  if (status === 429) {
    if (typeof error.retryAfter === "number" && Number.isFinite(error.retryAfter)) {
      return `Spotify のアクセス上限に達しました。約 ${error.retryAfter} 秒待ってからもう一度試してください。`;
    }

    return "Spotify のアクセス上限に達しました。少し待ってからもう一度試してください。";
  }

  if (typeof status === "number" && status >= 500) {
    return "Spotify サーバー側で問題が発生している可能性があります。しばらくしてから再度お試しください。";
  }

  return fallbackMessage || "Spotify のリクエストでエラーが発生しました。もう一度お試しください。";
}

export function hasSpotifyScope(session, requiredScope) {
  if (!requiredScope) {
    return true;
  }

  const scopeValue = typeof session?.scope === "string" ? session.scope : "";
  return scopeValue.split(/\s+/).includes(requiredScope);
}

export function createBrowserDataSummary() {
  const trackTagsMap = getStoredTrackTagsMap();
  const trackTagEntries = Object.values(trackTagsMap).filter(
    (entry) => entry && typeof entry === "object"
  );

  return {
    trackTagEntryCount: Object.keys(trackTagsMap).length,
    userTagEntryCount: trackTagEntries.filter(
      (entry) => Array.isArray(entry.user) && entry.user.length > 0
    ).length,
  };
}

export function getMarketFromBrowser() {
  const runtimeLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  const locales = [runtimeLocale, navigator.language, ...(navigator.languages || [])].filter(Boolean);

  for (const locale of locales) {
    if (typeof Intl.Locale === "function") {
      try {
        const expandedLocale = new Intl.Locale(locale).maximize();

        if (expandedLocale.region && /^[A-Z]{2}$/i.test(expandedLocale.region)) {
          return expandedLocale.region.toUpperCase();
        }
      } catch (error) {
        // Ignore locale parsing issues and continue with the simpler fallback.
      }
    }

    const parts = locale.split("-");

    if (parts.length > 1 && /^[A-Z]{2}$/i.test(parts[1])) {
      return parts[1].toUpperCase();
    }
  }

  return "";
}

export function createMissingSessionError() {
  const error = new Error("Spotify のログイン期限が切れました。もう一度ログインしてください。");
  error.status = 401;
  return error;
}
