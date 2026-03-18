import type { Metadata } from "next";
import { HandHistoryBrowser } from "@/components/hand-history-browser";
import { SITE_NAME, buildAbsoluteUrl } from "@/lib/site";

const PAGE_TITLE = "Hand History";
const PAGE_DESCRIPTION =
  "Review saved poker hand uploads, reopen them, and keep AI analysis attached to each record.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/history",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: `${PAGE_TITLE} | ${SITE_NAME}`,
    description: PAGE_DESCRIPTION,
    url: buildAbsoluteUrl("/history"),
  },
};

export default function HistoryPage() {
  return <HandHistoryBrowser />;
}
