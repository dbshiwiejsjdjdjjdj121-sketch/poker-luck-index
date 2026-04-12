"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth-provider";

type AuthLoginModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
};

export function AuthLoginModal({
  open,
  onClose,
  title = "Keep your poker history in one place",
  description = "Use one account to save your hand history, keep bankroll records and Pro access, and reopen saved hands across phone and desktop.",
}: AuthLoginModalProps) {
  const {
    loading,
    authError,
    authMessage,
    signInWithGoogle,
    requestEmailSignInCode,
    verifyEmailSignInCode,
    clearAuthFeedback,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSentTo, setEmailCodeSentTo] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    "" | "google" | "email" | "verify"
  >("");

  useEffect(() => {
    if (!open) {
      setBusyAction("");
      setEmail("");
      setEmailCode("");
      setEmailCodeSentTo(null);
      clearAuthFeedback();
    }
  }, [clearAuthFeedback, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const isBusy = loading || busyAction !== "";

  async function handleGoogleSignIn() {
    setBusyAction("google");
    clearAuthFeedback();

    try {
      await signInWithGoogle();
    } finally {
      setBusyAction("");
    }
  }

  async function handleEmailCodeRequest(emailOverride?: string) {
    const normalizedEmail = (emailOverride || email).trim().toLowerCase();

    setBusyAction("email");
    clearAuthFeedback();

    try {
      await requestEmailSignInCode(normalizedEmail);
      setEmail(normalizedEmail);
      setEmailCode("");
      setEmailCodeSentTo(normalizedEmail);
    } finally {
      setBusyAction("");
    }
  }

  async function handleEmailCodeVerify() {
    const normalizedEmail = (emailCodeSentTo || email).trim().toLowerCase();

    setBusyAction("verify");
    clearAuthFeedback();

    try {
      await verifyEmailSignInCode(normalizedEmail, emailCode);
    } finally {
      setBusyAction("");
    }
  }

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/78 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
      role="dialog"
    >
      <div className="grid min-h-full w-full place-items-start sm:place-items-center">
        <div className="my-4 w-full max-w-[32rem] overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[rgba(29,31,34,0.98)] shadow-[var(--shadow)]">
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[0.7rem] uppercase tracking-[0.24em] text-white/52">
                  Sign in
                </p>
                <div className="space-y-2">
                  <h2 className="font-heading text-3xl leading-tight text-white sm:text-4xl">
                    {title}
                  </h2>
                  <p className="max-w-[34rem] text-sm leading-7 text-[var(--muted)] sm:text-base">
                    {description}
                  </p>
                </div>
              </div>

              <button
                aria-label="Close"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-white/[0.03] text-xl text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </div>

            {authError ? (
              <div className="mt-5 rounded-[20px] border border-[#ff8d72]/30 bg-[#2b1f1d] px-4 py-3 text-sm leading-6 text-[#ffb39d]">
                {authError}
              </div>
            ) : null}
            {!authError && authMessage ? (
              <div className="mt-5 rounded-[20px] border border-[#57c878]/28 bg-[#1a2520] px-4 py-3 text-sm leading-6 text-[#8fe4a7]">
                {authMessage}
              </div>
            ) : null}

            {!emailCodeSentTo ? (
              <form
                className="mt-5 space-y-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleEmailCodeRequest();
                }}
              >
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white/78">
                    Email address
                  </span>
                  <input
                    autoComplete="email"
                    className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                    disabled={isBusy}
                    onChange={(event) => {
                      clearAuthFeedback();
                      setEmail(event.target.value);
                    }}
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                  />
                </label>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  We will send a 6-digit verification code to this address. Enter
                  the code here to finish signing in without leaving this screen.
                </p>
                <button
                  className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isBusy}
                  type="submit"
                >
                  {busyAction === "email" ? "Sending..." : "Send code"}
                </button>
              </form>
            ) : (
              <form
                className="mt-5 space-y-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleEmailCodeVerify();
                }}
              >
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Enter the 6-digit code we sent to{" "}
                  <strong className="text-white">{emailCodeSentTo}</strong>.
                </p>
                <input
                  autoComplete="one-time-code"
                  className="field-shell w-full rounded-[16px] px-4 py-3 text-white outline-none"
                  disabled={isBusy}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => {
                    clearAuthFeedback();
                    setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  }}
                  placeholder="123456"
                  type="text"
                  value={emailCode}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={isBusy || emailCode.trim().length < 6}
                    type="submit"
                  >
                    {busyAction === "verify" ? "Verifying..." : "Continue"}
                  </button>
                  <button
                    className="btn-secondary justify-center"
                    onClick={() => {
                      setEmailCode("");
                      setEmailCodeSentTo(null);
                      clearAuthFeedback();
                    }}
                    type="button"
                  >
                    Use another email
                  </button>
                </div>
                <button
                  className="btn-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={isBusy}
                  onClick={() =>
                    void handleEmailCodeRequest(emailCodeSentTo || undefined)
                  }
                  type="button"
                >
                  {busyAction === "email" ? "Sending..." : "Resend code"}
                </button>
              </form>
            )}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <small className="text-xs uppercase tracking-[0.18em] text-white/38">
                Or use Google
              </small>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
              disabled={isBusy}
              onClick={() => void handleGoogleSignIn()}
              type="button"
            >
              {busyAction === "google" ? "Continuing..." : "Continue with Google"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
