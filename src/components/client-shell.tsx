"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { SubscriptionProvider } from "@/components/subscription-provider";

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SubscriptionProvider>{children}</SubscriptionProvider>
    </AuthProvider>
  );
}
