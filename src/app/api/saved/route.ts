import { savedApi } from "@/lib/saved-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return savedApi.list(request); }

