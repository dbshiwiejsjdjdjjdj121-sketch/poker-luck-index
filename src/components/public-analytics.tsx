"use client";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { publicAnalyticsUrl } from "@/lib/analytics-policy";

export function PublicAnalytics({ paths }: { paths: string[] }) {
  const pathname = usePathname();
  if (!paths.includes(pathname) || typeof window === "undefined" || window.location.hostname !== "www.allinpokerai.com") return null;
  function beforeSend(event: BeforeSendEvent) {
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (privacy.doNotTrack === "1" || privacy.globalPrivacyControl || event.type !== "pageview") return null;
    const url = publicAnalyticsUrl(event.url, paths);
    return url ? { ...event, url } : null;
  }
  return <Analytics mode="production" debug={false} beforeSend={beforeSend} />;
}
