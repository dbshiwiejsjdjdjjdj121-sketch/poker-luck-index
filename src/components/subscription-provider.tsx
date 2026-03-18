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
import { useAuth } from "@/components/auth-provider";
import { FREE_SUBSCRIPTION, type SubscriptionSnapshot } from "@/lib/subscription";

type SubscriptionContextValue = {
  loading: boolean;
  subscription: SubscriptionSnapshot;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, getIdToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] =
    useState<SubscriptionSnapshot>(FREE_SUBSCRIPTION);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const idToken = await getIdToken();
      const response = await fetch(
        `/api/subscription-status?viewerId=${encodeURIComponent(user?.uid || "")}`,
        {
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
      setSubscription(data.subscription || FREE_SUBSCRIPTION);
    } catch {
      setSubscription(FREE_SUBSCRIPTION);
    } finally {
      setLoading(false);
    }
  }, [getIdToken, user?.uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      loading,
      subscription,
      refresh,
    }),
    [loading, refresh, subscription],
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
