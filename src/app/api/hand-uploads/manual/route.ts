import { NextResponse } from "next/server";
import {
  handUploadRuntimeConfigured,
  processManualUpload,
  resolveViewerId,
} from "@/lib/hand-upload-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const runtimeConfig = handUploadRuntimeConfigured();

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
      handText?: string;
    };

    const viewerId = await resolveViewerId({
      requestedViewerId: body.viewerId?.trim(),
      authHeader: request.headers.get("authorization"),
    });
    const handText = body.handText?.trim() ?? "";
    const item = await processManualUpload(viewerId, handText);

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Manual upload failed.";
    const status = message.toLowerCase().includes("enough poker") ? 422 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
