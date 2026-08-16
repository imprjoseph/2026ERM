import { NextResponse } from "next/server";
import { checkRateLimit, createRegistration } from "../../../lib/db";
import { sameOrigin } from "../../../lib/auth";
import { syncRegistrationToGoogleSheet } from "../../../lib/googleSheets";
import { validateRegistration } from "../../../lib/validation";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "無法驗證此請求。" }, { status: 403 });
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`registration:${forwarded}`, 5, 60_000))) {
    return NextResponse.json(
      { error: "送出次數過多，請稍後再試。" },
      { status: 429 },
    );
  }
  const body = await request.json().catch(() => null);
  const validation = validateRegistration(body);
  if (!validation.valid)
    return NextResponse.json(
      { error: "請檢查表單欄位。", errors: validation.errors },
      { status: 400 },
    );
  try {
    const result = await createRegistration(
      validation.data as unknown as Record<string, unknown>,
    );
    try {
      await syncRegistrationToGoogleSheet(validation.data, result);
    } catch (error) {
      console.error("Google Sheets registration sync unavailable", error);
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DUPLICATE_EMAIL")
      return NextResponse.json(
        { error: "此電子信箱已提交過本年度報名申請。" },
        { status: 409 },
      );
    if (code === "REGISTRATION_CLOSED")
      return NextResponse.json(
        { error: "報名目前已截止或暫停。" },
        { status: 410 },
      );
    return NextResponse.json(
      { error: "報名申請暫時無法送出，請稍後再試。" },
      { status: 500 },
    );
  }
}
