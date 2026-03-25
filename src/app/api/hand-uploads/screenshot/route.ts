import { NextResponse } from "next/server";
import {
  extractScreenshotUploadDraft,
  handUploadRuntimeConfigured,
  resolveViewerId,
} from "@/lib/hand-upload-server";
import { assertPremiumAccess } from "@/lib/subscription-server";

export const runtime = "nodejs";

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
    const formData = await request.formData();
    const viewerId = await resolveViewerId({
      requestedViewerId: `${formData.get("viewerId") ?? ""}`.trim(),
      authHeader: request.headers.get("authorization"),
      allowGuest: false,
      requireAuth: true,
    });
    await assertPremiumAccess(viewerId);
    const fileEntry = formData.get("image");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        {
          error: "Attach a screenshot first.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const draft = await extractScreenshotUploadDraft(
      buffer,
      fileEntry.name || "hand-screenshot.jpg",
      fileEntry.type || "image/jpeg",
    );

    return NextResponse.json(draft);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Screenshot upload failed.";
    const lowerMessage = message.toLowerCase();
    const status =
      lowerMessage.includes("token")
        ? 401
        : lowerMessage.includes("premium subscription") ||
            lowerMessage.includes("sign in to use premium") ||
            lowerMessage.includes("sign in to access this data")
        ? 403
        : lowerMessage.includes("heic screenshots are not supported") ||
            lowerMessage.includes("export the screenshot as jpg") ||
            lowerMessage.includes("export the screenshot as png")
        ? 415
        : lowerMessage.includes("enough poker") ||
            lowerMessage.includes("did not contain enough")
        ? 422
        : lowerMessage.includes("openai") ||
            lowerMessage.includes("parsing")
        ? 502
        : lowerMessage.includes("firebase") ||
            lowerMessage.includes("storage") ||
            lowerMessage.includes("saving the screenshot upload record")
        ? 500
        : 400;

    console.error("[api/hand-uploads/screenshot] request failed", error);

    return NextResponse.json({ error: message }, { status });
  }
}
