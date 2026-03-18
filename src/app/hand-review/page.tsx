import type { Metadata } from "next";
import { HandReviewStudio } from "@/components/hand-review-studio";
import {
  SITE_NAME,
  buildAbsoluteUrl,
  buildOgImageUrl,
} from "@/lib/site";

const PAGE_TITLE = "Hand Upload Studio";
const PAGE_DESCRIPTION =
  "Save a poker hand by manual note, voice, or screenshot. Manual upload stays free, while AI-powered voice, screenshot, and hand analysis run through Firebase-backed premium flows.";

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

export default function HandReviewPage() {
  return <HandReviewStudio />;
}
