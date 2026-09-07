import { savedApi } from "@/lib/saved-server";
export const runtime = "nodejs";
type Context = { params: Promise<{ festivalId: string }> };
export async function PUT(request: Request, { params }: Context) { return savedApi.save(request, (await params).festivalId); }
export async function DELETE(request: Request, { params }: Context) { return savedApi.remove(request, (await params).festivalId); }

