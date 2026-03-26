import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
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

        <section className="panel panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="home-felt absolute inset-x-[10%] top-[-18%] hidden h-[420px] rounded-[999px] lg:block" />

          <div className="relative grid gap-10 xl:grid-cols-[1.04fr_0.96fr] xl:items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[var(--gold-soft)]">
                <span>♠</span>
                <span>Free Poker Tools For Live Players</span>
                <span>♥</span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl font-heading text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  <span className="block">Track Bankroll.</span>
                  <span className="mt-2 block text-[var(--gold-soft)]">
                    Replay Hands. Check The Table.
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  Start with the free bankroll tracker and manual replay studio. Keep the
                  luck read as a fast pre-session hook, then unlock AI analysis only when
                  you want voice, screenshot, and deeper review tools.
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
                  <article key={pillar.title} className="panel p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      {pillar.eyebrow}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">{pillar.title}</p>
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
      </div>
    </main>
  );
}
