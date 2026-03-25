import { NextResponse } from "next/server";
import { resolveViewerId } from "@/lib/hand-upload-server";
import { getSubscriptionSnapshot } from "@/lib/subscription-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  try {
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({
        subscription: await getSubscriptionSnapshot(null),
      });
    }

    const viewerId = await resolveViewerId({
      authHeader,
      allowGuest: false,
      requireAuth: true,
    });
    const subscription = await getSubscriptionSnapshot(viewerId || null);

    return NextResponse.json({ subscription });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load subscription.";

    return NextResponse.json({
      subscription: await getSubscriptionSnapshot(null),
      error: message,
    }, { status: 401 });
  }
}
