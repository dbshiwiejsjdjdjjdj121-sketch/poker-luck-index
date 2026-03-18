"use client";

import type { ReactNode } from "react";
import { HandAnalysisCard } from "@/components/hand-analysis-card";
import { uploadSourceLabels, type SavedHandUpload } from "@/lib/hand-upload-types";

function summarizeBoard(item: SavedHandUpload) {
  const parts = [
    item.board.flop.length > 0 ? item.board.flop.join(" ") : "",
    item.board.turn,
    item.board.river,
  ].filter(Boolean);

  return parts.join(" • ");
}

function summarizeHero(item: SavedHandUpload) {
  const parts = [
    item.hero.position,
    item.hero.cards.length > 0 ? item.hero.cards.join(" ") : "",
    item.hero.stackBb > 0 ? `${item.hero.stackBb}bb` : "",
  ].filter(Boolean);

  return parts.join(" • ");
}

function formatManualCards(first: string, second: string, unknown?: boolean) {
  if (unknown || first === "Unknown" || second === "Unknown") {
    return "Unknown cards";
  }

  return [first, second].filter(Boolean).join(" ");
}

export function HandUploadRecordCard({
  item,
  actions,
  showRawInput = false,
}: {
  item: SavedHandUpload;
  actions?: ReactNode;
  showRawInput?: boolean;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
            {uploadSourceLabels[item.source]}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-white/75">
            {item.confidence} confidence
          </span>
          {item.analysis ? (
            <span className="rounded-full border border-[#d8f3b1]/30 bg-[#d8f3b1]/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-[#d8f3b1]">
              AI analyzed
            </span>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="font-heading text-2xl text-white">{item.title}</p>
          <p className="mt-2 text-base leading-7 text-white/88">
            {item.quickSummary}
          </p>
        </div>

        <p className="text-sm leading-6 text-[var(--muted)]">
          {item.coachAdvice}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Hero Snapshot
            </p>
            <p className="mt-2 text-sm leading-6 text-white">
              {summarizeHero(item) || "No clear hero details extracted."}
            </p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Board
            </p>
            <p className="mt-2 text-sm leading-6 text-white">
              {summarizeBoard(item) || "Board cards were not clearly shown."}
            </p>
          </div>
        </div>

        {item.manualSetup ? (
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Manual Table Setup
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-white/8 bg-black/15 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                  Hero
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {item.manualSetup.hero.name}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/60">
                  {item.manualSetup.hero.seat} • {item.manualSetup.hero.stackBb}bb
                </p>
                <p className="mt-2 text-sm text-white/86">
                  {formatManualCards(
                    item.manualSetup.hero.holeCards.first,
                    item.manualSetup.hero.holeCards.second,
                  )}
                </p>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-black/15 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                  Button
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {item.manualSetup.buttonSeat}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {item.manualSetup.opponents.length} opponent
                  {item.manualSetup.opponents.length === 1 ? "" : "s"} added
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {item.manualSetup.opponents.map((opponent) => (
                <div
                  key={`${opponent.seat}-${opponent.name}`}
                  className="rounded-[18px] border border-white/8 bg-black/15 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {opponent.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/60">
                        {opponent.seat} • {opponent.stackBb}bb
                      </p>
                    </div>
                    <p className="text-sm text-white/82">
                      {formatManualCards(
                        opponent.holeCards.first,
                        opponent.holeCards.second,
                        opponent.unknownCards,
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {item.manualSetup.actionNotes ? (
              <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                  Action Notes
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/88">
                  {item.manualSetup.actionNotes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {item.keyActions.length > 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Key Actions
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.keyActions.map((action) => (
                <span
                  key={action}
                  className="rounded-full border border-[var(--border)] bg-black/15 px-3 py-1 text-xs text-white/80"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {showRawInput ? (
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Original Input
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/88">
              {item.rawInput}
            </p>
          </div>
        ) : null}

        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
            Saved Hand Text
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/88">
            {item.normalizedHandText}
          </p>
        </div>

        {item.missingDetails.length > 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Missing Details
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {item.missingDetails.join(" • ")}
            </p>
          </div>
        ) : null}

        {item.analysis ? <HandAnalysisCard analysis={item.analysis} /> : null}
      </div>
    </section>
  );
}
