import OpenAI, { toFile } from "openai";
import {
  type ManualHandSetup,
  type ManualReplayData,
  type SavedHandAnalysis,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_MANUAL_TEXT_LENGTH,
  type ParsedHandUpload,
  type SavedHandUpload,
  type StoredUploadMedia,
  type UploadSource,
} from "@/lib/hand-upload-types";
import {
  firebaseAdminConfigured,
  getFirebaseAdminAuth,
  getFirebaseAdminBucket,
  getFirebaseAdminDb,
} from "@/lib/firebase-admin";

const DEFAULT_TEXT_MODEL = process.env.OPENAI_HAND_UPLOAD_MODEL || "gpt-4.1-mini";
const DEFAULT_TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const DEFAULT_ANALYSIS_MODEL =
  process.env.OPENAI_HAND_ANALYSIS_MODEL || "gpt-4.1-mini";

const HAND_UPLOAD_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "valid",
    "error",
    "sourceText",
    "title",
    "normalizedHandText",
    "quickSummary",
    "coachAdvice",
    "hero",
    "opponents",
    "board",
    "keyActions",
    "missingDetails",
    "confidence",
  ],
  properties: {
    valid: { type: "boolean" },
    error: { type: "string" },
    sourceText: { type: "string" },
    title: { type: "string" },
    normalizedHandText: { type: "string" },
    quickSummary: { type: "string" },
    coachAdvice: { type: "string" },
    hero: {
      type: "object",
      additionalProperties: false,
      required: ["position", "cards", "stackBb"],
      properties: {
        position: { type: "string" },
        cards: { type: "array", items: { type: "string" } },
        stackBb: { type: "number" },
      },
    },
    opponents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "position", "stackBb"],
        properties: {
          label: { type: "string" },
          position: { type: "string" },
          stackBb: { type: "number" },
        },
      },
    },
    board: {
      type: "object",
      additionalProperties: false,
      required: ["flop", "turn", "river"],
      properties: {
        flop: { type: "array", items: { type: "string" } },
        turn: { type: "string" },
        river: { type: "string" },
      },
    },
    keyActions: { type: "array", items: { type: "string" } },
    missingDetails: { type: "array", items: { type: "string" } },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
  },
} as const;

const HAND_ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "streets", "gtoTips", "encouragement"],
  properties: {
    summary: { type: "string" },
    streets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["street", "highlight", "suggestion"],
        properties: {
          street: { type: "string" },
          highlight: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
    gtoTips: {
      type: "array",
      items: { type: "string" },
    },
    encouragement: { type: "string" },
  },
} as const;

function openAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function handUploadRuntimeConfigured() {
  return {
    openAI: openAIConfigured(),
    firebase: firebaseAdminConfigured(),
  };
}

export async function resolveViewerId({
  requestedViewerId,
  authHeader,
}: {
  requestedViewerId?: string;
  authHeader?: string | null;
}) {
  if (firebaseAdminConfigured() && authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.slice("Bearer ".length).trim();

    if (idToken) {
      try {
        const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
        return sanitizeViewerId(decoded.uid);
      } catch {
        // Fall back to requested viewerId for non-authenticated browsing.
      }
    }
  }

  return sanitizeViewerId(requestedViewerId ?? "");
}

function getOpenAIClient() {
  if (!openAIConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function sanitizeViewerId(viewerId: string) {
  const cleaned = viewerId.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);

  if (cleaned.length < 8) {
    throw new Error("viewerId is missing or invalid.");
  }

  return cleaned;
}

function stripCodeFence(value: string) {
  return value.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function normalizeTextArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeCard(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.length === 2) {
    return `${trimmed.slice(0, 1).toUpperCase()}${trimmed.slice(1).toLowerCase()}`;
  }

  return trimmed.toUpperCase();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeAnalysisResult(payload: unknown): Omit<SavedHandAnalysis, "createdAtMs" | "model"> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Model analysis response is not a JSON object.");
  }

  const data = payload as Record<string, unknown>;
  const streets = Array.isArray(data.streets)
    ? data.streets
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const street = item as Record<string, unknown>;

          return {
            street:
              typeof street.street === "string" ? street.street.trim() : "",
            highlight:
              typeof street.highlight === "string"
                ? street.highlight.trim()
                : "",
            suggestion:
              typeof street.suggestion === "string"
                ? street.suggestion.trim()
                : "",
          };
        })
        .filter(
          (
            item,
          ): item is {
            street: string;
            highlight: string;
            suggestion: string;
          } => Boolean(item?.street || item?.highlight || item?.suggestion),
        )
    : [];

  return {
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    streets,
    gtoTips: normalizeTextArray(data.gtoTips).slice(0, 4),
    encouragement:
      typeof data.encouragement === "string" ? data.encouragement.trim() : "",
  };
}

