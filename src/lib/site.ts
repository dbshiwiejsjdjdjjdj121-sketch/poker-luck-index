import type { Metadata } from "next";
export const SITE_NAME = "ALL IN Poker Guide";
export const SITE_URL = "https://www.allinpokerai.com";
export const SITE_DESCRIPTION = "Find free poker tournaments, compare freeroll entry rules and follow official sources. Explore major live poker festivals and plan your tournament trip.";
export const IS_PREVIEW = process.env.VERCEL_ENV !== undefined && process.env.VERCEL_ENV !== "production";
export function pageMeta(title: string, description: string, path: string, noindex = false): Metadata {
  return { title, description, alternates: { canonical: path }, robots: { index: !IS_PREVIEW && !noindex, follow: true },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, type: "website", siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title, description } };
}
