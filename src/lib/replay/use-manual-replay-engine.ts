"use client";

import { useCallback, useMemo, useState } from "react";
import { GameState, Player, Pot } from "@/lib/replay/engine";
import type {
  ManualHandSetup,
  ReplayActionHistoryItem,
  ReplayActionType,
  ReplayHandState,
  ReplayPlayerState,
  ReplaySeatPosition,
} from "@/lib/hand-upload-types";

export type ReplayBoardStreet = "flop" | "turn" | "river";

export interface ReplayActionAvailabilityMap {
  Check: { enabled: boolean };
  Call: { enabled: boolean };
  Bet: { enabled: boolean };
  Raise: {
    enabled: boolean;
    minRaiseTo?: number | null;
    maxRaiseTo?: number | null;
  };
  "All-In": { enabled: boolean };
  Fold: { enabled: boolean };
  Limp: { enabled: boolean };
}

export type ReplayNextStep =
  | { type: "idle" }
  | { type: "needPlayerAction"; seat: ReplaySeatPosition }
  | { type: "needBoardCards"; street: ReplayBoardStreet }
  | { type: "handFinished" };

const DISABLED_AVAILABILITY: ReplayActionAvailabilityMap = {
  Check: { enabled: false },
  Call: { enabled: false },
  Bet: { enabled: false },
  Raise: { enabled: false, minRaiseTo: null, maxRaiseTo: null },
  "All-In": { enabled: false },
  Fold: { enabled: false },
  Limp: { enabled: false },
};

