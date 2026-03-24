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
import { buildAllInHandRecord, getAllInHandRecord } from "@/lib/allin-hand-record";
import { generateReplayLog } from "@/lib/replay/hand-log-generator";

const DEFAULT_TEXT_MODEL = process.env.OPENAI_HAND_UPLOAD_MODEL || "gpt-4.1-mini";
const DEFAULT_TRANSCRIPTION_MODEL =
  process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const DEFAULT_ANALYSIS_MODEL =
  process.env.OPENAI_HAND_ANALYSIS_MODEL || "gpt-5.3-chat-latest";

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
  required: ["coach_summary", "villain_reading", "street_details", "gto_tips"],
  properties: {
    coach_summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "score",
        "title",
        "emotional_feedback",
        "main_feedback",
        "is_tilt_detected",
      ],
      properties: {
        score: { type: "number" },
        title: { type: "string" },
        emotional_feedback: { type: "string" },
        main_feedback: { type: "string" },
        is_tilt_detected: { type: "boolean" },
      },
    },
    villain_reading: {
      type: "object",
      additionalProperties: false,
      required: ["range_category", "analysis"],
      properties: {
        range_category: { type: "string" },
        analysis: { type: "string" },
      },
    },
    street_details: {
      type: "object",
      additionalProperties: false,
      required: ["preflop", "flop", "turn", "river"],
      properties: {
        preflop: {
          type: "object",
          additionalProperties: false,
          required: ["rating", "markdown_content"],
          properties: {
            rating: { type: "string" },
            markdown_content: { type: "string" },
          },
        },
        flop: {
          type: "object",
          additionalProperties: false,
          required: ["rating", "markdown_content"],
          properties: {
            rating: { type: "string" },
            markdown_content: { type: "string" },
          },
        },
        turn: {
          type: "object",
          additionalProperties: false,
          required: ["rating", "markdown_content"],
          properties: {
            rating: { type: "string" },
            markdown_content: { type: "string" },
          },
        },
        river: {
          type: "object",
          additionalProperties: false,
          required: ["rating", "markdown_content"],
          properties: {
            rating: { type: "string" },
            markdown_content: { type: "string" },
          },
        },
      },
    },
    gto_tips: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const IMPORTED_REPLAY_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "hero",
    "opponents",
    "buttonSeat",
    "actions",
    "board",
    "winnerSeat",
    "potBb",
  ],
  properties: {
    hero: {
      type: "object",
      additionalProperties: false,
      required: ["seat", "name", "stackBb", "holeCards"],
      properties: {
        seat: { type: "string" },
        name: { type: "string" },
        stackBb: { type: "number" },
        holeCards: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    opponents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["seat", "name", "stackBb", "holeCards", "unknownCards"],
        properties: {
          seat: { type: "string" },
          name: { type: "string" },
          stackBb: { type: "number" },
          holeCards: {
            type: "array",
            items: { type: "string" },
          },
          unknownCards: { type: "boolean" },
        },
      },
    },
    buttonSeat: { type: "string" },
    actions: {
      type: "object",
      additionalProperties: false,
      required: ["preflop", "flop", "turn", "river"],
      properties: {
        preflop: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["seat", "action", "amount", "to"],
            properties: {
              seat: { type: "string" },
              action: { type: "string" },
              amount: { type: "number" },
              to: { type: "number" },
            },
          },
        },
        flop: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["seat", "action", "amount", "to"],
            properties: {
              seat: { type: "string" },
              action: { type: "string" },
              amount: { type: "number" },
              to: { type: "number" },
            },
          },
        },
        turn: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["seat", "action", "amount", "to"],
            properties: {
              seat: { type: "string" },
              action: { type: "string" },
              amount: { type: "number" },
              to: { type: "number" },
            },
          },
        },
        river: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["seat", "action", "amount", "to"],
            properties: {
              seat: { type: "string" },
              action: { type: "string" },
              amount: { type: "number" },
              to: { type: "number" },
            },
          },
        },
      },
    },
    board: {
      type: "object",
      additionalProperties: false,
      required: ["flop", "turn", "river"],
      properties: {
        flop: {
          type: "array",
          items: { type: "string" },
        },
        turn: { type: "string" },
        river: { type: "string" },
      },
    },
    winnerSeat: { type: "string" },
    potBb: { type: "number" },
  },
} as const;

type ImportedReplaySnapshot = {
  hero: {
    seat: string;
    name: string;
    stackBb: number;
    holeCards: string[];
  };
  opponents: Array<{
    seat: string;
    name: string;
    stackBb: number;
    holeCards: string[];
    unknownCards: boolean;
  }>;
  buttonSeat: string;
  actions: {
    preflop: Array<{ seat: string; action: string; amount: number; to: number }>;
    flop: Array<{ seat: string; action: string; amount: number; to: number }>;
    turn: Array<{ seat: string; action: string; amount: number; to: number }>;
    river: Array<{ seat: string; action: string; amount: number; to: number }>;
  };
  board: {
    flop: string[];
    turn: string;
    river: string;
  };
  winnerSeat: string;
  potBb: number;
};

function isImportedUploadSource(
  source: UploadSource,
): source is Extract<UploadSource, "voice" | "screenshot"> {
  return source === "voice" || source === "screenshot";
}

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

const RANK_WORD_MAP: Record<string, string> = {
  ace: "A",
  aces: "A",
  king: "K",
  kings: "K",
  queen: "Q",
  queens: "Q",
  jack: "J",
  jacks: "J",
  ten: "T",
  tens: "T",
  nine: "9",
  nines: "9",
  eight: "8",
  eights: "8",
  seven: "7",
  sevens: "7",
  six: "6",
  sixes: "6",
  five: "5",
  fives: "5",
  four: "4",
  fours: "4",
  three: "3",
  threes: "3",
  two: "2",
  twos: "2",
  a: "A",
  k: "K",
  q: "Q",
  j: "J",
  t: "T",
  "10": "T",
  "9": "9",
  "8": "8",
  "7": "7",
  "6": "6",
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
};

function normalizeRankToken(value: string) {
  const normalized = `${value || ""}`.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return RANK_WORD_MAP[normalized] || "";
}

function inferOffsuitHoleCards(firstRank: string, secondRank: string) {
  if (!firstRank || !secondRank) {
    return [];
  }

  if (firstRank === secondRank) {
    return [`${firstRank}s`, `${secondRank}h`];
  }

  return [`${firstRank}s`, `${secondRank}h`];
}

