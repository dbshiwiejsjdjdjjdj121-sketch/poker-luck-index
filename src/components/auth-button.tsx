"use client";

import { useEffect, useState } from "react";
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
    authError,
    authMessage,
    pendingEmailLink,
    signInWithGoogle,
    requestEmailSignInLink,
    completeEmailLink,
    signOut,
    clearAuthFeedback,
  } = useAuth();
  const [busyAction, setBusyAction] = useState<
    "" | "google" | "email" | "complete" | "signout"
  >("");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const isSignedIn = Boolean(user);
  const accountLabel = getAccountLabel(user?.displayName, user?.email);
  const accountInitials = getInitials(user?.displayName, user?.email);

  useEffect(() => {
    if (pendingEmailLink) {
      setOpen(true);
    }
  }, [pendingEmailLink]);

  async function handleGoogleSignIn() {
    setBusyAction("google");
    clearAuthFeedback();

    try {
      await signInWithGoogle();
      setOpen(false);
    } finally {
      setBusyAction("");
    }
  }

  async function handleEmailLinkRequest() {
    setBusyAction("email");
    clearAuthFeedback();

    try {
      await requestEmailSignInLink(email);
    } finally {
      setBusyAction("");
    }
  }

  async function handleEmailLinkComplete() {
    setBusyAction("complete");
    clearAuthFeedback();

    try {
      await completeEmailLink(email);
      setOpen(false);
    } finally {
      setBusyAction("");
    }
  }

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
          className="inline-flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-white/5 px-3 py-2.5 text-xs uppercase tracking-[0.22em] text-[var(--gold-soft)] transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[var(--border-strong)] bg-[rgba(196,145,42,0.18)] text-[0.7rem] tracking-[0.18em] text-[var(--gold-soft)]">
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
          <span className="max-w-[8.5rem] truncate normal-case tracking-[0.04em]">
            {loading || busyAction === "signout" ? "Loading" : accountLabel}
          </span>
          <span>{open ? "−" : "+"}</span>
        </button>

        {open ? (
          <div className="absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-[24px] border border-[var(--border-strong)] bg-[rgba(6,18,16,0.96)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[var(--border-strong)] bg-[rgba(196,145,42,0.18)] text-sm tracking-[0.18em] text-[var(--gold-soft)]">
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
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
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
    <div className="relative notranslate" translate="no">
      <button
        type="button"
        onClick={() => {
          clearAuthFeedback();
          setOpen((current) => !current);
        }}
        disabled={isBusy}
        className="inline-flex items-center gap-3 rounded-full border border-[var(--border-strong)] bg-white/5 px-4 py-2.5 text-xs uppercase tracking-[0.22em] text-[var(--gold-soft)] transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
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

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-3 w-[min(24rem,calc(100vw-2rem))] rounded-[24px] border border-[var(--border-strong)] bg-[rgba(6,18,16,0.96)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              Sign In
            </p>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Continue with Google, or use a secure email link to finish sign-in
              without a password.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isBusy}
            className="btn-primary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busyAction === "google" ? "Connecting..." : "Continue With Google"}
          </button>

          <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[var(--gold-soft)]">
              Email Link
            </p>
            <label className="mt-3 block">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                autoComplete="email"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {pendingEmailLink ? (
                <button
                  type="button"
                  onClick={() => void handleEmailLinkComplete()}
                  disabled={isBusy}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busyAction === "complete"
                    ? "Completing..."
                    : "Complete Email Sign-In"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleEmailLinkRequest()}
                  disabled={isBusy}
                  className="btn-secondary disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busyAction === "email" ? "Sending..." : "Send Sign-In Link"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>

          {authError ? (
            <p className="mt-4 text-sm leading-6 text-[#ffb2bc]">{authError}</p>
          ) : null}

          {!authError && authMessage ? (
            <p className="mt-4 text-sm leading-6 text-[#d8f3b1]">
              {authMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
