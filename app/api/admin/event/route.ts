import { NextResponse } from "next/server";
import { requireAdminApi, sameOrigin } from "../../../../lib/auth";
import { updateCurrentEvent } from "../../../../lib/db";

export async function PATCH(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error:"未授權" }, { status:401 });
  if (!sameOrigin(request)) return NextResponse.json({ error:"無法驗證此請求。" }, { status:403 });
  const body = await request.json().catch(() => ({})) as { dateLabel?:string; locationName?:string };
  if (!body.dateLabel && !body.locationName) return NextResponse.json({ error:"沒有可更新的活動資料。" }, { status:400 });
  return NextResponse.json(await updateCurrentEvent(body, admin.userId));
}