function normalizeHandUploadResult(payload: unknown): ParsedHandUpload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Model response is not a JSON object.");
  }

  const data = payload as Record<string, unknown>;
  const heroRecord =
    data.hero && typeof data.hero === "object"
      ? (data.hero as Record<string, unknown>)
      : {};
  const boardRecord =
    data.board && typeof data.board === "object"
      ? (data.board as Record<string, unknown>)
      : {};

  const opponents = Array.isArray(data.opponents)
    ? data.opponents
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const opponent = item as Record<string, unknown>;

          return {
            label:
              typeof opponent.label === "string" ? opponent.label.trim() : "",
            position:
              typeof opponent.position === "string"
                ? opponent.position.trim()
                : "",
            stackBb: normalizeNumber(opponent.stackBb),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return {
    valid: Boolean(data.valid),
    error: typeof data.error === "string" ? data.error.trim() : "",
    sourceText:
      typeof data.sourceText === "string" ? data.sourceText.trim() : "",
    title: typeof data.title === "string" ? data.title.trim() : "",
    normalizedHandText:
      typeof data.normalizedHandText === "string"
        ? data.normalizedHandText.trim()
        : "",
    quickSummary:
      typeof data.quickSummary === "string" ? data.quickSummary.trim() : "",
    coachAdvice:
      typeof data.coachAdvice === "string" ? data.coachAdvice.trim() : "",
    hero: {
      position:
        typeof heroRecord.position === "string"
          ? heroRecord.position.trim()
          : "",
      cards: normalizeTextArray(heroRecord.cards),
      stackBb: normalizeNumber(heroRecord.stackBb),
    },
    opponents,
    board: {
      flop: normalizeTextArray(boardRecord.flop),
      turn:
        typeof boardRecord.turn === "string" ? boardRecord.turn.trim() : "",
      river:
        typeof boardRecord.river === "string" ? boardRecord.river.trim() : "",
    },
    keyActions: normalizeTextArray(data.keyActions),
    missingDetails: normalizeTextArray(data.missingDetails),
    confidence:
      data.confidence === "high" ||
      data.confidence === "medium" ||
      data.confidence === "low"
        ? data.confidence
        : "low",
  };
}

function detectHeroPosition(rawText: string) {
  const match = rawText.match(
    /\b(UTG\+?1?|UTG|EP|MP|LJ|HJ|CO|BTN|BU|SB|BB)\b/i,
  );

  if (!match) {
    return "";
  }

  const normalized = match[1].toUpperCase();
  return normalized === "BU" ? "BTN" : normalized;
}

function detectHeroCards(rawText: string) {
  const explicitCardMatch = rawText.match(
    /\b([AKQJT2-9][shdc])\s+([AKQJT2-9][shdc])\b/i,
  );

  if (explicitCardMatch) {
    return [
      normalizeCard(explicitCardMatch[1] ?? ""),
      normalizeCard(explicitCardMatch[2] ?? ""),
    ];
  }

  const shorthandMatch = rawText.match(/\b(AA|KK|QQ|JJ|TT|99|88|77|66|55|44|33|22|AK|AQ|AJ|AT|A9|A8|A7|A6|A5|A4|A3|A2|KQ|KJ|KT|QJ|QT|JT|T9|98|87|76|65|54)\b/i);

  if (!shorthandMatch) {
    return [];
  }

  return shorthandMatch[1]!.toUpperCase().split("");
}

