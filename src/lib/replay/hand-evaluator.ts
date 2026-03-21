export type HandRankType =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export interface HandRank {
  type: HandRankType;
  rankValue: number;
  kickers: number[];
}

const RANK_VALUES: Record<string, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};

function parseCard(card: string) {
  const normalized = card.trim();

  if (normalized.startsWith("10")) {
    return { rank: "10", suit: normalized.slice(2) };
  }

  if (normalized.length === 2) {
    return {
      rank: normalized.slice(0, 1).toUpperCase(),
      suit: normalized.slice(1).toLowerCase(),
    };
  }

  return {
    rank: normalized.slice(0, 1).toUpperCase(),
    suit: normalized.slice(1),
  };
}

function getRankValue(card: string) {
  return RANK_VALUES[parseCard(card).rank] || 0;
}

function getSuit(card: string) {
  return parseCard(card).suit;
}

function checkStraight(sortedRanks: number[]) {
  const uniqueRanks = Array.from(new Set(sortedRanks)).sort((a, b) => b - a);

  if (uniqueRanks.length < 5) {
    return false;
  }

  for (let start = 0; start <= uniqueRanks.length - 5; start += 1) {
    let consecutive = true;

    for (let offset = 1; offset < 5; offset += 1) {
      if (uniqueRanks[start + offset] !== uniqueRanks[start] - offset) {
        consecutive = false;
        break;
      }
    }

    if (consecutive) {
      return uniqueRanks[start];
    }
  }

  const wheel = [14, 5, 4, 3, 2];
  return wheel.every((rank) => uniqueRanks.includes(rank)) ? 5 : false;
}

function getCombinations<T>(items: T[], take: number): T[][] {
  if (take === 0) {
    return [[]];
  }

  if (take > items.length) {
    return [];
  }

  if (take === items.length) {
    return [items];
  }

  const combinations: T[][] = [];

  for (let index = 0; index <= items.length - take; index += 1) {
    const head = items[index];

    getCombinations(items.slice(index + 1), take - 1).forEach((tail) => {
      combinations.push([head, ...tail]);
    });
  }

  return combinations;
}

function evaluateFiveCards(cards: string[]): HandRank {
  const ranks = cards.map(getRankValue);
  const suits = cards.map(getSuit);
  const rankCounts = new Map<number, number>();
  const suitCounts = new Map<string, number>();

  ranks.forEach((rank) => {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  });

  suits.forEach((suit) => {
    suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
  });

  const sortedRanks = [...ranks].sort((a, b) => b - a);
  const isFlush = Array.from(suitCounts.values()).some((count) => count === 5);
  const straightHigh = checkStraight(sortedRanks);

  if (isFlush && straightHigh !== false) {
    return {
      type: "straight-flush",
      rankValue: 9,
      kickers: [straightHigh],
    };
  }

  const fourOfAKind = Array.from(rankCounts.entries()).find(([, count]) => count === 4);

  if (fourOfAKind) {
    const quadRank = fourOfAKind[0];
    const kicker = sortedRanks.find((rank) => rank !== quadRank) || 0;

    return {
      type: "four-of-a-kind",
      rankValue: 8,
      kickers: [quadRank, kicker],
    };
  }

  const threeOfAKind = Array.from(rankCounts.entries()).find(([, count]) => count === 3);
  const pair = Array.from(rankCounts.entries()).find(([, count]) => count === 2);

  if (threeOfAKind && pair) {
    return {
      type: "full-house",
      rankValue: 7,
      kickers: [threeOfAKind[0], pair[0]],
    };
  }

  if (isFlush) {
    return {
      type: "flush",
      rankValue: 6,
      kickers: sortedRanks,
    };
  }

  if (straightHigh !== false) {
    return {
      type: "straight",
      rankValue: 5,
      kickers: [straightHigh],
    };
  }

  if (threeOfAKind) {
    const tripRank = threeOfAKind[0];
    const kickers = sortedRanks.filter((rank) => rank !== tripRank).slice(0, 2);

    return {
      type: "three-of-a-kind",
      rankValue: 4,
      kickers: [tripRank, ...kickers],
    };
  }

  const pairs = Array.from(rankCounts.entries())
    .filter(([, count]) => count === 2)
    .map(([rank]) => rank)
    .sort((a, b) => b - a);

  if (pairs.length >= 2) {
    const kicker = sortedRanks.find((rank) => !pairs.includes(rank)) || 0;

    return {
      type: "two-pair",
      rankValue: 3,
      kickers: [pairs[0] || 0, pairs[1] || 0, kicker],
    };
  }

  if (pairs.length === 1) {
    const pairRank = pairs[0];
    const kickers = sortedRanks.filter((rank) => rank !== pairRank).slice(0, 3);

    return {
      type: "pair",
      rankValue: 2,
      kickers: [pairRank, ...kickers],
    };
  }

  return {
    type: "high-card",
    rankValue: 1,
    kickers: sortedRanks,
  };
}

export function evaluateHand(holeCards: string[], board: string[]) {
  const allCards = [...holeCards, ...board];

  if (allCards.length < 5) {
    return {
      type: "high-card" as const,
      rankValue: 1,
      kickers: allCards.map(getRankValue).sort((a, b) => b - a),
    };
  }

  let bestHand: HandRank | null = null;

  getCombinations(allCards, 5).forEach((combo) => {
    const candidate = evaluateFiveCards(combo);

    if (!bestHand || compareHandRanks(candidate, bestHand) > 0) {
      bestHand = candidate;
    }
  });

  return bestHand!;
}

export function compareHandRanks(hand1: HandRank, hand2: HandRank) {
  if (hand1.rankValue !== hand2.rankValue) {
    return hand1.rankValue - hand2.rankValue;
  }

  const maxLength = Math.min(hand1.kickers.length, hand2.kickers.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (hand1.kickers[index] !== hand2.kickers[index]) {
      return hand1.kickers[index]! - hand2.kickers[index]!;
    }
  }

  return 0;
}
