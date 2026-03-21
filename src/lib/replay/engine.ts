import { compareHandRanks, evaluateHand, type HandRank } from "@/lib/replay/hand-evaluator";

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export class Pot {
  total = 0;
  contributors: Map<Player, number> = new Map();
}

export class Player {
  stack: number;
  isActive = true;
  isAllIn = false;
  committedTotal = 0;
  committedThisStreet = 0;
  holeCards: string[] = [];
  seat?: string;
  name?: string;
  hasActedThisStreet = false;

  constructor(stack: number) {
    this.stack = stack;
  }
}

export class GameState {
  players: Player[] = [];
  street: Street = "preflop";
  currentPlayerIndex = 0;
  lastBetSize = 0;
  lastAggressorIndex: number | null = null;
  lastRaiseSize = 0;
  minBet = 1;
  board: string[] = [];
  buttonIndex = 0;
  pots: Pot[] = [];

  initHand(stacks: number[], sbAmount: number, bbAmount: number, buttonIndex: number) {
    this.players = stacks.map((stack) => new Player(stack));
    this.buttonIndex = buttonIndex;
    this.street = "preflop";
    this.lastBetSize = bbAmount;
    this.minBet = bbAmount;
    this.board = [];
    this.pots = [];
    this.lastRaiseSize = bbAmount;
    this.lastAggressorIndex = null;
    this.currentPlayerIndex = 0;

    this.players.forEach((player) => {
      player.hasActedThisStreet = false;
    });

    const playerCount = this.players.length;
    const sbIndex = (buttonIndex + 1) % playerCount;
    const bbIndex = (sbIndex + 1) % playerCount;

    const sb = this.players[sbIndex]!;
    const bb = this.players[bbIndex]!;
    const sbToPost = Math.min(sbAmount, sb.stack);
    const bbToPost = Math.min(bbAmount, bb.stack);

    sb.stack -= sbToPost;
    sb.committedThisStreet = sbToPost;
    sb.committedTotal = sbToPost;
    if (sb.stack === 0) sb.isAllIn = true;

    bb.stack -= bbToPost;
    bb.committedThisStreet = bbToPost;
    bb.committedTotal = bbToPost;
    if (bb.stack === 0) bb.isAllIn = true;

    this.lastAggressorIndex = bbIndex;
    this.currentPlayerIndex = this.nextActiveAfter(bbIndex);
  }

  getCurrentPlayer() {
    if (this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.length) {
      return null;
    }

    const player = this.players[this.currentPlayerIndex]!;
    return player.isActive && !player.isAllIn ? player : null;
  }

  nextActiveAfter(index: number) {
    const total = this.players.length;

    for (let offset = 1; offset <= total; offset += 1) {
      const nextIndex = (index + offset) % total;
      const nextPlayer = this.players[nextIndex]!;

      if (nextPlayer.isActive && !nextPlayer.isAllIn) {
        return nextIndex;
      }
    }

    return -1;
  }

  isBettingRoundComplete() {
    const contenders = this.players.filter((player) => player.isActive && !player.isAllIn);

    if (contenders.length === 0) {
      return true;
    }

    if (contenders.length === 1) {
      const lastPlayer = contenders[0]!;

      if (lastPlayer.committedThisStreet < this.lastBetSize) {
        return (
          lastPlayer.hasActedThisStreet &&
          lastPlayer.committedThisStreet >= this.lastBetSize
        );
      }

      if (lastPlayer.hasActedThisStreet) {
        return true;
      }

      const otherActivePlayers = this.players.filter(
        (player) => player !== lastPlayer && player.isActive,
      );

      return otherActivePlayers.every((player) => player.isAllIn);
    }

    return contenders.every(
      (player) =>
        player.hasActedThisStreet && player.committedThisStreet >= this.lastBetSize,
    );
  }

