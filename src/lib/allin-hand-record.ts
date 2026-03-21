import type {
  AllInSavedHand,
  AllInSavedHandAction,
  ManualHandSetup,
  ManualReplayData,
  ReplayActionHistoryItem,
  SavedHandUpload,
} from "@/lib/hand-upload-types";

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
