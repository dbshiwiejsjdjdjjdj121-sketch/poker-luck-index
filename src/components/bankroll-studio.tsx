"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppNavigation } from "@/components/app-navigation";
import { useAuth } from "@/components/auth-provider";
import { trackEvent } from "@/lib/analytics";
import {
  buildBankrollStats,
  recordProfit,
} from "@/lib/bankroll-logic";
import type {
  BankrollRecord,
  BankrollRecordInput,
  ChartPoint,
  CustomRange,
  TimeRangeFilter,
} from "@/lib/bankroll-types";

const LOCAL_BANKROLL_KEY_PREFIX = "poker-luck-index-bankroll";

const TIME_RANGE_OPTIONS: Array<{ label: string; value: TimeRangeFilter }> = [
  { label: "All Time", value: "all" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

function bankrollStorageKey(viewerId: string) {
  return `${LOCAL_BANKROLL_KEY_PREFIX}:${viewerId}`;
}

function loadLocalRecords(viewerId: string) {
  try {
    const raw = window.localStorage.getItem(bankrollStorageKey(viewerId));
    if (!raw) {
      return [] as BankrollRecord[];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BankrollRecord[]) : [];
  } catch {
    return [] as BankrollRecord[];
  }
}

function saveLocalRecords(viewerId: string, records: BankrollRecord[]) {
  window.localStorage.setItem(bankrollStorageKey(viewerId), JSON.stringify(records));
}

function mergeRecords(localRecords: BankrollRecord[], cloudRecords: BankrollRecord[]) {
  const recordMap = new Map<string, BankrollRecord>();

  [...localRecords, ...cloudRecords].forEach((record) => {
    const key = record.cloudId || record.id;
    const existing = recordMap.get(key);

    if (!existing) {
      recordMap.set(key, record);
      return;
    }

    const existingSynced = existing.syncedAt || 0;
    const currentSynced = record.syncedAt || 0;
    recordMap.set(key, currentSynced >= existingSynced ? record : existing);
  });

  return [...recordMap.values()].sort(
    (left, right) =>
      new Date(right.dateUTC).getTime() - new Date(left.dateUTC).getTime(),
  );
}

function formatCurrency(amount: number) {
  const prefix = amount >= 0 ? "+" : "-";
  return `${prefix}$${Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function buildChartPath(points: ChartPoint[]) {
  if (points.length === 0) {
    return { path: "", pointsWithCoords: [] as Array<ChartPoint & { px: number; py: number }> };
  }

  const width = 760;
  const height = 210;
  const left = 14;
  const top = 16;
  const usableWidth = width - left * 2;
  const usableHeight = height - top * 2;
  const values = points.map((point) => point.value);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const pointsWithCoords = points.map((point, index) => {
    const x =
      left + (points.length === 1 ? usableWidth / 2 : (usableWidth / (points.length - 1)) * index);
    const y = top + usableHeight - ((point.value - min) / range) * usableHeight;

    return {
      ...point,
      px: x,
      py: y,
    };
  });

  const path = pointsWithCoords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.px} ${point.py}`)
    .join(" ");

  return { path, pointsWithCoords };
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BankrollStudio() {
  const { user, getIdToken } = useAuth();
  const [viewerId, setViewerId] = useState("");
  const [records, setRecords] = useState<BankrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("all");
  const [customRange, setCustomRange] = useState<CustomRange>({
    startDate: null,
    endDate: null,
  });
  const [buyIn, setBuyIn] = useState("");
  const [cashOut, setCashOut] = useState("");
  const [note, setNote] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const localViewerId =
      user?.uid ||
      window.localStorage.getItem("poker-luck-index-viewer-id") ||
      `viewer-${crypto.randomUUID()}`;

    window.localStorage.setItem("poker-luck-index-viewer-id", localViewerId);
    setViewerId(localViewerId);
  }, [user?.uid]);

  const syncCloud = useCallback(
    async (currentViewerId: string, currentRecords: BankrollRecord[]) => {
      if (!user?.uid) {
        saveLocalRecords(currentViewerId, currentRecords);
        setRecords(currentRecords);
        return;
      }

      const idToken = await getIdToken();
      const response = await fetch(
        `/api/bankroll-records?viewerId=${encodeURIComponent(currentViewerId)}`,
        {
          headers: idToken
            ? {
                Authorization: `Bearer ${idToken}`,
              }
            : undefined,
        },
      );
      const data = (await response.json()) as {
        items?: BankrollRecord[];
      };
      const merged = mergeRecords(currentRecords, data.items || []);
      saveLocalRecords(currentViewerId, merged);
      setRecords(merged);
    },
    [getIdToken, user?.uid],
  );

  useEffect(() => {
    if (!viewerId) {
      return;
    }

    setLoading(true);
    const localRecords = loadLocalRecords(viewerId);
    setRecords(localRecords);

    void syncCloud(viewerId, localRecords).finally(() => {
      setLoading(false);
    });
  }, [syncCloud, viewerId]);

  const { filteredRecords, chartPoints, totalProfit } = useMemo(
    () => buildBankrollStats(records, timeRange, customRange),
    [customRange, records, timeRange],
  );

  const { path, pointsWithCoords } = useMemo(
    () => buildChartPath(chartPoints),
    [chartPoints],
  );

  async function persistCloudRecord(record: BankrollRecord) {
    if (!user?.uid) {
      return record;
    }

    const idToken = await getIdToken();
    const response = await fetch("/api/bankroll-records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        viewerId,
        record,
      }),
    });
    const data = (await response.json()) as {
      item?: BankrollRecord;
      error?: string;
    };

    if (!response.ok || !data.item) {
      throw new Error(data.error || "Unable to sync bankroll record.");
    }

    return data.item;
  }

  async function handleAddRecord() {
    const buyInValue = Number(buyIn);
    const cashOutValue = Number(cashOut);

    if (!viewerId) {
      return;
    }

    if (Number.isNaN(buyInValue) || Number.isNaN(cashOutValue)) {
      setMessage("Buy-in and cash-out must both be valid numbers.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const payload: BankrollRecordInput = {
        gameType: "texas_holdem",
        buyInUSD: buyInValue,
        cashOutUSD: cashOutValue,
        dateUTC: new Date(selectedDate).toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}),
      };

      const localRecord: BankrollRecord = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ownerUid: user?.uid || undefined,
        ...payload,
      };

      const nextLocalRecords = [localRecord, ...records];
      saveLocalRecords(viewerId, nextLocalRecords);
      setRecords(nextLocalRecords);

      if (user?.uid) {
        const cloudRecord = await persistCloudRecord(localRecord);
        const syncedRecords = nextLocalRecords.map((record) =>
          record.id === cloudRecord.id ? cloudRecord : record,
        );
        saveLocalRecords(viewerId, syncedRecords);
        setRecords(syncedRecords);
      }

      trackEvent("bankroll_record_added", {
        signed_in: Boolean(user?.uid),
        profit_usd: recordProfit(localRecord),
      });

      setBuyIn("");
      setCashOut("");
      setNote("");
      setSelectedDate(new Date().toISOString().slice(0, 10));
      setTimeRange("all");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save bankroll record.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRecord(recordId: string) {
    if (!viewerId) {
      return;
    }

    const nextRecords = records.filter((record) => record.id !== recordId);
    saveLocalRecords(viewerId, nextRecords);
    setRecords(nextRecords);

    if (!user?.uid) {
      return;
    }

    try {
      const idToken = await getIdToken();
      await fetch(
        `/api/bankroll-records?viewerId=${encodeURIComponent(viewerId)}&recordId=${encodeURIComponent(recordId)}`,
        {
          method: "DELETE",
          headers: idToken
            ? {
                Authorization: `Bearer ${idToken}`,
              }
            : undefined,
        },
      );
    } catch {
      setMessage("Record removed locally, but cloud delete needs a retry.");
    }
  }

  return (
    <main className="px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppNavigation />

        <section className="relative">
          <div className="profit-stage">
            <div
              className={`profit-stage-card ${totalProfit >= 0 ? "" : "is-negative"}`}
            >
              <div className="flex min-h-[188px] items-center justify-center px-6 sm:px-10">
                <p
                  className={`profit-number-display ${
                    totalProfit >= 0 ? "" : "is-negative"
                  }`}
                >
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="space-y-6">
            <section className="panel p-5 sm:p-6">
              <div className="flex flex-wrap gap-3">
                {TIME_RANGE_OPTIONS.map((option) => {
                  const selected = option.value === timeRange;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTimeRange(option.value)}
                      className={`rounded-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                        selected
                          ? "border-[var(--border-strong)] bg-[rgba(214,178,93,0.14)] text-[var(--gold-soft)]"
                          : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {timeRange === "custom" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      From
                    </span>
                    <input
                      type="date"
                      value={
                        customRange.startDate
                          ? customRange.startDate.toISOString().slice(0, 10)
                          : ""
                      }
                      onChange={(event) =>
                        setCustomRange((current) => ({
                          ...current,
                          startDate: event.target.value
                            ? new Date(event.target.value)
                            : null,
                        }))
                      }
                      className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                      To
                    </span>
                    <input
                      type="date"
                      value={
                        customRange.endDate
                          ? customRange.endDate.toISOString().slice(0, 10)
                          : ""
                      }
                      onChange={(event) =>
                        setCustomRange((current) => ({
                          ...current,
                          endDate: event.target.value
                            ? new Date(event.target.value)
                            : null,
                        }))
                      }
                      className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                    />
                  </label>
                </div>
              ) : null}

              <div className="mt-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                {chartPoints.length === 0 ? (
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    No bankroll points yet. Add your first session below.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <svg
                        viewBox="0 0 760 210"
                        className="min-w-[760px]"
                        aria-label="Bankroll line chart"
                      >
                        <defs>
                          <linearGradient id="bankrollStroke" x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0%" stopColor="#f4df9c" />
                            <stop offset="100%" stopColor="#d6b25d" />
                          </linearGradient>
                        </defs>
                        <path
                          d={path}
                          fill="none"
                          stroke="url(#bankrollStroke)"
                          strokeWidth="4"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {pointsWithCoords.map((point) => (
                          <circle
                            key={`${point.label}-${point.x}`}
                            cx={point.px}
                            cy={point.py}
                            r="4.5"
                            fill={point.sessionProfit && point.sessionProfit < 0 ? "#ff8998" : "#f4df9c"}
                          />
                        ))}
                      </svg>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {chartPoints.slice(-3).map((point) => (
                        <div
                          key={`${point.label}-${point.x}`}
                          className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3"
                        >
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                            {point.label}
                          </p>
                          <p className="mt-2 text-sm text-white">
                            {formatCurrency(point.value)}
                          </p>
                          {point.note ? (
                            <p className="mt-1 text-xs text-[var(--muted)]">{point.note}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="panel p-5 sm:p-6">
              <p className="font-heading text-2xl text-white">Add New Record</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Buy-in (USD)
                  </span>
                  <input
                    value={buyIn}
                    onChange={(event) => setBuyIn(event.target.value)}
                    inputMode="decimal"
                    placeholder="200"
                    className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Cash-out (USD)
                  </span>
                  <input
                    value={cashOut}
                    onChange={(event) => setCashOut(event.target.value)}
                    inputMode="decimal"
                    placeholder="380"
                    className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Date
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Note
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional note about lineup, stakes, or session texture"
                    className="min-h-[110px] w-full rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/32 focus:border-[var(--border-strong)]"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Texas Hold&apos;em is fixed for now to match the poker product.
                </p>
                <button
                  type="button"
                  onClick={() => void handleAddRecord()}
                  disabled={busy}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busy ? "Saving..." : "Add Record"}
                </button>
              </div>

              {message ? (
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  {message}
                </p>
              ) : null}
            </section>
          </div>

          <div className="space-y-6">
            <section className="panel p-5 sm:p-6">
              <p className="font-heading text-2xl text-white">Recent Sessions</p>
              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--muted)]">
                    Loading bankroll records...
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--muted)]">
                    No records yet.
                  </div>
                ) : (
                  filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {formatCurrency(recordProfit(record))}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--gold-soft)]">
                            {formatDateLabel(record.dateUTC)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteRecord(record.id)}
                          className="text-xs uppercase tracking-[0.18em] text-white/56 transition hover:text-white"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                        Buy-in ${record.buyInUSD} → Cash-out ${record.cashOutUSD}
                      </p>
                      {record.note ? (
                        <p className="mt-2 text-sm leading-6 text-white/82">
                          {record.note}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
