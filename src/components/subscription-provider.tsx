"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { FREE_SUBSCRIPTION, type SubscriptionSnapshot } from "@/lib/subscription";

type SubscriptionContextValue = {
  loading: boolean;
  subscription: SubscriptionSnapshot;
  checkoutBusy: boolean;
  checkoutError: string;
  billingNotice: string;
  refresh: () => Promise<SubscriptionSnapshot>;
  startCheckout: () => Promise<void>;
  clearCheckoutError: () => void;
  clearBillingNotice: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, getIdToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [subscription, setSubscription] =
    useState<SubscriptionSnapshot>(FREE_SUBSCRIPTION);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const idToken = await getIdToken();
      const response = await fetch(
        `/api/subscription-status?viewerId=${encodeURIComponent(user?.uid || "")}`,
        {
          cache: "no-store",
          headers: idToken
            ? {
                Authorization: `Bearer ${idToken}`,
              }
            : undefined,
        },
      );
      const data = (await response.json()) as {
        subscription?: SubscriptionSnapshot;
      };
      const snapshot = data.subscription || FREE_SUBSCRIPTION;
      setSubscription(snapshot);
      return snapshot;
    } catch {
      setSubscription(FREE_SUBSCRIPTION);
      return FREE_SUBSCRIPTION;
    } finally {
      setLoading(false);
    }
  }, [getIdToken, user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);

    if (currentUrl.searchParams.get("billing") !== "success") {
      return;
    }

    let cancelled = false;
    setCheckoutError("");
    setBillingNotice("Checkout completed. Refreshing your Pro access...");
    router.replace(pathname);

    async function syncAccess() {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const snapshot = await refresh();

        if (cancelled) {
          return;
        }

        if (snapshot.premium) {
          setBillingNotice("Pro access is active.");
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (!cancelled) {
        setBillingNotice(
          "Checkout finished. If Pro access does not appear within a minute, refresh this page.",
        );
      }
    }

    void syncAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, refresh, router]);

  const value = useMemo(
    () => ({
      loading,
      checkoutBusy,
      checkoutError,
      billingNotice,
      subscription,
      refresh,
      async startCheckout() {
        setCheckoutBusy(true);
        setCheckoutError("");
        setBillingNotice("");

        try {
          const idToken = await getIdToken();
          const response = await fetch("/api/billing/creem/checkout", {
            method: "POST",
            headers: idToken
              ? {
                  Authorization: `Bearer ${idToken}`,
                }
              : undefined,
          });
          const data = (await response.json()) as {
            checkoutUrl?: string;
            error?: string;
          };

          if (!response.ok || !data.checkoutUrl) {
            throw new Error(
              data.error || "Unable to start the Creem checkout right now.",
            );
          }

          window.location.assign(data.checkoutUrl);
        } catch (error) {
          setCheckoutError(
            error instanceof Error
              ? error.message
              : "Unable to start the Creem checkout right now.",
          );
        } finally {
          setCheckoutBusy(false);
        }
      },
      clearCheckoutError() {
        setCheckoutError("");
      },
      clearBillingNotice() {
        setBillingNotice("");
      },
    }),
    [
      billingNotice,
      checkoutBusy,
      checkoutError,
      getIdToken,
      loading,
      refresh,
      subscription,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error("useSubscription must be used inside SubscriptionProvider.");
  }

  return context;
}
