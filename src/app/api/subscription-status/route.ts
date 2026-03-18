import { NextResponse } from "next/server";
import { resolveViewerId } from "@/lib/hand-upload-server";
import { getSubscriptionSnapshot } from "@/lib/subscription-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const viewerId = await resolveViewerId({
      requestedViewerId: searchParams.get("viewerId")?.trim() || undefined,
      authHeader: request.headers.get("authorization"),
    });
    const subscription = await getSubscriptionSnapshot(viewerId || null);

    return NextResponse.json({ subscription });
  } catch {
    return NextResponse.json({
      subscription: await getSubscriptionSnapshot(null),
    });
  }
}
