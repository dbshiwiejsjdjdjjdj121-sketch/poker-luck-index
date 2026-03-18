import { NextResponse } from "next/server";
import {
  getCreemWebhookSecret,
  verifyCreemWebhookSignature,
} from "@/lib/creem";
import { syncCreemSubscriptionFromWebhook } from "@/lib/subscription-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("creem-signature");
  const webhookSecret = getCreemWebhookSecret();

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      {
        error: "Creem webhook verification is not configured.",
      },
      { status: 400 },
    );
  }

  if (!verifyCreemWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      {
        error: "The Creem webhook signature could not be verified.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    const subscription = await syncCreemSubscriptionFromWebhook(payload);

    return NextResponse.json({
      ok: true,
      subscription,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The Creem webhook payload could not be processed.",
      },
      { status: 400 },
    );
  }
}
