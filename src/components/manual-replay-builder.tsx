"use client";

import { useEffect, useMemo, useState } from "react";
import { ManualReplayTable } from "@/components/manual-replay-table";
import { generateReplayLog } from "@/lib/replay/hand-log-generator";
import {
  useManualReplayEngine,
  type ReplayActionAvailabilityMap,
} from "@/lib/replay/use-manual-replay-engine";
import type {
  ManualHandSetup,
  ManualReplayData,
  ReplayActionHistoryItem,
  ReplayActionType,
} from "@/lib/hand-upload-types";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = [
  { value: "s", label: "♠", color: "text-white" },
  { value: "h", label: "♥", color: "text-[#de8d96]" },
  { value: "d", label: "♦", color: "text-[#de8d96]" },
  { value: "c", label: "♣", color: "text-white" },
] as const;

const ALL_CARDS = RANKS.flatMap((rank) =>
  SUITS.map((suit) => ({
    value: `${rank}${suit.value}`,
    label: `${rank}${suit.label}`,
    tone: suit.color,
  })),
);

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

function buildAvailableActions(
  availability: ReplayActionAvailabilityMap,
  callAmount: number,
  currentPlayerStack: number,
  street: string,
  currentBet: number,
  lastRaiseSize: number,
) {
  const actions: Array<{
    type: ReplayActionType;
    label: string;
    input?: "bet" | "raise";
  }> = [];

  const isReRaise =
    availability.Raise.enabled &&
    currentBet > 0 &&
    ((street === "preflop" && currentBet > 1) ||
      (street !== "preflop" && lastRaiseSize > 0 && lastRaiseSize < currentBet));

  if (availability.Check.enabled) {
    actions.push({ type: "Check", label: "Check" });
  }

  if (availability.Limp.enabled) {
    actions.push({ type: "Limp", label: "Limp" });
  }

  if (availability.Call.enabled) {
    actions.push({
      type: "Call",
      label: callAmount > 0 ? `Call ${callAmount}bb` : "Call",
    });
  }

  if (availability.Bet.enabled) {
    actions.push({ type: "Bet", label: "Bet", input: "bet" });
  }

  if (availability.Raise.enabled) {
    actions.push({
      type: "Raise",
      label: isReRaise ? "Re-Raise" : "Raise",
      input: "raise",
    });
  }

  if (availability["All-In"].enabled) {
    actions.push({
      type: "All-In",
      label: `All-In (${currentPlayerStack}bb)`,
    });
  }

  actions.push({ type: "Fold", label: "Fold" });

  return actions;
}

