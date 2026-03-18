export type GameType =
  | "texas_holdem"
  | "omaha"
  | "blackjack"
  | "baccarat"
  | "slots"
  | "roulette";

export interface BankrollRecord {
  id: string;
  gameType: GameType;
  buyInUSD: number;
  cashOutUSD: number;
  dateUTC: string;
  createdAt: string;
  note?: string;
  deviceId?: string;
  syncedAt?: number;
  cloudId?: string;
  ownerUid?: string;
}

export interface BankrollRecordInput {
  gameType: GameType;
  buyInUSD: number;
  cashOutUSD: number;
  dateUTC: string;
  note?: string;
  deviceId?: string;
  ownerUid?: string;
}

export type TimeRangeFilter = "all" | "monthly" | "yearly" | "custom";

export interface CustomRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface ChartPoint {
  x: number;
  label: string;
  value: number;
  sessionProfit?: number;
  note?: string;
}
