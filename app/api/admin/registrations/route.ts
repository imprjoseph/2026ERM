import { NextResponse } from "next/server";
import { getDashboardStats, listRegistrations, updateRegistrationStatus } from "../../../../lib/db";
import { requireAdminApi, sameOrigin } from "../../../../lib/auth";
import { canTransition, isRegistrationStatus } from "../../../../lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "未授權" }, { status: 401 });
  const url = new URL(request.url);
  const [registrations, stats] = await Promise.all([
    listRegistrations(url.searchParams.get("search")?.slice(0, 100) ?? "", url.searchParams.get("status") ?? ""),
    getDashboardStats(),
  ]);
  return NextResponse.json({ registrations, stats });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "未授權" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "無法驗證此請求。" }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown; fromStatus?: unknown } | null;
  if (!body || typeof body.id !== "string" || !isRegistrationStatus(body.status) || !isRegistrationStatus(body.fromStatus) || !canTransition(body.fromStatus, body.status)) {
    return NextResponse.json({ error: "不允許的狀態變更。" }, { status: 400 });
  }
  try {
    return NextResponse.json(await updateRegistrationStatus(body.id, body.status, admin.userId));
  } catch {
    return NextResponse.json({ error: "無法更新報名狀態。" }, { status: 400 });
  }
}
