import type { Metadata } from "next";
import Link from "next/link";
import { BankrollStudio } from "@/components/bankroll-studio";
import { SITE_NAME, buildAbsoluteUrl, buildOgImageUrl } from "@/lib/site";

const PAGE_TITLE = "Free Poker Bankroll Tracker for Live Sessions";
const PAGE_DESCRIPTION =
  "Track live poker sessions, bankroll swings, and running profit for free in a mobile-friendly poker bankroll tracker.";
const PAGE_KEYWORDS = [
  "free poker bankroll tracker",
  "live poker bankroll tracker",
  "track poker sessions",
  "poker session tracker",
  "poker bankroll management",
] as const;

const BANKROLL_FEATURES = [
  {
    title: "Log Sessions Fast",
    description: "Save buy-in, cash-out, date, and a quick table note without leaving the same screen.",
  },
  {
    title: "See Swings Clearly",
    description: "Watch the running profit line update as your sample grows across live sessions.",
  },
  {
    title: "Keep Notes Useful",
    description: "Attach lineup or texture notes so later reviews are still tied to the actual session.",
  },
] as const;

const BANKROLL_STEPS = [
  "Enter your buy-in and cash-out after each live session.",
  "Use the note field for lineup reads, table texture, or stake changes worth remembering.",
  "Review the chart and recent sessions to spot swings, leaks, and trend changes over time.",
] as const;

const BANKROLL_FAQS = [
  {
    question: "Who is this bankroll tracker for?",
    answer:
      "It is built for live poker players who want a fast way to log sessions, track running profit, and keep session notes together in one lightweight web tool.",
  },
  {
    question: "Can I use it for free?",
    answer:
      "Yes. The bankroll tracker is part of the free workflow. Paid features are reserved for deeper AI analysis, not for basic bankroll logging.",
  },
  {
    question: "What should I record after a poker session?",
    answer:
      "At minimum, record buy-in, cash-out, and date. A short note about lineup quality, game texture, or tilt can make later reviews much more useful.",
  },
] as const;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [...PAGE_KEYWORDS],
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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: `${SITE_NAME} Bankroll Tracker`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: buildAbsoluteUrl("/bankroll"),
        description: PAGE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: BANKROLL_FEATURES.map((item) => item.title),
      },
      {
        "@type": "FAQPage",
        mainEntity: BANKROLL_FAQS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <h1 className="sr-only">Free Poker Bankroll Tracker for Live Poker Sessions</h1>
      <BankrollStudio />

      <section className="px-4 pb-28 sm:px-6 lg:px-8 lg:pb-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="panel panel-strong grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <p className="text-[0.72rem] uppercase tracking-[0.26em] text-[var(--gold-soft)]">
                Live Poker Bankroll Tracker
              </p>
              <h2 className="font-heading text-3xl text-white sm:text-4xl">
                Track sessions, bankroll swings, and real progress in one place.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Use this free poker bankroll tracker to log live cash sessions, keep a
                running profit line, and attach notes that still matter when you look
                back later. The goal is simple: make session tracking fast enough that
                you actually keep doing it.
              </p>
            </div>

            <div className="grid gap-3">
              {BANKROLL_FEATURES.map((item) => (
                <article key={item.title} className="panel p-4">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="panel p-5 sm:p-6">
              <h2 className="font-heading text-2xl text-white">
                How to use this poker session tracker
              </h2>
              <ol className="mt-5 space-y-4">
                {BANKROLL_STEPS.map((step, index) => (
                  <li key={step} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Step {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{step}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/hand-review"
                  className="btn-secondary inline-flex items-center justify-center"
                >
                  Pair It With Manual Replay
                </Link>
                <Link
                  href="/history"
                  className="btn-secondary inline-flex items-center justify-center"
                >
                  Reopen Saved History
                </Link>
              </div>
            </article>

            <article className="panel p-5 sm:p-6">
              <h2 className="font-heading text-2xl text-white">
                Poker bankroll tracker FAQ
              </h2>
              <div className="mt-5 space-y-4">
                {BANKROLL_FAQS.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--gold-soft)]">
                      {item.question}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </section>
    </>
  );
}