export function ManualReplayBuilder({
  setup,
  saving,
  onEditSetup,
  onSave,
  onSaved,
}: {
  setup: ManualHandSetup;
  saving: boolean;
  onEditSetup: () => void;
  onSave: (payload: {
    setup: ManualHandSetup;
    replay: ManualReplayData;
  }) => Promise<void>;
  onSaved?: () => void;
}) {
  const {
    handState,
    actionHistory,
    availability,
    currentPlayer,
    currentSeat,
    callAmount,
    pendingStreet,
    handFinished,
    initializeHand,
    performAction,
    setBoardCards,
  } = useManualReplayEngine(setup);
  const [selectedBoardCards, setSelectedBoardCards] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState("");
  const [raiseAmount, setRaiseAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!handState && actionHistory.length === 0) {
      initializeHand();
    }
  }, [actionHistory.length, handState, initializeHand]);

  const requiredBoardCards = pendingStreet === "flop" ? 3 : pendingStreet ? 1 : 0;
  const usedCards = useMemo(() => {
    const taken = new Set<string>();
    const addCard = (card?: string) => {
      if (!card || card === "Unknown") {
        return;
      }

      taken.add(card);
    };

    addCard(setup.hero.holeCards.first);
    addCard(setup.hero.holeCards.second);
    setup.opponents.forEach((opponent) => {
      addCard(opponent.holeCards.first);
      addCard(opponent.holeCards.second);
    });
    handState?.board.forEach((card) => addCard(card));
    selectedBoardCards.forEach((card) => addCard(card));
    return taken;
  }, [handState?.board, selectedBoardCards, setup.hero.holeCards.first, setup.hero.holeCards.second, setup.opponents]);

  const availableActions = useMemo(() => {
    if (!handState || !currentPlayer) {
      return [];
    }

    return buildAvailableActions(
      availability,
      callAmount,
      currentPlayer.stackBb,
      handState.street,
      handState.currentBetBb,
      handState.lastRaiseSizeBb,
    );
  }, [availability, callAmount, currentPlayer, handState]);

  function toggleBoardCard(card: string) {
    setSelectedBoardCards((current) => {
      if (current.includes(card)) {
        return current.filter((item) => item !== card);
      }

      if (current.length >= requiredBoardCards) {
        return current;
      }

      return [...current, card];
    });
  }

  function submitBoardCards() {
    if (!pendingStreet || selectedBoardCards.length !== requiredBoardCards) {
      return;
    }

    try {
      setBoardCards(pendingStreet, selectedBoardCards);
      setSelectedBoardCards([]);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to set board cards.");
    }
  }

  function runAction(action: ReplayActionType) {
    try {
      if (action === "Bet") {
        performAction(action, Number(betAmount));
        setBetAmount("");
      } else if (action === "Raise") {
        performAction(action, Number(raiseAmount));
        setRaiseAmount("");
      } else {
        performAction(action);
      }

      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to record this action.");
    }
  }

  async function handleSave() {
    if (!handState) {
      return;
    }

    try {
      const progressionText = generateReplayLog(setup, handState, actionHistory);
      const nextSetup: ManualHandSetup = {
        ...setup,
        actionNotes: progressionText,
      };

      await onSave({
        setup: nextSetup,
        replay: {
          actionHistory,
          finalState: handState,
          progressionText,
        },
      });

      setError("");
      onSaved?.();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this replay.",
      );
    }
  }

  if (!handState) {
    return (
      <section className="panel p-6">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Preparing the replay table...
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <ManualReplayTable setup={setup} handState={handState} />

      {error ? (
        <section className="panel p-4">
          <p className="text-sm leading-6 text-[#ffb2bc]">{error}</p>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                Replay Controls
              </p>
              <h3 className="mt-3 font-heading text-3xl text-white">
                {pendingStreet
                  ? `Set ${pendingStreet[0]?.toUpperCase()}${pendingStreet.slice(1)}`
                  : currentSeat
                    ? `${currentSeat} To Act`
                    : handFinished
                      ? "Hand Complete"
                      : "Replay In Progress"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {pendingStreet
                  ? "Pick board cards the same way the desktop replay flow does before the next action opens."
                  : currentPlayer
                    ? `${currentPlayer.name} has ${currentPlayer.stackBb}bb behind. Pot is ${handState.potBb}bb.`
                    : "The saved hand is waiting for the next street or ready to save."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onEditSetup} className="btn-secondary">
                Edit Setup
              </button>
            </div>
          </div>

          {pendingStreet ? (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: requiredBoardCards }).map((_, index) => (
                  <div
                    key={`slot-${index}`}
                    className="flex h-14 w-12 items-center justify-center rounded-[14px] border border-dashed border-[var(--border-strong)] bg-white/[0.03] text-sm font-semibold text-white/78"
                  >
                    {selectedBoardCards[index]
                      ? ALL_CARDS.find((card) => card.value === selectedBoardCards[index])?.label
                      : "?"}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                {ALL_CARDS.map((card) => {
                  const selected = selectedBoardCards.includes(card.value);
                  const unavailable = usedCards.has(card.value) && !selected;

                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => toggleBoardCard(card.value)}
                      disabled={unavailable}
                      className={`rounded-[14px] border px-3 py-3 text-sm font-semibold transition ${
                        selected
                          ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)]"
                          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
                      } ${card.tone} disabled:cursor-not-allowed disabled:opacity-25`}
                    >
                      {card.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={submitBoardCards}
                  disabled={selectedBoardCards.length !== requiredBoardCards}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {`Set ${pendingStreet}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {availableActions.map((action) => {
                if (action.input === "bet") {
                  return (
                    <div key={action.type} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => runAction("Bet")}
                          disabled={!betAmount}
                          className="btn-primary min-w-[160px] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Bet
                        </button>
                        <input
                          value={betAmount}
                          onChange={(event) =>
                            setBetAmount(event.target.value.replace(/[^0-9.]/g, ""))
                          }
                          inputMode="decimal"
                          placeholder={`Enter bet size (max ${currentPlayer?.stackBb ?? 0}bb)`}
                          className="field-shell flex-1 rounded-[16px] px-4 py-3 text-white outline-none"
                        />
                      </div>
                    </div>
                  );
                }

                if (action.input === "raise") {
                  return (
                    <div key={action.type} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => runAction("Raise")}
                          disabled={!raiseAmount}
                          className="btn-primary min-w-[160px] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {action.label}
                        </button>
                        <input
                          value={raiseAmount}
                          onChange={(event) =>
                            setRaiseAmount(event.target.value.replace(/[^0-9.]/g, ""))
                          }
                          inputMode="decimal"
                          placeholder={`Raise to ${
                            availability.Raise.minRaiseTo ?? handState.currentBetBb
                          }-${availability.Raise.maxRaiseTo ?? currentPlayer?.stackBb ?? 0}bb`}
                          className="field-shell flex-1 rounded-[16px] px-4 py-3 text-white outline-none"
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={action.type}
                    type="button"
                    onClick={() => runAction(action.type)}
                    className="btn-secondary w-full justify-center py-4 text-center"
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/15 p-4">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Save any time. If the hand is unfinished, we keep the current street and action line exactly as entered.
            </p>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
            >
              {saving ? "Saving..." : "Save Replay"}
            </button>
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                Action Timeline
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Same street order and action naming as the desktop `allin` replay flow.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[0.66rem] uppercase tracking-[0.2em] text-white/58">
              {actionHistory.length} actions
            </div>
          </div>

          {actionHistory.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-[var(--muted)]">
              Start the action sequence. The timeline will build from preflop to river here.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {actionHistory.map((action, index) => (
                <div
                  key={`${action.street}-${action.seat}-${index}`}
                  className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3"
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
          )}
        </section>
      </div>
    </div>
  );
}
