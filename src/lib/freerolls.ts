import type { Freeroll, FreerollFilters, FreerollSlot } from "./guide-types";

export function localDay(now: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {timeZone: timezone, year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
export function freerollStale(f: Freeroll, now = new Date()) {
  return now.getTime() - Date.parse(f.checkedAt) > 48 * 3600000;
}
export function freerollEnded(f: Freeroll, now = new Date()) {
  return f.status === "ended" || (f.schedule.endDate !== null && f.schedule.endDate < localDay(now, f.schedule.timezone || "Etc/UTC"));
}
export function availableSlots(f: Freeroll, when = "week", now = new Date()): FreerollSlot[] {
  if (f.status !== "published" || freerollEnded(f, now) || freerollStale(f, now)) return [];
  return f.schedule.slots.filter(slot => {
    const today = localDay(now, slot.timezone);
    const end = new Date(today + "T12:00:00Z");
    end.setUTCDate(end.getUTCDate() + (when === "today" ? 0 : 6));
    if (slot.date < today || slot.date > end.toISOString().slice(0,10)) return false;
    // Once a known start passes, don't advertise registration as still available.
    // Unknown times remain date-only listings, never invented midnight sessions.
    if (slot.date === today && slot.time !== null) {
      const time = new Intl.DateTimeFormat("en-GB", {timeZone:slot.timezone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(now);
      return slot.time > time;
    }
    return true;
  }).sort((a,b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")));
}
export function filterFreerolls(items: Freeroll[], filters: FreerollFilters, now = new Date()) {
  return items.filter(f => {
    if (freerollEnded(f, now) || f.status !== "published") return false;
    if (filters.mode && f.mode !== filters.mode) return false;
    if (filters.country && !f.market.countries.includes(filters.country)) return false;
    if (filters.state && (!f.market.countries.includes("US") || !f.market.usStates.includes(filters.state))) return false;
    if (filters.entry === "no-deposit" && f.entry.deposit !== "not-required") return false;
    if (filters.q && ![f.title,f.brand,f.description,f.market.label].join(" ").toLowerCase().includes(filters.q.trim().toLowerCase())) return false;
    if (["today","week"].includes(filters.when || "") && !availableSlots(f, filters.when, now).length) return false;
    return true;
  });
}
export const entryLabel = (f: Freeroll) => f.entry.deposit === "not-required" ? "No deposit required" : f.entry.deposit === "required" ? "Deposit condition" : "Other costs / conditions";
