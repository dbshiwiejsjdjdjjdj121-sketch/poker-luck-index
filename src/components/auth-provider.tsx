"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  clearStoredEmailLinkEmail,
  completeEmailSignInLink,
  hasPendingEmailSignInLink,
  observeFirebaseUser,
  readStoredEmailLinkEmail,
  signInWithGoogleClient,
  signOutFirebaseUser,
  storeEmailLinkEmail,
} from "@/lib/firebase-client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authError: string;
  authMessage: string;
  pendingEmailLink: boolean;
  signInWithGoogle: () => Promise<void>;
  requestEmailSignInLink: (email: string) => Promise<void>;
  completeEmailLink: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string>;
  clearAuthFeedback: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [pendingEmailLink, setPendingEmailLink] = useState(false);

  useEffect(() => {
    const unsubscribe = observeFirebaseUser((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const clearEmailLinkParams = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const continueUrl = url.searchParams.get("continueUrl");

    if (continueUrl) {
      try {
        const decoded = new URL(continueUrl);
        window.history.replaceState({}, "", `${decoded.pathname}${decoded.search}${decoded.hash}`);
        return;
      } catch {
        // Fall through to stripping Firebase params from the current URL.
      }
    }

    [
      "apiKey",
      "mode",
      "oobCode",
      "lang",
      "continueUrl",
    ].forEach((key) => {
      url.searchParams.delete(key);
    });

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const completeEmailSignIn = useCallback(async (currentUrl: string, explicitEmail?: string) => {
    setLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await completeEmailSignInLink(currentUrl, explicitEmail);
      setPendingEmailLink(false);
      setAuthMessage("Signed in successfully with your email link.");
      clearEmailLinkParams();
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "We could not complete the email sign-in link.",
      );
    } finally {
      setLoading(false);
    }
  }, [clearEmailLinkParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = window.location.href;

    if (!hasPendingEmailSignInLink(currentUrl)) {
      return;
    }

    const storedEmail = readStoredEmailLinkEmail();
    setPendingEmailLink(true);
    setLoading(true);

    if (!storedEmail) {
      setAuthMessage("Confirm your email address to finish the sign-in link.");
      setLoading(false);
      return;
    }

    void completeEmailSignIn(currentUrl, storedEmail);
  }, [completeEmailSignIn]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authError,
      authMessage,
      pendingEmailLink,
      async signInWithGoogle() {
        setAuthError("");
        setAuthMessage("");
        await signInWithGoogleClient();
      },
      async requestEmailSignInLink(email: string) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
          throw new Error("Enter your email address first.");
        }

        if (typeof window === "undefined") {
          throw new Error("Email sign-in only works in the browser.");
        }

        setLoading(true);
        setAuthError("");
        setAuthMessage("");

        try {
          const continueUrl = `${window.location.origin}${window.location.pathname}`;
          const response = await fetch("/api/auth/email-link/request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: normalizedEmail,
              continueUrl,
            }),
          });
          const data = (await response.json()) as {
            message?: string;
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error || "We could not send the sign-in link.");
          }

          storeEmailLinkEmail(normalizedEmail);
          setAuthMessage(
            data.message ||
              `A secure sign-in link was sent to ${normalizedEmail}.`,
          );
        } catch (error) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "We could not send the sign-in link.",
          );
          throw error;
        } finally {
          setLoading(false);
        }
      },
      async completeEmailLink(email?: string) {
        if (typeof window === "undefined") {
          return;
        }

        if (email?.trim()) {
          storeEmailLinkEmail(email);
        } else if (!readStoredEmailLinkEmail()) {
          clearStoredEmailLinkEmail();
        }

        await completeEmailSignIn(window.location.href, email?.trim().toLowerCase());
      },
      async signOut() {
        setAuthError("");
        setAuthMessage("");
        clearStoredEmailLinkEmail();
        await signOutFirebaseUser();
      },
      async getIdToken() {
        if (!user) {
          return "";
        }

        return user.getIdToken();
      },
      clearAuthFeedback() {
        setAuthError("");
        setAuthMessage("");
      },
    }),
    [authError, authMessage, completeEmailSignIn, loading, pendingEmailLink, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
