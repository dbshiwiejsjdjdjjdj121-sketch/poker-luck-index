import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { HomeForm } from "@/components/home-form";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  buildOgImageUrl,
} from "@/lib/site";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [buildOgImageUrl({ view: "home" })],
  },
};

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center">
        <section className="panel panel-strong relative overflow-hidden p-5 sm:p-8 lg:p-10">
          <div className="home-felt absolute inset-x-[10%] top-[-18%] hidden h-[420px] rounded-[999px] lg:block" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[var(--gold-soft)]">
                  <span>♠</span>
                  <span>Poker Luck Index</span>
                  <span>♥</span>
                </div>
                <AuthButton />
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl font-heading text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  <span className="block">Check Your Poker Luck</span>
                  <span className="mt-2 block text-[var(--gold-soft)]">
                    Before The First Hand
                  </span>
                </h1>
                <p className="max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  Get today&apos;s luck score, best play style, coin-flip call,
                  and three hands to watch.
                </p>
              </div>

              <div className="mini-deck">
                <div className="mini-card mini-card-hand">
                  <span>AK</span>
                  <span>AK</span>
                </div>
                <div className="mini-card mini-card-hand mini-card-red">
                  <span>77</span>
                  <span>77</span>
                </div>
                <div className="mini-card mini-card-hand">
                  <span>QJ</span>
                  <span>QJ</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                <span>♣ 10-point table read</span>
                <span>♦ Free bankroll + manual upload</span>
                <span>♥ Pro voice, screenshot, and AI review</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/hand-review" className="btn-secondary">
                  Upload A Real Hand
                </Link>
                <Link href="/bankroll" className="btn-secondary">
                  Track Bankroll
                </Link>
                <Link href="/history" className="btn-secondary">
                  View History
                </Link>
              </div>
            </div>

            <HomeForm />
          </div>
        </section>
      </div>
    </main>
  );
}