  finishBettingRound() {
    this.collectBets();

    this.players.forEach((player) => {
      player.committedThisStreet = 0;
      player.hasActedThisStreet = false;
    });

    this.lastBetSize = 0;
    this.lastAggressorIndex = null;
    this.lastRaiseSize = 0;

    if (this.street === "preflop") {
      this.street = "flop";
    } else if (this.street === "flop") {
      this.street = "turn";
    } else if (this.street === "turn") {
      this.street = "river";
    } else if (this.street === "river") {
      this.street = "showdown";
    }

    const contenders = this.players.filter((player) => player.isActive && !player.isAllIn);

    if (contenders.length <= 1) {
      this.currentPlayerIndex = -1;
      return;
    }

    const postflopOrder = ["SB", "BB", "UTG", "HJ", "CO", "BTN"];
    let firstToAct = -1;

    for (const seatName of postflopOrder) {
      const playerIndex = this.players.findIndex(
        (player) => player.seat === seatName && player.isActive && !player.isAllIn,
      );

      if (playerIndex !== -1) {
        firstToAct = playerIndex;
        break;
      }
    }

    this.currentPlayerIndex =
      firstToAct !== -1 ? firstToAct : this.nextActiveAfter(this.buttonIndex);
  }

  collectBets(calculateSidePots = false) {
    const totalBet = this.players.reduce((sum, player) => sum + player.committedThisStreet, 0);

    if (totalBet <= 0) {
      return;
    }

    if (calculateSidePots && this.street === "showdown") {
      this.collectBetsWithSidePots();
      return;
    }

    const pot = new Pot();
    pot.total = totalBet;

    this.players.forEach((player) => {
      if (player.committedThisStreet > 0) {
        pot.contributors.set(player, player.committedThisStreet);
        player.committedTotal += player.committedThisStreet;
      }
    });

    this.pots.push(pot);
  }

  private collectBetsWithSidePots() {
    const contributions = new Map<Player, number>();

    this.players.forEach((player) => {
      if (player.committedThisStreet > 0) {
        contributions.set(player, player.committedThisStreet);
        player.committedTotal += player.committedThisStreet;
      }
    });

    if (!contributions.size) {
      return;
    }

    const betAmounts = Array.from(new Set(contributions.values())).sort((a, b) => a - b);
    let previousAmount = 0;

    betAmounts.forEach((currentAmount) => {
      const pot = new Pot();
      const increment = currentAmount - previousAmount;

      contributions.forEach((amount, player) => {
        if (amount >= currentAmount) {
          pot.total += increment;
          pot.contributors.set(player, (pot.contributors.get(player) || 0) + increment);
        }
      });

      if (pot.total > 0) {
        this.pots.push(pot);
      }

      previousAmount = currentAmount;
    });
  }

  determineShowdownWinners() {
    if (this.street !== "showdown") {
      return [] as string[];
    }

    const activePlayers = this.players.filter(
      (player) => player.isActive && player.holeCards.length >= 2,
    );

    if (!activePlayers.length) {
      return [] as string[];
    }

    const playerHands: Array<{ player: Player; handRank: HandRank }> = [];

    activePlayers.forEach((player) => {
      try {
        playerHands.push({
          player,
          handRank: evaluateHand(player.holeCards, this.board),
        });
      } catch {
        // Ignore invalid hand evaluations.
      }
    });

    if (!playerHands.length) {
      return [] as string[];
    }

    let bestHand = playerHands[0]!;

    for (let index = 1; index < playerHands.length; index += 1) {
      if (compareHandRanks(playerHands[index]!.handRank, bestHand.handRank) > 0) {
        bestHand = playerHands[index]!;
      }
    }

    return playerHands
      .filter(({ handRank }) => compareHandRanks(handRank, bestHand.handRank) === 0)
      .map(({ player }) => player.seat || "")
      .filter(Boolean);
  }

  advanceToNextPlayer() {
    if (this.isBettingRoundComplete()) {
      this.finishBettingRound();
      return;
    }

    this.currentPlayerIndex = this.nextActiveAfter(this.currentPlayerIndex);

    if (this.isBettingRoundComplete()) {
      this.finishBettingRound();
    }
  }

