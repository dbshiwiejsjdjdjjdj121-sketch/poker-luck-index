import { destinations, festivals } from "./guide-data";
import { filterFestivals } from "./guide-utils";
import type { TourGuide } from "./guide-types";
import { matchesTourFamily } from "./tour-catalog";

export function tourGuideFestivals(id: string, now = new Date()) {
  return filterFestivals(festivals, { brand: id }, {}, now);
}

export function tourGuideModified(guide: TourGuide) {
  const related = festivals.filter(f => matchesTourFamily(f, guide.tourId));
  const destinationIds = new Set(related.map(f => f.destinationId));
  return [guide.updatedAt, ...related.map(f => f.updatedAt), ...destinations.filter(d => destinationIds.has(d.id)).map(d => d.updatedAt)].sort().at(-1)!;
}