function inferRainbowBoardCards(ranks: string[]) {
  const suits = ["d", "c", "s", "h", "d"];
  return ranks
    .filter(Boolean)
    .map((rank, index) => `${rank}${suits[index] || "d"}`);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function hasMagicBytes(
  buffer: Buffer,
  offset: number,
  bytes: number[],
) {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function detectAudioFormat(buffer: Buffer) {
  if (buffer.byteLength >= 4 && hasMagicBytes(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    return {
      mimeType: "audio/webm",
      extension: "webm",
      label: "WebM audio",
    };
  }

  if (buffer.byteLength >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return {
      mimeType: "audio/ogg",
      extension: "ogg",
      label: "Ogg audio",
    };
  }

  if (
    buffer.byteLength >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return {
      mimeType: "audio/wav",
      extension: "wav",
      label: "WAV audio",
    };
  }

  if (
    buffer.byteLength >= 3 &&
    (buffer.subarray(0, 3).toString("ascii") === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))
  ) {
    return {
      mimeType: "audio/mpeg",
      extension: "mp3",
      label: "MP3 audio",
    };
  }

  if (
    buffer.byteLength >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp"
  ) {
    return {
      mimeType: "audio/mp4",
      extension: "m4a",
      label: "M4A audio",
    };
  }

  return null;
}

function detectImageFormat(buffer: Buffer) {
  if (
    buffer.byteLength >= 8 &&
    hasMagicBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return {
      mimeType: "image/png",
      extension: "png",
      label: "PNG image",
      supported: true,
    };
  }

  if (
    buffer.byteLength >= 3 &&
    hasMagicBytes(buffer, 0, [0xff, 0xd8, 0xff])
  ) {
    return {
      mimeType: "image/jpeg",
      extension: "jpg",
      label: "JPEG image",
      supported: true,
    };
  }

  if (
    buffer.byteLength >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return {
      mimeType: "image/webp",
      extension: "webp",
      label: "WebP image",
      supported: true,
    };
  }

  if (
    buffer.byteLength >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp"
  ) {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    const heifBrands = new Set([
      "heic",
      "heix",
      "hevc",
      "hevx",
      "mif1",
      "msf1",
    ]);

    if (heifBrands.has(brand)) {
      return {
        mimeType: "image/heic",
        extension: "heic",
        label: "HEIC image",
        supported: false,
      };
    }
  }

  return null;
}

function normalizeOpenAIAudioFile(
  buffer: Buffer,
  originalName: string,
) {
  const detected = detectAudioFormat(buffer);

  if (!detected) {
    throw new Error(
      "This audio format is not supported yet. Export it as WebM, WAV, MP3, or M4A first.",
    );
  }

  const baseName =
    originalName.replace(/\.[^.]+$/, "").trim() || `voice-note-${Date.now()}`;

  return {
    normalizedName: `${baseName}.${detected.extension}`,
    normalizedMimeType: detected.mimeType,
    detectedLabel: detected.label,
  };
}

function normalizeOpenAIImageFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
) {
  const detected = detectImageFormat(buffer);

  if (!detected) {
    return {
      normalizedName: originalName,
      normalizedMimeType: mimeType,
    };
  }

  if (!detected.supported) {
    throw new Error(
      "HEIC screenshots are not supported in this upload flow yet. Export the screenshot as JPG or PNG first.",
    );
  }

  const baseName =
    originalName.replace(/\.[^.]+$/, "").trim() || `hand-screenshot-${Date.now()}`;

  return {
    normalizedName: `${baseName}.${detected.extension}`,
    normalizedMimeType: detected.mimeType,
  };
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, stripUndefinedDeep(item)] as const)
        .filter(([, item]) => item !== undefined),
    ) as T;
  }

  return value;
}

function normalizeAnalysisResult(payload: unknown): Omit<SavedHandAnalysis, "createdAtMs" | "model"> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Model analysis response is not a JSON object.");
  }

  const data = payload as Record<string, unknown>;
  const coachSummary =
    data.coach_summary && typeof data.coach_summary === "object"
      ? (data.coach_summary as Record<string, unknown>)
      : {};
  const villainReading =
    data.villain_reading && typeof data.villain_reading === "object"
      ? (data.villain_reading as Record<string, unknown>)
      : {};
  const streetDetails =
    data.street_details && typeof data.street_details === "object"
      ? (data.street_details as Record<string, unknown>)
      : {};
  const streetOrder = ["preflop", "flop", "turn", "river"];
  const streets = streetOrder
    .map((streetKey) => {
      const streetDetail =
        streetDetails[streetKey] && typeof streetDetails[streetKey] === "object"
          ? (streetDetails[streetKey] as Record<string, unknown>)
          : {};
      const highlight = `${streetDetail.markdown_content || ""}`
        .replace(/\*\*/g, "")
        .trim();
      const rating = `${streetDetail.rating || ""}`.trim();
      const verdictMatch = highlight.match(/^(Correct|Incorrect)\./i);

      if (!highlight && !rating) {
        return null;
      }

      return {
        street: streetKey[0]!.toUpperCase() + streetKey.slice(1),
        highlight,
        suggestion: rating,
        rating,
        verdict: verdictMatch?.[1]
          ? `${verdictMatch[1][0]!.toUpperCase()}${verdictMatch[1].slice(1).toLowerCase()}`
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
        rating: string;
        verdict: string;
      } => Boolean(item),
    );

  return {
    summary:
      typeof coachSummary.main_feedback === "string"
        ? coachSummary.main_feedback.trim()
        : "",
    streets,
    gtoTips: normalizeTextArray(data.gto_tips).slice(0, 4),
    encouragement:
      typeof coachSummary.emotional_feedback === "string"
        ? coachSummary.emotional_feedback.trim()
        : "",
    score:
      typeof coachSummary.score === "number" && Number.isFinite(coachSummary.score)
        ? coachSummary.score
        : undefined,
    title:
      typeof coachSummary.title === "string"
        ? coachSummary.title.trim()
        : undefined,
    rangeCategory:
      typeof villainReading.range_category === "string"
        ? villainReading.range_category.trim()
        : undefined,
    villainReading:
      typeof villainReading.analysis === "string"
        ? villainReading.analysis.trim()
        : undefined,
    emotionalFeedback:
      typeof coachSummary.emotional_feedback === "string"
        ? coachSummary.emotional_feedback.trim()
        : undefined,
  };
}

function normalizeReplaySeat(value: string, fallback = "") {
  const normalized = `${value || ""}`.trim().toUpperCase();

  if (["UTG", "HJ", "CO", "BTN", "SB", "BB"].includes(normalized)) {
    return normalized;
  }

  if (normalized === "BU") {
    return "BTN";
  }

  if (normalized === "LJ") {
    return "HJ";
  }

  if (normalized === "MP" || normalized === "EP") {
    return "UTG";
  }

  return fallback;
}

function normalizeReplayAction(value: string) {
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

  if (normalized === "raise" || normalized === "raises" || normalized === "3-bet") {
    return "Raise";
  }

  if (
    normalized === "all-in" ||
    normalized === "all in" ||
    normalized === "jam" ||
    normalized === "shove" ||
    normalized === "shoves"
  ) {
    return "All-In";
  }

  if (normalized === "limp" || normalized === "limps") {
    return "Limp";
  }

  return "";
}

function expandSeatLabel(seat: string) {
  switch (seat) {
    case "UTG":
      return "under the gun";
    case "HJ":
      return "hijack";
    case "CO":
      return "cutoff";
    case "BTN":
      return "button";
    case "SB":
      return "small blind";
    case "BB":
      return "big blind";
    default:
      return "";
  }
}

function sanitizeImportedPlayerName(value: string, fallback: string) {
  const trimmed = `${value || ""}`.trim();

  if (!trimmed) {
    return fallback;
  }

  if (/^(hero|villain(\s+\d+)?)$/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.length > 20) {
    return fallback;
  }

  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return fallback;
  }

  if (trimmed.split(/\s+/).length > 2) {
    return fallback;
  }

  if (
    /(preflop|flop|turn|river|pot|action|check|call|raise|bet|fold|all-?in|button|blind)/i.test(
      trimmed,
    )
  ) {
    return fallback;
  }

  return trimmed;
}

function inferReplayButtonSeat(
  heroSeat: string,
  opponents: Array<{ seat: string }>,
) {
  if (heroSeat === "BTN" || opponents.some((player) => player.seat === "BTN")) {
    return "BTN";
  }

  if (
    heroSeat === "SB" &&
    opponents.length === 1 &&
    opponents[0]?.seat === "BB"
  ) {
    return "SB";
  }

  return heroSeat || "BTN";
}

