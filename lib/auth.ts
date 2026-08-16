import { getChatGPTUser } from "../app/chatgpt-auth";

export async function requireAdminApi() {
  if (process.env.NODE_ENV !== "production") {
    return { userId: "local-admin", email: "local-preview@example.invalid", displayName: "本機預覽管理者", fullName: null };
  }
  const user = await getChatGPTUser();
  if (!user) return null;
  const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(user.email.toLowerCase())) return null;
  return user;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
