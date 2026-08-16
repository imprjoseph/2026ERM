import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const root = new URL("../", import.meta.url);
test("核心公開與管理路由存在", async () => {
  for (const path of [
    "app/page.tsx",
    "app/register/page.tsx",
    "app/admin/page.tsx",
    "app/admin/check-in/page.tsx",
    "app/2026/agenda/page.tsx",
    "app/2026/speakers/[id]/page.tsx",
    "app/dialogues/[year]/page.tsx",
  ])
    await access(new URL(path, root));
});
test("講者卡片提供指定欄位與詳細資料入口", async () => {
  const card = await readFile(
    new URL("components/SpeakerCard.tsx", root),
    "utf8",
  );
  assert.match(card, /speaker-photo/);
  assert.match(card, /speaker-organization/);
  assert.match(card, /speaker\.nameZh/);
  assert.match(card, /speaker-title/);
  assert.match(card, /查看詳細/);
  assert.match(card, /\/2026\/speakers\/\$\{encodeURIComponent/);
});
test("歷年頁提供照片，頁尾使用完整單位名稱與聯絡資訊", async () => {
  const detail = await readFile(
    new URL("components/EventDetailPages.tsx", root),
    "utf8",
  );
  const shell = await readFile(
    new URL("components/SiteShell.tsx", root),
    "utf8",
  );
  assert.match(detail, /history-gallery/);
  assert.match(shell, /金融監督管理委員會保險局/);
  assert.match(shell, /財團法人保險事業發展中心/);
  assert.match(shell, /中華民國精算學會/);
  assert.match(shell, /02-27635666/);
  assert.match(shell, /penny@impr\.com\.tw/);
  assert.doesNotMatch(shell, /執行單位/);
});
test("議程開始與結束時間使用一致的 HH:mm 區間格式", async () => {
  const home = await readFile(new URL("components/HomePage.tsx", root), "utf8");
  const detail = await readFile(
    new URL("components/EventDetailPages.tsx", root),
    "utf8",
  );
  assert.match(home, /\{item\.startTime\}–\{item\.endTime\}/);
  assert.match(detail, /\{item\.startTime\}–\{item\.endTime\}/);
  assert.doesNotMatch(home, /<small>\{item\.endTime\}<\/small>/);
  assert.doesNotMatch(detail, /<small>\{item\.endTime\}<\/small>/);
});
test("首頁與完整議程皆使用時間項目講者三欄表格", async () => {
  const home = await readFile(new URL("components/HomePage.tsx", root), "utf8");
  const detail = await readFile(
    new URL("components/EventDetailPages.tsx", root),
    "utf8",
  );
  for (const source of [home, detail]) {
    assert.match(source, /className="agenda-table/);
    assert.match(source, /<th scope="col">時間<\/th>/);
    assert.match(source, /<th scope="col">項目<\/th>/);
    assert.match(source, /<th scope="col">講者<\/th>/);
    assert.match(source, /agenda-speaker-cell/);
  }
});
test("歷年頁不顯示年度成果，首頁使用緊湊版面範圍", async () => {
  const home = await readFile(new URL("components/HomePage.tsx", root), "utf8");
  const detail = await readFile(
    new URL("components/EventDetailPages.tsx", root),
    "utf8",
  );
  const enhancements = await readFile(
    new URL("app/enhancements.css", root),
    "utf8",
  );
  assert.match(home, /<main className="home-page">/);
  assert.doesNotMatch(detail, /年度成果/);
  assert.doesNotMatch(detail, /dialogue\.highlights\.map/);
  assert.match(enhancements, /\.home-page \.timeline \.year/);
  assert.match(enhancements, /\.home-page \.quick-registration-section/);
});
test("會議資訊移除費用名額列並確認三樓宴會廳", async () => {
  const home = await readFile(new URL("components/HomePage.tsx", root), "utf8");
  const database = await readFile(new URL("lib/db.ts", root), "utf8");
  assert.doesNotMatch(home, /<dt>費用／名額<\/dt>/);
  assert.match(database, /3 樓宴會廳/);
  assert.match(database, /2026-confirmed-details-v4/);
});
test("敏感設定只出現在環境變數範本", async () => {
  const source = await readFile(new URL("lib/auth.ts", root), "utf8");
  assert.match(source, /ADMIN_EMAIL_ALLOWLIST/);
  assert.doesNotMatch(source, /password\s*[:=]\s*["'][^"']+/i);
});
test("SEO、sitemap 與 robots 已設定", async () => {
  await access(new URL("app/sitemap.ts", root));
  await access(new URL("app/robots.ts", root));
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(layout, /openGraph/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
});
test("資料庫 migration 包含報名唯一索引與稽核紀錄", async () => {
  const sql = await readFile(
    new URL("migrations/0000_forum_core.sql", root),
    "utf8",
  );
  assert.match(sql, /UNIQUE\(event_id, email_normalized\)/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS registration_history/);
});
test("2026 會議資訊與範本資料已設定", async () => {
  const source = await readFile(new URL("lib/db.ts", root), "utf8");
  assert.match(source, /2026 Conference on ERM in the insurance industry/);
  assert.match(source, /09:00–16:30/);
  assert.match(source, /08:30–09:00/);
  assert.match(source, /2026 年 11 月 6 日/);
  assert.match(source, /agenda-template-12/);
  assert.match(source, /speaker-template-03/);
});
test("公開導覽採站內快速連結並移除左上品牌文字", async () => {
  const shell = await readFile(
    new URL("components/SiteShell.tsx", root),
    "utf8",
  );
  const home = await readFile(new URL("components/HomePage.tsx", root), "utf8");
  assert.doesNotMatch(shell, /className="brand/);
  assert.match(shell, /<ReliableLink/);
  assert.match(home, /<Link href=\{`\/dialogues\/\$\{d\.slug\}`\}/);
  assert.match(shell, /publicEventRequest \?\?=/);
  assert.match(shell, /window\.location\.assign\(destination\.href\)/);
});