const GAME_SEAT_ORDER: ReplaySeatPosition[] = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];
const PREFLOP_ORDER: ReplaySeatPosition[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
function cloneState(previous: GameState) {
  const next = new GameState();

  next.players = previous.players.map((player) => {
    const clone = new Player(player.stack);
    clone.isActive = player.isActive;
    clone.isAllIn = player.isAllIn;
    clone.committedTotal = player.committedTotal;
    clone.committedThisStreet = player.committedThisStreet;
    clone.holeCards = [...player.holeCards];
    clone.seat = player.seat;
    clone.name = player.name;
    clone.hasActedThisStreet = player.hasActedThisStreet;
    return clone;
  });
  next.street = previous.street;
  next.currentPlayerIndex = previous.currentPlayerIndex;
  next.lastBetSize = previous.lastBetSize;
  next.lastAggressorIndex = previous.lastAggressorIndex;
  next.lastRaiseSize = previous.lastRaiseSize;
  next.minBet = previous.minBet;
  next.board = [...previous.board];
  next.buttonIndex = previous.buttonIndex;
  next.pots = previous.pots.map((pot) => {
    const clonedPot = new Pot();
    clonedPot.total = pot.total;

    pot.contributors.forEach((amount, player) => {
      const playerIndex = previous.players.indexOf(player);

      if (playerIndex >= 0) {
        clonedPot.contributors.set(next.players[playerIndex]!, amount);
      }
    });

    return clonedPot;
  });

  return next;
}

function convertToHandState(
  engineState: GameState,
  seatToIndex: Map<ReplaySeatPosition, number>,
  setup: ManualHandSetup,
): ReplayHandState {
  const players: ReplayPlayerState[] = engineState.players.map((enginePlayer, index) => {
    const seat =
      Array.from(seatToIndex.entries()).find(([, value]) => value === index)?.[0] || "UTG";
    const isHero = setup.hero.seat === seat;
    const basePlayer = isHero
      ? setup.hero
      : setup.opponents.find((opponent) => opponent.seat === seat);

    return {
      seat,
      name: basePlayer?.name || enginePlayer.name || seat,
      style: "",
      stackBb: enginePlayer.stack,
      committedThisStreetBb: enginePlayer.committedThisStreet,
      holeCards:
        enginePlayer.holeCards.length === 2
          ? {
              first: enginePlayer.holeCards[0]!,
              second: enginePlayer.holeCards[1]!,
            }
          : basePlayer?.holeCards,
      inHand: enginePlayer.isActive,
      allIn: enginePlayer.isAllIn,
      isHero,
      hasActedThisRound: enginePlayer.hasActedThisStreet,
    };
  });

  const activePlayers = engineState.players.filter((player) => player.isActive);
  let winnerSeat: ReplaySeatPosition | undefined;

  if (engineState.street === "showdown" || activePlayers.length <= 1) {
    if (activePlayers.length === 1) {
      winnerSeat = activePlayers[0]?.seat as ReplaySeatPosition | undefined;
    } else if (engineState.street === "showdown" && activePlayers.length > 1) {
      winnerSeat = engineState.determineShowdownWinners()[0] as ReplaySeatPosition | undefined;
    }
  }

  const currentPlayer = engineState.getCurrentPlayer();
  const toActQueue: ReplaySeatPosition[] = [];

  if (currentPlayer) {
    const currentSeat = Array.from(seatToIndex.entries()).find(
      ([, value]) => value === engineState.currentPlayerIndex,
    )?.[0];

    if (currentSeat) {
      toActQueue.push(currentSeat);
    }
  }

  return {
    street:
      engineState.street === "showdown"
        ? "finished"
        : (engineState.street as ReplayHandState["street"]),
    potBb: engineState.players.reduce((sum, player) => sum + player.committedTotal, 0),
    currentBetBb: engineState.lastBetSize,
    lastFullRaiseBb: engineState.minBet,
    lastRaiseSizeBb: engineState.lastRaiseSize,
    toActQueue,
    players,
    board: [...engineState.board],
    finished: engineState.street === "showdown" || activePlayers.length <= 1,
    winnerSeat,
  };
}

function getActionAvailability(
  state: GameState,
  currentPlayer: Player | null,
): ReplayActionAvailabilityMap {
  if (!currentPlayer || !currentPlayer.isActive || currentPlayer.isAllIn) {
    return DISABLED_AVAILABILITY;
  }

  const toCall = state.lastBetSize - currentPlayer.committedThisStreet;
  const canCheck = toCall <= 0;
  const canCall = toCall > 0 && currentPlayer.stack >= toCall;
  const canBet = state.lastBetSize === 0 && currentPlayer.stack > 0;
  const minRaiseSize = state.lastRaiseSize > 0 ? state.lastRaiseSize : state.minBet;
  const minRaise = state.lastBetSize + minRaiseSize;
  const maxRaise = currentPlayer.committedThisStreet + currentPlayer.stack;
  const canRaise = state.lastBetSize > 0 && maxRaise >= minRaise;
  const hasPreflopRaise = state.street === "preflop" && state.lastBetSize > state.minBet;
  const canLimp =
    state.street === "preflop" &&
    state.lastBetSize === state.minBet &&
    canCall &&
    !hasPreflopRaise &&
    currentPlayer.committedThisStreet === 0;

  return {
    Check: { enabled: canCheck },
    Call: { enabled: canCall && !canLimp },
    Bet: { enabled: canBet },
    Raise: {
      enabled: canRaise,
      minRaiseTo: canRaise ? minRaise : null,
      maxRaiseTo: canRaise ? maxRaise : null,
    },
    "All-In": { enabled: currentPlayer.stack > 0 },
    Fold: { enabled: true },
    Limp: { enabled: canLimp },
  };
}

function getNextStep(
  engineState: GameState | null,
  seatToIndex: Map<ReplaySeatPosition, number>,
): ReplayNextStep {
  if (!engineState) {
    return { type: "idle" };
  }

  const boardCount = engineState.board.length;

  if (engineState.street === "flop" && boardCount < 3) {
    return { type: "needBoardCards", street: "flop" };
  }

  if (engineState.street === "turn" && boardCount < 4) {
    return { type: "needBoardCards", street: "turn" };
  }

  if (engineState.street === "river" && boardCount < 5) {
    return { type: "needBoardCards", street: "river" };
  }

  if (
    engineState.street === "showdown" ||
    (engineState.players.filter((player) => player.isActive).length <= 1 && boardCount >= 5)
  ) {
    return { type: "handFinished" };
  }

  if (engineState.currentPlayerIndex === -1) {
    return { type: "handFinished" };
  }

  const currentSeat = Array.from(seatToIndex.entries()).find(
    ([, value]) => value === engineState.currentPlayerIndex,
  )?.[0];

  if (currentSeat) {
    return {
      type: "needPlayerAction",
      seat: currentSeat,
    };
  }

  return { type: "handFinished" };
}

function initializeReplayState(setup: ManualHandSetup) {
  const allPlayers = [setup.hero, ...setup.opponents].sort(
    (left, right) =>
      GAME_SEAT_ORDER.indexOf(left.seat) - GAME_SEAT_ORDER.indexOf(right.seat),
  );
  const seatToIndex = new Map<ReplaySeatPosition, number>();
  const stacks = allPlayers.map((player, index) => {
    seatToIndex.set(player.seat, index);
    return player.stackBb;
  });

  const buttonIndex = allPlayers.findIndex((player) => player.seat === setup.buttonSeat);
  const engineState = new GameState();
  engineState.initHand(stacks, 0.5, 1, buttonIndex === -1 ? 0 : buttonIndex);

  engineState.players.forEach((player, index) => {
    const source = allPlayers[index]!;
    player.seat = source.seat;
    player.name = source.name;
    player.holeCards = source.unknownCards
      ? []
      : [source.holeCards.first, source.holeCards.second];
  });

  let firstToActIndex = 0;
  let firstRank = Number.MAX_SAFE_INTEGER;

  engineState.players.forEach((player, index) => {
    const rank = PREFLOP_ORDER.indexOf((player.seat || "UTG") as ReplaySeatPosition);

    if (rank !== -1 && rank < firstRank) {
      firstRank = rank;
      firstToActIndex = index;
    }
  });

  engineState.currentPlayerIndex = firstToActIndex;

  engineState.players.forEach((player, index) => {
    player.stack = stacks[index]!;

    if (player.seat === "BB") {
      const amount = Math.min(1, player.stack);
      player.stack -= amount;
      player.committedThisStreet = amount;
      player.committedTotal = amount;
      if (player.stack === 0) player.isAllIn = true;
    } else if (player.seat === "SB") {
      const amount = Math.min(0.5, player.stack);
      player.stack -= amount;
      player.committedThisStreet = amount;
      player.committedTotal = amount;
      if (player.stack === 0) player.isAllIn = true;
    } else {
      player.committedThisStreet = 0;
      player.committedTotal = 0;
    }

    player.hasActedThisStreet = false;
  });

  engineState.lastBetSize = 1;
  const bbPlayerIndex = engineState.players.findIndex((player) => player.seat === "BB");
  engineState.lastAggressorIndex = bbPlayerIndex === -1 ? null : bbPlayerIndex;
  engineState.lastRaiseSize = 1;

  return { engineState, seatToIndex };
}

export function useManualReplayEngine(setup: ManualHandSetup | null) {
  const [engineState, setEngineState] = useState<GameState | null>(null);
  const [seatToIndex, setSeatToIndex] = useState<Map<ReplaySeatPosition, number>>(new Map());
  const [actionHistory, setActionHistory] = useState<ReplayActionHistoryItem[]>([]);

  const initializeHand = useCallback(() => {
    if (!setup) {
      return;
    }

    const initialized = initializeReplayState(setup);
    setEngineState(initialized.engineState);
    setSeatToIndex(initialized.seatToIndex);
    setActionHistory([]);
  }, [setup]);

  const performAction = useCallback(
    (action: ReplayActionType, amount?: number) => {
      setEngineState((previous) => {
        if (!previous || !setup) {
          return previous;
        }

        const currentSeat = Array.from(seatToIndex.entries()).find(
          ([, value]) => value === previous.currentPlayerIndex,
        )?.[0];
        const next = cloneState(previous);

        const recordedAction: ReplayActionType = action;
        let recordedAmount = amount;
        let recordedTo: number | undefined;

        if (action === "Limp") {
          next.actCall();
        } else if (action === "Fold") {
          next.actFold();
        } else if (action === "Check") {
          next.actCheck();
        } else if (action === "Call") {
          next.actCall();
        } else if (action === "Bet") {
          if (!amount) {
            throw new Error("Bet amount required.");
          }
          next.actBet(amount);
        } else if (action === "Raise") {
          if (!amount) {
            throw new Error("Raise amount required.");
          }
          next.actRaise(amount);
          recordedTo = amount;
        } else if (action === "All-In") {
          const currentPlayer = next.getCurrentPlayer();

          if (currentPlayer) {
            const allInAmount = currentPlayer.committedThisStreet + currentPlayer.stack;

            if (next.lastBetSize === 0) {
              next.actBet(currentPlayer.stack);
              recordedAmount = currentPlayer.stack;
            } else if (allInAmount > next.lastBetSize) {
              next.actRaise(allInAmount);
              recordedAmount = allInAmount;
              recordedTo = allInAmount;
            } else {
              next.actCall();
              recordedAmount = allInAmount - currentPlayer.committedThisStreet;
            }
          }
        }

        if (currentSeat) {
          setActionHistory((previousHistory) => [
            ...previousHistory,
            {
              street: previous.street as ReplayActionHistoryItem["street"],
              seat: currentSeat,
              action: recordedAction,
              amount: recordedAmount,
              to: recordedTo,
              timestamp: previousHistory.length * 500,
            },
          ]);
        }

        return next;
      });
    },
    [seatToIndex, setup],
  );

  const setBoardCards = useCallback((street: ReplayBoardStreet, cards: string[]) => {
    setEngineState((previous) => {
      if (!previous) {
        return previous;
      }

      const mergedCards =
        street === "flop"
          ? [...cards]
          : street === "turn"
            ? [...previous.board, ...cards]
            : [...previous.board, ...cards];
      const uniqueCards = new Set(mergedCards);

      if (uniqueCards.size !== mergedCards.length) {
        throw new Error("Duplicate cards detected. Choose a different board card.");
      }

      const next = cloneState(previous);

      if (street === "flop") {
        next.setBoard("flop", mergedCards);
      } else if (street === "turn") {
        next.setBoard("turn", mergedCards);
      } else {
        next.setBoard("river", mergedCards);
      }

      return next;
    });
  }, []);

  const handState = useMemo(() => {
    if (!engineState || !setup) {
      return null;
    }

    return convertToHandState(engineState, seatToIndex, setup);
  }, [engineState, seatToIndex, setup]);

  const availability = useMemo(() => {
    if (!engineState) {
      return DISABLED_AVAILABILITY;
    }

    return getActionAvailability(engineState, engineState.getCurrentPlayer());
  }, [engineState]);

  const nextStep = useMemo(
    () => getNextStep(engineState, seatToIndex),
    [engineState, seatToIndex],
  );

  const currentSeat = useMemo(() => {
    if (!handState) {
      return null;
    }

    return handState.toActQueue[0] || null;
  }, [handState]);

  const currentPlayer = useMemo(() => {
    if (!handState || !currentSeat) {
      return null;
    }

    return handState.players.find((player) => player.seat === currentSeat) || null;
  }, [currentSeat, handState]);

  const callAmount = useMemo(() => {
    if (!engineState || !currentPlayer) {
      return 0;
    }

    const toCall = engineState.lastBetSize - currentPlayer.committedThisStreetBb;
    return Math.min(toCall, currentPlayer.stackBb);
  }, [currentPlayer, engineState]);

  const reset = useCallback(() => {
    setEngineState(null);
    setSeatToIndex(new Map());
    setActionHistory([]);
  }, []);

  return {
    handState,
    actionHistory,
    availability,
    currentPlayer,
    currentSeat,
    callAmount,
    pendingStreet: nextStep.type === "needBoardCards" ? nextStep.street : null,
    handFinished: nextStep.type === "handFinished",
    initializeHand,
    performAction,
    setBoardCards,
    reset,
  };
}
