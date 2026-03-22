import { NextResponse } from "next/server";
import {
  extractAudioUploadDraft,
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
    });
    await assertPremiumAccess(viewerId);
    const fileEntry = formData.get("audio");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        {
          error: "Attach an audio file first.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const draft = await extractAudioUploadDraft(
      buffer,
      fileEntry.name || "voice-note.webm",
    );

    return NextResponse.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio upload failed.";
    const lowerMessage = message.toLowerCase();
    const status =
      lowerMessage.includes("premium subscription") ||
      lowerMessage.includes("sign in to use premium")
        ? 403
        : lowerMessage.includes("not supported yet") ||
            lowerMessage.includes("export it as webm") ||
            lowerMessage.includes("export it as wav") ||
            lowerMessage.includes("export it as mp3") ||
            lowerMessage.includes("export it as m4a")
        ? 415
        : lowerMessage.includes("enough poker") ||
            lowerMessage.includes("not contain enough")
        ? 422
        : lowerMessage.includes("openai") ||
            lowerMessage.includes("transcription")
        ? 502
        : lowerMessage.includes("firebase") ||
            lowerMessage.includes("storage") ||
            lowerMessage.includes("saving the audio upload record")
        ? 500
        : 400;

    console.error("[api/hand-uploads/audio] request failed", error);

    return NextResponse.json({ error: message }, { status });
  }
}
