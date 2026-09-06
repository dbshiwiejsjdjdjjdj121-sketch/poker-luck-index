"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithCustomToken,
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

export async function ensureFirebaseAuthPersistence() {
  const auth = getFirebaseClientAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
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

  if (code === "auth/invalid-custom-token") {
    return new Error("This verification code session is invalid. Request a fresh code and try again.");
  }

  if (code === "auth/custom-token-mismatch") {
    return new Error("The verification code session does not match this Firebase project.");
  }

  if (code === "auth/api-key-not-valid") {
    return new Error("Firebase web sign-in is misconfigured right now. Please try again in a moment.");
  }

  return error;
}

export async function signInWithEmailCodeToken(customToken: string) {
  if (!customToken.trim()) {
    throw new Error("Missing verification token.");
  }

  const auth = await ensureFirebaseAuthPersistence();

  try {
    const credential = await signInWithCustomToken(auth, customToken);
    return credential.user;
  } catch (error) {
    throw normalizeFirebaseError(
      error,
      "We could not complete the verification code sign-in.",
    );
  }
}

export function observeFirebaseUser(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseClientAuth(), callback);
}

export async function signOutFirebaseUser() {
  await signOut(getFirebaseClientAuth());
}
