import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { AppStorePromo } from "@/components/app-store-promo";
import { HomeForm } from "@/components/home-form";
import {
  SITE_NAME,
  buildOgImageUrl,
} from "@/lib/site";

const HOME_TITLE = `${SITE_NAME} | Free Poker Bankroll Tracker, Replay & Luck Index`;
const HOME_DESCRIPTION =
  "Free poker bankroll tracker, manual hand replay, saved history, and a fast table read in one clean poker workspace.";

const HOME_PILLARS = [
  {
    eyebrow: "Free Tool",
    title: "Bankroll Tracker",
    description: "Log sessions, watch swings, and keep a running profit line without leaving the same site.",
  },
  {
    eyebrow: "Free Tool",
    title: "Manual Replay",
    description: "Save live hands street by street, reopen them later, and keep your history attached.",
  },
  {
    eyebrow: "Pro Upgrade",
    title: "AI Analysis",
    description: "Use voice, screenshots, and AI hand breakdowns only after the free workflow is already useful.",
  },
] as const;

export const metadata: Metadata = {
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    images: [
      {
        url: buildOgImageUrl({ view: "home" }),
        width: 1200,
        height: 630,
        alt: "Poker Luck Index home sharing card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [buildOgImageUrl({ view: "home" })],
  },
};

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppNavigation />

        <section className="panel panel-strong p-6 sm:p-8 lg:p-10">
          <div className="grid gap-10 xl:grid-cols-[1fr_0.95fr] xl:items-start">
            <div className="space-y-6">
              <p className="text-[0.7rem] uppercase tracking-[0.32em] text-[var(--gold-soft)]">
                Free Poker Tools For Live Players
              </p>

              <div className="space-y-3">
                <h1 className="max-w-3xl font-heading text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                  Track bankroll, replay hands, and get a fast table read.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Start with the free bankroll tracker and manual replay studio. Use the
                  luck read as a quick pre-session check, then unlock AI analysis only
                  when you want a deeper review.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/bankroll"
                  className="btn-primary inline-flex items-center justify-center"
                >
                  Open Free Bankroll Tracker
                </Link>
                <Link
                  href="/hand-review"
                  className="btn-secondary inline-flex items-center justify-center"
                >
                  Start Manual Replay
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {HOME_PILLARS.map((pillar) => (
                  <article key={pillar.title} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      {pillar.eyebrow}
                    </p>
                    <p className="mt-3 text-base font-semibold text-white">{pillar.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {pillar.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <HomeForm />
          </div>
        </section>

        <AppStorePromo />
      </div>
    </main>
  );
}
