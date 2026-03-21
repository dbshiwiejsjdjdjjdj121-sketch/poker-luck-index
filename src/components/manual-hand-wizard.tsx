"use client";

import { useMemo, useState } from "react";
import { ManualReplayBuilder } from "@/components/manual-replay-builder";
import type {
  ManualHandSetup,
  ManualPlayerSetup,
  ManualReplayData,
  ReplaySeatPosition,
} from "@/lib/hand-upload-types";

const SEATS: ReplaySeatPosition[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = [
  { value: "s", label: "♠", color: "text-white" },
  { value: "h", label: "♥", color: "text-[#c96979]" },
  { value: "d", label: "♦", color: "text-[#c96979]" },
  { value: "c", label: "♣", color: "text-white" },
] as const;

type WizardStep = "hero" | "opponents" | "actions";

type HoleCardsDraft = {
  first?: string;
  second?: string;
};

type HeroDraft = {
  seat?: ReplaySeatPosition;
  name: string;
  stackText: string;
  holeCards: HoleCardsDraft;
};

type OpponentDraft = {
  seat?: ReplaySeatPosition;
  name: string;
  stackText: string;
  holeCards: HoleCardsDraft;
  unknownCards: boolean;
};

type PickerTarget =
  | { owner: "hero"; slot: "first" | "second" }
  | { owner: "opponent"; slot: "first" | "second" }
  | null;

const ALL_CARDS = RANKS.flatMap((rank) =>
  SUITS.map((suit) => ({
    value: `${rank}${suit.value}`,
    rank,
    suit: suit.label,
    color: suit.color,
  })),
);

function createHeroDraft(): HeroDraft {
  return {
    name: "Hero",
    stackText: "",
    holeCards: {},
  };
}

function createOpponentDraft(defaultName = "Villain"): OpponentDraft {
  return {
    name: defaultName,
    stackText: "",
    holeCards: {},
    unknownCards: false,
  };
}

function formatCardLabel(card?: string) {
  if (!card) {
    return "Select card";
  }

  if (card === "Unknown") {
    return "Unknown";
  }

  const rank = card.slice(0, 1).toUpperCase();
  const suit = card.slice(1).toLowerCase();
  const symbol =
    suit === "s" ? "♠" : suit === "h" ? "♥" : suit === "d" ? "♦" : "♣";

  return `${rank}${symbol}`;
}

function buildOpponentName(index: number) {
  return index === 0 ? "Villain" : `Villain ${index + 1}`;
}

function buildSetup(
  heroDraft: HeroDraft,
  opponents: ManualPlayerSetup[],
  buttonSeat: ReplaySeatPosition,
  previousNotes: string,
): ManualHandSetup {
  return {
    buttonSeat,
    actionNotes: previousNotes,
    hero: {
      seat: heroDraft.seat!,
      name: heroDraft.name.trim() || "Hero",
      stackBb: Number(heroDraft.stackText) || 0,
      holeCards: {
        first: heroDraft.holeCards.first!,
        second: heroDraft.holeCards.second!,
      },
    },
    opponents,
  };
}

export function ManualHandWizard({
  initialSetup,
  saving,
  onClose,
  onSave,
}: {
  initialSetup: ManualHandSetup | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    setup: ManualHandSetup;
    replay: ManualReplayData;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<WizardStep>(initialSetup ? "actions" : "hero");
  const [heroDraft, setHeroDraft] = useState<HeroDraft>(() =>
    initialSetup
      ? {
          seat: initialSetup.hero.seat,
          name: initialSetup.hero.name,
          stackText: String(initialSetup.hero.stackBb || ""),
          holeCards: {
            first: initialSetup.hero.holeCards.first,
            second: initialSetup.hero.holeCards.second,
          },
        }
      : createHeroDraft(),
  );
  const [buttonSeat, setButtonSeat] = useState<ReplaySeatPosition>(
    () => initialSetup?.buttonSeat ?? "BTN",
  );
  const [opponents, setOpponents] = useState<ManualPlayerSetup[]>(
    () => initialSetup?.opponents ?? [],
  );
  const [opponentDraft, setOpponentDraft] = useState<OpponentDraft>(() =>
    createOpponentDraft(buildOpponentName(initialSetup?.opponents.length ?? 0)),
  );
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const usedCards = useMemo(() => {
    const cards = new Set<string>();
    const addCard = (card?: string) => {
      if (!card || card === "Unknown") {
        return;
      }

      cards.add(card);
    };

    addCard(heroDraft.holeCards.first);
    addCard(heroDraft.holeCards.second);

    opponents.forEach((opponent) => {
      addCard(opponent.holeCards.first);
      addCard(opponent.holeCards.second);
    });

    addCard(opponentDraft.holeCards.first);
    addCard(opponentDraft.holeCards.second);

    return cards;
  }, [heroDraft.holeCards, opponentDraft.holeCards, opponents]);

  const availableSeats = useMemo(() => {
    const taken = new Set<ReplaySeatPosition>();

    if (heroDraft.seat) {
      taken.add(heroDraft.seat);
    }

    opponents.forEach((opponent) => {
      taken.add(opponent.seat);
    });

    return SEATS.filter((seat) => !taken.has(seat));
  }, [heroDraft.seat, opponents]);

  const heroReady =
    Boolean(heroDraft.seat) &&
    heroDraft.name.trim().length > 0 &&
    Number(heroDraft.stackText) > 0 &&
    Boolean(heroDraft.holeCards.first) &&
    Boolean(heroDraft.holeCards.second);

  const opponentReady =
    Boolean(opponentDraft.seat) &&
    opponentDraft.name.trim().length > 0 &&
    Number(opponentDraft.stackText) > 0 &&
    (opponentDraft.unknownCards ||
      (Boolean(opponentDraft.holeCards.first) &&
        Boolean(opponentDraft.holeCards.second)));

  const pendingOpponent =
    opponentReady && opponentDraft.seat
      ? {
          seat: opponentDraft.seat,
          name: opponentDraft.name.trim() || buildOpponentName(opponents.length),
          stackBb: Number(opponentDraft.stackText) || 0,
          holeCards: {
            first: opponentDraft.unknownCards
              ? "Unknown"
              : opponentDraft.holeCards.first!,
            second: opponentDraft.unknownCards
              ? "Unknown"
              : opponentDraft.holeCards.second!,
          },
          unknownCards: opponentDraft.unknownCards,
        }
      : null;

  const replayOpponents = pendingOpponent ? [...opponents, pendingOpponent] : opponents;
  const canStartActions = heroReady && replayOpponents.length > 0;
  const replaySetup = canStartActions
    ? buildSetup(
        heroDraft,
        replayOpponents,
        buttonSeat,
        initialSetup?.actionNotes ?? "",
      )
    : null;

  function updateHeroCard(slot: "first" | "second", value?: string) {
    setHeroDraft((current) => ({
      ...current,
      holeCards: {
        ...current.holeCards,
        [slot]: value,
      },
    }));
  }

  function updateOpponentCard(slot: "first" | "second", value?: string) {
    setOpponentDraft((current) => {
      if (value === "Unknown") {
        return {
          ...current,
          unknownCards: true,
          holeCards: {
            first: "Unknown",
            second: "Unknown",
          },
        };
      }

      return {
        ...current,
        unknownCards: value ? false : current.unknownCards,
        holeCards: {
          ...current.holeCards,
          [slot]: value,
        },
      };
    });
  }

  function handleCardPick(card: string) {
    if (!pickerTarget) {
      return;
    }

    if (pickerTarget.owner === "hero") {
      updateHeroCard(pickerTarget.slot, card);
    } else {
      updateOpponentCard(pickerTarget.slot, card);
    }

    setPickerTarget(null);
  }

  function addOpponent() {
    if (!opponentReady || !opponentDraft.seat) {
      return;
    }

    const nextOpponent: ManualPlayerSetup = {
      seat: opponentDraft.seat,
      name: opponentDraft.name.trim() || buildOpponentName(opponents.length),
      stackBb: Number(opponentDraft.stackText) || 0,
      holeCards: {
        first: opponentDraft.unknownCards
          ? "Unknown"
          : opponentDraft.holeCards.first!,
        second: opponentDraft.unknownCards
          ? "Unknown"
          : opponentDraft.holeCards.second!,
      },
      unknownCards: opponentDraft.unknownCards,
    };

    const nextOpponents = [...opponents, nextOpponent];
    setOpponents(nextOpponents);
    setOpponentDraft(createOpponentDraft(buildOpponentName(nextOpponents.length)));
  }

  function renderSeatPills(
    currentValue: ReplaySeatPosition | undefined,
    onSelect: (seat: ReplaySeatPosition) => void,
    seats: ReplaySeatPosition[],
  ) {
    return (
      <div className="flex flex-wrap gap-2">
        {seats.map((seat) => {
          const active = seat === currentValue;

          return (
            <button
              key={seat}
              type="button"
              onClick={() => onSelect(seat)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-[var(--gold-soft)]"
                  : "border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              {seat}
            </button>
          );
        })}
      </div>
    );
  }

  const currentPickedCard =
    pickerTarget?.owner === "hero"
      ? heroDraft.holeCards[pickerTarget.slot]
      : pickerTarget?.owner === "opponent"
        ? opponentDraft.holeCards[pickerTarget.slot]
        : undefined;

  return (
    <div className="fixed inset-0 z-[160] overflow-y-auto overscroll-contain bg-black/78 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="grid min-h-full w-full place-items-start sm:place-items-center">
        <div className="panel my-4 w-full max-w-4xl overflow-hidden rounded-[30px] border border-[var(--border-strong)] bg-[rgba(8,18,15,0.96)] shadow-[0_32px_90px_rgba(0,0,0,0.46)]">
          <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-h-[min(56rem,calc(100dvh-3rem))] sm:p-6">
            <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.26em] text-[var(--gold-soft)]">
              Manual Input
            </p>
            <h2 className="mt-2 font-heading text-3xl text-white">
              {step === "hero"
                ? "Choose Your Seat"
                : step === "opponents"
                  ? "Select Opponents"
                  : "Replay Actions"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {step === "hero"
                ? "Start the hand the same way All In does: seat, stack, and hole cards first."
                : step === "opponents"
                  ? "Add opponents, set the button, then continue straight into the action flow."
                  : "Finish the hand in this same window, then save it when the action line is ready."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/[0.08]"
          >
            Close
          </button>
            </div>

            {step === "hero" ? (
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Seat
                  </p>
                  {renderSeatPills(heroDraft.seat, (seat) => {
                    setHeroDraft((current) => ({ ...current, seat }));
                  }, SEATS)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Name
                    </span>
                    <input
                      value={heroDraft.name}
                      onChange={(event) =>
                        setHeroDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                      placeholder="Hero"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Stack (bb)
                    </span>
                    <input
                      value={heroDraft.stackText}
                      onChange={(event) =>
                        setHeroDraft((current) => ({
                          ...current,
                          stackText: event.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                      inputMode="numeric"
                      className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                      placeholder="120"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {(["first", "second"] as const).map((slot, index) => (
                    <div key={slot} className="space-y-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                        Card {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPickerTarget({ owner: "hero", slot })}
                        className="field-shell w-full justify-between rounded-[16px] px-4 py-3 text-left"
                      >
                        <span className={heroDraft.holeCards[slot] ? "text-white" : "text-white/34"}>
                          {formatCardLabel(heroDraft.holeCards[slot])}
                        </span>
                        <span className="text-[var(--gold-soft)]">Pick</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                  >
                    Exit
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("opponents")}
                    disabled={!heroReady}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : step === "opponents" ? (
              <div className="mt-6 space-y-6">
                {opponents.length > 0 ? (
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Added Opponents
                    </p>
                    <div className="mt-4 space-y-3">
                      {opponents.map((opponent) => (
                        <div
                          key={`${opponent.seat}-${opponent.name}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {opponent.name}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/55">
                              {opponent.seat} • {opponent.stackBb}bb •{" "}
                              {opponent.unknownCards
                                ? "Unknown cards"
                                : `${formatCardLabel(opponent.holeCards.first)} ${formatCardLabel(opponent.holeCards.second)}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setOpponents((current) =>
                                current.filter((item) => item.seat !== opponent.seat),
                              )
                            }
                            className="text-xs uppercase tracking-[0.18em] text-[#ff9ead] transition hover:text-[#ffc4cc]"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Seat
                  </p>
                  {availableSeats.length > 0 ? (
                    renderSeatPills(opponentDraft.seat, (seat) => {
                      setOpponentDraft((current) => ({ ...current, seat }));
                    }, availableSeats)
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      All six seats are already taken.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Name
                    </p>
                    <input
                      value={opponentDraft.name}
                      onChange={(event) =>
                        setOpponentDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                      placeholder="Villain"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      Stack (bb)
                    </span>
                    <input
                      value={opponentDraft.stackText}
                      onChange={(event) =>
                        setOpponentDraft((current) => ({
                          ...current,
                          stackText: event.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                      inputMode="numeric"
                      className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                      placeholder="100"
                    />
                  </label>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Hole Cards
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Pick Unknown if villain cards were not shown.
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {(["first", "second"] as const).map((slot, index) => (
                      <div key={slot} className="space-y-2">
                        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                          Card {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setPickerTarget({ owner: "opponent", slot })
                          }
                          disabled={
                            slot === "second" &&
                            opponentDraft.holeCards.first === "Unknown"
                          }
                          className="field-shell w-full justify-between rounded-[16px] px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <span
                            className={
                              opponentDraft.holeCards[slot]
                                ? "text-white"
                                : "text-white/34"
                            }
                          >
                            {formatCardLabel(opponentDraft.holeCards[slot])}
                          </span>
                          <span className="text-[var(--gold-soft)]">Pick</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateOpponentCard("first", "Unknown");
                      setPickerTarget(null);
                    }}
                    className="mt-4 rounded-full border border-white/8 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/75 transition hover:bg-white/[0.06]"
                  >
                    Pick Unknown
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Button Seat
                  </p>
                  {renderSeatPills(buttonSeat, setButtonSeat, SEATS)}
                </div>

                <button
                  type="button"
                  onClick={addOpponent}
                  disabled={!opponentReady}
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Opponent
                </button>

                <div className="flex flex-wrap justify-between gap-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary"
                    >
                      Exit
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("hero")}
                      className="btn-secondary"
                    >
                      Back
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("actions")}
                    disabled={!canStartActions}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Start Actions
                  </button>
                </div>
              </div>
            ) : replaySetup ? (
              <div className="mt-6">
                <ManualReplayBuilder
                  key={JSON.stringify(replaySetup)}
                  setup={replaySetup}
                  saving={saving}
                  onEditSetup={() => setStep("opponents")}
                  onSave={onSave}
                  onSaved={onClose}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-[var(--muted)]">
                Finish the setup first, then the action flow will open here.
              </div>
            )}

            {pickerTarget ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[30px] bg-black/72 p-4">
                <div className="w-full max-w-3xl rounded-[24px] border border-[var(--border-strong)] bg-[rgba(8,18,15,0.96)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.36)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                        Card Picker
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {currentPickedCard
                          ? `Current card: ${formatCardLabel(currentPickedCard)}`
                          : "Choose the exact card from the deck."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerTarget(null)}
                      className="btn-secondary"
                    >
                      Close
                    </button>
                  </div>

                  {pickerTarget.owner === "opponent" ? (
                    <button
                      type="button"
                      onClick={() => handleCardPick("Unknown")}
                      className="mt-4 rounded-full border border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]"
                    >
                      Unknown
                    </button>
                  ) : null}

                  <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {ALL_CARDS.map((card) => {
                      const disabled =
                        usedCards.has(card.value) && currentPickedCard !== card.value;

                      return (
                        <button
                          key={card.value}
                          type="button"
                          onClick={() => handleCardPick(card.value)}
                          disabled={disabled}
                          className={`rounded-[16px] border px-3 py-3 text-sm font-semibold transition ${
                            currentPickedCard === card.value
                              ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)]"
                              : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                          } disabled:cursor-not-allowed disabled:opacity-25`}
                        >
                          <span className={card.color}>
                            {card.rank}
                            {card.suit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
