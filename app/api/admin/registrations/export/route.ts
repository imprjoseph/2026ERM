import { requireAdminApi } from "../../../../../lib/auth";
import { listRegistrations } from "../../../../../lib/db";
import { csvSafe } from "../../../../../lib/validation";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return new Response("未授權", { status: 401 });
  const records = await listRegistrations();
  const header = ["申請編號","中文姓名","英文姓名","服務單位","部門","職稱","身分類別","手機","電子信箱","狀態","飲食需求","報到時間"];
  const rows = records.map((r) => [r.applicationNo,r.nameZh,r.nameEn,r.organization,r.department,r.jobTitle,r.category,r.mobile,r.email,r.status,r.dietary,r.checkedInAt]);
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvSafe).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=forum-registrations.csv", "Cache-Control": "no-store" } });
}
