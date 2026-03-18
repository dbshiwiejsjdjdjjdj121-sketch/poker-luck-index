import type {
  BankrollRecord,
  ChartPoint,
  CustomRange,
  TimeRangeFilter,
} from "@/lib/bankroll-types";

const ensureDateOrder = (start: Date, end: Date) => {
  if (start.getTime() > end.getTime()) {
    return {
      startDate: end,
      endDate: start,
    };
  }
  return { startDate: start, endDate: end };
};

const isWithinCustomRange = (
  record: BankrollRecord,
  range: { startDate: Date; endDate: Date },
) => {
  const dateMs = new Date(record.dateUTC).getTime();
  return (
    dateMs >= range.startDate.getTime() && dateMs <= range.endDate.getTime()
  );
};

export const recordProfit = (record: BankrollRecord) =>
  record.cashOutUSD - record.buyInUSD;

export function filterBankrollRecords(
  records: BankrollRecord[],
  timeRange: TimeRangeFilter,
  customRange: CustomRange,
) {
  if (timeRange === "all") {
    return records;
  }

  if (timeRange === "custom") {
    if (!customRange.startDate || !customRange.endDate) {
      return records;
    }

    const normalized = ensureDateOrder(
      customRange.startDate,
      customRange.endDate,
    );

    return records.filter((record) => isWithinCustomRange(record, normalized));
  }

  return records;
}

function buildMonthlyView(records: BankrollRecord[]) {
  const now = new Date();
  const monthAnchors: Date[] = [];

  for (let index = 11; index >= 0; index -= 1) {
    monthAnchors.push(new Date(now.getFullYear(), now.getMonth() - index, 1));
  }

  const startDate = new Date(
    monthAnchors[0].getFullYear(),
    monthAnchors[0].getMonth(),
    1,
  );

  const relevantRecords = records.filter(
    (record) => new Date(record.dateUTC) >= startDate,
  );
  const profitByMonth = new Map<string, number>();

  relevantRecords.forEach((record) => {
    const date = new Date(record.dateUTC);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    profitByMonth.set(key, (profitByMonth.get(key) ?? 0) + recordProfit(record));
  });

  let rolling = 0;
  const chartPoints: ChartPoint[] = monthAnchors.map((anchor, index) => {
    const key = `${anchor.getFullYear()}-${anchor.getMonth()}`;
    const monthProfit = profitByMonth.get(key) ?? 0;
    rolling += monthProfit;
    const monthRecords = relevantRecords.filter((record) => {
      const date = new Date(record.dateUTC);

      return (
        date.getFullYear() === anchor.getFullYear() &&
        date.getMonth() === anchor.getMonth()
      );
    });

    return {
      x: index,
      label: anchor.toLocaleDateString("en-US", { month: "short" }),
      value: rolling,
      sessionProfit: monthProfit,
      note:
        monthRecords.length > 0
          ? `${monthRecords.length} session${monthRecords.length > 1 ? "s" : ""}`
          : undefined,
    };
  });

  return {
    filteredRecords: relevantRecords,
    chartPoints,
    totalProfit: chartPoints.at(-1)?.value ?? 0,
  };
}

function buildYearlyView(records: BankrollRecord[]) {
  const now = new Date();
  const years: number[] = [];

  for (let index = 4; index >= 0; index -= 1) {
    years.push(now.getFullYear() - index);
  }

  const startDate = new Date(years[0], 0, 1);
  const relevantRecords = records.filter(
    (record) => new Date(record.dateUTC) >= startDate,
  );
  const profitByYear = new Map<number, number>();

  relevantRecords.forEach((record) => {
    const date = new Date(record.dateUTC);
    const year = date.getFullYear();
    profitByYear.set(year, (profitByYear.get(year) ?? 0) + recordProfit(record));
  });

  let rolling = 0;
  const chartPoints: ChartPoint[] = years.map((year, index) => {
    const yearProfit = profitByYear.get(year) ?? 0;
    rolling += yearProfit;
    const yearRecords = relevantRecords.filter(
      (record) => new Date(record.dateUTC).getFullYear() === year,
    );

    return {
      x: index,
      label: String(year),
      value: rolling,
      sessionProfit: yearProfit,
      note:
        yearRecords.length > 0
          ? `${yearRecords.length} session${yearRecords.length > 1 ? "s" : ""}`
          : undefined,
    };
  });

  return {
    filteredRecords: relevantRecords,
    chartPoints,
    totalProfit: chartPoints.at(-1)?.value ?? 0,
  };
}

function buildChartPoints(
  records: BankrollRecord[],
  timeRange: TimeRangeFilter,
): ChartPoint[] {
  if (!records.length) {
    return [];
  }

  const sorted = [...records].sort(
    (left, right) =>
      new Date(left.dateUTC).getTime() - new Date(right.dateUTC).getTime(),
  );

  if (timeRange === "all" || timeRange === "custom") {
    const firstRecordDate = new Date(sorted[0]!.dateUTC);
    const startDate = new Date(firstRecordDate);
    startDate.setDate(startDate.getDate() - 1);

    const startPoint: ChartPoint = {
      x: 0,
      label: startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: 0,
      sessionProfit: 0,
      note: "Start",
    };

    let rolling = 0;
    const dataPoints = sorted.map((record, index) => {
      const sessionProfit = recordProfit(record);
      rolling += sessionProfit;
      const date = new Date(record.dateUTC);

      return {
        x: index + 1,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: rolling,
        sessionProfit,
        note: record.note,
      };
    });

    return [startPoint, ...dataPoints];
  }

  let rolling = 0;

  return sorted.map((record, index) => {
    const sessionProfit = recordProfit(record);
    rolling += sessionProfit;
    const date = new Date(record.dateUTC);

    return {
      x: index,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: rolling,
      sessionProfit,
      note: record.note,
    };
  });
}

export function buildBankrollStats(
  records: BankrollRecord[],
  timeRange: TimeRangeFilter,
  customRange: CustomRange,
) {
  if (timeRange === "monthly") {
    return buildMonthlyView(records);
  }

  if (timeRange === "yearly") {
    return buildYearlyView(records);
  }

  const filteredRecords = filterBankrollRecords(records, timeRange, customRange);

  return {
    filteredRecords,
    chartPoints: buildChartPoints(filteredRecords, timeRange),
    totalProfit: filteredRecords.reduce(
      (sum, record) => sum + recordProfit(record),
      0,
    ),
  };
}
