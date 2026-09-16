export type Money = { amount: number; currency: string };
export type Source = { id: string; title: string; url: string; checkedAt: string; kind: "schedule" | "travel" | "tax" | "organizer" };
export type Session = { id: string; label: string; date: string; time: string | null; kind: "entry" | "continuation"; registrationCloses?: string | null };
export type Tournament = {
  id: string; slug: string; name: string; number: string; game: string;
  category: "main" | "side" | "satellite"; buyIn: Money | null; fee: Money | null;
  guarantee: Money | null; startingStack: string | null; levels: string | null;
  reentry: string | null; lateRegistration: string | null; endDate: string | null;
  sessions: Session[]; sourceIds: string[];
};
export type Festival = {
  id: string; slug: string; name: string; tour: string; destinationId: string;
  previousEditionId?: string;
  startDate: string; endDate: string; dateNote: string | null; timezone: string;
  venue: { name: string; address: string | null; url: string | null };
  status: "scheduled" | "postponed" | "cancelled";
  description: string; registration: string | null; registrationUrl: string;
  scheduleUrl: string; scheduleCoverage: string; sourceIds: string[];
  checkedAt: string; updatedAt: string; reviewNote: string | null;
  changes: { date: string; text: string }[]; tournaments: Tournament[];
};
export type TravelItem = { title: string; detail: string; url: string; sourceId: string };
export type Destination = {
  indexable?: boolean;
  id: string; country: string; countryCode: string; countrySlug: string; city: string; slug: string;
  region: string; intro: string; airport: TravelItem; transport: TravelItem[];
  hotels: TravelItem[]; dining: TravelItem[]; tax: { text: string; sourceIds: string[] };
  updatedAt: string;
};
export type GuideData = { festivals: Festival[]; destinations: Destination[]; sources: Source[] };
export type TourFamily = { id: string; label: string; fullName: string; series: string[]; keywords: string[]; officialUrl: string; featured: boolean; description: string; checkedAt: string };
export type TourGuide = {
  tourId: string; title: string; description: string; intro: string;
  formats: { title: string; description: string; series: string | null }[];
  planning: { title: string; description: string }[];
  sourceIds: string[]; checkedAt: string; updatedAt: string;
};
export type Filters = { q?: string; from?: string; to?: string; country?: string; city?: string; brand?: string; tour?: string; game?: string; currency?: string; min?: string; max?: string; status?: string };

export type FreerollSlot = {
  id: string; label: string; date: string; time: string | null;
  timezone: string; sourceId: string;
};
export type Freeroll = {
  id: string; slug: string; title: string; brand: string;
  description: string; mode: "online" | "live";
  status: "published" | "paused" | "ended";
  market: { label: string; countries: string[]; usStates: string[]; note: string };
  entry: {
    buyIn: 0; deposit: "not-required" | "required" | "unknown";
    ticket: "required" | "varies" | "not-required";
    password: "required" | "varies" | "not-required" | "unknown";
    requirements: string[]; costNote: string;
  };
  reward: { label: string; details: string };
  schedule: { text: string; timezone: string | null; endDate: string | null; slots: FreerollSlot[] };
  sections: { title: string; text: string }[];
  officialLinks: { label: string; url: string; kind: "rules" | "schedule" | "explanation"; sourceId: string }[];
  sourceIds: string[]; checkedAt: string; updatedAt: string; reviewNote: string | null;
};
export type FreerollFilters = { q?: string; mode?: string; country?: string; state?: string; entry?: string; when?: string };
