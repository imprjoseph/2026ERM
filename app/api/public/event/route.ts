import { NextResponse } from "next/server";
import { getCurrentEvent } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const event = await getCurrentEvent();
    return NextResponse.json(event, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ error: "活動資料暫時無法載入，請稍後再試。" }, { status: 503 });
  }
}
