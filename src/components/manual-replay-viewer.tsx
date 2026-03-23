"use client";

import { PokerCardImage } from "@/components/poker-card-image";
import type {
  ManualHandSetup,
  ManualReplayData,
  ManualPlayerSetup,
  ReplayActionHistoryItem,
  ReplayActionStreet,
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

function getPlayerLabel(player: ManualPlayerSetup, setup: ManualHandSetup) {
  return player.seat === setup.hero.seat ? "Hero" : player.name;
}

function getStreetLabel(street: ReplayActionStreet) {
  switch (street) {
    case "preflop":
      return "Preflop";
    case "flop":
      return "Flop";
    case "turn":
      return "Turn";
    case "river":
      return "River";
    default:
      return street;
  }
}

function getStreetBoard(street: ReplayActionStreet, board: string[]) {
  switch (street) {
    case "flop":
      return board.slice(0, 3);
    case "turn":
      return board.slice(0, 4);
    case "river":
      return board.slice(0, 5);
    default:
      return [];
  }
}

function renderPlayerCards(player: ManualPlayerSetup) {
  const cards = player.unknownCards
    ? ["Unknown", "Unknown"]
    : [player.holeCards.first, player.holeCards.second];

  return (
    <div className="mt-3 flex items-center gap-2">
      {cards.map((card, index) => (
        <PokerCardImage
          key={`${player.seat}-${index}`}
          card={card}
          backIfUnknown
          alt={`${player.name} card ${index + 1}`}
          sizes="44px"
          className="h-[64px] w-[46px] rounded-[12px] border border-white/12 bg-[rgba(255,255,255,0.04)] p-[3px] shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
        />
      ))}
    </div>
  );
}

export function ManualReplayViewer({
  setup,
  replay,
}: {
  setup: ManualHandSetup;
  replay: ManualReplayData;
}) {
  const players = [setup.hero, ...setup.opponents];
  const streets: ReplayActionStreet[] = ["preflop", "flop", "turn", "river"];
  const winnerLabel = replay.finalState.winnerSeat
    ? getPlayerLabel(
        players.find((player) => player.seat === replay.finalState.winnerSeat) || setup.hero,
        setup,
      )
    : "No winner set";

  return (
    <div className="space-y-6">
      <ManualReplayTable setup={setup} handState={replay.finalState} />

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Hand Flow
            </p>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.66rem] uppercase tracking-[0.2em] text-white/58">
              {players.length} players
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {players.map((player) => (
              <div
                key={`summary-${player.seat}`}
                className="rounded-[20px] border border-white/8 bg-black/15 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {getPlayerLabel(player, setup)}
                    </p>
                    <p className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      {player.seat}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/62">
                    {player.stackBb}bb
                  </div>
                </div>

                {renderPlayerCards(player)}
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {streets.map((street) => {
              const streetActions = replay.actionHistory.filter(
                (action) => action.street === street,
              );
              const streetBoard = getStreetBoard(street, replay.finalState.board);
              const shouldShow = street === "preflop" || streetActions.length > 0 || streetBoard.length > 0;

              if (!shouldShow) {
                return null;
              }

              return (
                <div
                  key={street}
                  className="rounded-[20px] border border-white/8 bg-black/15 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                      {getStreetLabel(street)}
                    </p>

                    {streetBoard.length > 0 ? (
                      <div className="flex items-center gap-2">
                        {streetBoard.map((card, index) => (
                          <PokerCardImage
                            key={`${street}-${card}-${index}`}
                            card={card}
                            alt={`${street} board card ${index + 1}`}
                            sizes="34px"
                            className="h-[48px] w-[34px] rounded-[10px] border border-white/12 bg-[rgba(255,255,255,0.04)] p-[2px]"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2">
                    {streetActions.length > 0 ? (
                      streetActions.map((action, index) => (
                        <div
                          key={`${street}-${action.seat}-${index}`}
                          className="flex items-start gap-3 rounded-[16px] border border-white/7 bg-white/[0.03] px-3 py-2.5"
                        >
                          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent-strong)]" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">
                              {describeAction(action)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[16px] border border-dashed border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm text-white/45">
                        No recorded action.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-white/8 bg-[rgba(167,139,250,0.08)] px-4 py-3">
              <p className="text-[0.66rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                Final Pot
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {replay.finalState.potBb}bb
              </p>
            </div>

            <div className="rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
              <p className="text-[0.66rem] uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                Winner
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{winnerLabel}</p>
            </div>
          </div>
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
