import type { Festival, Filters, Money, Tournament } from "./guide-types";

export function localToday(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function statusOf(f: Festival, now = new Date()) {
  if (f.status !== "scheduled") return f.status;
  const today = localToday(f.timezone, now);
  return f.endDate < today ? "ended" : f.startDate <= today ? "ongoing" : "upcoming";
}
export function formatDate(date: string, year = false) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}
export function dateRange(start: string, end: string) {
  return start === end ? formatDate(start, true) : `${formatDate(start)} – ${formatDate(end, true)}`;
}
export function money(value: Money | null | undefined) {
  return value ? `${value.currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value.amount)}` : "Not confirmed";
}
export function mainEvent(f: Festival) { return f.tournaments.find(t => t.category === "main"); }
export function buyInRange(f: Festival) {
  const values = f.tournaments.filter(t => t.category !== "satellite" && t.buyIn).map(t => t.buyIn!);
  const currencies = [...new Set(values.map(v => v.currency))];
  if (!values.length) return "Buy-ins to be confirmed";
  if (currencies.length > 1) return "Multiple currencies";
  const amounts = values.map(v => v.amount), lo = Math.min(...amounts), hi = Math.max(...amounts);
  return lo === hi ? money(values[0]) : `${money({ amount: lo, currency: currencies[0] })} – ${hi.toLocaleString("en-US")}`;
}
export function isStale(f: Festival, now = new Date()) {
  const daysUntil = (Date.parse(f.startDate) - now.getTime()) / 86400000;
  const allowance = daysUntil <= 30 ? 2 : 8;
  return (now.getTime() - Date.parse(f.checkedAt)) / 86400000 > allowance;
}
export function matchesTournament(t: Tournament, filters: Filters, nowDate?: string) {
  if (filters.game && t.game !== filters.game) return false;
  if (filters.currency && t.buyIn?.currency !== filters.currency) return false;
  const min = filters.min ? Number(filters.min) : NaN, max = filters.max ? Number(filters.max) : NaN;
  if (filters.currency && Number.isFinite(min) && (!t.buyIn || t.buyIn.amount < min)) return false;
  if (filters.currency && Number.isFinite(max) && (!t.buyIn || t.buyIn.amount > max)) return false;
  if (filters.from || filters.to || nowDate) {
    const dates = t.sessions.map(s => s.date).sort();
    if (!dates.length) return false;
    const end = t.endDate || dates.at(-1)!;
    if (end < (filters.from || nowDate || "0000")) return false;
    if (filters.to && dates[0] > filters.to) return false;
  }
  return true;
}
export function filterFestivals(festivals: Festival[], filters: Filters, cityNames: Record<string, string>, now = new Date()) {
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return festivals.filter(f => {
    const state = statusOf(f, now), dest = cityNames[f.destinationId] || "";
    if (!filters.status || filters.status === "upcoming") { if (state !== "ongoing" && state !== "upcoming") return false; }
    else if (filters.status !== "all" && state !== filters.status) return false;
    if (filters.country && !f.destinationId.startsWith(filters.country + "/")) return false;
    if (filters.city && f.destinationId !== filters.city) return false;
    if (filters.tour && f.tour !== filters.tour) return false;
    if (filters.q && !`${f.name} ${f.venue.name} ${dest}`.toLowerCase().includes(filters.q.trim().toLowerCase())) return false;
    if (filters.from && f.endDate < filters.from) return false;
    if (filters.to && f.startDate > filters.to) return false;
    if (filters.game || filters.currency || (filters.currency && (filters.min || filters.max))) {
      return f.tournaments.some(t => matchesTournament(t, { game: filters.game, currency: filters.currency, min: filters.min, max: filters.max }));
    }
    return true;
  }).sort((a,b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
}
export function serializeJsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
