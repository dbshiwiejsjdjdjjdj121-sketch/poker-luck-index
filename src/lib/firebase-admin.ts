import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_FIREBASE_PROJECT_ID = "all-in-bd5a2";

function readFirebasePrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";
}

export function getFirebaseAdminConfig() {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: readFirebasePrivateKey(),
  };
}

export function firebaseAdminConfigured() {
  const config = getFirebaseAdminConfig();

  return Boolean(
    config.projectId &&
      config.clientEmail &&
      config.privateKey,
  );
}

function getFirebaseAdminApp() {
  const config = getFirebaseAdminConfig();

  if (!firebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY first.",
    );
  }

  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  return initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
  });
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
