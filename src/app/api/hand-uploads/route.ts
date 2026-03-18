import { NextResponse } from "next/server";
import {
  handUploadRuntimeConfigured,
  listViewerUploads,
  resolveViewerId,
} from "@/lib/hand-upload-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedViewerId = searchParams.get("viewerId")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") || "12");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 12;
  const runtimeConfig = handUploadRuntimeConfigured();

  if (!runtimeConfig.firebase) {
    return NextResponse.json({
      configured: false,
      items: [],
      message:
        "Firebase Admin credentials are not configured yet. Add the Firebase env vars to enable saved uploads.",
    });
  }

  try {
    const viewerId = await resolveViewerId({
      requestedViewerId,
      authHeader: request.headers.get("authorization"),
    });
    const items = await listViewerUploads(viewerId, limit);

    return NextResponse.json({
      configured: true,
      items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load saved uploads.";

    return NextResponse.json(
      {
        configured: true,
        items: [],
        message,
      },
      { status: 500 },
    );
  }
}
