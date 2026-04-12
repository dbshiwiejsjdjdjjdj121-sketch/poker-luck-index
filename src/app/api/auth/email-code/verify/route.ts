import { NextResponse } from "next/server";
import { verifyEmailVerificationCode } from "@/lib/email-auth-server";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolveStatus(errorMessage: string) {
  if (
    errorMessage.includes("Please wait") ||
    errorMessage.includes("Too many incorrect codes")
  ) {
    return 429;
  }

  return 400;
}

export async function POST(request: Request) {
  if (!firebaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin credentials are missing. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY first.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      code?: string;
      email?: string;
    };

    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Enter a valid email address.",
        },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error: "Enter the 6-digit verification code.",
        },
        { status: 400 },
      );
    }

    const result = await verifyEmailVerificationCode({ email, code });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not verify the code.";

    return NextResponse.json(
      { error: message },
      { status: resolveStatus(message) },
    );
  }
}
