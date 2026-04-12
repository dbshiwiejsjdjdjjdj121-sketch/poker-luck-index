import { NextResponse } from "next/server";
import {
  emailDeliveryConfigured,
  requestEmailVerificationCode,
} from "@/lib/email-auth-server";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolveStatus(errorMessage: string) {
  if (errorMessage.includes("Please wait")) {
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

  if (!emailDeliveryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email delivery is not configured yet. Add RESEND_API_KEY and EMAIL_FROM, or set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
    };

    const email = String(body.email || "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Enter a valid email address.",
        },
        { status: 400 },
      );
    }

    const result = await requestEmailVerificationCode({ email });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not send the verification code.";

    return NextResponse.json(
      { error: message },
      { status: resolveStatus(message) },
    );
  }
}
