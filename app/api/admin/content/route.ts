import { NextResponse } from "next/server";
import { getCurrentEvent, saveContent } from "../../../../lib/db";
import { requireAdminApi, sameOrigin } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "未授權" }, { status: 401 });
  return NextResponse.json(await getCurrentEvent());
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "未授權" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "無法驗證此請求。" }, { status: 403 });
  const body = await request.json().catch(() => null) as { kind?: unknown; data?: unknown } | null;
  if (!body || !["event","focus","speaker","agenda","dialogue","faq"].includes(String(body.kind)) || !body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "資料格式不正確。" }, { status: 400 });
  }
  try {
    return NextResponse.json(await saveContent(String(body.kind), body.data as Record<string, unknown>, admin.userId), { status: 201 });
  } catch {
    return NextResponse.json({ error: "無法儲存內容，請檢查欄位。" }, { status: 400 });
  }
}
