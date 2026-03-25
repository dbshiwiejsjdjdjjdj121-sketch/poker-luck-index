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
  const cursorParam = searchParams.get("cursor");
  const parsedCursor =
    cursorParam && cursorParam.trim().length > 0
      ? Number(cursorParam)
      : null;
  const cursor =
    parsedCursor !== null && Number.isFinite(parsedCursor)
      ? parsedCursor
      : undefined;
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
    const result = await listViewerUploads(viewerId, limit, cursor);

    return NextResponse.json({
      configured: true,
      items: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load saved uploads.";
    const lowerMessage = message.toLowerCase();
    const status =
      lowerMessage.includes("sign in") || lowerMessage.includes("token") ? 401 : 500;

    return NextResponse.json(
      {
        configured: true,
        items: [],
        nextCursor: null,
        hasMore: false,
        message,
      },
      { status },
    );
  }
}
