"use client";

import type { CSSProperties, ReactNode } from "react";
import { PokerCardImage } from "@/components/poker-card-image";
import type {
  ManualHandSetup,
  ReplayHandState,
  ReplayPlayerState,
  ReplaySeatPosition,
} from "@/lib/hand-upload-types";

const SEAT_LAYOUT: Record<
  ReplaySeatPosition,
  { style: CSSProperties }
> = {
  BTN: { style: { left: "7%", top: "14%" } },
  SB: { style: { left: "50%", top: "2%", transform: "translateX(-50%)" } },
  BB: { style: { right: "7%", top: "14%" } },
  UTG: { style: { right: "7%", bottom: "14%" } },
  HJ: {
    style: { left: "50%", bottom: "1%", transform: "translateX(-50%)" },
  },
  CO: { style: { left: "7%", bottom: "14%" } },
};

function formatPot(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SeatCard({
  player,
  setup,
  isCurrent,
  isWinner,
}: {
  player: ReplayPlayerState | undefined;
  setup: ManualHandSetup;
  isCurrent: boolean;
  isWinner: boolean;
}) {
  if (!player) {
    return null;
  }

  const seatPlayer =
    player.seat === setup.hero.seat
      ? setup.hero
      : setup.opponents.find((opponent) => opponent.seat === player.seat);
  const cards = seatPlayer?.unknownCards
    ? ["Unknown", "Unknown"]
    : [player.holeCards?.first, player.holeCards?.second];

  return (
    <div
      className={`w-[126px] rounded-[22px] border bg-[rgba(7,16,14,0.92)] p-3 shadow-[0_14px_28px_rgba(0,0,0,0.28)] transition ${
        isWinner
          ? "border-[#b8f0b5]/40"
          : player.isHero
            ? "border-[rgba(214,178,93,0.4)]"
            : player.inHand
              ? "border-white/12"
              : "border-white/6 opacity-45"
      } ${isCurrent ? "ring-2 ring-[rgba(214,178,93,0.5)]" : ""}`}
    >
      <p className="text-[0.78rem] uppercase tracking-[0.28em] text-white/72">{player.seat}</p>

      <div className="mt-3 flex justify-center gap-2">
        {cards.map((card, index) => (
          <PokerCardImage
            key={`${player.seat}-${index}`}
            card={card}
            backIfUnknown
            alt={`${player.name} card ${index + 1}`}
            sizes="58px"
            className="h-[82px] w-[58px] rounded-[16px] border border-white/12 bg-[rgba(255,255,255,0.06)] p-[3px] shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
          />
        ))}
      </div>
    </div>
  );
}

export function ManualReplayTable({
  setup,
  handState,
  topRightControl,
  boardActionControl,
}: {
  setup: ManualHandSetup;
  handState: ReplayHandState;
  topRightControl?: ReactNode;
  boardActionControl?: ReactNode;
}) {
  const tableShellClass =
    "absolute inset-[7%_6%_8%] rounded-[30px] border border-white/7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]";
  const innerFrameClass =
    "absolute inset-[14%_12%_16%] rounded-[26px] border border-white/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]";

  return (
    <section className="panel panel-strong relative overflow-hidden p-4 sm:p-6">
      <div className="home-felt absolute inset-[10%] opacity-90" />

      <div className="relative">
        <div className="mx-auto aspect-[1.48/1] max-w-5xl">
          <div className={tableShellClass} />
          <div className={innerFrameClass} />

          {topRightControl ? (
            <div className={`${innerFrameClass} pointer-events-none z-20`}>
              <div className="absolute right-4 top-4 pointer-events-auto">
                {topRightControl}
              </div>
            </div>
          ) : null}

          <div className="absolute inset-[20%_16%_16%] rounded-[999px] border border-[rgba(214,178,93,0.18)] bg-[radial-gradient(circle_at_center,rgba(21,87,66,0.92),rgba(8,35,28,0.96))] shadow-[inset_0_0_0_1px_rgba(214,178,93,0.08)]" />

          <div className="absolute left-1/2 top-[31%] -translate-x-1/2">
            <div className="rounded-full border border-[var(--border-strong)] bg-black/25 px-4 py-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              {handState.finished ? "Hand Complete" : `${handState.street} action`}
            </div>
          </div>

          <div className="absolute left-1/2 top-[43%] w-[220px] -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-[22px] border border-white/10 bg-[rgba(6,13,11,0.84)] px-5 py-4 text-center shadow-[0_18px_38px_rgba(0,0,0,0.26)]">
              <p className="text-[0.66rem] uppercase tracking-[0.22em] text-white/52">Pot</p>
              <p className="mt-2 font-heading text-4xl text-[var(--gold-soft)]">
                {formatPot(handState.potBb)}bb
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/48">
                Current bet {formatPot(handState.currentBetBb)}bb
              </p>
            </div>
          </div>

          <div className="absolute inset-x-[12%] top-[58%] -translate-y-1/2">
            <div className="relative">
              <div className="flex justify-center sm:pr-[190px]">
                <div className="flex justify-center gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const card = handState.board[index];

                    return card ? (
                      <PokerCardImage
                        key={`board-${index}`}
                        card={card}
                        alt={`Board card ${index + 1}`}
                        sizes="50px"
                        className="h-[76px] w-[54px] rounded-[14px] border border-white/14 bg-[rgba(255,255,255,0.04)] p-[3px] shadow-[0_12px_26px_rgba(0,0,0,0.22)]"
                      />
                    ) : (
                      <div
                        key={`board-${index}`}
                        className="flex h-[76px] w-[54px] items-center justify-center rounded-[14px] border border-dashed border-white/10 bg-black/20 text-sm font-semibold text-white/25 shadow-[0_12px_26px_rgba(0,0,0,0.22)]"
                      >
                        ?
                      </div>
                    );
                  })}
                </div>
              </div>

              {boardActionControl ? (
                <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 sm:block">
                  {boardActionControl}
                </div>
              ) : null}
            </div>
          </div>

          {(["BTN", "SB", "BB", "UTG", "HJ", "CO"] as ReplaySeatPosition[]).map((seat) => (
            <div key={seat} className="absolute" style={SEAT_LAYOUT[seat].style}>
              <SeatCard
                player={handState.players.find((player) => player.seat === seat)}
                setup={setup}
                isCurrent={handState.toActQueue[0] === seat}
                isWinner={handState.winnerSeat === seat}
              />
            </div>
          ))}
        </div>

        {boardActionControl ? (
          <div className="mt-4 flex justify-center sm:hidden">{boardActionControl}</div>
        ) : null}
      </div>
    </section>
  );
}
