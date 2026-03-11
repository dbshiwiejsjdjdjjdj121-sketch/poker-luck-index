export type FortuneInput = {
  tableNumber: string;
  seatNumber: string;
  birthDate: string;
  todayDate: string;
};

export type FortuneOutput = FortuneInput & {
  luckScore: number;
  scoreLabel: string;
  scoreSummary: string;
  scoreAdvice: string;
  recommendedStyle: string;
  recommendedStyleNote: string;
  earlySessionStrategy: string;
  midSessionAdjustment: string;
  lateSessionStrategy: string;
  coinFlipDecision: string;
  coinFlipReason: string;
  luckyHands: string[];
};

const conservativeHands = [
  "AA",
  "KK",
  "QQ",
  "JJ",
  "TT",
  "AK",
  "AQ",
  "99",
  "88",
  "77",
] as const;

const balancedHands = [
  "AK",
  "AQ",
  "AJ",
  "KQ",
  "QJ",
  "JT",
  "TT",
  "99",
  "88",
  "77",
  "KJ",
  "A9",
] as const;

const aggressiveHands = [
  "AK",
  "AQ",
  "AJ",
  "KQ",
  "QJ",
  "JT",
  "T9",
  "98",
  "KJ",
  "A9",
  "77",
  "66",
  "55",
] as const;

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickFromList<const T extends readonly string[]>(
  seedSource: string,
  label: string,
  list: T,
) {
  const seed = hashString(`${seedSource}:${label}`);
  return list[seed % list.length];
}

function buildLuckyHands(seedSource: string, luckScore: number) {
  const pool =
    luckScore >= 8
      ? aggressiveHands
      : luckScore >= 5
        ? balancedHands
        : conservativeHands;

  const hands: string[] = [];
  let cursor = hashString(`${seedSource}:hands:${luckScore}`);

  while (hands.length < 3) {
    const hand = pool[cursor % pool.length];

    if (!hands.includes(hand)) {
      hands.push(hand);
    }

    cursor = hashString(`${cursor}:${hands.length}:${luckScore}`);
  }

  return hands;
}

