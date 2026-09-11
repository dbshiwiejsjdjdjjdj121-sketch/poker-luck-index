export function publicAnalyticsUrl(value: string, publicPaths: readonly string[]): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== "https://www.allinpokerai.com" || !publicPaths.includes(url.pathname)) return null;
    return url.origin + url.pathname;
  } catch { return null; }
}