function detectBoardCards(rawText: string) {
  const flopMatch = rawText.match(
    /\bflop\b[^A-Za-z0-9]{0,12}([AKQJT2-9][shdc])\s+([AKQJT2-9][shdc])\s+([AKQJT2-9][shdc])/i,
  );
  const turnMatch = rawText.match(
    /\bturn\b[^A-Za-z0-9]{0,12}([AKQJT2-9][shdc])/i,
  );
  const riverMatch = rawText.match(
    /\briver\b[^A-Za-z0-9]{0,12}([AKQJT2-9][shdc])/i,
  );

  return {
    flop: uniqueStrings(
      flopMatch
        ? [
            normalizeCard(flopMatch[1] ?? ""),
            normalizeCard(flopMatch[2] ?? ""),
            normalizeCard(flopMatch[3] ?? ""),
          ]
        : [],
    ),
    turn: normalizeCard(turnMatch?.[1] ?? ""),
    river: normalizeCard(riverMatch?.[1] ?? ""),
  };
}

function detectActionTags(rawText: string) {
  const normalized = rawText.toLowerCase();
  const tags = [
    ["Open Raise", /\b(open|raise|raises|opened)\b/],
    ["3-Bet", /\b3-bet|three-bet|reraised|re-raised|reraise\b/],
    ["Call", /\bcall|called|calls\b/],
    ["Fold", /\bfold|folded|folds\b/],
    ["Bet", /\bbet|bets|barrel|c-bet\b/],
    ["Check", /\bcheck|checks|checked\b/],
    ["All In", /\ball[- ]?in|jam|shove\b/],
  ] as const;

  return tags
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([label]) => label)
    .slice(0, 6);
}

function detectStreetLabel(rawText: string) {
  const normalized = rawText.toLowerCase();

  if (/\briver\b/.test(normalized)) {
    return "River";
  }

  if (/\bturn\b/.test(normalized)) {
    return "Turn";
  }

  if (/\bflop\b/.test(normalized)) {
    return "Flop";
  }

  return "Preflop";
}

function buildManualSummary(streetLabel: string, hasActions: boolean) {
  if (streetLabel === "River") {
    return "Manual river note saved. Unlock AI analysis when you want a sharper final street review.";
  }

  if (streetLabel === "Turn") {
    return "Manual turn note saved. The spot is ready for deeper AI analysis whenever you need it.";
  }

  if (streetLabel === "Flop") {
    return "Manual postflop note saved. Add premium analysis if you want range and sizing feedback.";
  }

  if (hasActions) {
    return "Manual preflop note saved. You can analyze it later without re-entering the hand.";
  }

  return "Manual hand note saved. Add more action detail now, or run AI analysis later.";
}

function buildManualTitle(
  streetLabel: string,
  position: string,
  heroCards: string[],
) {
  const fragments = [streetLabel];

  if (position) {
    fragments.push(position);
  }

  if (heroCards.length > 0) {
    fragments.push(heroCards.join(" "));
  }

  return `Manual Note • ${fragments.join(" • ")}`;
}

function buildManualMissingDetails(rawText: string, position: string, heroCards: string[]) {
  const missing: string[] = [];

  if (!heroCards.length) {
    missing.push("Hero hole cards were not clearly entered.");
  }

  if (!position) {
    missing.push("Hero position is still missing.");
  }

  if (!/\b(flop|turn|river)\b/i.test(rawText)) {
    missing.push("Board runout was not specified.");
  }

  if (!/\b(raise|bet|call|check|fold|all[- ]?in|jam|shove)\b/i.test(rawText)) {
    missing.push("Key actions were not clearly described.");
  }

  return missing.slice(0, 4);
}

function buildManualUpload(rawInput: string): ParsedHandUpload {
  const position = detectHeroPosition(rawInput);
  const heroCards = detectHeroCards(rawInput);
  const board = detectBoardCards(rawInput);
  const keyActions = detectActionTags(rawInput);
  const streetLabel = detectStreetLabel(rawInput);
  const missingDetails = buildManualMissingDetails(rawInput, position, heroCards);

  return {
    valid: true,
    error: "",
    sourceText: rawInput,
    title: buildManualTitle(streetLabel, position, heroCards),
    normalizedHandText: rawInput,
    quickSummary: buildManualSummary(streetLabel, keyActions.length > 0),
    coachAdvice:
      "This manual upload is saved without using the AI API, so it stays on the free tier. When you want structured poker feedback, run premium AI analysis on this saved hand.",
    hero: {
      position,
      cards: heroCards,
      stackBb: 0,
    },
    opponents: [],
    board,
    keyActions,
    missingDetails,
    confidence:
      heroCards.length > 0 && keyActions.length > 0 ? "medium" : "low",
  };
}

