import { NextResponse } from "next/server";
import { requireAdminApi, sameOrigin } from "../../../../../lib/auth";
import { logTestEmail } from "../../../../../lib/db";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "未授權" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "無法驗證此請求。" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { recipient?: string };
  if (!body.recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.recipient)) return NextResponse.json({ error: "請輸入有效的收件信箱。" }, { status: 400 });
  return NextResponse.json(await logTestEmail(body.recipient.toLowerCase(), admin.userId));
}
