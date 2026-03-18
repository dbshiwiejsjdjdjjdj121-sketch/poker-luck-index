import { NextResponse } from "next/server";
import {
  handUploadRuntimeConfigured,
  processScreenshotUpload,
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
    const item = await processScreenshotUpload(
      viewerId,
      buffer,
      fileEntry.name || "hand-screenshot.jpg",
      fileEntry.type || "image/jpeg",
    );

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Screenshot upload failed.";
    const status =
      message.toLowerCase().includes("premium subscription") ||
      message.toLowerCase().includes("sign in with google")
        ? 403
        : message.toLowerCase().includes("enough poker") ||
            message.toLowerCase().includes("did not contain enough")
        ? 422
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