function detectMentionedReplaySeats(rawText: string) {
  const matches = Array.from(
    rawText.matchAll(
      /\b(UTG\+?1?|UTG|HJ|CO|BTN|BU|SB|BB|small blind|big blind|button|cutoff|hijack)\b/gi,
    ),
  );

  return uniqueStrings(
    matches
      .map((match) => normalizeReplaySeat(match[1] || ""))
      .filter(Boolean),
  );
}

function buildSeatAliases(
  heroSeat: string,
  opponents: Array<{ seat: string; name: string }>,
) {
  const entries = [
    {
      seat: heroSeat,
      aliases: [
        "hero",
        heroSeat,
        expandSeatLabel(heroSeat),
      ],
    },
    ...opponents.map((opponent, index) => ({
      seat: opponent.seat,
      aliases: [
        opponent.name,
        opponent.seat,
        expandSeatLabel(opponent.seat),
        index === 0 ? "villain" : `villain ${index + 1}`,
      ],
    })),
  ];

  return entries.map((entry) => ({
    seat: entry.seat,
    aliases: uniqueStrings(
      entry.aliases
        .map((alias) => `${alias || ""}`.trim().toLowerCase())
        .filter(Boolean),
    ),
  }));
}

function detectActionAmount(fragment: string) {
  const toMatch = fragment.match(/to\s+(\d+(?:\.\d+)?)\s*(?:bb|big blind|big blinds)?/i);

  if (toMatch?.[1]) {
    return {
      amount: Number.parseFloat(toMatch[1]),
      to: Number.parseFloat(toMatch[1]),
    };
  }

  const forMatch = fragment.match(/for\s+(\d+(?:\.\d+)?)\s*(?:bb|big blind|big blinds)?/i);

  if (forMatch?.[1]) {
    return {
      amount: Number.parseFloat(forMatch[1]),
      to: 0,
    };
  }

  const plainMatch = fragment.match(/(\d+(?:\.\d+)?)\s*(?:bb|big blind|big blinds)/i);

  if (plainMatch?.[1]) {
    return {
      amount: Number.parseFloat(plainMatch[1]),
      to: 0,
    };
  }

  return {
    amount: 0,
    to: 0,
  };
}

function inferActionType(fragment: string) {
  if (/\b(check|checks|checked)\b/i.test(fragment)) {
    return "Check";
  }

  if (/\b(fold|folds|folded)\b/i.test(fragment)) {
    return "Fold";
  }

  if (/\b(call|calls|called)\b/i.test(fragment)) {
    return "Call";
  }

  if (/\b(all[\s-]?in|jam|jams|shove|shoves|shoved)\b/i.test(fragment)) {
    return "All-In";
  }

  if (/\b(3-bet|three-bet|reraises|re-raises|reraised|re-raised|raises|raise)\b/i.test(fragment)) {
    return "Raise";
  }

  if (/\b(limp|limps|limped)\b/i.test(fragment)) {
    return "Limp";
  }

  if (/\b(bet|bets|betted)\b/i.test(fragment)) {
    return "Bet";
  }

  return "";
}

function inferActionsFromHandText(
  rawText: string,
  heroSeat: string,
  opponents: Array<{ seat: string; name: string }>,
): ImportedReplaySnapshot["actions"] {
  const actionGroups: ImportedReplaySnapshot["actions"] = {
    preflop: [],
    flop: [],
    turn: [],
    river: [],
  };
  const aliases = buildSeatAliases(heroSeat, opponents);
  const chunks = rawText
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+|,\s+| then /i))
    .map((line) => line.trim())
    .filter(Boolean);
  let currentStreet: keyof ImportedReplaySnapshot["actions"] = "preflop";

  for (const chunk of chunks) {
    const lowerChunk = chunk.toLowerCase();

    if (/\bpreflop\b/.test(lowerChunk)) {
      currentStreet = "preflop";
    } else if (/\bflop\b/.test(lowerChunk)) {
      currentStreet = "flop";
    } else if (/\bturn\b/.test(lowerChunk)) {
      currentStreet = "turn";
    } else if (/\briver\b/.test(lowerChunk)) {
      currentStreet = "river";
    }

    const actionType = inferActionType(chunk);

    if (!actionType) {
      continue;
    }

    const matchedSeat = aliases.find((entry) =>
      entry.aliases.some((alias) => lowerChunk.includes(alias)),
    )?.seat;

    if (!matchedSeat) {
      continue;
    }

    const { amount, to } = detectActionAmount(chunk);
    actionGroups[currentStreet].push({
      seat: matchedSeat,
      action: actionType,
      amount,
      to,
    });
  }

  return actionGroups;
}

