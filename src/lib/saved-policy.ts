import type { Festival } from "./guide-types";
import { localToday, statusOf } from "./guide-utils";

export type SavedFestival = {
  festivalId: string;
  savedAt: string;
  datesWhenSaved: { startDate: string; endDate: string };
};
export const SAVED_LIMIT = 500;
export function validFestivalId(id: string) { return /^[a-z0-9-]{1,100}$/.test(id); }
export function safeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/saved";
  const url = new URL(value, "https://www.allinpokerai.com");
  return /^\/(?:$|tournaments(?:\/|$)|tours(?:\/|$)|destinations(?:\/|$)|saved$)/.test(url.pathname) ? url.pathname + url.search + url.hash : "/saved";
}
export function savedSignInUrl(festivalId: string, returnTo: string) {
  return "/account?" + new URLSearchParams({ save: festivalId, returnTo: safeReturnPath(returnTo) });
}
export function datesChanged(entry: SavedFestival, festival: Festival) {
  return entry.datesWhenSaved.startDate !== festival.startDate || entry.datesWhenSaved.endDate !== festival.endDate;
}
export function savedIsPast(festival: Festival, now = new Date()) {
  return statusOf(festival, now) === "ended" || (festival.status === "cancelled" && festival.endDate < localToday(festival.timezone, now));
}
