import type { Metadata } from "next";
import Link from "next/link";
import { ShareFortune } from "@/components/share-fortune";
import { TipDealer } from "@/components/tip-dealer";
import { buildFortune } from "@/lib/fortune";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  buildAbsoluteUrl,
  buildOgImageUrl,
  buildResultDescription,
  buildResultPath,
  buildShareText,
  getFortuneInputFromSearchParams,
  readSearchParam,
  type SearchParams,
} from "@/lib/site";

type ResultPageProps = {
  searchParams: Promise<SearchParams>;
};

function InsightTile({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[rgba(216,177,82,0.08)] text-lg text-[var(--gold-soft)]">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold-soft)]">
            {title}
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{value}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function SessionStage({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="stage-row">
      <div className="stage-pill">{title}</div>
      <p className="text-base leading-7 text-white">{value}</p>
    </div>
  );
}

export async function generateMetadata({
  searchParams,
}: ResultPageProps): Promise<Metadata> {
  const params = await searchParams;
  const input = getFortuneInputFromSearchParams(params);

  if (!input) {
    return {
      title: "No Fortune Yet",
      description: SITE_DESCRIPTION,
      alternates: {
        canonical: "/result",
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const fortune = buildFortune(input);
  const description = buildResultDescription(fortune);
  const resultPath = buildResultPath(input);
  const ogImageUrl = buildOgImageUrl({ view: "result", fortune });

  return {
    title: `Luck Index ${fortune.luckScore}/10`,
    description,
    alternates: {
      canonical: resultPath,
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: `${SITE_NAME} ${fortune.luckScore}/10`,
      description,
      url: buildAbsoluteUrl(resultPath),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Poker Luck Index ${fortune.luckScore} out of 10 sharing card`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} ${fortune.luckScore}/10`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;
  const tableNumber = readSearchParam(params, "table_number");
  const seatNumber = readSearchParam(params, "seat_number");
  const birthDate = readSearchParam(params, "birth_date");
  const todayDate = readSearchParam(params, "today_date");

  if (!tableNumber || !seatNumber || !birthDate || !todayDate) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <section className="panel panel-strong w-full max-w-xl p-8 text-center">
          <p className="font-heading text-3xl text-white">No fortune yet</p>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Enter your table number, seat number, birth date, and today&apos;s
            date to see your poker read.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full border border-[var(--border-strong)] px-5 py-3 text-sm uppercase tracking-[0.24em] text-[var(--gold-soft)] transition hover:bg-white/5"
          >
            Back Home
          </Link>
        </section>
      </main>
    );
  }

  const fortune = buildFortune({
    tableNumber,
    seatNumber,
    birthDate,
    todayDate,
  });
  const shareUrl = buildAbsoluteUrl(
    buildResultPath({
      tableNumber,
      seatNumber,
      birthDate,
      todayDate,
    }),
  );
  const shareText = buildShareText(fortune);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)] transition hover:text-white"
          >
            <span>←</span>
            <span>New Reading</span>
          </Link>
        </div>

        <section className="panel panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="home-felt absolute inset-x-[8%] top-[-20%] hidden h-[420px] rounded-[999px] lg:block" />

          <p className="relative text-xs uppercase tracking-[0.34em] text-[var(--gold-soft)]">
            Today&apos;s Table Read
          </p>

          <div className="relative mt-5 grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
              <div className="score-orbit">
                <div className="score-ring">
                  <span className="score-main">{fortune.luckScore}</span>
                  <span className="score-denom">/10</span>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.34em] text-[var(--gold-soft)]">
                  Luck Index
                </p>
                <div className="score-pips mt-4">
                  {Array.from({ length: 10 }, (_, index) => (
                    <span
                      key={index}
                      className={index < fortune.luckScore ? "score-pip is-active" : "score-pip"}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="order-2 space-y-5 lg:order-1">
              <h1 className="font-heading text-4xl leading-tight text-white sm:text-5xl">
                {fortune.scoreLabel}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/92">
                {fortune.scoreSummary}
              </p>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
                {fortune.scoreAdvice}
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="result-chip">
                  <span>♠</span>
                  <span>{fortune.recommendedStyle} style</span>
                </div>
                <div className="result-chip">
                  <span>♥</span>
                  <span>{fortune.coinFlipDecision} the first flip</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <InsightTile
            icon="♠"
            title="Best Style"
            value={fortune.recommendedStyle}
            description={fortune.recommendedStyleNote}
          />
          <InsightTile
            icon="♥"
            title="Coin Flip"
            value={fortune.coinFlipDecision}
            description={fortune.coinFlipReason}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <section className="panel p-6 sm:p-8">
            <div className="max-w-xl">
              <p className="font-heading text-2xl text-white">
                How to Play This Session
              </p>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                A simple plan for the start, the middle stretch, and the close.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <SessionStage title="Start" value={fortune.earlySessionStrategy} />
              <SessionStage title="Middle" value={fortune.midSessionAdjustment} />
              <SessionStage title="Finish" value={fortune.lateSessionStrategy} />
            </div>
          </section>

          <section className="panel p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-heading text-2xl text-white">
                  Hands To Watch Today
                </p>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  Play these more confidently when spots are reasonable.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold-soft)]">
                No Suits
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {fortune.luckyHands.map((hand) => (
                <div
                  key={hand}
                  className="poker-card flex flex-col justify-between p-4"
                >
                  <span className="text-lg font-bold text-[#8e1d2d]">{hand}</span>
                  <span className="self-center font-heading text-4xl text-[#191919]">
                    {hand}
                  </span>
                  <span className="self-end text-lg font-bold text-[#8e1d2d]">
                    {hand}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ShareFortune shareUrl={shareUrl} shareText={shareText} />
          <TipDealer />
        </section>
      </div>
    </main>
  );
}