function normalizeManualCard(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed === "Unknown" || trimmed === "??") {
    return "Unknown";
  }

  return normalizeCard(trimmed);
}

function normalizeManualSetup(setup: ManualHandSetup): ManualHandSetup {
  return {
    buttonSeat: setup.buttonSeat,
    actionNotes: setup.actionNotes.trim(),
    hero: {
      seat: setup.hero.seat,
      name: setup.hero.name.trim() || "Hero",
      stackBb: Math.max(0, Number(setup.hero.stackBb) || 0),
      holeCards: {
        first: normalizeManualCard(setup.hero.holeCards.first),
        second: normalizeManualCard(setup.hero.holeCards.second),
      },
    },
    opponents: setup.opponents.map((opponent, index) => ({
      seat: opponent.seat,
      name: opponent.name.trim() || `Villain ${index + 1}`,
      stackBb: Math.max(0, Number(opponent.stackBb) || 0),
      holeCards: {
        first: normalizeManualCard(opponent.holeCards.first),
        second: normalizeManualCard(opponent.holeCards.second),
      },
      unknownCards: Boolean(opponent.unknownCards),
    })),
  };
}

function normalizeReplayActionType(value: string) {
  if (
    value === "Fold" ||
    value === "Check" ||
    value === "Call" ||
    value === "Bet" ||
    value === "Raise" ||
    value === "All-In" ||
    value === "Limp"
  ) {
    return value;
  }

  throw new Error("Manual replay action type is invalid.");
}

function normalizeManualReplay(
  replay: ManualReplayData,
  setup: ManualHandSetup,
): ManualReplayData {
  const validSeats = new Set([setup.hero.seat, ...setup.opponents.map((opponent) => opponent.seat)]);
  const players = Array.isArray(replay.finalState?.players)
    ? replay.finalState.players
    : [];
  const board = Array.isArray(replay.finalState?.board)
    ? replay.finalState.board.map((card) => normalizeManualCard(String(card || ""))).filter(Boolean)
    : [];

  return {
    actionHistory: Array.isArray(replay.actionHistory)
      ? replay.actionHistory
          .map((action, index) => {
            if (!validSeats.has(action.seat)) {
              throw new Error("Manual replay contains an unknown seat.");
            }

            return {
              street:
                action.street === "preflop" ||
                action.street === "flop" ||
                action.street === "turn" ||
                action.street === "river"
                  ? action.street
                  : "preflop",
              seat: action.seat,
              action: normalizeReplayActionType(String(action.action || "")),
              amount: Number.isFinite(action.amount) ? action.amount : undefined,
              to: Number.isFinite(action.to) ? action.to : undefined,
              timestamp: Number.isFinite(action.timestamp) ? action.timestamp : index * 500,
            };
          })
      : [],
    finalState: {
      street:
        replay.finalState?.street === "preflop" ||
        replay.finalState?.street === "flop" ||
        replay.finalState?.street === "turn" ||
        replay.finalState?.street === "river" ||
        replay.finalState?.street === "showdown" ||
        replay.finalState?.street === "finished"
          ? replay.finalState.street
          : "preflop",
      potBb: normalizeNumber(replay.finalState?.potBb),
      currentBetBb: normalizeNumber(replay.finalState?.currentBetBb),
      lastFullRaiseBb: normalizeNumber(replay.finalState?.lastFullRaiseBb),
      lastRaiseSizeBb: normalizeNumber(replay.finalState?.lastRaiseSizeBb),
      toActQueue: Array.isArray(replay.finalState?.toActQueue)
        ? replay.finalState.toActQueue.filter((seat) => validSeats.has(seat))
        : [],
      players: players
        .map((player) => ({
          seat: validSeats.has(player.seat) ? player.seat : setup.hero.seat,
          name: typeof player.name === "string" ? player.name.trim() : "",
          style: typeof player.style === "string" ? player.style.trim() : "",
          stackBb: normalizeNumber(player.stackBb),
          committedThisStreetBb: normalizeNumber(player.committedThisStreetBb),
          holeCards:
            player.holeCards &&
            typeof player.holeCards === "object" &&
            typeof player.holeCards.first === "string" &&
            typeof player.holeCards.second === "string"
              ? {
                  first: normalizeManualCard(player.holeCards.first),
                  second: normalizeManualCard(player.holeCards.second),
                }
              : undefined,
          inHand: Boolean(player.inHand),
          allIn: Boolean(player.allIn),
          isHero: Boolean(player.isHero),
          hasActedThisRound: Boolean(player.hasActedThisRound),
        }))
        .slice(0, 6),
      board,
      finished: Boolean(replay.finalState?.finished),
      winnerSeat:
        replay.finalState?.winnerSeat && validSeats.has(replay.finalState.winnerSeat)
          ? replay.finalState.winnerSeat
          : undefined,
    },
    progressionText:
      typeof replay.progressionText === "string" ? replay.progressionText.trim() : "",
  };
}

