"use client";

import type { SavedHandAnalysis } from "@/lib/hand-upload-types";

export function HandAnalysisCard({
  analysis,
}: {
  analysis: SavedHandAnalysis;
}) {
  const scoreText =
    typeof analysis.score === "number" && Number.isFinite(analysis.score)
      ? `${Math.round(analysis.score)}/100`
      : "";

  return (
    <section className="rounded-[22px] border border-[var(--border-strong)] bg-[rgba(214,178,93,0.08)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
          AI Analysis
        </p>
        <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-white/60">
          {analysis.model}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {analysis.title ? (
          <p className="text-lg font-semibold text-white">{analysis.title}</p>
        ) : null}
        {scoreText ? (
          <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold-soft)]">
            {scoreText}
          </span>
        ) : null}
        {analysis.rangeCategory ? (
          <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/68">
            {analysis.rangeCategory}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-7 text-white/88">{analysis.summary}</p>

      {analysis.villainReading ? (
        <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
            Villain Reading
          </p>
          <p className="mt-3 text-sm leading-6 text-white/84">
            {analysis.villainReading}
          </p>
        </div>
      ) : null}

      {analysis.streets.length > 0 ? (
        <div className="mt-4 space-y-3">
          {analysis.streets.map((street) => (
            <div
              key={`${street.street}-${street.highlight}`}
              className="rounded-[18px] border border-white/8 bg-black/15 p-4"
            >
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                {street.street}
              </p>
              {(street.verdict || street.rating) ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {street.verdict ? (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/78">
                      {street.verdict}
                    </span>
                  ) : null}
                  {street.rating ? (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-white/56">
                      {street.rating}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-2 text-sm leading-6 text-white/86">
                {street.highlight}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {street.suggestion}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {analysis.gtoTips.length > 0 ? (
        <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
            GTO Tips
          </p>
          <div className="mt-3 space-y-2">
            {analysis.gtoTips.map((tip) => (
              <p key={tip} className="text-sm leading-6 text-white/86">
                • {tip}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-[#d8f3b1]">
        {analysis.encouragement}
      </p>
    </section>
  );
}
