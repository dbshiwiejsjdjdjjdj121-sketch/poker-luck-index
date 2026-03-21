"use client";

import type {
  ManualHandSetup,
  ManualReplayData,
  ReplayActionHistoryItem,
} from "@/lib/hand-upload-types";
import { ManualReplayTable } from "@/components/manual-replay-table";

function describeAction(action: ReplayActionHistoryItem) {
  switch (action.action) {
    case "Fold":
      return `${action.seat} folds`;
    case "Check":
      return `${action.seat} checks`;
    case "Call":
      return `${action.seat} calls${action.amount ? ` ${action.amount}bb` : ""}`;
    case "Bet":
      return `${action.seat} bets${action.amount ? ` ${action.amount}bb` : ""}`;
    case "Raise":
      return `${action.seat} raises${action.to ? ` to ${action.to}bb` : action.amount ? ` ${action.amount}bb` : ""}`;
    case "All-In":
      return `${action.seat} moves all-in${action.amount ? ` for ${action.amount}bb` : ""}`;
    case "Limp":
      return `${action.seat} limps`;
    default:
      return `${action.seat} ${String(action.action).toLowerCase()}`;
  }
}

export function ManualReplayViewer({
  setup,
  replay,
}: {
  setup: ManualHandSetup;
  replay: ManualReplayData;
}) {
  return (
    <div className="space-y-6">
      <ManualReplayTable setup={setup} handState={replay.finalState} />

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <section className="panel p-5 sm:p-6">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
            Hand Flow
          </p>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-white/84">
            {replay.progressionText}
          </pre>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                Action Log
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Saved in the same preflop-to-river order as the desktop replay flow.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-white/58">
              {replay.actionHistory.length} actions
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {replay.actionHistory.map((action, index) => (
              <div
                key={`${action.street}-${action.seat}-${index}`}
                className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    {describeAction(action)}
                  </p>
                  <span className="text-[0.66rem] uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                    {action.street}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
