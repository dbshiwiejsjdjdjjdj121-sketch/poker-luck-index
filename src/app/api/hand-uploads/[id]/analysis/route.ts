import { NextRequest, NextResponse } from "next/server";
import {
  analyzeViewerUpload,
  handUploadRuntimeConfigured,
  resolveViewerId,
} from "@/lib/hand-upload-server";
import { assertPremiumAccess } from "@/lib/subscription-server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const runtimeConfig = handUploadRuntimeConfigured();

  if (!runtimeConfig.openAI) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is missing. Add it before using AI analysis.",
      },
      { status: 503 },
    );
  }

  if (!runtimeConfig.firebase) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin credentials are missing. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY first.",
      },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    const uploadId = Array.isArray(id) ? id[0] || "" : id || "";
    const body = (await request.json().catch(() => ({}))) as {
      viewerId?: string;
      force?: boolean;
    };
    const viewerId = await resolveViewerId({
      requestedViewerId: body.viewerId?.trim(),
      authHeader: request.headers.get("authorization"),
    });
    await assertPremiumAccess(viewerId);
    const item = await analyzeViewerUpload(viewerId, uploadId, {
      force: Boolean(body.force),
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to analyze hand.";
    const status =
      message.toLowerCase().includes("premium subscription") ||
      message.toLowerCase().includes("sign in with google")
        ? 403
        : message.toLowerCase().includes("not found")
          ? 404
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
