import type { Metadata } from "next";
import { AppNavigation } from "@/components/app-navigation";
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
    <main className="relative min-h-screen overflow-hidden px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppNavigation />

        <section className="panel panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="home-felt absolute inset-x-[10%] top-[-18%] hidden h-[420px] rounded-[999px] lg:block" />

          <div className="relative grid gap-10 xl:grid-cols-[1.04fr_0.96fr] xl:items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[var(--gold-soft)]">
                <span>♠</span>
                <span>Poker Luck Index</span>
                <span>♥</span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl font-heading text-5xl leading-none text-white sm:text-6xl lg:text-7xl">
                  <span className="block">One Poker Home</span>
                  <span className="mt-2 block text-[var(--gold-soft)]">
                    Luck, Replay, History, Bankroll
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  Use Luck before the session. Save real hands with Replay. Keep every spot in History.
                  Track your bankroll without leaving the same app.
                </p>
              </div>
            </div>

            <HomeForm />
          </div>
        </section>
      </div>
    </main>
  );
}