function ensureManualSetup(setup: ManualHandSetup | null | undefined) {
  if (!setup) {
    throw new Error("Add the hand setup before saving.");
  }

  const normalized = normalizeManualSetup(setup);

  if (!normalized.hero.seat) {
    throw new Error("Choose Hero's seat first.");
  }

  if (normalized.hero.stackBb <= 0) {
    throw new Error("Hero stack must be greater than zero.");
  }

  if (!normalized.hero.holeCards.first || !normalized.hero.holeCards.second) {
    throw new Error("Hero needs two hole cards.");
  }

  if (normalized.opponents.length === 0) {
    throw new Error("Add at least one opponent.");
  }

  return normalized;
}

function ensureManualReplay(
  replay: ManualReplayData | null | undefined,
  setup: ManualHandSetup,
) {
  if (!replay) {
    throw new Error("Replay actions are missing.");
  }

  const normalized = normalizeManualReplay(replay, setup);

  if (!normalized.progressionText) {
    throw new Error("Replay text is missing.");
  }

  if (!normalized.finalState.players.length) {
    throw new Error("Replay player state is missing.");
  }

  return normalized;
}

function buildManualRawInputFromSetup(setup: ManualHandSetup) {
  const heroCards = `${setup.hero.holeCards.first} ${setup.hero.holeCards.second}`;
  const heroLine = `Hero ${setup.hero.name} sits ${setup.hero.seat} with ${heroCards} for ${setup.hero.stackBb}bb.`;
  const buttonLine = `Button starts at ${setup.buttonSeat}.`;
  const opponentLines = setup.opponents.map((opponent) => {
    const cards = opponent.unknownCards
      ? "unknown cards"
      : `${opponent.holeCards.first} ${opponent.holeCards.second}`;

    return `${opponent.name} sits ${opponent.seat} with ${cards} for ${opponent.stackBb}bb.`;
  });
  const notesLine = setup.actionNotes
    ? `Action notes: ${setup.actionNotes}`
    : "Action notes: setup saved, action line still to be added.";

  return [heroLine, buttonLine, ...opponentLines, notesLine].join("\n");
}

