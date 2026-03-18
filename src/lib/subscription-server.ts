import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { FREE_SUBSCRIPTION, type SubscriptionSnapshot } from "@/lib/subscription";

function readPremiumUidSet() {
  return new Set(
    (process.env.PREMIUM_UIDS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export async function getSubscriptionSnapshot(
  uid: string | null,
): Promise<SubscriptionSnapshot> {
  if (!uid) {
    return FREE_SUBSCRIPTION;
  }

  const premiumUids = readPremiumUidSet();

  if (premiumUids.has(uid)) {
    return {
      uid,
      plan: "pro",
      status: "active",
      premium: true,
      source: "env",
    };
  }

  try {
    const doc = await getFirebaseAdminDb().collection("user_access").doc(uid).get();
    const data = doc.data() as
      | {
          premium?: boolean;
          plan?: string;
          status?: string;
          source?: string;
        }
      | undefined;

    const premium = Boolean(data?.premium || data?.status === "active" || data?.plan === "pro");

    return {
      uid,
      plan: premium ? "pro" : "free",
      status: premium ? "active" : "inactive",
      premium,
      source: data?.source || "firestore",
    };
  } catch {
    return {
      ...FREE_SUBSCRIPTION,
      uid,
      source: "fallback",
    };
  }
}

export async function assertPremiumAccess(uid: string | null) {
  if (!uid) {
    throw new Error("Sign in with Google to use premium AI features.");
  }

  const snapshot = await getSubscriptionSnapshot(uid);

  if (!snapshot.premium) {
    throw new Error("Premium subscription required for this AI feature.");
  }

  return snapshot;
}
