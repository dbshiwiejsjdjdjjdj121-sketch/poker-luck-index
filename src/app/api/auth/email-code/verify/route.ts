import { NextResponse } from "next/server";
import { verifyEmailVerificationCode } from "@/lib/email-auth-server";
import { firebaseAdminConfigured } from "@/lib/firebase-admin";
import { validEmail, publicEmailError } from "@/lib/email-api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
  if (!firebaseAdminConfigured()) return NextResponse.json({ error: "Email sign-in is temporarily unavailable. Please try again shortly." }, { status: 503 });
  try { return NextResponse.json(await verifyEmailVerificationCode({email,code})); }
  catch (error) { const result=publicEmailError(error); return NextResponse.json({error:result.error},{status:result.status}); }
}
