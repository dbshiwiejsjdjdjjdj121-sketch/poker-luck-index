import { NextRequest, NextResponse } from "next/server";
import {
  deleteViewerUpload,
  getViewerUpload,
  handUploadRuntimeConfigured,
  resolveViewerId,
} from "@/lib/hand-upload-server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
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
    const { id } = await context.params;
    const uploadId = Array.isArray(id) ? id[0] || "" : id || "";
    const viewerId = await resolveViewerId({
      requestedViewerId:
        new URL(request.url).searchParams.get("viewerId") || undefined,
      authHeader: request.headers.get("authorization"),
    });
    const item = await getViewerUpload(viewerId, uploadId);

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load hand upload.";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
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
    const { id } = await context.params;
    const uploadId = Array.isArray(id) ? id[0] || "" : id || "";
    const viewerId = await resolveViewerId({
      requestedViewerId:
        new URL(request.url).searchParams.get("viewerId") || undefined,
      authHeader: request.headers.get("authorization"),
    });
    await deleteViewerUpload(viewerId, uploadId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete hand upload.";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
