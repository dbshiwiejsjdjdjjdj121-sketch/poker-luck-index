import type {
  ManualHandSetup,
  ReplayActionHistoryItem,
  ReplayHandState,
  ReplaySeatPosition,
} from "@/lib/hand-upload-types";

function getPlayerName(seat: ReplaySeatPosition, setup: ManualHandSetup) {
  if (setup.hero.seat === seat) {
    return "Hero";
  }

  return setup.opponents.find((opponent) => opponent.seat === seat)?.name || seat;
}

function formatAction(action: ReplayActionHistoryItem) {
  switch (action.action) {
    case "Check":
      return "checks";
    case "Call":
      return action.amount ? `calls ${action.amount}bb` : "calls";
    case "Bet":
      return action.amount ? `bets ${action.amount}bb` : "bets";
    case "Raise":
      return action.to ? `raises to ${action.to}bb` : `raises ${action.amount || ""}bb`.trim();
    case "All-In":
      return action.amount ? `moves all-in for ${action.amount}bb` : "moves all-in";
    case "Fold":
      return "folds";
    case "Limp":
      return "limps";
    default:
      return String(action.action || "").toLowerCase();
  }
}

export function generateReplayLog(
  setup: ManualHandSetup,
  finalState: ReplayHandState,
  actionHistory: ReplayActionHistoryItem[],
) {
  const lines: string[] = [];

  const players = [setup.hero, ...setup.opponents];

  players.forEach((player) => {
    const displayName = player.seat === setup.hero.seat ? "Hero" : player.name;
    const cards =
      player.unknownCards ||
      player.holeCards.first === "Unknown" ||
      player.holeCards.second === "Unknown"
        ? "Unknown Unknown"
        : `${player.holeCards.first} ${player.holeCards.second}`;

    lines.push(`${displayName} (${player.seat}) Hand: ${cards}`);
    lines.push(`${displayName} Stack: ${player.stackBb}bb`);
  });

  lines.push("");

  const byStreet = {
    preflop: actionHistory.filter((action) => action.street === "preflop"),
    flop: actionHistory.filter((action) => action.street === "flop"),
    turn: actionHistory.filter((action) => action.street === "turn"),
    river: actionHistory.filter((action) => action.street === "river"),
  };

  if (byStreet.preflop.length) {
    lines.push("Preflop:");
    byStreet.preflop.forEach((action) => {
      lines.push(`  ${getPlayerName(action.seat, setup)} ${formatAction(action)}`);
    });
  }

  if (byStreet.flop.length || finalState.board.length >= 3) {
    lines.push("");
    lines.push(`Flop (${finalState.board.slice(0, 3).join(" ")}):`);
    byStreet.flop.forEach((action) => {
      lines.push(`  ${getPlayerName(action.seat, setup)} ${formatAction(action)}`);
    });
  }

  if (byStreet.turn.length || finalState.board.length >= 4) {
    lines.push("");
    lines.push(`Turn (${finalState.board[3] || "??"}):`);
    byStreet.turn.forEach((action) => {
      lines.push(`  ${getPlayerName(action.seat, setup)} ${formatAction(action)}`);
    });
  }

  if (byStreet.river.length || finalState.board.length >= 5) {
    lines.push("");
    lines.push(`River (${finalState.board[4] || "??"}):`);
    byStreet.river.forEach((action) => {
      lines.push(`  ${getPlayerName(action.seat, setup)} ${formatAction(action)}`);
    });
  }

  lines.push("");
  lines.push(`Pot: ${finalState.potBb}bb`);

  if (finalState.winnerSeat) {
    lines.push(`Winner: ${getPlayerName(finalState.winnerSeat, setup)}`);
  } else {
    const activePlayers = finalState.players.filter((player) => player.inHand);

    if (activePlayers.length > 1) {
      lines.push("Chop pot");
    }
  }

  return lines.join("\n").trim();
}
