import { NextResponse } from "next/server";
import { getPublishedEvent } from "../../../../lib/publishedEvent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const event = await getPublishedEvent();
    return NextResponse.json(event, {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "會議資料暫時無法載入，請稍後再試。" },
      { status: 503 },
    );
  }
}