function buildManualUploadFromSetup(
  setup: ManualHandSetup,
  replay?: ManualReplayData | null,
): ParsedHandUpload {
  const heroCards = [
    setup.hero.holeCards.first,
    setup.hero.holeCards.second,
  ].filter((card) => card && card !== "Unknown");
  const board = replay
    ? {
        flop: replay.finalState.board.slice(0, 3),
        turn: replay.finalState.board[3] || "",
        river: replay.finalState.board[4] || "",
      }
    : detectBoardCards(setup.actionNotes);
  const keyActions = replay
    ? uniqueStrings(replay.actionHistory.map((action) => action.action)).slice(0, 6)
    : detectActionTags(setup.actionNotes);
  const rawInput = replay?.progressionText || buildManualRawInputFromSetup(setup);
  const missingDetails: string[] = [];

  if (!replay && !setup.actionNotes.trim()) {
    missingDetails.push("Action line is still missing.");
  }

  if (!board.flop.length && !board.turn && !board.river) {
    missingDetails.push("Board runout has not been entered yet.");
  }

  if (!keyActions.length) {
    missingDetails.push("No clear betting sequence was recorded yet.");
  }

  return {
    valid: true,
    error: "",
    sourceText: rawInput,
    title: `Manual Replay • ${setup.hero.seat} • ${heroCards.join(" ") || setup.hero.name}`,
    normalizedHandText: rawInput,
    quickSummary: replay
      ? `${setup.hero.name} starts from ${setup.hero.seat} with ${heroCards.join(" ") || "a saved range"} and reaches a ${replay.finalState.street} pot of ${replay.finalState.potBb}bb.`
      : `${setup.hero.name} starts from ${setup.hero.seat} with ${heroCards.join(" ") || "a saved range"} against ${setup.opponents.length} opponent${setup.opponents.length === 1 ? "" : "s"}.`,
    coachAdvice:
      replay
        ? "Manual replay saved. You can reopen the full action flow anytime, or run Pro analysis when you want AI feedback."
        : "Manual setup saved. Add action notes whenever you want, or run Pro analysis later for the full review.",
    hero: {
      position: setup.hero.seat,
      cards: heroCards,
      stackBb: setup.hero.stackBb,
    },
    opponents: setup.opponents.map((opponent) => ({
      label: opponent.name,
      position: opponent.seat,
      stackBb: opponent.stackBb,
    })),
    board,
    keyActions,
    missingDetails,
    confidence: replay
      ? replay.actionHistory.length >= 3
        ? "high"
        : "medium"
      : setup.actionNotes.trim()
        ? "medium"
        : "low",
  };
}

function buildExtractionInstructions(source: UploadSource) {
  return [
    "You are the intake parser for a poker hand review web app.",
    "Turn the user's hand description, voice transcript, or screenshot into a clean structured hand summary.",
    "Be conservative. Never invent cards, actions, stacks, or board cards that are not reasonably supported by the input.",
    "If there is not enough poker information, set valid=false and explain the gap in error.",
    "Write normalizedHandText as a compact English hand history, organized by street when possible.",
    "Write quickSummary as one sentence and coachAdvice as one or two actionable sentences.",
    "Use sourceText for the cleaned transcript / OCR / manual note.",
    "Use empty strings, empty arrays, or 0 for unknown values.",
    "confidence should be high only when hero cards and at least one meaningful action or board detail are clear.",
    `The current upload source is ${source}.`,
  ].join(" ");
}

async function parseModelJsonResponse(
  source: UploadSource,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: DEFAULT_TEXT_MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "poker_hand_upload",
        strict: true,
        schema: HAND_UPLOAD_RESPONSE_SCHEMA,
      },
    },
    messages: [
      {
        role: "developer",
        content: buildExtractionInstructions(source),
      },
      ...messages,
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error("The model returned an empty response.");
  }

  return normalizeHandUploadResult(JSON.parse(stripCodeFence(rawContent)));
}

async function parseHandFromText(source: UploadSource, rawText: string) {
  return parseModelJsonResponse(source, [
    {
      role: "user",
      content: rawText,
    },
  ]);
}

function buildAnalysisInstructions() {
  return [
    "You are the premium poker coach inside a Texas Hold'em review app.",
    "Analyze only what is supported by the saved hand note and extracted details.",
    "Do not invent exact ranges, solver frequencies, or hidden cards.",
    "If information is missing, say so in a calm and practical way.",
    "summary should be a compact overall read of the hand.",
    "streets should include only the relevant streets in order.",
    "Each street highlight should explain what happened.",
    "Each street suggestion should say what to adjust next time.",
    "gtoTips should contain at most 4 concise strategy reminders.",
    "encouragement should end on a constructive note, not hype.",
  ].join(" ");
}

