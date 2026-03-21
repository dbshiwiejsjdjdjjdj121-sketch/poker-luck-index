export type UploadSource = "manual" | "voice" | "screenshot";

export type UploadConfidence = "high" | "medium" | "low";

export type ReplaySeatPosition = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";

export interface ReplayHoleCards {
  first: string;
  second: string;
}

export interface ManualPlayerSetup {
  seat: ReplaySeatPosition;
  name: string;
  stackBb: number;
  holeCards: ReplayHoleCards;
  unknownCards?: boolean;
}

export interface ManualHandSetup {
  buttonSeat: ReplaySeatPosition;
  hero: ManualPlayerSetup;
  opponents: ManualPlayerSetup[];
  actionNotes: string;
}

export type ReplayActionType =
  | "Fold"
  | "Check"
  | "Call"
  | "Bet"
  | "Raise"
  | "All-In"
  | "Limp";

export type ReplayActionStreet = "preflop" | "flop" | "turn" | "river";

export interface ReplayActionHistoryItem {
  street: ReplayActionStreet;
  seat: ReplaySeatPosition;
  action: ReplayActionType;
  amount?: number;
  to?: number;
  timestamp: number;
}

export interface ReplayPlayerState {
  seat: ReplaySeatPosition;
  name: string;
  style: string;
  stackBb: number;
  committedThisStreetBb: number;
  holeCards?: ReplayHoleCards;
  inHand: boolean;
  allIn: boolean;
  isHero: boolean;
  hasActedThisRound: boolean;
}

export interface ReplayHandState {
  street: "preflop" | "flop" | "turn" | "river" | "showdown" | "finished";
  potBb: number;
  currentBetBb: number;
  lastFullRaiseBb: number;
  lastRaiseSizeBb: number;
  toActQueue: ReplaySeatPosition[];
  players: ReplayPlayerState[];
  board: string[];
  finished: boolean;
  winnerSeat?: ReplaySeatPosition;
}

export interface ManualReplayData {
  actionHistory: ReplayActionHistoryItem[];
  finalState: ReplayHandState;
  progressionText: string;
}

export interface ParsedHeroSnapshot {
  position: string;
  cards: string[];
  stackBb: number;
}

export interface ParsedOpponentSnapshot {
  label: string;
  position: string;
  stackBb: number;
}

export interface ParsedBoardSnapshot {
  flop: string[];
  turn: string;
  river: string;
}

export interface ParsedHandUpload {
  valid: boolean;
  error: string;
  sourceText: string;
  title: string;
  normalizedHandText: string;
  quickSummary: string;
  coachAdvice: string;
  hero: ParsedHeroSnapshot;
  opponents: ParsedOpponentSnapshot[];
  board: ParsedBoardSnapshot;
  keyActions: string[];
  missingDetails: string[];
  confidence: UploadConfidence;
}

export interface HandAnalysisStreet {
  street: string;
  highlight: string;
  suggestion: string;
}

export interface SavedHandAnalysis {
  summary: string;
  streets: HandAnalysisStreet[];
  gtoTips: string[];
  encouragement: string;
  model: string;
  createdAtMs: number;
}

export interface StoredUploadMedia {
  storagePath: string;
  contentType: string;
  originalName: string;
  bytes: number;
}

export interface SavedHandUpload extends ParsedHandUpload {
  id: string;
  viewerId: string;
  source: UploadSource;
  rawInput: string;
  createdAtMs: number;
  media: StoredUploadMedia | null;
  manualSetup?: ManualHandSetup | null;
  manualReplay?: ManualReplayData | null;
  analysis?: SavedHandAnalysis | null;
}

export const MAX_MANUAL_TEXT_LENGTH = 6000;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export const uploadSourceLabels: Record<UploadSource, string> = {
  manual: "Manual",
  voice: "Voice",
  screenshot: "Screenshot",
};
