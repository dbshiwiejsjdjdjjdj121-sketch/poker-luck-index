import type { Metadata } from "next";
import Link from "next/link";
import { HandReviewStudio } from "@/components/hand-review-studio";
import {
  SITE_NAME,
  buildAbsoluteUrl,
  buildOgImageUrl,
} from "@/lib/site";

const PAGE_TITLE = "Poker Hand Replay And Review";
const PAGE_DESCRIPTION =
  "Replay poker hands from live notes, voice, or screenshots. Manual hand replay stays free, while AI analysis is there when you want a faster second pass.";

const COMPARISON_CARDS = [
  {
    title: "Use manual replay when you want accuracy first",
    body:
      "Manual replay is best when you have table notes, stack sizes, and action details you trust. You can rebuild the hand street by street without paying to get started.",
  },
  {
    title: "Use AI analysis when speed matters more than setup",
    body:
      "Voice and screenshot flows help when you need to capture the hand quickly, then come back for a structured review later. Premium analysis makes sense after the free replay already fits your study routine.",
  },
  {
    title: "Use both after a live session",
    body:
      "Save key hands with manual replay, reopen them from history, and only run AI on the spots that still feel unclear. That keeps the free workflow useful while reserving paid analysis for the hardest decisions.",
  },
] as const;

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

  return (
    <>
      <HandReviewStudio selectedHandId={handId} />

      <section className="px-4 pb-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="panel panel-strong p-6 sm:p-8 lg:p-10">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--gold-soft)]">
                <span>♣</span>
                <span>Manual Replay Vs AI</span>
              </span>
              <div className="space-y-3">
                <h2 className="font-heading text-3xl leading-tight text-white sm:text-4xl">
                  A poker hand replay tool should help before it asks for an upgrade.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  This page is built for players who want to replay a poker hand from
                  live notes, save the result, and decide later whether AI analysis is
                  worth using on the same spot.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {COMPARISON_CARDS.map((card) => (
                <article key={card.title} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className="space-y-4">
                <h2 className="font-heading text-2xl text-white sm:text-3xl">
                  Build a cleaner post-session review workflow
                </h2>
                <p className="text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Replay is strongest when it connects to the rest of the poker workspace.
                  Track sessions in the bankroll tool, save notable hands here, and reopen
                  important spots from history when you are ready to study them.
                </p>
              </div>

              <div className="grid gap-3">
                <Link href="/bankroll" className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                    Related Tool
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">Free Poker Bankroll Tracker</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Log sessions and connect the hands you want to review after the game.
                  </p>
                </Link>

                <Link href="/history" className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                    Review Flow
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">Saved Hand History</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Reopen saved hands, compare reads, and keep premium analysis attached only where it helps.
                  </p>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