function inferWinnerSeatFromText(
  rawText: string,
  heroSeat: string,
  opponents: Array<{ seat: string; name: string }>,
) {
  const lower = rawText.toLowerCase();

  if (/\b(hero|you)\s+(wins|won|takes)\b/i.test(lower)) {
    return heroSeat;
  }

  for (const opponent of opponents) {
    const aliases = uniqueStrings([
      opponent.name.toLowerCase(),
      opponent.seat.toLowerCase(),
      expandSeatLabel(opponent.seat).toLowerCase(),
      "villain",
    ]).filter(Boolean);

    if (
      aliases.some((alias) =>
        new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b.*\\b(wins|won|takes)\\b`, "i").test(lower),
      )
    ) {
      return opponent.seat;
    }
  }

  return "";
}

function inferPotBbFromText(rawText: string) {
  const match = rawText.match(
    /\bpot(?:\s+size)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:bb|big blind|big blinds)\b/i,
  );

  if (!match?.[1]) {
    return 0;
  }

  return Number.parseFloat(match[1]) || 0;
}

function buildFallbackImportedSnapshot(
  parsed: ParsedHandUpload,
  rawText: string,
): ImportedReplaySnapshot {
  const heroSeat = normalizeReplaySeat(parsed.hero.position, "BTN");
  const combinedText = `${parsed.normalizedHandText}\n${rawText}`;
  const detectedHeroCards = detectHeroCards(combinedText);
  const detectedBoard = detectBoardCards(combinedText);
  let opponents = parsed.opponents
    .map((opponent, index) => {
      const seat = normalizeReplaySeat(opponent.position);

      if (!seat || seat === heroSeat) {
        return null;
      }

      return {
        seat,
        name: sanitizeImportedPlayerName(opponent.label, `Villain ${index + 1}`),
        stackBb: opponent.stackBb || 100,
        holeCards: [] as string[],
        unknownCards: true,
      };
    })
    .filter((opponent): opponent is NonNullable<typeof opponent> => Boolean(opponent));

  if (opponents.length === 0) {
    opponents = detectMentionedReplaySeats(combinedText)
      .filter((seat) => seat && seat !== heroSeat)
      .map((seat, index) => ({
        seat,
        name: `Villain ${index + 1}`,
        stackBb: 100,
        holeCards: [] as string[],
        unknownCards: true,
      }));
  }

  const actions = inferActionsFromHandText(
    combinedText,
    heroSeat,
    opponents,
  );

  return {
    hero: {
      seat: heroSeat,
      name: "Hero",
      stackBb: parsed.hero.stackBb || 100,
      holeCards:
        parsed.hero.cards.map((card) => normalizeCard(card)).filter(Boolean).slice(0, 2).length >= 2
          ? parsed.hero.cards.map((card) => normalizeCard(card)).filter(Boolean).slice(0, 2)
          : detectedHeroCards,
    },
    opponents,
    buttonSeat: inferReplayButtonSeat(heroSeat, opponents),
    actions,
    board: {
      flop:
        parsed.board.flop.map((card) => normalizeCard(card)).filter(Boolean).slice(0, 3).length >= 3
          ? parsed.board.flop.map((card) => normalizeCard(card)).filter(Boolean).slice(0, 3)
          : detectedBoard.flop,
      turn: normalizeCard(parsed.board.turn) || detectedBoard.turn,
      river: normalizeCard(parsed.board.river) || detectedBoard.river,
    },
    winnerSeat: inferWinnerSeatFromText(
      combinedText,
      heroSeat,
      opponents,
    ),
    potBb: inferPotBbFromText(combinedText),
  };
}

function mergeImportedSnapshots(
  primary: ImportedReplaySnapshot,
  fallback: ImportedReplaySnapshot,
): ImportedReplaySnapshot {
  const heroHoleCards =
    primary.hero.holeCards.length >= 2 ? primary.hero.holeCards : fallback.hero.holeCards;
  const boardFlop =
    primary.board.flop.length > 0 ? primary.board.flop : fallback.board.flop;

  return {
    hero: {
      seat: primary.hero.seat || fallback.hero.seat,
      name: sanitizeImportedPlayerName(primary.hero.name, fallback.hero.name || "Hero"),
      stackBb: primary.hero.stackBb || fallback.hero.stackBb || 100,
      holeCards: heroHoleCards,
    },
    opponents:
      primary.opponents.length > 0
        ? primary.opponents.map((opponent, index) => ({
            ...opponent,
            name: sanitizeImportedPlayerName(opponent.name, fallback.opponents[index]?.name || `Villain ${index + 1}`),
          }))
        : fallback.opponents,
    buttonSeat: primary.buttonSeat || fallback.buttonSeat,
    actions: {
      preflop:
        primary.actions.preflop.length > 0 ? primary.actions.preflop : fallback.actions.preflop,
      flop: primary.actions.flop.length > 0 ? primary.actions.flop : fallback.actions.flop,
      turn: primary.actions.turn.length > 0 ? primary.actions.turn : fallback.actions.turn,
      river:
        primary.actions.river.length > 0 ? primary.actions.river : fallback.actions.river,
    },
    board: {
      flop: boardFlop,
      turn: primary.board.turn || fallback.board.turn,
      river: primary.board.river || fallback.board.river,
    },
    winnerSeat: primary.winnerSeat || fallback.winnerSeat,
    potBb: primary.potBb || fallback.potBb,
  };
}

function importedReplayNeedsRepair(item: SavedHandUpload) {
  if (!isImportedUploadSource(item.source)) {
    return false;
  }

  if (!item.manualSetup || !item.manualReplay) {
    return true;
  }

  const hero = item.manualSetup.hero;
  const heroHasCards =
    hero.holeCards.first &&
    hero.holeCards.second &&
    hero.holeCards.first !== "Unknown" &&
    hero.holeCards.second !== "Unknown";
  const boardCount = item.manualReplay.finalState.board.length;
  const actionCount = item.manualReplay.actionHistory.length;
  const potBb = item.manualReplay.finalState.potBb;
  const heroNameHealthy =
    hero.name === sanitizeImportedPlayerName(hero.name, "Hero");
  const opponents = item.manualSetup.opponents || [];
  const opponentNamesHealthy = opponents.every((opponent, index) => {
    const fallback = `Villain ${index + 1}`;
    return opponent.name === sanitizeImportedPlayerName(opponent.name, fallback);
  });
  const knownPlayerCardCount = [
    item.manualSetup.hero,
    ...opponents,
  ].filter(
    (player) =>
      player.holeCards.first &&
      player.holeCards.second &&
      player.holeCards.first !== "Unknown" &&
      player.holeCards.second !== "Unknown",
  ).length;

  return (
    !heroHasCards ||
    !heroNameHealthy ||
    !opponentNamesHealthy ||
    opponents.length === 0 ||
    knownPlayerCardCount === 0 ||
    (boardCount === 0 && actionCount <= 1 && potBb === 0)
  );
}

function normalizeSnapshotPayload(
  payload: unknown,
  parsed: ParsedHandUpload,
): ImportedReplaySnapshot {
  if (!payload || typeof payload !== "object") {
    throw new Error("Replay snapshot response is not a JSON object.");
  }

  const data = payload as Record<string, unknown>;
  const heroRecord =
    data.hero && typeof data.hero === "object"
      ? (data.hero as Record<string, unknown>)
      : {};
  const actionRecord =
    data.actions && typeof data.actions === "object"
      ? (data.actions as Record<string, unknown>)
      : {};
  const boardRecord =
    data.board && typeof data.board === "object"
      ? (data.board as Record<string, unknown>)
      : {};

  const normalizeActionArray = (value: unknown) =>
    Array.isArray(value)
      ? value
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const action = item as Record<string, unknown>;
            const normalizedSeat = normalizeReplaySeat(
              typeof action.seat === "string" ? action.seat : "",
            );
            const normalizedAction = normalizeReplayAction(
              typeof action.action === "string" ? action.action : "",
            );

            if (!normalizedSeat || !normalizedAction) {
              return null;
            }

            return {
              seat: normalizedSeat,
              action: normalizedAction,
              amount:
                typeof action.amount === "number" && Number.isFinite(action.amount)
                  ? action.amount
                  : 0,
              to:
                typeof action.to === "number" && Number.isFinite(action.to)
                  ? action.to
                  : 0,
            };
          })
          .filter(
            (
              item,
            ): item is {
              seat: string;
              action: string;
              amount: number;
              to: number;
            } => Boolean(item),
          )
      : [];

  const normalizedHeroSeat = normalizeReplaySeat(
    typeof heroRecord.seat === "string" ? heroRecord.seat : parsed.hero.position,
    normalizeReplaySeat(parsed.hero.position, "BTN"),
  );

  const normalizedOpponents = Array.isArray(data.opponents)
    ? data.opponents
        .map((item, index) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const opponent = item as Record<string, unknown>;
          const seat = normalizeReplaySeat(
            typeof opponent.seat === "string" ? opponent.seat : "",
          );

          if (!seat || seat === normalizedHeroSeat) {
            return null;
          }

          return {
            seat,
            name:
              typeof opponent.name === "string" && opponent.name.trim()
                ? opponent.name.trim()
                : parsed.opponents[index]?.label || `Villain ${index + 1}`,
            stackBb:
              typeof opponent.stackBb === "number" && Number.isFinite(opponent.stackBb)
                ? opponent.stackBb
                : parsed.opponents[index]?.stackBb || 100,
            holeCards: normalizeTextArray(opponent.holeCards).slice(0, 2),
            unknownCards:
              typeof opponent.unknownCards === "boolean"
                ? opponent.unknownCards
                : normalizeTextArray(opponent.holeCards).length < 2,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return {
    hero: {
      seat: normalizedHeroSeat,
      name:
        typeof heroRecord.name === "string" && heroRecord.name.trim()
          ? heroRecord.name.trim()
          : "Hero",
      stackBb:
        typeof heroRecord.stackBb === "number" && Number.isFinite(heroRecord.stackBb)
          ? heroRecord.stackBb
          : parsed.hero.stackBb || 100,
      holeCards: (
        normalizeTextArray(heroRecord.holeCards).length >= 2
          ? normalizeTextArray(heroRecord.holeCards)
          : parsed.hero.cards
      )
        .map((card) => normalizeCard(card))
        .slice(0, 2),
    },
    opponents:
      normalizedOpponents.length > 0
        ? normalizedOpponents
        : parsed.opponents
            .map((opponent, index) => ({
              seat: normalizeReplaySeat(opponent.position),
              name: opponent.label || `Villain ${index + 1}`,
              stackBb: opponent.stackBb || 100,
              holeCards: [] as string[],
              unknownCards: true,
            }))
            .filter((opponent) => opponent.seat && opponent.seat !== normalizedHeroSeat),
    buttonSeat: normalizeReplaySeat(
      typeof data.buttonSeat === "string" ? data.buttonSeat : "",
      normalizedHeroSeat,
    ),
    actions: {
      preflop: normalizeActionArray(actionRecord.preflop),
      flop: normalizeActionArray(actionRecord.flop),
      turn: normalizeActionArray(actionRecord.turn),
      river: normalizeActionArray(actionRecord.river),
    },
    board: {
      flop: (
        normalizeTextArray(boardRecord.flop).length > 0
          ? normalizeTextArray(boardRecord.flop)
          : parsed.board.flop
      )
        .map((card) => normalizeCard(card))
        .slice(0, 3),
      turn: normalizeCard(
        typeof boardRecord.turn === "string" && boardRecord.turn.trim()
          ? boardRecord.turn
          : parsed.board.turn,
      ),
      river: normalizeCard(
        typeof boardRecord.river === "string" && boardRecord.river.trim()
          ? boardRecord.river
          : parsed.board.river,
      ),
    },
    winnerSeat: normalizeReplaySeat(
      typeof data.winnerSeat === "string" ? data.winnerSeat : "",
    ),
    potBb:
      typeof data.potBb === "number" && Number.isFinite(data.potBb)
        ? data.potBb
        : 0,
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
  const lowerRawText = rawText.toLowerCase();
  const explicitCardMatch = rawText.match(
    /\b([AKQJT2-9][shdc])\s+([AKQJT2-9][shdc])\b/i,
  );

  if (explicitCardMatch) {
    return [
      normalizeCard(explicitCardMatch[1] ?? ""),
      normalizeCard(explicitCardMatch[2] ?? ""),
    ];
  }

  const pairWordMatch = lowerRawText.match(
    /\b(?:pocket|pair(?:\s+of)?)\s+(aces|kings|queens|jacks|tens|nines|eights|sevens|sixes|fives|fours|threes|twos)\b/i,
  );

  if (pairWordMatch?.[1]) {
    const rank = normalizeRankToken(pairWordMatch[1]);
    return inferOffsuitHoleCards(rank, rank);
  }

  const twoWordMatch = lowerRawText.match(
    /\b(?:with|holding|hand:?|hero(?:\s+\([^)]+\))?\s+has)\s+(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two|a|k|q|j|t|9|8|7|6|5|4|3|2)\s+(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two|a|k|q|j|t|9|8|7|6|5|4|3|2)\b/i,
  );

  if (twoWordMatch?.[1] && twoWordMatch?.[2]) {
    const firstRank = normalizeRankToken(twoWordMatch[1]);
    const secondRank = normalizeRankToken(twoWordMatch[2]);
    return inferOffsuitHoleCards(firstRank, secondRank);
  }

  const shorthandMatch = rawText.match(/\b(AA|KK|QQ|JJ|TT|99|88|77|66|55|44|33|22|AK|AQ|AJ|AT|A9|A8|A7|A6|A5|A4|A3|A2|KQ|KJ|KT|QJ|QT|JT|T9|98|87|76|65|54)\b/i);

  if (!shorthandMatch) {
    return [];
  }

  return inferOffsuitHoleCards(
    shorthandMatch[1]!.toUpperCase().slice(0, 1),
    shorthandMatch[1]!.toUpperCase().slice(1, 2),
  );
}

function detectBoardCards(rawText: string) {
  const lowerRawText = rawText.toLowerCase();
  const flopMatch = rawText.match(
    /\bflop\b[^A-Za-z0-9]{0,12}([AKQJT2-9][shdc])\s+([AKQJT2-9][shdc])\s+([AKQJT2-9][shdc])/i,
  );
  const turnMatch = rawText.match(
    /\bturn\b[^A-Za-z0-9]{0,12}([AKQJT2-9][shdc])/i,
  );
  const riverMatch = rawText.match(
    /\briver\b[^A-Za-z0-9]{0,12}([AKQJT2-9][shdc])/i,
  );

  const flopWordMatch = lowerRawText.match(
    /\bflop\b[^a-z0-9]{0,20}(?:came|is|was|:)?[^a-z0-9]{0,20}(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two|a|k|q|j|t|9|8|7|6|5|4|3|2)[,\s/.-]+(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two|a|k|q|j|t|9|8|7|6|5|4|3|2)[,\s/.-]+(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two|a|k|q|j|t|9|8|7|6|5|4|3|2)/i,
  );
  const turnWordMatch = lowerRawText.match(
    /\bturn\b[^a-z0-9]{0,20}(?:brought|was|is|:)?[^a-z0-9]{0,20}(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two|a|k|q|j|t|9|8|7|6|5|4|3|2)/i,
  );
  const riverWordMatch = lowerRawText.match(
    /\briver\b[^a-z0-9]{0,20}(?:brought|was|is|:)?[^a-z0-9]{0,20}(ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two|a|k|q|j|t|9|8|7|6|5|4|3|2)/i,
  );

  const inferredFlop =
    flopWordMatch?.slice(1, 4).map((token) => normalizeRankToken(token || "")).filter(Boolean) || [];
  const inferredTurn = normalizeRankToken(turnWordMatch?.[1] || "");
  const inferredRiver = normalizeRankToken(riverWordMatch?.[1] || "");
  const rainbowBoard = inferRainbowBoardCards([
    ...inferredFlop,
    inferredTurn,
    inferredRiver,
  ]);

  return {
    flop: uniqueStrings(
      flopMatch
        ? [
            normalizeCard(flopMatch[1] ?? ""),
            normalizeCard(flopMatch[2] ?? ""),
            normalizeCard(flopMatch[3] ?? ""),
          ]
        : rainbowBoard.slice(0, 3),
    ),
    turn: normalizeCard(turnMatch?.[1] ?? "") || rainbowBoard[3] || "",
    river: normalizeCard(riverMatch?.[1] ?? "") || rainbowBoard[4] || "",
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
    "Accept any input language, but ALL output fields must be ENGLISH ONLY.",
    "Be conservative. Never invent cards, actions, stacks, or board cards that are not reasonably supported by the input.",
    "If there is not enough poker information, set valid=false and explain the gap in error.",
    "Structured extraction is the priority: identify Hero, opponent seats, board, and key actions whenever the text supports them.",
    "Use only these seats when possible: UTG, HJ, CO, BTN, SB, BB.",
    "If a player name is unclear or sounds like transcript filler, prefer Hero and Villain labels instead of odd names.",
    "If stacks are not clearly stated, use 100 for unknown stacks instead of 0.",
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

function buildReplaySnapshotInstructions(source: UploadSource) {
  return [
    "You are the replay snapshot parser for the ALL IN POKER style hand review flow.",
    "Your job is to turn confirmed hand text into a clean replay snapshot for a Texas Hold'em table.",
    "This is a structured data extraction task. Replay JSON is the primary output, not prose.",
    "Output only valid JSON that matches the schema.",
    "Use ENGLISH ONLY.",
    "Use only these seats: UTG, HJ, CO, BTN, SB, BB.",
    "Fix obvious ASR and OCR mistakes before extracting the hand.",
    "Recognize poker rank words and pair words: pocket Aces, pair of Kings, pocket Jacks, Tens, Ace King, AK, AQ, TT, 44, etc.",
    "If suits are missing, infer offsuit hole cards and a rainbow board. If a card uses x as the suit, treat it as an unknown suit and infer a reasonable suit.",
    "When the text says Hero from Button / Small Blind / Big Blind / Cutoff / Hijack / UTG, use that real seat in the snapshot.",
    "If multiple opponents exist, distinguish them by seat and keep their seats stable.",
    "Preserve the action order exactly as described and keep actions grouped by street.",
    "Hero must include the known hole cards when they exist.",
    "If villain cards were not shown, use an empty holeCards array and unknownCards=true.",
    "If an amount or final pot is unknown, use 0 instead of guessing.",
    "If the hand ended before flop, keep flop/turn/river arrays and cards empty.",
    "buttonSeat must be the real button for the hand, not just the hero seat.",
    "winnerSeat should be empty only when the winner cannot be determined from the text.",
    "Do not use transcript filler, commentary, or stray spoken phrases as player names.",
    "Prefer Hero and Villain 1 / Villain 2 when names are unclear.",
    "If the text explicitly mentions showdown cards for an opponent, include them. Do not leave known showdown cards empty.",
    "If the text clearly describes the final board, include all known board cards.",
    "If the text clearly says who won, set winnerSeat.",
    "If the confirmed text already implies a board, hole cards, or showdown winner, keep them in the snapshot.",
    `The source is ${source}.`,
  ].join(" ");
}

async function parseReplaySnapshotFromText(
  source: Extract<UploadSource, "voice" | "screenshot">,
  rawText: string,
  parsed: ParsedHandUpload,
) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: DEFAULT_TEXT_MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "poker_replay_snapshot",
        strict: true,
        schema: IMPORTED_REPLAY_RESPONSE_SCHEMA,
      },
    },
    messages: [
      {
        role: "developer",
        content: buildReplaySnapshotInstructions(source),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            source,
            rawText,
            parsedPreview: parsed,
          },
          null,
          2,
        ),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error("The model returned an empty replay snapshot.");
  }

  const normalized = normalizeSnapshotPayload(
    JSON.parse(stripCodeFence(rawContent)),
    parsed,
  );
  const fallback = buildFallbackImportedSnapshot(parsed, rawText);

  return mergeImportedSnapshots(normalized, fallback);
}

function buildReplayArtifactsFromSnapshot(
  snapshot: ImportedReplaySnapshot,
  source: Extract<UploadSource, "voice" | "screenshot">,
  id: string,
  createdAtMs: number,
) {
  if (!snapshot.hero.seat || snapshot.hero.holeCards.length < 2) {
    return null;
  }

  const hero: ManualHandSetup["hero"] = {
    seat: snapshot.hero.seat as ManualHandSetup["hero"]["seat"],
    name: sanitizeImportedPlayerName(snapshot.hero.name, "Hero"),
    stackBb: snapshot.hero.stackBb || 100,
    holeCards: {
      first: snapshot.hero.holeCards[0]!,
      second: snapshot.hero.holeCards[1]!,
    },
  };

  const opponents = snapshot.opponents
    .filter((opponent) => opponent.seat && opponent.seat !== hero.seat)
    .map((opponent, index) => ({
      seat: opponent.seat as ManualHandSetup["opponents"][number]["seat"],
      name: sanitizeImportedPlayerName(opponent.name, `Villain ${index + 1}`),
      stackBb: opponent.stackBb || 100,
      holeCards: {
        first: opponent.holeCards[0] || "Unknown",
        second: opponent.holeCards[1] || "Unknown",
      },
      unknownCards: opponent.unknownCards || opponent.holeCards.length < 2,
    }));

  if (opponents.length === 0) {
    return null;
  }

  const actionHistory = (
    [
      ["preflop", snapshot.actions.preflop],
      ["flop", snapshot.actions.flop],
      ["turn", snapshot.actions.turn],
      ["river", snapshot.actions.river],
    ] as const
  ).flatMap(([street, actions], streetIndex) =>
    actions.map((action, index) => ({
      street,
      seat: action.seat as ManualHandSetup["hero"]["seat"],
      action: action.action as ManualReplayData["actionHistory"][number]["action"],
      amount: action.amount > 0 ? action.amount : undefined,
      to: action.to > 0 ? action.to : undefined,
      timestamp: streetIndex * 10_000 + index * 500,
    })),
  );

  const players = [hero, ...opponents].map((player) => {
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
      isHero: player.seat === hero.seat,
      hasActedThisRound: false,
    };
  });

  const board = [
    ...snapshot.board.flop,
    ...(snapshot.board.turn ? [snapshot.board.turn] : []),
    ...(snapshot.board.river ? [snapshot.board.river] : []),
  ].filter(Boolean);
  const activePlayers = players.filter((player) => player.inHand);
  const winnerSeat =
    snapshot.winnerSeat ||
    (activePlayers.length === 1 ? activePlayers[0]?.seat : undefined);
  const setup: ManualHandSetup = {
    buttonSeat: (snapshot.buttonSeat || hero.seat) as ManualHandSetup["buttonSeat"],
    hero,
    opponents,
    actionNotes: "",
  };
  const replay: ManualReplayData = {
    actionHistory,
    finalState: {
      street: "finished",
      potBb: snapshot.potBb || 0,
      currentBetBb: 0,
      lastFullRaiseBb: 0,
      lastRaiseSizeBb: 0,
      toActQueue: [],
      players,
      board,
      finished: true,
      winnerSeat: winnerSeat as ManualReplayData["finalState"]["winnerSeat"],
    },
    progressionText: "",
  };

  replay.progressionText = generateReplayLog(setup, replay.finalState, actionHistory);

  return {
    setup,
    replay,
    allinHand: buildAllInHandRecord(
      id,
      createdAtMs,
      setup,
      replay,
      source,
      null,
    ),
  };
}

function buildAnalysisInstructions() {
  return `
♟️ AI Texas Hold'em Coach (GTO & Exploit Expert)

CORE:
Analyze strictly from provided JSON data only.
Judge each Hero DECISION as CORRECT or INCORRECT.
Focus on decision quality, not outcome or luck.

────────────────────────────────
⚖️ JUDGMENT (HARD)
────────────────────────────────
1. Verdict First
- Each street where Hero HAS A DECISION must start in markdown_content with:
  Correct. or Incorrect.
- No hedging, no delayed conclusions.

2. Correct
- Give professional, technical praise.
- Explain WHY it is correct (range advantage, frequency, discipline, EV logic).

3. Incorrect
- Explicitly state it is wrong.
- State the correct action.
- Explain the mistake using EV, GTO, or range logic.
- Do NOT add emotional comfort.

────────────────────────────────
🧠 WHAT COUNTS AS A DECISION (DEFINITION)
────────────────────────────────
- A street has a decision ONLY if Hero can choose between at least two actions
  (e.g. bet/check/fold/call/raise).
- If Hero has no available choice, the street is a No-Decision Street.

────────────────────────────────
🛑 NO-DECISION STREETS (e.g. after all-in)
────────────────────────────────
- If Hero has no decision on a street (stacks fully committed earlier):
  - Still output that street in street_details.
  - Set:
    - rating = Good
    - markdown_content must start with Correct.
  - State clearly:
    "No decision exists on this street due to earlier all-in or full commitment."
  - Use wording that makes it explicit this is NOT praise,
    only confirmation that no error could occur.
  - Do NOT evaluate outcome, luck, or imply skill.
  - Also applies when Hero folded on a previous street — Hero was not in the hand.
    State: "Hero was not in the hand on this street."

────────────────────────────────
🔑 LANGUAGE / 🚫 IDENTITY
────────────────────────────────
- ENGLISH ONLY.
- Analyze ONLY:
  - hero_hand
  - hero_seat
  - hero_name
- Hero hand strength = hero_hand + board_cards ONLY.
- Never assign villain's hand or board-only hands to Hero.
- Verify board cards, Hero cards, and actual best hand before writing.

────────────────────────────────
🧠 GTO REQUIREMENTS
────────────────────────────────
- Solver-level reasoning only.
- Reference:
  - Range construction
  - Frequencies and sizing
  - SPR
  - Blockers
  - EV logic
- No vague or generic statements.

────────────────────────────────
📋 OUTPUT JSON (STRUCTURE UNCHANGED)
────────────────────────────────
- Use the existing JSON schema exactly.
- Valid JSON only.
- Exactly 3 gto_tips.

────────────────────────────────
🎯 RATING CONSISTENCY
────────────────────────────────
- Best / Good → Verdict MUST be Correct
- Mistake / Blunder → Verdict MUST be Incorrect
- No-Decision Street → rating = Good, verdict = Correct

────────────────────────────────
🧠 GTO TIPS
────────────────────────────────
- Exactly 3 tips.
- No narrative repetition.
- Ranges, frequencies, and theory ONLY.
- Each tip: icon + bold title.

────────────────────────────────
⚠️ FINAL
────────────────────────────────
- Parse actions_log as hand history if needed.
- If actions_log is insufficient to determine whether Hero had a decision on a street, treat as no-decision (Good, Correct) and briefly note the ambiguity.
- If hero_hand and board_cards exist, full analysis is mandatory.
- Output valid JSON only.
- All required fields must be present.
- ENGLISH ONLY.
`.trim();
}

async function analyzeSavedHand(item: SavedHandUpload) {
  const allinHand = getAllInHandRecord(item);
  const heroPlayer = allinHand?.setup.players.find(
    (player) => player.seat === allinHand.setup.heroSeat,
  );
  const boardCards = [
    ...(allinHand?.streets.flop?.board || []),
    ...(allinHand?.streets.turn?.card ? [allinHand.streets.turn.card] : []),
    ...(allinHand?.streets.river?.card ? [allinHand.streets.river.card] : []),
  ].filter(Boolean);
  const actionLog = [
    `Preflop: ${(allinHand?.streets.preflop || [])
      .map((action) => `${action.seat} ${action.action}${typeof action.amount === "number" ? ` ${action.amount}bb` : ""}${typeof action.to === "number" ? ` to ${action.to}bb` : ""}`)
      .join(", ")}`,
    allinHand?.streets.flop
      ? `Flop [${allinHand.streets.flop.board?.join(" ") || ""}]: ${allinHand.streets.flop.actions
          .map((action) => `${action.seat} ${action.action}${typeof action.amount === "number" ? ` ${action.amount}bb` : ""}${typeof action.to === "number" ? ` to ${action.to}bb` : ""}`)
          .join(", ")}`
      : "",
    allinHand?.streets.turn
      ? `Turn [${allinHand.streets.turn.card || ""}]: ${allinHand.streets.turn.actions
          .map((action) => `${action.seat} ${action.action}${typeof action.amount === "number" ? ` ${action.amount}bb` : ""}${typeof action.to === "number" ? ` to ${action.to}bb` : ""}`)
          .join(", ")}`
      : "",
    allinHand?.streets.river
      ? `River [${allinHand.streets.river.card || ""}]: ${allinHand.streets.river.actions
          .map((action) => `${action.seat} ${action.action}${typeof action.amount === "number" ? ` ${action.amount}bb` : ""}${typeof action.to === "number" ? ` to ${action.to}bb` : ""}`)
          .join(", ")}`
      : "",
  ].filter(Boolean);

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
            handFacts: allinHand
              ? {
                  hero_seat: allinHand.setup.heroSeat,
                  hero_name: heroPlayer?.name || "Hero",
                  hero_hand: heroPlayer?.hole
                    ? [heroPlayer.hole.first, heroPlayer.hole.second]
                    : item.hero.cards,
                  board_cards: boardCards,
                  actions_log: actionLog.join("\n"),
                  pot_size_bb: allinHand.result.pots[0]?.sizeBb || 0,
                  street:
                    boardCards.length >= 5
                      ? "river"
                      : boardCards.length >= 4
                        ? "turn"
                        : boardCards.length >= 3
                          ? "flop"
                          : "preflop",
                  players: allinHand.setup.players.map((player) => ({
                    seat: player.seat,
                    name: player.name,
                    stack_bb: player.stackBb,
                    in_hand:
                      !allinHand.actionHistory?.some(
                        (action) =>
                          action.seat === player.seat && action.action === "Fold",
                      ),
                    is_hero: player.seat === allinHand.setup.heroSeat,
                    hole_cards: player.hole
                      ? [player.hole.first, player.hole.second]
                      : null,
                  })),
                }
              : null,
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
  const { normalizedMimeType, normalizedName } = normalizeOpenAIImageFile(
    buffer,
    originalName,
    mimeType,
  );
  const dataUrl = `data:${normalizedMimeType};base64,${buffer.toString("base64")}`;

  return parseModelJsonResponse("screenshot", [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Extract the poker hand from this screenshot. File name: ${normalizedName}.`,
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

async function transcribeAudio(buffer: Buffer, originalName: string) {
  const client = getOpenAIClient();
  const { normalizedName, normalizedMimeType } = normalizeOpenAIAudioFile(
    buffer,
    originalName,
  );
  const file = await toFile(buffer, normalizedName, { type: normalizedMimeType });
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

function logUploadStageError(
  source: UploadSource,
  stage: "transcription" | "parsing" | "storage" | "save",
  error: unknown,
) {
  console.error(`[hand-upload:${source}] ${stage} failed`, error);
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
  const allinHand =
    manualSetup && manualReplay
      ? buildAllInHandRecord(id, createdAtMs, manualSetup, manualReplay, source, null)
      : null;

  return {
    id,
    viewerId,
    source,
    rawInput,
    createdAtMs,
    media,
    manualSetup: manualSetup || null,
    manualReplay: manualReplay || null,
    allinHand,
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

  const sanitizedPayload = stripUndefinedDeep(payload) as SavedHandUpload;

  await docRef.set(sanitizedPayload);

  return sanitizedPayload;
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

  let transcript = "";
  try {
    transcript = await transcribeAudio(buffer, originalName);
  } catch (error) {
    logUploadStageError("voice", "transcription", error);
    throw new Error("OpenAI transcription failed for this audio file.");
  }

  let parsed: ParsedHandUpload;
  try {
    parsed = await parseHandFromText("voice", transcript);
  } catch (error) {
    logUploadStageError("voice", "parsing", error);
    throw new Error("OpenAI hand extraction failed for this audio file.");
  }

  ensureValidExtraction(parsed);

  let media: StoredUploadMedia;
  try {
    media = await uploadMedia(viewerId, "voice", buffer, mimeType, originalName);
  } catch (error) {
    logUploadStageError("voice", "storage", error);
    throw new Error("Firebase media storage failed while saving this audio file.");
  }

  try {
    return await saveUploadRecord(viewerId, "voice", transcript, parsed, media);
  } catch (error) {
    logUploadStageError("voice", "save", error);
    throw new Error("Saving the audio upload record failed.");
  }
}

export async function extractAudioUploadDraft(
  buffer: Buffer,
  originalName: string,
) {
  ensureFileSize(buffer, MAX_AUDIO_BYTES, "Audio file");

  let transcript = "";
  try {
    transcript = await transcribeAudio(buffer, originalName);
  } catch (error) {
    logUploadStageError("voice", "transcription", error);
    throw new Error("OpenAI transcription failed for this audio file.");
  }

  let parsed: ParsedHandUpload;
  try {
    parsed = await parseHandFromText("voice", transcript);
  } catch (error) {
    logUploadStageError("voice", "parsing", error);
    throw new Error("OpenAI hand extraction failed for this audio file.");
  }

  ensureValidExtraction(parsed);

  return {
    extractedText: parsed.sourceText || parsed.normalizedHandText || transcript,
    preview: parsed,
  };
}

export async function processScreenshotUpload(
  viewerId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
) {
  ensureFileSize(buffer, MAX_IMAGE_BYTES, "Image file");

  let parsed: ParsedHandUpload;
  try {
    parsed = await parseHandFromImage(buffer, mimeType, originalName);
  } catch (error) {
    logUploadStageError("screenshot", "parsing", error);
    throw new Error("OpenAI image parsing failed for this screenshot.");
  }

  ensureValidExtraction(parsed);

  let media: StoredUploadMedia;
  try {
    media = await uploadMedia(
      viewerId,
      "screenshot",
      buffer,
      mimeType,
      originalName,
    );
  } catch (error) {
    logUploadStageError("screenshot", "storage", error);
    throw new Error("Firebase media storage failed while saving this screenshot.");
  }

  try {
    return await saveUploadRecord(
      viewerId,
      "screenshot",
      parsed.sourceText || originalName,
      parsed,
      media,
    );
  } catch (error) {
    logUploadStageError("screenshot", "save", error);
    throw new Error("Saving the screenshot upload record failed.");
  }
}

export async function extractScreenshotUploadDraft(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
) {
  ensureFileSize(buffer, MAX_IMAGE_BYTES, "Image file");

  let parsed: ParsedHandUpload;
  try {
    parsed = await parseHandFromImage(buffer, mimeType, originalName);
  } catch (error) {
    logUploadStageError("screenshot", "parsing", error);
    throw new Error("OpenAI image parsing failed for this screenshot.");
  }

  ensureValidExtraction(parsed);

  return {
    extractedText: parsed.sourceText || parsed.normalizedHandText || originalName,
    preview: parsed,
  };
}

export async function savePremiumUploadFromText(
  viewerId: string,
  source: Extract<UploadSource, "voice" | "screenshot">,
  handText: string,
) {
  const rawInput = ensureManualText(handText);

  let parsed: ParsedHandUpload;
  try {
    parsed = await parseHandFromText(source, rawInput);
  } catch (error) {
    logUploadStageError(source, "parsing", error);
    throw new Error("OpenAI hand extraction failed for this hand text.");
  }

  ensureValidExtraction(parsed);

  let replayArtifacts: ReturnType<typeof buildReplayArtifactsFromSnapshot> | null = null;
  try {
    const snapshot = await parseReplaySnapshotFromText(source, rawInput, parsed);
    replayArtifacts = buildReplayArtifactsFromSnapshot(
      snapshot,
      source,
      crypto.randomUUID(),
      Date.now(),
    );
  } catch (error) {
    logUploadStageError(source, "save", error);
  }

  try {
    return await saveUploadRecord(
      viewerId,
      source,
      rawInput,
      parsed,
      null,
      replayArtifacts?.setup ?? null,
      replayArtifacts?.replay ?? null,
    );
  } catch (error) {
    logUploadStageError(source, "save", error);
    throw new Error("Saving the uploaded hand failed.");
  }
}

export async function getViewerUpload(viewerId: string, uploadId: string) {
  const docRef = uploadEntryDoc(viewerId, uploadId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Hand upload not found.");
  }

  const item = doc.data() as SavedHandUpload;

  if (importedReplayNeedsRepair(item) && isImportedUploadSource(item.source)) {
    try {
      const snapshot = await parseReplaySnapshotFromText(
        item.source,
        item.rawInput || item.normalizedHandText,
        item,
      );
      const replayArtifacts = buildReplayArtifactsFromSnapshot(
        snapshot,
        item.source,
        item.id,
        item.createdAtMs,
      );

      if (replayArtifacts) {
        const nextItem = stripUndefinedDeep({
          ...item,
          manualSetup: replayArtifacts.setup,
          manualReplay: replayArtifacts.replay,
          allinHand: replayArtifacts.allinHand,
        }) as SavedHandUpload;

        await docRef.set(nextItem, { merge: true });
        return nextItem;
      }
    } catch (error) {
      logUploadStageError(item.source, "save", error);
    }
  }

  return item;
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

  let nextItem = item;

  if (
    importedReplayNeedsRepair(nextItem) &&
    isImportedUploadSource(nextItem.source)
  ) {
    try {
      const replaySnapshot = await parseReplaySnapshotFromText(
        nextItem.source,
        nextItem.rawInput || nextItem.normalizedHandText,
        nextItem,
      );
      const replayArtifacts = buildReplayArtifactsFromSnapshot(
        replaySnapshot,
        nextItem.source,
        nextItem.id,
        nextItem.createdAtMs,
      );

      if (replayArtifacts) {
        nextItem = stripUndefinedDeep({
          ...nextItem,
          manualSetup: replayArtifacts.setup,
          manualReplay: replayArtifacts.replay,
          allinHand: replayArtifacts.allinHand,
        }) as SavedHandUpload;
        await docRef.set(nextItem, { merge: true });
      }
    } catch (error) {
      logUploadStageError(nextItem.source, "save", error);
    }
  }

  if (nextItem.analysis && !options?.force) {
    return nextItem;
  }

  const analysis = await analyzeSavedHand(nextItem);
  const analyzedItem = {
    ...nextItem,
    allinHand: nextItem.manualSetup && nextItem.manualReplay
      ? buildAllInHandRecord(
          nextItem.id,
          nextItem.createdAtMs,
          nextItem.manualSetup,
          nextItem.manualReplay,
          nextItem.source,
          analysis,
        )
      : nextItem.allinHand ?? null,
    analysis,
  } satisfies SavedHandUpload;

  const sanitizedNextItem = stripUndefinedDeep(analyzedItem) as SavedHandUpload;

  await docRef.set(sanitizedNextItem, { merge: true });
  return sanitizedNextItem;
}

export async function listViewerUploads(
  viewerId: string,
  limit = 12,
  cursor?: number,
) {
  const db = getFirebaseAdminDb();
  const sanitizedViewerId = sanitizeViewerId(viewerId);
  let query = db
    .collection("hand_uploads")
    .doc(sanitizedViewerId)
    .collection("entries")
    .orderBy("createdAtMs", "desc")
    .limit(limit + 1);

  if (typeof cursor === "number" && Number.isFinite(cursor)) {
    query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs;
  const pageDocs = docs.slice(0, limit);
  const hasMore = docs.length > limit;
  const lastItem = pageDocs.at(-1)?.data() as SavedHandUpload | undefined;

  return {
    items: pageDocs.map((doc) => doc.data() as SavedHandUpload),
    nextCursor:
      hasMore && typeof lastItem?.createdAtMs === "number"
        ? lastItem.createdAtMs
        : null,
    hasMore,
  };
}