  actCheck() {
    const player = this.getCurrentPlayer();

    if (!player) {
      return;
    }

    if (this.lastBetSize - player.committedThisStreet > 0) {
      throw new Error("Cannot check when facing a bet.");
    }

    player.hasActedThisStreet = true;
    this.advanceToNextPlayer();
  }

  actCall() {
    const player = this.getCurrentPlayer();

    if (!player) {
      return;
    }

    const toCall = this.lastBetSize - player.committedThisStreet;

    if (toCall <= 0) {
      throw new Error("Nothing to call.");
    }

    const actualCall = Math.min(toCall, player.stack);
    player.stack -= actualCall;
    player.committedThisStreet += actualCall;
    if (player.stack === 0) player.isAllIn = true;
    player.hasActedThisStreet = true;
    this.advanceToNextPlayer();
  }

  actBet(amount: number) {
    const player = this.getCurrentPlayer();

    if (!player) {
      return;
    }

    if (this.lastBetSize > 0) {
      throw new Error("Cannot bet when there is already a bet.");
    }

    const finalAmount = Math.min(amount, player.stack);

    if (finalAmount <= 0) {
      throw new Error("Bet amount must be positive.");
    }

    player.stack -= finalAmount;
    player.committedThisStreet += finalAmount;
    this.lastBetSize = player.committedThisStreet;
    this.lastAggressorIndex = this.currentPlayerIndex;
    this.lastRaiseSize = player.committedThisStreet;
    if (player.stack === 0) player.isAllIn = true;

    this.players.forEach((candidate) => {
      if (candidate !== player && candidate.isActive && !candidate.isAllIn) {
        candidate.hasActedThisStreet = false;
      }
    });

    player.hasActedThisStreet = true;
    this.advanceToNextPlayer();
  }

  actRaise(raiseTo: number) {
    const player = this.getCurrentPlayer();

    if (!player) {
      return;
    }

    if (this.lastBetSize === 0) {
      throw new Error("Cannot raise when there is no bet.");
    }

    const maxRaise = player.committedThisStreet + player.stack;
    let finalRaiseTo = Math.min(raiseTo, maxRaise);

    if (finalRaiseTo <= this.lastBetSize) {
      if (player.committedThisStreet + player.stack <= this.lastBetSize) {
        this.actCall();
        return;
      }

      const minRaise = this.lastBetSize + (this.lastRaiseSize || this.minBet);
      finalRaiseTo = Math.min(maxRaise, minRaise);
    }

    const raiseAmount = finalRaiseTo - player.committedThisStreet;
    player.stack -= raiseAmount;
    player.committedThisStreet = finalRaiseTo;
    const raiseIncrement = finalRaiseTo - this.lastBetSize;
    this.lastRaiseSize = raiseIncrement;
    this.lastBetSize = finalRaiseTo;
    this.lastAggressorIndex = this.currentPlayerIndex;
    if (player.stack === 0) player.isAllIn = true;

    this.players.forEach((candidate) => {
      if (candidate !== player && candidate.isActive && !candidate.isAllIn) {
        candidate.hasActedThisStreet = false;
      }
    });

    player.hasActedThisStreet = true;
    this.advanceToNextPlayer();
  }

  actFold() {
    const player = this.getCurrentPlayer();

    if (!player) {
      return;
    }

    player.isActive = false;
    player.hasActedThisStreet = true;

    if (this.players.filter((candidate) => candidate.isActive).length === 1) {
      this.street = "showdown";
      return;
    }

    this.advanceToNextPlayer();
  }

  setBoard(street: Street, cards: string[]) {
    if (street === "flop") {
      if (cards.length !== 3) {
        throw new Error("Flop requires exactly 3 cards.");
      }
      this.board = cards;
    } else if (street === "turn") {
      if (cards.length !== 4) {
        throw new Error("Turn requires exactly 4 cards.");
      }
      this.board = cards;
    } else if (street === "river") {
      if (cards.length !== 5) {
        throw new Error("River requires exactly 5 cards.");
      }
      this.board = cards;
    }

    if (!this.getCurrentPlayer() && this.isBettingRoundComplete()) {
      this.finishBettingRound();
    }
  }
}
