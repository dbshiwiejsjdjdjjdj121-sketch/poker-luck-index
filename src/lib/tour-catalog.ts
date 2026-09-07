import catalog from "../../data/tours.json";
import type { Festival, Filters, TourFamily } from "./guide-types";
export const tourFamilies = catalog as TourFamily[];
export function tourFamily(id: string | undefined) { return tourFamilies.find(tour => tour.id === id); }
export function familyForSeries(series: string) { return tourFamilies.find(family => family.series.includes(series) || series.toLowerCase().startsWith(family.label.toLowerCase() + " ")); }
export function matchesSeries(festival: Festival, series: string) { return festival.tour === series || (series === "WPT Prime" && festival.tour === "WPT" && festival.tournaments.some(event => /^WPT Prime\b/.test(event.name))); }
export function matchesTourFamily(festival: Festival, id: string) { return familyForSeries(festival.tour)?.id === id; }
export function tourSearchText(festival: Festival) {
  const family = familyForSeries(festival.tour);
  return [festival.tour, family?.label, family?.fullName, ...(family?.keywords || [])].join(" ");
}
export function tourFilterHref(filters: Filters, id?: string) {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(filters)) if (value && key !== "brand" && key !== "tour") params.set(key,value);
  if (id) params.set("brand", id);
  return "/tournaments" + (params.size ? "?" + params : "");
}
