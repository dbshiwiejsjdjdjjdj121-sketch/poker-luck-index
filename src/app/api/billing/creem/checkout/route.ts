import { NextResponse } from "next/server";
import { createCreemCheckout, creemConfigured } from "@/lib/creem";
import {
  firebaseAdminConfigured,
  getFirebaseAdminAuth,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

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

  if (!creemConfigured()) {
    return NextResponse.json(
      {
        error:
          "Creem checkout is not configured yet. Add the API key, product ID, and webhook secret first.",
      },
      { status: 503 },
    );
  }

  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Sign in first to start the Pro subscription.",
        },
        { status: 401 },
      );
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const checkout = await createCreemCheckout({
      firebaseUid: decoded.uid,
      customerEmail: decoded.email || undefined,
    });

    return NextResponse.json({
      checkoutUrl: checkout.checkout_url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the Creem checkout right now.",
      },
      { status: 400 },
    );
  }
}