async function analyzeSavedHand(item: SavedHandUpload) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: DEFAULT_ANALYSIS_MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "poker_hand_analysis",
        strict: true,
        schema: HAND_ANALYSIS_RESPONSE_SCHEMA,
      },
    },
    messages: [
      {
        role: "developer",
        content: buildAnalysisInstructions(),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            source: item.source,
            title: item.title,
            rawInput: item.rawInput,
            normalizedHandText: item.normalizedHandText,
            quickSummary: item.quickSummary,
            hero: item.hero,
            opponents: item.opponents,
            board: item.board,
            keyActions: item.keyActions,
            missingDetails: item.missingDetails,
            manualReplay: item.manualReplay
              ? {
                  progressionText: item.manualReplay.progressionText,
                  finalState: item.manualReplay.finalState,
                  actionHistory: item.manualReplay.actionHistory,
                }
              : null,
          },
          null,
          2,
        ),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error("The model returned an empty analysis.");
  }

  const normalized = normalizeAnalysisResult(JSON.parse(stripCodeFence(rawContent)));

  return {
    ...normalized,
    model: DEFAULT_ANALYSIS_MODEL,
    createdAtMs: Date.now(),
  } satisfies SavedHandAnalysis;
}

async function parseHandFromImage(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
) {
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  return parseModelJsonResponse("screenshot", [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Extract the poker hand from this screenshot. File name: ${originalName}.`,
        },
        {
          type: "image_url",
          image_url: {
            url: dataUrl,
            detail: "high",
          },
        },
      ],
    },
  ]);
}

async function transcribeAudio(buffer: Buffer, originalName: string, mimeType: string) {
  const client = getOpenAIClient();
  const file = await toFile(buffer, originalName, { type: mimeType });
  const transcription = await client.audio.transcriptions.create({
    file,
    model: DEFAULT_TRANSCRIPTION_MODEL,
  });

  return transcription.text.trim();
}

function normalizeFileName(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop() ?? "" : "";
  const baseName = parts.join(".") || "upload";
  const safeBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8);

  return safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
}

function buildStoragePath(viewerId: string, source: UploadSource, fileName: string) {
  return `hand-uploads/${viewerId}/${source}/${Date.now()}-${normalizeFileName(fileName)}`;
}

async function uploadMedia(
  viewerId: string,
  source: UploadSource,
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<StoredUploadMedia> {
  const bucket = getFirebaseAdminBucket();
  const storagePath = buildStoragePath(viewerId, source, originalName);
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
    },
  });

  return {
    storagePath,
    contentType: mimeType,
    originalName,
    bytes: buffer.byteLength,
  };
}

function serializeSavedUpload(
  id: string,
  viewerId: string,
  source: UploadSource,
  rawInput: string,
  createdAtMs: number,
  media: StoredUploadMedia | null,
  parsed: ParsedHandUpload,
  manualSetup?: ManualHandSetup | null,
  manualReplay?: ManualReplayData | null,
): SavedHandUpload {
  return {
    id,
    viewerId,
    source,
    rawInput,
    createdAtMs,
    media,
    manualSetup: manualSetup || null,
    manualReplay: manualReplay || null,
    analysis: null,
    ...parsed,
  };
}

async function saveUploadRecord(
  viewerId: string,
  source: UploadSource,
  rawInput: string,
  parsed: ParsedHandUpload,
  media: StoredUploadMedia | null,
  manualSetup?: ManualHandSetup | null,
  manualReplay?: ManualReplayData | null,
) {
  const db = getFirebaseAdminDb();
  const sanitizedViewerId = sanitizeViewerId(viewerId);
  const createdAtMs = Date.now();
  const docRef = db
    .collection("hand_uploads")
    .doc(sanitizedViewerId)
    .collection("entries")
    .doc();

  const payload = serializeSavedUpload(
    docRef.id,
    sanitizedViewerId,
    source,
    rawInput,
    createdAtMs,
    media,
    parsed,
    manualSetup,
    manualReplay,
  );

  await docRef.set(payload);

  return payload;
}

function uploadEntryDoc(viewerId: string, uploadId: string) {
  return getFirebaseAdminDb()
    .collection("hand_uploads")
    .doc(sanitizeViewerId(viewerId))
    .collection("entries")
    .doc(uploadId.trim());
}

function ensureManualText(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("Add a hand description before uploading.");
  }

  if (trimmed.length > MAX_MANUAL_TEXT_LENGTH) {
    throw new Error("Manual notes are too long. Keep them under 6,000 characters.");
  }

  return trimmed;
}

function ensureFileSize(buffer: Buffer, limit: number, label: string) {
  if (buffer.byteLength > limit) {
    throw new Error(`${label} is too large for this upload flow.`);
  }
}

function ensureValidExtraction(parsed: ParsedHandUpload) {
  if (!parsed.valid) {
    throw new Error(parsed.error || "The upload did not contain enough poker detail.");
  }

  if (!parsed.normalizedHandText) {
    throw new Error("The model did not return a usable hand summary.");
  }
}

export async function processManualUpload(
  viewerId: string,
  handText: string,
  manualSetup?: ManualHandSetup | null,
  manualReplay?: ManualReplayData | null,
) {
  if (manualSetup) {
    const normalizedSetup = ensureManualSetup(manualSetup);
    const normalizedReplay = manualReplay
      ? ensureManualReplay(manualReplay, normalizedSetup)
      : null;
    const rawInput =
      normalizedReplay?.progressionText || buildManualRawInputFromSetup(normalizedSetup);
    const parsed = buildManualUploadFromSetup(normalizedSetup, normalizedReplay);

    return saveUploadRecord(
      viewerId,
      "manual",
      rawInput,
      parsed,
      null,
      normalizedSetup,
      normalizedReplay,
    );
  }

  const rawInput = ensureManualText(handText);
  const parsed = buildManualUpload(rawInput);

  return saveUploadRecord(viewerId, "manual", rawInput, parsed, null, null);
}

export async function processAudioUpload(
  viewerId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
) {
  ensureFileSize(buffer, MAX_AUDIO_BYTES, "Audio file");

  const transcript = await transcribeAudio(buffer, originalName, mimeType);
  const parsed = await parseHandFromText("voice", transcript);

  ensureValidExtraction(parsed);

  const media = await uploadMedia(viewerId, "voice", buffer, mimeType, originalName);

  return saveUploadRecord(viewerId, "voice", transcript, parsed, media);
}

export async function processScreenshotUpload(
  viewerId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
) {
  ensureFileSize(buffer, MAX_IMAGE_BYTES, "Image file");

  const parsed = await parseHandFromImage(buffer, mimeType, originalName);

  ensureValidExtraction(parsed);

  const media = await uploadMedia(
    viewerId,
    "screenshot",
    buffer,
    mimeType,
    originalName,
  );

  return saveUploadRecord(
    viewerId,
    "screenshot",
    parsed.sourceText || originalName,
    parsed,
    media,
  );
}

export async function getViewerUpload(viewerId: string, uploadId: string) {
  const doc = await uploadEntryDoc(viewerId, uploadId).get();

  if (!doc.exists) {
    throw new Error("Hand upload not found.");
  }

  return doc.data() as SavedHandUpload;
}

export async function deleteViewerUpload(viewerId: string, uploadId: string) {
  const entry = await getViewerUpload(viewerId, uploadId);
  await uploadEntryDoc(viewerId, uploadId).delete();

  if (entry.media?.storagePath) {
    try {
      await getFirebaseAdminBucket().file(entry.media.storagePath).delete({
        ignoreNotFound: true,
      });
    } catch {
      // The hand record is already gone; media cleanup can fail quietly.
    }
  }
}

export async function analyzeViewerUpload(
  viewerId: string,
  uploadId: string,
  options?: {
    force?: boolean;
  },
) {
  const docRef = uploadEntryDoc(viewerId, uploadId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error("Hand upload not found.");
  }

  const item = snapshot.data() as SavedHandUpload;

  if (item.analysis && !options?.force) {
    return item;
  }

  const analysis = await analyzeSavedHand(item);
  const nextItem = {
    ...item,
    analysis,
  } satisfies SavedHandUpload;

  await docRef.set(nextItem, { merge: true });
  return nextItem;
}

export async function listViewerUploads(viewerId: string, limit = 12) {
  const db = getFirebaseAdminDb();
  const sanitizedViewerId = sanitizeViewerId(viewerId);
  const snapshot = await db
    .collection("hand_uploads")
    .doc(sanitizedViewerId)
    .collection("entries")
    .orderBy("createdAtMs", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as SavedHandUpload);
}
