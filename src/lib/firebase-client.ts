"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";

const DEFAULT_FIREBASE_WEB_CONFIG = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyB3cAm1FBYItXyxxk_QynizZ70IC2_de5k",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "all-in-bd5a2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "all-in-bd5a2",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "all-in-bd5a2.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "420277791910",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:420277791910:web:50644b38042e138aa65867",
};

let cachedApp: FirebaseApp | null = null;
export const FIREBASE_EMAIL_STORAGE_KEY = "poker-luck-index-email-link-email";

export function getFirebaseErrorCode(error: unknown) {
  if (!(error instanceof Error)) {
    return "";
  }

  return String((error as { code?: string }).code || "");
}

export function getFirebaseClientApp() {
  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(DEFAULT_FIREBASE_WEB_CONFIG);
  return cachedApp;
}

export function getFirebaseClientAuth() {
  return getAuth(getFirebaseClientApp());
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });
  provider.addScope("email");
  provider.addScope("profile");
  return provider;
}

export async function ensureFirebaseAuthPersistence() {
  const auth = getFirebaseClientAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}

export async function signInWithGoogleClient() {
  const auth = await ensureFirebaseAuthPersistence();
  const provider = getGoogleProvider();

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    if (
      message.includes("popup") ||
      message.includes("operation-not-supported") ||
      message.includes("redirect")
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw error;
  }
}

function normalizeFirebaseError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof Error)) {
    return new Error(fallbackMessage);
  }

  const code = getFirebaseErrorCode(error);

  if (code === "auth/operation-not-allowed") {
    return new Error(fallbackMessage);
  }

  if (code === "auth/unauthorized-domain") {
    return new Error("This domain is not authorized in Firebase Authentication yet.");
  }

  if (code === "auth/popup-closed-by-user") {
    return new Error("The Google sign-in popup was closed before the sign-in finished.");
  }

  if (code === "auth/popup-blocked") {
    return new Error("The browser blocked the Google sign-in popup. Please allow popups and try again.");
  }

  if (code === "auth/invalid-action-code") {
    return new Error("This sign-in link has already been used or expired. Request a fresh email link.");
  }

  if (code === "auth/invalid-email") {
    return new Error("Enter a valid email address.");
  }

  if (code === "auth/api-key-not-valid") {
    return new Error("Firebase web sign-in is misconfigured right now. Please try again in a moment.");
  }

  return error;
}

export function storeEmailLinkEmail(email: string) {
  window.localStorage.setItem(FIREBASE_EMAIL_STORAGE_KEY, email.trim().toLowerCase());
}

export function readStoredEmailLinkEmail() {
  return window.localStorage.getItem(FIREBASE_EMAIL_STORAGE_KEY)?.trim() || "";
}

export function clearStoredEmailLinkEmail() {
  window.localStorage.removeItem(FIREBASE_EMAIL_STORAGE_KEY);
}

export function hasPendingEmailSignInLink(url: string) {
  return isSignInWithEmailLink(getFirebaseClientAuth(), url);
}

export async function completeEmailSignInLink(url: string, explicitEmail?: string) {
  const auth = await ensureFirebaseAuthPersistence();
  const email = (explicitEmail || readStoredEmailLinkEmail()).trim().toLowerCase();

  if (!email) {
    throw new Error("Confirm the email address you used for the sign-in link.");
  }

  let credential;

  try {
    credential = await signInWithEmailLink(auth, email, url);
  } catch (error) {
    throw normalizeFirebaseError(
      error,
      "We could not complete the email sign-in link.",
    );
  }

  clearStoredEmailLinkEmail();
  return credential.user;
}

export function observeFirebaseUser(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseClientAuth(), callback);
}

export async function signOutFirebaseUser() {
  await signOut(getFirebaseClientAuth());
}
