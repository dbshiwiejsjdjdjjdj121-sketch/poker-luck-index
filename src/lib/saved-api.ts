import type { Festival } from "./guide-types";
import { SAVED_LIMIT, validFestivalId, type SavedFestival } from "./saved-policy";

export class SavedError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface SavedStore {
  read(uid: string): Promise<SavedFestival[]>;
  update(uid: string, apply: (entries: SavedFestival[]) => SavedFestival[]): Promise<SavedFestival[]>;
}
type Dependencies = {
  verify: (token: string) => Promise<{ uid: string; email_verified?: boolean }>;
  store: SavedStore;
  festival: (id: string) => Festival | undefined;
  now?: () => Date;
};
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
function sameOrigin(request: Request, origin: string) {
  try {
    const supplied = new URL(origin), internal = new URL(request.url);
    // Next.js can reconstruct the internal URL with localhost or HTTP behind a proxy.
    // The HTTP Host remains the authority visited by the browser.
    return supplied.origin === origin && supplied.host === (request.headers.get("host") || internal.host)
      && (supplied.protocol === "https:" || supplied.protocol === internal.protocol);
  } catch { return false; }
}
export function createSavedApi({ verify, store, festival, now = () => new Date() }: Dependencies) {
  async function identify(request: Request) {
    const match = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") || "");
    if (!match || match[1].length > 16000) throw new SavedError(401, "Sign in with email to manage your saved festivals.");
    let identity;
    try { identity = await verify(match[1]); } catch { throw new SavedError(401, "Your session has expired. Please sign in again."); }
    if (!identity.uid || identity.uid.includes("/") || !identity.email_verified) throw new SavedError(401, "Verify your email to save festivals.");
    return identity.uid;
  }
  async function handle(request: Request, operation: "read" | "save" | "remove", id?: string) {
    try {
      const uid = await identify(request);
      if (operation !== "read") {
        const origin = request.headers.get("origin");
        if (origin && !sameOrigin(request, origin)) throw new SavedError(403, "Open this page on ALL IN Poker Guide to make changes.");
        if (!id || !validFestivalId(id)) throw new SavedError(400, "Invalid festival.");
      }
      let entries: SavedFestival[];
      if (operation === "read") entries = await store.read(uid);
      else {
        const f = operation === "save" ? festival(id!) : undefined;
        if (operation === "save" && !f) throw new SavedError(404, "This festival is not available to save.");
        entries = await store.update(uid, current => {
          if (operation === "remove") return current.filter(entry => entry.festivalId !== id);
          if (current.some(entry => entry.festivalId === id)) return current;
          if (current.length >= SAVED_LIMIT) throw new SavedError(409, `You can save up to ${SAVED_LIMIT} festivals. Remove one before adding another.`);
          return [...current, { festivalId: id!, savedAt: now().toISOString(), datesWhenSaved: { startDate: f!.startDate, endDate: f!.endDate } }];
        });
      }
      return Response.json({ entries }, { headers });
    } catch (error) {
      return Response.json({ error: error instanceof SavedError ? error.message : "Saved festivals are temporarily unavailable. Please try again." }, { status: error instanceof SavedError ? error.status : 503, headers });
    }
  }
  return { list: (request: Request) => handle(request, "read"), save: (request: Request, id: string) => handle(request, "save", id), remove: (request: Request, id: string) => handle(request, "remove", id) };
}
