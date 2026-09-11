import guideJson from "../../data/tour-guides.json";
import type { TourGuide } from "./guide-types";

export const tourGuides = guideJson as TourGuide[];
export const tourGuideFor = (id: string | undefined) => tourGuides.find(guide => guide.tourId === id);
export const tourGuideHref = (id: string) => tourGuideFor(id) ? `/tours/${id}` : undefined;
