import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { resolveViewerId } from "@/lib/hand-upload-server";
import type { BankrollRecord } from "@/lib/bankroll-types";

export const runtime = "nodejs";

function bankrollCollection(uid: string) {
  return getFirebaseAdminDb().collection("users").doc(uid).collection("bankrollRecords");
}

export async function GET(request: Request) {
  try {
    const viewerId = await resolveViewerId({
      requestedViewerId: new URL(request.url).searchParams.get("viewerId") || undefined,
      authHeader: request.headers.get("authorization"),
    });

    const snapshot = await bankrollCollection(viewerId)
      .orderBy("dateUTC", "desc")
      .limit(100)
      .get();

    const items = snapshot.docs.map((doc) => doc.data() as BankrollRecord);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load bankroll records.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      viewerId?: string;
      record?: BankrollRecord;
    };

    const viewerId = await resolveViewerId({
      requestedViewerId: body.viewerId?.trim(),
      authHeader: request.headers.get("authorization"),
    });
    const record = body.record;

    if (!record?.id) {
      return NextResponse.json({ error: "record.id is required." }, { status: 400 });
    }

    await bankrollCollection(viewerId).doc(record.id).set({
      ...record,
      ownerUid: viewerId,
      cloudId: record.cloudId || record.id,
      syncedAt: Date.now(),
    });

    return NextResponse.json({
      item: {
        ...record,
        ownerUid: viewerId,
        cloudId: record.cloudId || record.id,
        syncedAt: Date.now(),
      } satisfies BankrollRecord,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save bankroll record.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("recordId")?.trim() ?? "";
    const viewerId = await resolveViewerId({
      requestedViewerId: searchParams.get("viewerId")?.trim() || undefined,
      authHeader: request.headers.get("authorization"),
    });

    if (!recordId) {
      return NextResponse.json({ error: "recordId is required." }, { status: 400 });
    }

    await bankrollCollection(viewerId).doc(recordId).delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete bankroll record.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
