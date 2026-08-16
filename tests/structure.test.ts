import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const root=new URL("../",import.meta.url);
test("核心公開與管理路由存在",async()=>{for(const path of ["app/page.tsx","app/register/page.tsx","app/admin/page.tsx","app/admin/check-in/page.tsx","app/2026/agenda/page.tsx","app/dialogues/[year]/page.tsx"])await access(new URL(path,root))});
test("敏感設定只出現在環境變數範本",async()=>{const source=await readFile(new URL("lib/auth.ts",root),"utf8");assert.match(source,/ADMIN_EMAIL_ALLOWLIST/);assert.doesNotMatch(source,/password\s*[:=]\s*["'][^"']+/i)});
test("SEO、sitemap 與 robots 已設定",async()=>{await access(new URL("app/sitemap.ts",root));await access(new URL("app/robots.ts",root));const layout=await readFile(new URL("app/layout.tsx",root),"utf8");assert.match(layout,/openGraph/);assert.doesNotMatch(layout,/codex-preview|Starter Project/)});
test("資料庫 migration 包含報名唯一索引與稽核紀錄",async()=>{const sql=await readFile(new URL("migrations/0000_forum_core.sql",root),"utf8");assert.match(sql,/UNIQUE\(event_id, email_normalized\)/);assert.match(sql,/CREATE TABLE IF NOT EXISTS audit_logs/);assert.match(sql,/CREATE TABLE IF NOT EXISTS registration_history/)});
