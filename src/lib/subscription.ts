export type SubscriptionPlan = "free" | "pro";
export type SubscriptionStatus = "inactive" | "active";
export type BillingProvider = "none" | "creem";

export interface SubscriptionSnapshot {
  uid: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  premium: boolean;
  source: string;
  billingProvider: BillingProvider;
  checkoutConfigured: boolean;
}

export const FREE_SUBSCRIPTION: SubscriptionSnapshot = {
  uid: null,
  plan: "free",
  status: "inactive",
  premium: false,
  source: "default",
  billingProvider: "none",
  checkoutConfigured: false,
};
