"use client";

import type { ReactNode } from "react";
import type {
  ManualHandSetup,
  ReplayHandState,
  ReplayPlayerState,
  ReplaySeatPosition,
} from "@/lib/hand-upload-types";

const SEAT_LAYOUT: Record<ReplaySeatPosition, string> = {
  BTN: "left-[9%] top-[8%]",
  SB: "left-1/2 top-[3%] -translate-x-1/2",
  BB: "right-[9%] top-[8%]",
  UTG: "right-[9%] bottom-[11%]",
  HJ: "left-1/2 bottom-[4%] -translate-x-1/2",
  CO: "left-[9%] bottom-[11%]",
};

function formatCard(card?: string) {
  if (!card) {
    return "??";
  }

  if (card === "Unknown") {
    return "??";
  }

  const suit = card.slice(-1).toLowerCase();
  const symbol =
    suit === "s" ? "♠" : suit === "h" ? "♥" : suit === "d" ? "♦" : suit === "c" ? "♣" : "";
  const rank = card.slice(0, card.length - 1).toUpperCase();

  return `${rank}${symbol}`;
}

function cardTextTone(card?: string) {
  const suit = card?.slice(-1).toLowerCase();
  return suit === "h" || suit === "d" ? "text-[#de8d96]" : "text-[#f8f8f8]";
}

function formatPot(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SeatBadge({
  children,
  tone = "gold",
}: {
  children: ReactNode;
  tone?: "gold" | "green" | "red" | "muted";
}) {
  const toneClass =
    tone === "green"
      ? "border-[#b8f0b5]/30 bg-[#b8f0b5]/10 text-[#d9ffd7]"
      : tone === "red"
        ? "border-[#ff97a6]/30 bg-[#ff97a6]/10 text-[#ffccd5]"
        : tone === "muted"
          ? "border-white/10 bg-white/[0.05] text-white/65"
          : "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-[var(--gold-soft)]";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] ${toneClass}`}
    >
      {children}
    </span>
  );
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
      className={`w-[152px] rounded-[22px] border bg-[rgba(7,16,14,0.92)] p-3 shadow-[0_14px_28px_rgba(0,0,0,0.28)] transition ${
        player.inHand ? "border-white/10" : "border-white/6 opacity-45"
      } ${isCurrent ? "ring-2 ring-[rgba(214,178,93,0.5)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{player.name}</p>
          <p className="mt-1 text-[0.68rem] uppercase tracking-[0.22em] text-white/55">
            {player.seat} • {formatPot(player.stackBb)}bb
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {player.isHero ? <SeatBadge>Hero</SeatBadge> : null}
          {setup.buttonSeat === player.seat ? <SeatBadge tone="muted">Button</SeatBadge> : null}
          {isCurrent ? <SeatBadge tone="gold">To Act</SeatBadge> : null}
          {player.allIn ? <SeatBadge tone="red">All-In</SeatBadge> : null}
          {!player.inHand ? <SeatBadge tone="muted">Folded</SeatBadge> : null}
          {isWinner ? <SeatBadge tone="green">Winner</SeatBadge> : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {cards.map((card, index) => (
          <div
            key={`${player.seat}-${index}`}
            className={`flex h-14 items-center justify-center rounded-[16px] border border-white/10 bg-[rgba(255,255,255,0.06)] text-lg font-semibold ${cardTextTone(card)}`}
          >
            {formatCard(card)}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.18em] text-white/48">
        <span>Committed</span>
        <span>{formatPot(player.committedThisStreetBb)}bb</span>
      </div>
    </div>
  );
}

export function ManualReplayTable({
  setup,
  handState,
}: {
  setup: ManualHandSetup;
  handState: ReplayHandState;
}) {
  return (
    <section className="panel panel-strong relative overflow-hidden p-4 sm:p-6">
      <div className="home-felt absolute inset-[10%] opacity-90" />

      <div className="relative">
        <div className="mx-auto aspect-[1.28/1] max-w-5xl">
          <div className="absolute inset-[14%_18%] rounded-[999px] border border-[rgba(214,178,93,0.18)] bg-[radial-gradient(circle_at_center,rgba(21,87,66,0.92),rgba(8,35,28,0.96))] shadow-[inset_0_0_0_1px_rgba(214,178,93,0.08)]" />

          <div className="absolute left-1/2 top-1/2 flex w-[240px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4">
            <div className="rounded-full border border-[var(--border-strong)] bg-black/25 px-4 py-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              {handState.finished ? "Hand Complete" : `${handState.street} action`}
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[rgba(6,13,11,0.84)] px-5 py-4 text-center shadow-[0_18px_38px_rgba(0,0,0,0.26)]">
              <p className="text-[0.66rem] uppercase tracking-[0.22em] text-white/52">Pot</p>
              <p className="mt-2 font-heading text-4xl text-[var(--gold-soft)]">
                {formatPot(handState.potBb)}bb
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/48">
                Current bet {formatPot(handState.currentBetBb)}bb
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const card = handState.board[index];

                return (
                  <div
                    key={`board-${index}`}
                    className={`flex h-14 w-11 items-center justify-center rounded-[14px] border text-sm font-semibold shadow-[0_12px_26px_rgba(0,0,0,0.22)] ${
                      card
                        ? "border-white/14 bg-[rgba(255,255,255,0.92)]"
                        : "border-dashed border-white/10 bg-black/20 text-white/25"
                    } ${card ? cardTextTone(card) : ""}`}
                  >
                    {card ? formatCard(card) : "?"}
                  </div>
                );
              })}
            </div>
          </div>

          {(["BTN", "SB", "BB", "UTG", "HJ", "CO"] as ReplaySeatPosition[]).map((seat) => (
            <div key={seat} className={`absolute ${SEAT_LAYOUT[seat]}`}>
              <SeatCard
                player={handState.players.find((player) => player.seat === seat)}
                setup={setup}
                isCurrent={handState.toActQueue[0] === seat}
                isWinner={handState.winnerSeat === seat}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
