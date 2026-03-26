import type { Metadata } from "next";
import { BankrollStudio } from "@/components/bankroll-studio";
import { SITE_NAME, buildAbsoluteUrl, buildOgImageUrl } from "@/lib/site";

const PAGE_TITLE = "Free Poker Bankroll Tracker";
const PAGE_DESCRIPTION =
  "Track poker sessions, bankroll swings, and running profit for free in a mobile-friendly web app.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/bankroll",
  },
  openGraph: {
    title: `${PAGE_TITLE} | ${SITE_NAME}`,
    description: PAGE_DESCRIPTION,
    url: buildAbsoluteUrl("/bankroll"),
    images: [
      {
        url: buildOgImageUrl({ view: "home" }),
        width: 1200,
        height: 630,
        alt: "Poker bankroll tracker",
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

export default function BankrollPage() {
  return <BankrollStudio />;
}
