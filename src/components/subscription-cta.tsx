"use client";

import { useSubscription } from "@/components/subscription-provider";

type SubscriptionCtaProps = {
  title?: string;
  description: string;
  className?: string;
  compact?: boolean;
};

export function SubscriptionCta({
  title = "Poker Luck Index Pro",
  description,
  className = "",
  compact = false,
}: SubscriptionCtaProps) {
  const {
    subscription,
    checkoutBusy,
    checkoutError,
    billingNotice,
    startCheckout,
    clearCheckoutError,
    clearBillingNotice,
  } = useSubscription();

  const configured = subscription.checkoutConfigured;

  return (
    <section
      className={`rounded-[24px] border border-[var(--border-strong)] bg-[rgba(214,178,93,0.08)] p-5 ${className}`.trim()}
    >
      <div className="space-y-3">
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
          {title}
        </p>
        <p className="text-sm leading-6 text-white/90">{description}</p>
        <p className="text-sm leading-6 text-[var(--muted)]">
          $9.99 / month unlocks voice upload, screenshot parsing, and AI hand
          analysis.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            clearCheckoutError();
            clearBillingNotice();
            void startCheckout();
          }}
          disabled={checkoutBusy || !configured}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
        >
          {checkoutBusy ? "Opening Checkout..." : "Subscribe For $9.99 / Month"}
        </button>
        {!compact ? (
          <p className="self-center text-xs uppercase tracking-[0.22em] text-[var(--gold-soft)]">
            Powered by Creem
          </p>
        ) : null}
      </div>

      {!configured ? (
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Creem is not configured yet. Add the product ID, API key, and webhook
          secret to finish billing setup.
        </p>
      ) : null}

      {billingNotice ? (
        <p className="mt-4 text-sm leading-6 text-[#d8f3b1]">{billingNotice}</p>
      ) : null}

      {checkoutError ? (
        <p className="mt-4 text-sm leading-6 text-[#ffb2bc]">{checkoutError}</p>
      ) : null}
    </section>
  );
}
