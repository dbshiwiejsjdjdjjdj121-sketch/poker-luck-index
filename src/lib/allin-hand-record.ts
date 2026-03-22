import type {
  AllInSavedHand,
  AllInSavedHandAction,
  ManualPlayerSetup,
  ManualHandSetup,
  ManualReplayData,
  ReplayActionHistoryItem,
  ReplayActionStreet,
  ReplayActionType,
  ReplayHoleCards,
  ReplaySeatPosition,
  ReplayPlayerState,
  SavedHandUpload,
} from "@/lib/hand-upload-types";
import { generateReplayLog } from "@/lib/replay/hand-log-generator";

const VALID_SEATS: ReplaySeatPosition[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

function normalizeSeat(value: string, fallback?: ReplaySeatPosition) {
  const normalized = `${value || ""}`.trim().toUpperCase();

  if (VALID_SEATS.includes(normalized as ReplaySeatPosition)) {
    return normalized as ReplaySeatPosition;
  }

  if (normalized === "BU") {
    return "BTN";
  }

  if (normalized === "MP" || normalized === "EP") {
    return "UTG";
  }

  if (normalized === "LJ") {
    return "HJ";
  }

  return fallback || null;
}

function normalizeHoleCards(
  hole: AllInSavedHand["setup"]["players"][number]["hole"],
  unknownCards?: boolean,
): ReplayHoleCards {
  if (!hole || unknownCards) {
    return {
      first: "Unknown",
      second: "Unknown",
    };
  }

  return {
    first: hole.first,
    second: hole.second,
  };
}

function normalizeActionType(value: string): ReplayActionType | null {
  const normalized = `${value || ""}`.trim().toLowerCase();

  if (normalized === "fold" || normalized === "folds") {
    return "Fold";
  }

  if (normalized === "check" || normalized === "checks") {
    return "Check";
  }

  if (normalized === "call" || normalized === "calls") {
    return "Call";
  }

  if (normalized === "bet" || normalized === "bets") {
    return "Bet";
  }

  if (normalized === "raise" || normalized === "raises") {
    return "Raise";
  }

  if (
    normalized === "all-in" ||
    normalized === "all in" ||
    normalized === "shove" ||
    normalized === "shoves" ||
    normalized === "jam" ||
    normalized === "jams"
  ) {
    return "All-In";
  }

  if (normalized === "limp" || normalized === "limps") {
    return "Limp";
  }

  return null;
}

function buildPlayerState(
  player: ManualPlayerSetup,
  actionHistory: ReplayActionHistoryItem[],
  heroSeat: ReplaySeatPosition,
): ReplayPlayerState {
  const folded = actionHistory.some(
    (action) => action.seat === player.seat && action.action === "Fold",
  );
  const allIn = actionHistory.some(
    (action) => action.seat === player.seat && action.action === "All-In",
  );

  return {
    seat: player.seat,
    name: player.name,
    style: "",
    stackBb: player.stackBb,
    committedThisStreetBb: 0,
    holeCards:
      player.unknownCards ||
      player.holeCards.first === "Unknown" ||
      player.holeCards.second === "Unknown"
        ? undefined
        : player.holeCards,
    inHand: !folded,
    allIn,
    isHero: player.seat === heroSeat,
    hasActedThisRound: false,
  };
}

function mapAction(action: ReplayActionHistoryItem): AllInSavedHandAction {
  const next: AllInSavedHandAction = {
    seat: action.seat,
    action: action.action,
  };

  if (typeof action.amount === "number") {
    next.amount = action.amount;
  }

  if (typeof action.to === "number") {
    next.to = action.to;
  }

  return next;
}

export function buildAllInHandRecord(
  id: string,
  createdAt: number,
  setup: ManualHandSetup,
  replay: ManualReplayData,
  source: SavedHandUpload["source"],
  analysis?: SavedHandUpload["analysis"] | null,
): AllInSavedHand {
  const preflop = replay.actionHistory
    .filter((action) => action.street === "preflop")
    .map(mapAction);
  const flopActions = replay.actionHistory
    .filter((action) => action.street === "flop")
    .map(mapAction);
  const turnActions = replay.actionHistory
    .filter((action) => action.street === "turn")
    .map(mapAction);
  const riverActions = replay.actionHistory
    .filter((action) => action.street === "river")
    .map(mapAction);
  const players = [setup.hero, ...setup.opponents].map((player) => ({
    seat: player.seat,
    name: player.name,
    style: "TAG",
    stackBb: player.stackBb,
    hole:
      player.unknownCards ||
      player.holeCards.first === "Unknown" ||
      player.holeCards.second === "Unknown"
        ? undefined
        : {
            first: player.holeCards.first,
            second: player.holeCards.second,
          },
    unknownCards: Boolean(player.unknownCards),
  }));
  const activeSeats = replay.finalState.players
    .filter((player) => player.inHand)
    .map((player) => player.seat);
  const board = replay.finalState.board;

  return {
    id,
    setup: {
      buttonSeat: setup.buttonSeat,
      heroSeat: setup.hero.seat,
      players,
    },
    streets: {
      preflop,
      ...(board.length >= 3 || flopActions.length > 0
        ? {
            flop: {
              board: board.slice(0, 3),
              actions: flopActions,
            },
          }
        : {}),
      ...(board[3] || turnActions.length > 0
        ? {
            turn: {
              card: board[3] || "",
              actions: turnActions,
            },
          }
        : {}),
      ...(board[4] || riverActions.length > 0
        ? {
            river: {
              card: board[4] || "",
              actions: riverActions,
            },
          }
        : {}),
    },
    result: {
      endedBy: replay.finalState.winnerSeat ? "showdown" : "fold",
      ...(replay.finalState.winnerSeat
        ? { winnerSeat: replay.finalState.winnerSeat }
        : {}),
      pots: [
        {
          sizeBb: replay.finalState.potBb,
          eligibleSeats: activeSeats,
        },
      ],
    },
    createdAt,
    progressionText: replay.progressionText,
    source,
    finalStateJson: replay.finalState,
    actionHistory: replay.actionHistory,
    ai: analysis || null,
  };
}

export function restoreReplayFromAllInHand(record: AllInSavedHand): {
  setup: ManualHandSetup;
  replay: ManualReplayData;
} | null {
  const heroSeat = normalizeSeat(record.setup.heroSeat);

  if (!heroSeat) {
    return null;
  }

  const setupPlayers = record.setup.players.reduce<ManualPlayerSetup[]>(
    (result, player) => {
      const seat = normalizeSeat(player.seat);

      if (!seat) {
        return result;
      }

      result.push({
        seat,
        name: player.name || (seat === heroSeat ? "Hero" : "Villain"),
        stackBb: player.stackBb || 0,
        holeCards: normalizeHoleCards(player.hole, player.unknownCards),
        unknownCards: Boolean(player.unknownCards || !player.hole),
      });

      return result;
    },
    [],
  );

  const hero = setupPlayers.find((player) => player.seat === heroSeat);

  if (!hero) {
    return null;
  }

  const opponents = setupPlayers.filter((player) => player.seat !== heroSeat);
  const actionHistory: ReplayActionHistoryItem[] = [];
  let timestamp = 0;

  const pushStreetActions = (
    street: ReplayActionStreet,
    actions: AllInSavedHandAction[] | undefined,
  ) => {
    (actions || []).forEach((action) => {
      const seat = normalizeSeat(action.seat);
      const normalizedAction = normalizeActionType(action.action);

      if (!seat || !normalizedAction) {
        return;
      }

      actionHistory.push({
        street,
        seat,
        action: normalizedAction,
        amount:
          typeof action.amount === "number" && Number.isFinite(action.amount)
            ? action.amount
            : undefined,
        to:
          typeof action.to === "number" && Number.isFinite(action.to)
            ? action.to
            : undefined,
        timestamp,
      });
      timestamp += 500;
    });
  };

  pushStreetActions("preflop", record.streets.preflop);
  pushStreetActions("flop", record.streets.flop?.actions);
  pushStreetActions("turn", record.streets.turn?.actions);
  pushStreetActions("river", record.streets.river?.actions);

  const board = [
    ...(record.streets.flop?.board || []),
    ...(record.streets.turn?.card ? [record.streets.turn.card] : []),
    ...(record.streets.river?.card ? [record.streets.river.card] : []),
  ].filter(Boolean);

  const players = [hero, ...opponents].map((player) =>
    buildPlayerState(player, actionHistory, heroSeat),
  );
  const normalizedWinnerSeat = normalizeSeat(record.result.winnerSeat || "");
  const activePlayers = players.filter((player) => player.inHand);
  const winnerSeat =
    normalizedWinnerSeat ||
    (activePlayers.length === 1 ? activePlayers[0]?.seat : undefined);

  const setup: ManualHandSetup = {
    buttonSeat: normalizeSeat(record.setup.buttonSeat, heroSeat) || heroSeat,
    hero,
    opponents,
    actionNotes: "",
  };

  const replay: ManualReplayData = {
    actionHistory,
    finalState: {
      street: "finished",
      potBb: record.result.pots[0]?.sizeBb || 0,
      currentBetBb: 0,
      lastFullRaiseBb: 0,
      lastRaiseSizeBb: 0,
      toActQueue: [],
      players,
      board,
      finished: true,
      winnerSeat,
    },
    progressionText:
      record.progressionText ||
      generateReplayLog(
        setup,
        {
          street: "finished",
          potBb: record.result.pots[0]?.sizeBb || 0,
          currentBetBb: 0,
          lastFullRaiseBb: 0,
          lastRaiseSizeBb: 0,
          toActQueue: [],
          players,
          board,
          finished: true,
          winnerSeat,
        },
        actionHistory,
      ),
  };

  return {
    setup,
    replay,
  };
}

export function getReplayPayload(item: SavedHandUpload): {
  setup: ManualHandSetup;
  replay: ManualReplayData;
} | null {
  if (item.manualSetup && item.manualReplay) {
    return {
      setup: item.manualSetup,
      replay: item.manualReplay,
    };
  }

  const record = getAllInHandRecord(item);

  if (!record) {
    return null;
  }

  return restoreReplayFromAllInHand(record);
}

export function getAllInHandRecord(item: SavedHandUpload): AllInSavedHand | null {
  if (item.allinHand) {
    return item.allinHand;
  }

  if (!item.manualSetup || !item.manualReplay) {
    return null;
  }

  return buildAllInHandRecord(
    item.id,
    item.createdAtMs,
    item.manualSetup,
    item.manualReplay,
    item.source,
    item.analysis,
  );
}
