"use client";

import { useEffect } from "react";
import { AuthLoginModal } from "@/components/auth-login-modal";
import { useAuth } from "@/components/auth-provider";
import { ProPricingModal } from "@/components/pro-pricing-modal";
import { useSubscription } from "@/components/subscription-provider";

export type PremiumAction = "voice" | "screenshot" | "analysis";

const COPY: Record<
  PremiumAction,
  {
    label: string;
    pricingReadyCopy: string;
  }
> = {
  voice: {
    label: "Voice Upload",
    pricingReadyCopy: "Your voice upload is next.",
  },
  screenshot: {
    label: "Screenshot Upload",
    pricingReadyCopy: "Your screenshot upload is next.",
  },
  analysis: {
    label: "AI Hand Analysis",
    pricingReadyCopy: "Your saved hand is ready.",
  },
};

type Props = {
  open: boolean;
  action: PremiumAction | null;
  onClose: () => void;
};

export function PremiumActionGateModal({ open, action, onClose }: Props) {
  const { user, clearAuthFeedback } = useAuth();
  const {
    subscription,
    checkoutBusy,
    checkoutError,
    clearCheckoutError,
    startCheckout,
  } = useSubscription();

  useEffect(() => {
    if (!open) {
      clearAuthFeedback();
      clearCheckoutError();
    }
  }, [clearAuthFeedback, clearCheckoutError, open]);

  if (!open || !action) {
    return null;
  }

  const copy = COPY[action];
  const step = user ? "pricing" : "login";
  return (
    <>
      <AuthLoginModal
        open={step === "login"}
        onClose={onClose}
        title="Keep your poker history in one place"
        description="Use one account to save your hand history, keep bankroll records and Pro access, and reopen saved hands across phone and desktop."
      />
      <ProPricingModal
        open={step === "pricing"}
        onClose={onClose}
        onPurchase={startCheckout}
        purchasing={checkoutBusy}
        purchaseDisabled={!subscription.checkoutConfigured}
        purchaseError={checkoutError}
        actionLabel={copy.label}
        actionReadyCopy={copy.pricingReadyCopy}
        accountEmail={user?.email || user?.displayName}
      />
    </>
  );
}
