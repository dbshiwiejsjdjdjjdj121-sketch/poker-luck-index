"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import {
  clearStoredEmailLinkEmail,
  completeEmailSignInLink,
  getFirebaseErrorCode,
  hasPendingEmailSignInLink,
  observeFirebaseUser,
  readStoredEmailLinkEmail,
  signInWithGoogleClient,
  signOutFirebaseUser,
  storeEmailLinkEmail,
} from "@/lib/firebase-client";

const POST_AUTH_REDIRECT_KEY = "poker-luck-index-post-auth-redirect";

function readPostAuthRedirect() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)?.trim() || "";
}

function storePostAuthRedirect(target: string) {
  if (typeof window === "undefined" || !target) {
    return;
  }

  window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, target);
}

function clearPostAuthRedirect() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
}

function getPreferredAuthDestination() {
  if (typeof window === "undefined") {
    return "/hand-review";
  }

  const { pathname, search, hash } = window.location;

  if (pathname === "/") {
    return "/hand-review";
  }

  return `${pathname}${search}${hash}`;
}

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
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [pendingEmailLink, setPendingEmailLink] = useState(false);
  const lastUserUidRef = useRef<string>("");

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
        router.replace(`${decoded.pathname}${decoded.search}${decoded.hash}`);
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

    router.replace(`${url.pathname}${url.search}${url.hash}`);
  }, [router]);

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
      const code = getFirebaseErrorCode(error);

      if (code === "auth/invalid-action-code") {
        clearStoredEmailLinkEmail();
        setPendingEmailLink(false);
        clearEmailLinkParams();
      }

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

  useEffect(() => {
    if (!user) {
      lastUserUidRef.current = "";
      return;
    }

    if (lastUserUidRef.current === user.uid) {
      return;
    }

    lastUserUidRef.current = user.uid;
    const target = readPostAuthRedirect();

    if (!target) {
      return;
    }

    clearPostAuthRedirect();

    if (target !== pathname) {
      router.replace(target);
    }
  }, [pathname, router, user]);

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
        const target = getPreferredAuthDestination();
        storePostAuthRedirect(target);

        try {
          const method = await signInWithGoogleClient();

          if (method === "popup") {
            clearPostAuthRedirect();
            router.replace(target);
          }
        } catch (error) {
          clearPostAuthRedirect();
          throw error;
        }
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
          const continueUrl = new URL(
            getPreferredAuthDestination(),
            window.location.origin,
          ).toString();
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
        clearPostAuthRedirect();
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
    [
      authError,
      authMessage,
      completeEmailSignIn,
      loading,
      pendingEmailLink,
      router,
      user,
    ],
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
