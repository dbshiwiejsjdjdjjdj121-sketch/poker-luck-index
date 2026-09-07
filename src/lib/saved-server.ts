import { getFirebaseAdminAuth, getFirebaseAdminDb } from "./firebase-admin";
import { festivals } from "./guide-data";
import { createSavedApi, type SavedStore } from "./saved-api";
import type { SavedFestival } from "./saved-policy";

// This collection is denied to client SDKs by the project's existing Firestore rules.
// All access goes through verified, non-revoked ID tokens; the request never supplies a UID.
const documentFor = (uid: string) => getFirebaseAdminDb().collection("guideSavedFestivals").doc(uid);
const store: SavedStore = {
  async read(uid) { return (await documentFor(uid).get()).data()?.entries as SavedFestival[] || []; },
  async update(uid, apply) {
    const ref = documentFor(uid);
    return getFirebaseAdminDb().runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const current = (snapshot.data()?.entries as SavedFestival[] | undefined) || [];
      const entries = apply(current);
      if (JSON.stringify(entries) !== JSON.stringify(current)) transaction.set(ref, { entries });
      return entries;
    });
  },
};
export const savedApi = createSavedApi({ verify: token => getFirebaseAdminAuth().verifyIdToken(token, true), store, festival: id => festivals.find(f => f.id === id) });

