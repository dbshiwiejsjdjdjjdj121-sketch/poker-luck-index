"use client";

import { useEffect, useState } from "react";
import { AuthLoginModal } from "@/components/auth-login-modal";
import { useAuth } from "@/components/auth-provider";

function getAccountLabel(displayName?: string | null, email?: string | null) {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  if (email?.trim()) {
    return email.trim().split("@")[0] || email.trim();
  }

  return "Signed In";
}

function getInitials(displayName?: string | null, email?: string | null) {
  const source = displayName?.trim() || email?.trim() || "P";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AuthButton() {
  const {
    user,
    loading,
    pendingEmailLink,
    signOut,
    clearAuthFeedback,
  } = useAuth();
  const [busyAction, setBusyAction] = useState<"" | "signout">("");
  const [open, setOpen] = useState(false);
  const isSignedIn = Boolean(user);
  const accountLabel = getAccountLabel(user?.displayName, user?.email);
  const accountInitials = getInitials(user?.displayName, user?.email);

  useEffect(() => {
    if (pendingEmailLink) {
      setOpen(true);
    }
  }, [pendingEmailLink]);

  useEffect(() => {
    if (open && user) {
      setOpen(false);
    }
  }, [open, user]);

  async function handleSignOut() {
    setBusyAction("signout");
    clearAuthFeedback();

    try {
      await signOut();
      setOpen(false);
    } finally {
      setBusyAction("");
    }
  }

  if (isSignedIn) {
    return (
      <div className="relative notranslate" translate="no">
        <button
          type="button"
          onClick={() => {
            clearAuthFeedback();
            setOpen((current) => !current);
          }}
          disabled={loading || busyAction === "signout"}
          className="inline-flex items-center gap-3 rounded-[16px] border border-[var(--border-strong)] bg-white/[0.02] px-3 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[var(--border-strong)] bg-black/30 text-[0.72rem] font-semibold text-white/86">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={accountLabel}
                className="h-full w-full object-cover"
              />
            ) : (
              accountInitials
            )}
          </span>
          <span className="max-w-[8.5rem] truncate normal-case">
            {loading || busyAction === "signout" ? "Loading" : accountLabel}
          </span>
          <span>{open ? "−" : "+"}</span>
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-[24px] border border-[var(--border-strong)] bg-[rgba(31,31,31,0.98)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),var(--shadow)] backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[var(--border-strong)] bg-black/30 text-sm font-semibold text-white/86">
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={accountLabel}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  accountInitials
                )}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/50">
                  Account
                </p>
                <p className="truncate text-sm leading-6 text-white">
                  {accountLabel}
                </p>
                {user?.email ? (
                  <p className="truncate text-sm leading-6 text-[var(--muted)]">
                    {user.email}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              You are signed in and ready to save hand uploads across devices.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={loading || busyAction === "signout"}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busyAction === "signout" ? "Signing Out..." : "Sign Out"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const isBusy = loading || busyAction !== "";

  return (
    <>
      <div className="relative notranslate" translate="no">
        <button
          type="button"
          onClick={() => {
            clearAuthFeedback();
            setOpen(true);
          }}
          disabled={isBusy}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span>{pendingEmailLink ? "✦" : "◌"}</span>
          <span>
            {isBusy
              ? "Loading"
              : pendingEmailLink
                ? "Complete Sign-In"
                : "Sign In"}
          </span>
        </button>
      </div>

      <AuthLoginModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
