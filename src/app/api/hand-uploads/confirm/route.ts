import { NextResponse } from "next/server";
import {
  handUploadRuntimeConfigured,
  resolveViewerId,
  savePremiumUploadFromText,
} from "@/lib/hand-upload-server";
import { assertPremiumAccess } from "@/lib/subscription-server";
import type { UploadSource } from "@/lib/hand-upload-types";

export const runtime = "nodejs";

function isPremiumSource(value: string): value is Extract<UploadSource, "voice" | "screenshot"> {
  return value === "voice" || value === "screenshot";
}

export async function POST(request: Request) {
  const runtimeConfig = handUploadRuntimeConfigured();

  if (!runtimeConfig.openAI) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is missing. Add it before using hand uploads.",
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
    const body = (await request.json()) as {
      viewerId?: string;
      source?: string;
      handText?: string;
    };
    const source = `${body.source || ""}`;

    if (!isPremiumSource(source)) {
      return NextResponse.json(
        {
          error: "Only screenshot and voice drafts can be confirmed here.",
        },
        { status: 400 },
      );
    }

    const viewerId = await resolveViewerId({
      requestedViewerId: body.viewerId?.trim(),
      authHeader: request.headers.get("authorization"),
    });
    await assertPremiumAccess(viewerId);
    const item = await savePremiumUploadFromText(
      viewerId,
      source,
      body.handText?.trim() || "",
    );

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save this hand upload.";
    const lowerMessage = message.toLowerCase();
    const status =
      lowerMessage.includes("premium subscription") ||
      lowerMessage.includes("sign in to use premium")
        ? 403
        : lowerMessage.includes("enough poker") ||
            lowerMessage.includes("hand extraction failed")
        ? 422
        : lowerMessage.includes("firebase") || lowerMessage.includes("saving")
        ? 500
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
