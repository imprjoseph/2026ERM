import { NextResponse } from "next/server";
import { checkInRegistration } from "../../../../lib/db";
import { requireAdminApi, sameOrigin } from "../../../../lib/auth";

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "未授權" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "無法驗證此請求。" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { token?: string; search?: string };
  if (!body.token && !body.search) return NextResponse.json({ error: "請掃描 QR Code 或輸入查詢資料。" }, { status: 400 });
  try {
    return NextResponse.json(await checkInRegistration({ token: body.token?.slice(0, 200), search: body.search?.trim().slice(0, 100) }, admin.userId));
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_ELIGIBLE") return NextResponse.json({ error: "此申請目前不具報到資格。" }, { status: 409 });
    return NextResponse.json({ error: "查無符合的報名資料。" }, { status: 404 });
  }
}
