"use client";

type AnalyticsPrimitive = boolean | number | string;
type AnalyticsParams = Record<string, AnalyticsPrimitive | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function normalizeValue(value: AnalyticsPrimitive | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value;
}

export function trackEvent(event: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEntries = Object.entries(params).flatMap(([key, value]) => {
    const normalizedValue = normalizeValue(value);

    if (normalizedValue === undefined || normalizedValue === null || normalizedValue === "") {
      return [];
    }

    return [[key, normalizedValue] as const];
  });

  const payload = Object.fromEntries(normalizedEntries);

  if (typeof window.gtag === "function") {
    window.gtag("event", event, payload);
    return;
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(["event", event, payload]);
  }
}
