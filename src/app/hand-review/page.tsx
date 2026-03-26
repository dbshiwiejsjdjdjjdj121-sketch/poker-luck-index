import type { Metadata } from "next";
import { HandReviewStudio } from "@/components/hand-review-studio";
import {
  SITE_NAME,
  buildAbsoluteUrl,
  buildOgImageUrl,
} from "@/lib/site";

const PAGE_TITLE = "Poker Hand Replay Studio";
const PAGE_DESCRIPTION =
  "Replay and save a poker hand by manual note, voice, or screenshot. Manual replay stays free, while AI-powered voice, screenshot, and hand analysis run through premium flows.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/hand-review",
  },
  openGraph: {
    title: `${PAGE_TITLE} | ${SITE_NAME}`,
    description: PAGE_DESCRIPTION,
    url: buildAbsoluteUrl("/hand-review"),
    images: [
      {
        url: buildOgImageUrl({ view: "home" }),
        width: 1200,
        height: 630,
        alt: "Poker hand upload studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | ${SITE_NAME}`,
    description: PAGE_DESCRIPTION,
    images: [buildOgImageUrl({ view: "home" })],
  },
};

export default async function HandReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ handId?: string }>;
}) {
  const params = await searchParams;
  const handId = params.handId?.trim() || "";

  return <HandReviewStudio selectedHandId={handId} />;
}
