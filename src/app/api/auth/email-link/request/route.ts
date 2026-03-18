import { NextResponse } from "next/server";
import { sendCustomEmailSignInLink, emailDeliveryConfigured } from "@/lib/email-auth-server";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
          "SMTP email delivery is not configured yet. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM first.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      continueUrl?: string;
    };

    const email = String(body.email || "").trim().toLowerCase();
    const continueUrl = String(body.continueUrl || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Enter a valid email address.",
        },
        { status: 400 },
      );
    }

    if (!continueUrl) {
      return NextResponse.json(
        {
          error: "A continue URL is required for email sign-in.",
        },
        { status: 400 },
      );
    }

    const result = await sendCustomEmailSignInLink({
      email,
      continueUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not send the sign-in email.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
