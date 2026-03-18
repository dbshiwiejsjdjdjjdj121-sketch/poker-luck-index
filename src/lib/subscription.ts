export type SubscriptionPlan = "free" | "pro";
export type SubscriptionStatus = "inactive" | "active";

export interface SubscriptionSnapshot {
  uid: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  premium: boolean;
  source: string;
}

export const FREE_SUBSCRIPTION: SubscriptionSnapshot = {
  uid: null,
  plan: "free",
  status: "inactive",
  premium: false,
  source: "default",
};