function buildScoreContent(luckScore: number, seedSource: string) {
  if (luckScore >= 9) {
    return {
      scoreLabel: pickFromList(seedSource, "label-heater", [
        "Heater Potential",
        "Pressure Window",
        "Hot Table Energy",
      ]),
      scoreSummary: pickFromList(seedSource, "summary-heater", [
        "The table feels live today. You can lean into good spots without playing reckless.",
        "This is one of the better days to trust your read and make people uncomfortable.",
        "Your fortune is running hot enough to press real edges when the table slows down.",
      ]),
      scoreAdvice: pickFromList(seedSource, "advice-heater", [
        "Open with confidence in position, punish hesitation, and do not miss clear value bets.",
        "Let weaker players call too much, then size up and keep the initiative.",
        "Push thin edges when ranges cap, but keep the bluffs clean and targeted.",
      ]),
    };
  }

  if (luckScore >= 7) {
    return {
      scoreLabel: pickFromList(seedSource, "label-green", [
        "Green Light",
        "Solid Upswing",
        "Good Table Current",
      ]),
      scoreSummary: pickFromList(seedSource, "summary-green", [
        "Today leans in your favor. The table should reward clean aggression and steady pressure.",
        "Your read looks above average. Good decisions should carry a little extra weight.",
        "There is room to play forward today, especially once weaker ranges start to cap.",
      ]),
      scoreAdvice: pickFromList(seedSource, "advice-green", [
        "Start balanced, then turn up the pressure when position and stack depth line up.",
        "Value bet clearly, isolate weak opens, and keep marginal hero calls to a minimum.",
        "You do not need to force the action early, but you should be ready to attack later.",
      ]),
    };
  }

  if (luckScore >= 5) {
    return {
      scoreLabel: pickFromList(seedSource, "label-steady", [
        "Steady Night",
        "Balanced Table",
        "Even Current",
      ]),
      scoreSummary: pickFromList(seedSource, "summary-steady", [
        "Today feels average. You will do best by staying calm and choosing your spots well.",
        "No major rush, no major storm. Discipline should matter more than flair tonight.",
        "The table looks playable, but not magical. Build around position and clean value.",
      ]),
      scoreAdvice: pickFromList(seedSource, "advice-steady", [
        "Keep your opening ranges honest, avoid ego battles early, and collect the easier pots.",
        "Take the clear spots, skip the thin gambles, and let patience create the best edges.",
        "You do not need a hero script today. Stable decisions should do the heavy lifting.",
      ]),
    };
  }

  if (luckScore >= 3) {
    return {
      scoreLabel: pickFromList(seedSource, "label-careful", [
        "Cautious Table",
        "Low-Variance Night",
        "Careful Current",
      ]),
      scoreSummary: pickFromList(seedSource, "summary-careful", [
        "Today looks a little stubborn. You will want tighter entries and cleaner value.",
        "The edge is thinner than usual, so avoid building big pots without a strong reason.",
        "This is more of a protect-the-stack day than a play-every-spot day.",
      ]),
      scoreAdvice: pickFromList(seedSource, "advice-careful", [
        "Stay patient, fold the glamorous marginal hands, and let the table make the first mistake.",
        "Keep pots manageable early and save your big swings for real leverage spots.",
        "Tighten preflop, respect pressure, and make your money from clear value lines.",
      ]),
    };
  }

  return {
    scoreLabel: pickFromList(seedSource, "label-warning", [
      "Storm Warning",
      "Turbulent Table",
      "Red-Light Session",
    ]),
    scoreSummary: pickFromList(seedSource, "summary-warning", [
      "Today is rough enough that survival matters more than spectacle.",
      "The current is against you. Protecting your stack is the sharpest move on the board.",
      "This session wants discipline, not fireworks. Avoid forcing a comeback narrative.",
    ]),
    scoreAdvice: pickFromList(seedSource, "advice-warning", [
      "Play tighter than usual, keep big bluffs rare, and wait for premium leverage spots.",
      "Pass the thin calls, preserve chips early, and let impatient players donate first.",
      "If a hand feels close, it probably belongs in the muck today.",
    ]),
  };
}

function buildRecommendedStyle(luckScore: number, seedSource: string) {
  if (luckScore >= 8) {
    return pickFromList(seedSource, "style-high", ["Loose", "Balanced"]);
  }

  if (luckScore >= 5) {
    return pickFromList(seedSource, "style-mid", [
      "Balanced",
      "Loose",
      "Tight",
    ]);
  }

  return pickFromList(seedSource, "style-low", ["Tight", "Balanced"]);
}

function buildRecommendedStyleNote(style: string, luckScore: number) {
  if (style === "Loose") {
    return luckScore >= 8
      ? "Play more speculative hands in position and lean on weaker seats."
      : "Open up selectively when position and table texture make it worth it.";
  }

  if (style === "Tight") {
    return "Keep the fringes folded and wait for cleaner spots before building pots.";
  }

  return "Let position, stack depth, and hand quality set the pace instead of forcing action.";
}

