import { FieldValue } from "firebase-admin/firestore";
import {
  creemConfigured,
  getCreemProductId,
  normalizeCreemWebhookEvent,
} from "@/lib/creem";
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
  const checkoutConfigured = creemConfigured();

  if (!uid) {
    return {
      ...FREE_SUBSCRIPTION,
      checkoutConfigured,
      billingProvider: checkoutConfigured ? "creem" : "none",
    };
  }

  const premiumUids = readPremiumUidSet();

  if (premiumUids.has(uid)) {
    return {
      uid,
      plan: "pro",
      status: "active",
      premium: true,
      source: "env",
      billingProvider: checkoutConfigured ? "creem" : "none",
      checkoutConfigured,
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
      billingProvider: checkoutConfigured ? "creem" : "none",
      checkoutConfigured,
    };
  } catch {
    return {
      ...FREE_SUBSCRIPTION,
      uid,
      source: "fallback",
      billingProvider: checkoutConfigured ? "creem" : "none",
      checkoutConfigured,
    };
  }
}

export async function assertPremiumAccess(uid: string | null) {
  if (!uid) {
    throw new Error("Sign in to use premium AI features.");
  }

  const snapshot = await getSubscriptionSnapshot(uid);

  if (!snapshot.premium) {
    throw new Error("Premium subscription required for this AI feature.");
  }

  return snapshot;
}

type CreemAccessUpdate = {
  uid: string;
  email?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  grantAccess: boolean;
  source: string;
};

async function writeSubscriptionAccess(update: CreemAccessUpdate) {
  const db = getFirebaseAdminDb();
  const ref = db.collection("user_access").doc(update.uid);

  await ref.set(
    {
      uid: update.uid,
      email: update.email || "",
      premium: update.grantAccess,
      plan: update.grantAccess ? "pro" : "free",
      status: update.grantAccess ? "active" : "inactive",
      source: update.source,
      provider: "creem",
      productId: getCreemProductId() || "",
      customerId: update.customerId || "",
      subscriptionId: update.subscriptionId || "",
      currentPeriodEnd: update.currentPeriodEnd || null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function syncCreemSubscriptionFromWebhook(payload: unknown) {
  const event = normalizeCreemWebhookEvent(payload);
  const productId = getCreemProductId();

  if (!event.type || !event.firebaseUid) {
    return null;
  }

  if (!productId || event.productId !== productId) {
    return null;
  }

  if (!event.shouldGrantAccess && !event.shouldRevokeAccess) {
    return null;
  }

  await writeSubscriptionAccess({
    uid: event.firebaseUid,
    email: event.customerEmail,
    customerId: event.customerId,
    subscriptionId: event.subscriptionId,
    currentPeriodEnd: event.currentPeriodEnd,
    grantAccess: event.shouldGrantAccess,
    source: `creem:${event.type}`,
  });

  return getSubscriptionSnapshot(event.firebaseUid);
}
