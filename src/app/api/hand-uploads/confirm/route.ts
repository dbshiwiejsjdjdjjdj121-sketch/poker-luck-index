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

async function readConfirmRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const mediaEntry = formData.get("media");

    return {
      viewerId: `${formData.get("viewerId") || ""}`.trim(),
      source: `${formData.get("source") || ""}`.trim(),
      handText: `${formData.get("handText") || ""}`.trim(),
      media: mediaEntry instanceof File ? mediaEntry : null,
    };
  }

  const body = (await request.json()) as {
    viewerId?: string;
    source?: string;
    handText?: string;
  };

  return {
    viewerId: body.viewerId?.trim() || "",
    source: `${body.source || ""}`.trim(),
    handText: body.handText?.trim() || "",
    media: null,
  };
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
    const payload = await readConfirmRequest(request);
    const source = payload.source;

    if (!isPremiumSource(source)) {
      return NextResponse.json(
        {
          error: "Only screenshot and voice drafts can be confirmed here.",
        },
        { status: 400 },
      );
    }

    const viewerId = await resolveViewerId({
      requestedViewerId: payload.viewerId || undefined,
      authHeader: request.headers.get("authorization"),
      allowGuest: false,
      requireAuth: true,
    });
    await assertPremiumAccess(viewerId);
    const mediaInput = payload.media
      ? {
          buffer: Buffer.from(await payload.media.arrayBuffer()),
          mimeType: payload.media.type || "application/octet-stream",
          originalName: payload.media.name || `${source}-upload`,
        }
      : null;
    const item = await savePremiumUploadFromText(
      viewerId,
      source,
      payload.handText,
      mediaInput,
    );

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save this hand upload.";
    const lowerMessage = message.toLowerCase();
    const status =
      lowerMessage.includes("token")
        ? 401
        : lowerMessage.includes("premium subscription") ||
            lowerMessage.includes("sign in to use premium") ||
            lowerMessage.includes("sign in to access this data")
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