function buildSessionPlan(luckScore: number, seedSource: string) {
  if (luckScore >= 8) {
    return {
      earlySessionStrategy: pickFromList(seedSource, "early-hot", [
        "Open a touch wider in position and keep the initiative.",
        "Start balanced, but punish passive tables as soon as the read is clean.",
        "Probe early for fold equity, especially against capped opens.",
      ]),
      midSessionAdjustment: pickFromList(seedSource, "mid-hot", [
        "Increase aggression when stacks get awkward for the table.",
        "Lean harder on players who dislike calling down three streets.",
        "Keep betting the spots where your range stays uncapped.",
      ]),
      lateSessionStrategy: pickFromList(seedSource, "late-hot", [
        "Apply pressure when fatigue shows and ranges tighten up.",
        "Close strong with selective pressure, not random fireworks.",
        "Punish weakness late instead of giving free cards and cheap showdowns.",
      ]),
    };
  }

  if (luckScore >= 5) {
    return {
      earlySessionStrategy: pickFromList(seedSource, "early-mid", [
        "Take the cleaner opens first and learn the table before widening.",
        "Start balanced and let position decide which pots deserve extra heat.",
        "Observe the splashy seats early, then choose your attack lanes.",
      ]),
      midSessionAdjustment: pickFromList(seedSource, "mid-mid", [
        "Maintain pressure only where the edge is obvious.",
        "Keep the pace steady and avoid drifting into marginal spots.",
        "Use position and sizing discipline instead of forcing hero plays.",
      ]),
      lateSessionStrategy: pickFromList(seedSource, "late-mid", [
        "Apply selective pressure once the table starts playing face up.",
        "Stay patient late and take the value that shows up.",
        "Choose your finish spots carefully and close on fundamentals.",
      ]),
    };
  }

  return {
    earlySessionStrategy: pickFromList(seedSource, "early-low", [
      "Start tight, observe first, and protect chips before chasing spots.",
      "Play straightforward early and keep fringe hands out of trouble.",
      "Use the first orbit to read the table, not to win every pot.",
    ]),
    midSessionAdjustment: pickFromList(seedSource, "mid-low", [
      "Control pot size when your hand strength is only medium.",
      "Fold the close spots and keep your stack ready for cleaner edges.",
      "Let volatility pass before stepping into thin confrontations.",
    ]),
    lateSessionStrategy: pickFromList(seedSource, "late-low", [
      "Wait for premium leverage spots rather than manufacturing action.",
      "Stay selective late and avoid paying off obvious value.",
      "Finish disciplined, especially when pressure gets expensive.",
    ]),
  };
}

function buildCoinFlipDecision(luckScore: number, seedSource: string) {
  if (luckScore >= 8) {
    return pickFromList(seedSource, "flip-high", ["Call", "Call", "Fold"]);
  }

  if (luckScore >= 5) {
    return pickFromList(seedSource, "flip-mid", ["Call", "Fold"]);
  }

  return pickFromList(seedSource, "flip-low", ["Fold", "Fold", "Call"]);
}

function buildCoinFlipReason(decision: string, luckScore: number) {
  if (decision === "Call") {
    return luckScore >= 8
      ? "The table energy is good enough to take close gambles at the right price."
      : "If the numbers work, you can take the spot without forcing it.";
  }

  return luckScore <= 4
    ? "Avoid marginal spots early today and save chips for better leverage."
    : "Pass the thin gamble unless the spot becomes clearly profitable.";
}

export function buildFortune(input: FortuneInput): FortuneOutput {
  const normalized = {
    tableNumber: input.tableNumber.trim(),
    seatNumber: input.seatNumber.trim(),
    birthDate: input.birthDate.trim(),
    todayDate: input.todayDate.trim(),
  };

  const seedSource = [
    normalized.tableNumber,
    normalized.seatNumber,
    normalized.birthDate,
    normalized.todayDate,
  ].join("|");
  const baseHash = hashString(seedSource);
  const luckScore = (baseHash % 10) + 1;
  const scoreContent = buildScoreContent(luckScore, seedSource);
  const sessionPlan = buildSessionPlan(luckScore, seedSource);
  const recommendedStyle = buildRecommendedStyle(luckScore, seedSource);
  const coinFlipDecision = buildCoinFlipDecision(luckScore, seedSource);

  return {
    ...normalized,
    luckScore,
    ...scoreContent,
    recommendedStyle,
    recommendedStyleNote: buildRecommendedStyleNote(
      recommendedStyle,
      luckScore,
    ),
    ...sessionPlan,
    coinFlipDecision,
    coinFlipReason: buildCoinFlipReason(coinFlipDecision, luckScore),
    luckyHands: buildLuckyHands(seedSource, luckScore),
  };
}
