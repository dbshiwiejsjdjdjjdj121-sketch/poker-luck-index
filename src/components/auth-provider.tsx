"use client";

import {
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
  observeFirebaseUser,
  signInWithEmailCodeToken,
  signInWithGoogleClient,
  signOutFirebaseUser,
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
    return "/";
  }

  const { pathname, search, hash } = window.location;

  return `${pathname}${search}${hash}`;
}

type EmailCodeRequestResult = {
  email: string;
  expiresInSeconds: number;
  resendInSeconds: number;
  message: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authError: string;
  authMessage: string;
  signInWithGoogle: () => Promise<void>;
  requestEmailSignInCode: (email: string) => Promise<EmailCodeRequestResult>;
  verifyEmailSignInCode: (email: string, code: string) => Promise<void>;
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
  const lastUserUidRef = useRef<string>("");

  useEffect(() => {
    const unsubscribe = observeFirebaseUser((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
      async requestEmailSignInCode(email: string) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
          throw new Error("Enter your email address first.");
        }

        setLoading(true);
        setAuthError("");
        setAuthMessage("");

        try {
          const response = await fetch("/api/auth/email-code/request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: normalizedEmail,
            }),
          });

          const data = (await response.json().catch(() => ({}))) as {
            email?: string;
            error?: string;
            expiresInSeconds?: number;
            message?: string;
            resendInSeconds?: number;
          };

          if (!response.ok) {
            throw new Error(data.error || "We could not send the verification code.");
          }

          const message =
            data.message ||
            `We sent a 6-digit verification code to ${normalizedEmail}.`;

          setAuthMessage(message);

          return {
            email: String(data.email || normalizedEmail),
            expiresInSeconds: Number(data.expiresInSeconds || 0),
            resendInSeconds: Number(data.resendInSeconds || 0),
            message,
          };
        } catch (error) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "We could not send the verification code.",
          );
          throw error;
        } finally {
          setLoading(false);
        }
      },
      async verifyEmailSignInCode(email: string, code: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

        if (!normalizedEmail) {
          throw new Error("Enter your email address first.");
        }

        if (normalizedCode.length !== 6) {
          throw new Error("Enter the 6-digit verification code.");
        }

        setLoading(true);
        setAuthError("");
        setAuthMessage("");

        try {
          const response = await fetch("/api/auth/email-code/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: normalizedEmail,
              code: normalizedCode,
            }),
          });

          const data = (await response.json().catch(() => ({}))) as {
            customToken?: string;
            error?: string;
            message?: string;
          };

          if (!response.ok) {
            throw new Error(data.error || "We could not verify the code.");
          }

          if (!data.customToken) {
            throw new Error("The verification response did not include a sign-in token.");
          }

          await signInWithEmailCodeToken(data.customToken);
          setAuthMessage(
            data.message || `Signed in successfully as ${normalizedEmail}.`,
          );
          router.refresh();
        } catch (error) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "We could not verify the code.",
          );
          throw error;
        } finally {
          setLoading(false);
        }
      },
      async signOut() {
        setAuthError("");
        setAuthMessage("");
        clearPostAuthRedirect();
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
      loading,
      pathname,
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
