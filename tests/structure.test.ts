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
  assert.match(card, /請看簡介/);
  assert.match(card, /\/2026\/speakers\/\$\{encodeURIComponent/);
  const enhancements = await readFile(
    new URL("app/enhancements.css", root),
    "utf8",
  );
  assert.match(
    enhancements,
    /\.speaker-card \.speaker-photo \{[\s\S]*width: 62\.5%/,
  );
  assert.match(
    enhancements,
    /\.speaker-grid\.detailed \{[\s\S]*grid-template-columns: repeat\(4/,
  );
  assert.match(
    enhancements,
    /\.speaker-card \{[\s\S]*border-top: 3px solid/,
  );
  assert.match(
    enhancements,
    /\.speaker-card \.speaker-organization \{[\s\S]*min-height: 0/,
  );
  assert.match(enhancements, /\.speaker-detail-photo \{[\s\S]*width: 188px/);
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
    assert.doesNotMatch(source, /item\.venue/);
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
  assert.doesNotMatch(detail, /資料依該年度結案報告/);
  assert.doesNotMatch(detail, /與會者個人資料/);
  assert.match(detail, /<p>歷年對話<\/p>/);
  assert.doesNotMatch(detail, /<p>\{dialogue\.name\}<\/p>/);
  assert.match(enhancements, /\.home-page \.timeline \.year/);
  assert.match(enhancements, /\.home-page \.quick-registration-section/);
});
test("會議資訊移除費用名額列並確認三樓宴會廳", async () => {
  const home = await readFile(new URL("components/HomePage.tsx", root), "utf8");
  const database = await readFile(new URL("lib/db.ts", root), "utf8");
  assert.doesNotMatch(home, /<dt>費用／名額<\/dt>/);
  assert.doesNotMatch(home, /<span>無障礙<\/span>/);
  assert.doesNotMatch(database, /無障礙動線待確認/);
  assert.match(database, /3 樓宴會廳/);
  assert.match(database, /午餐地點｜B1 栢麗廳/);
  assert.match(database, /2026-confirmed-details-v8/);
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
  assert.match(source, /peng-jin-long/);
  assert.match(source, /wang-li-hui/);
  assert.match(source, /shi-bai-da/);
  assert.match(source, /chen-chang-cheng/);
});
test("公開導覽採可靠原生連結並移除左上品牌文字", async () => {
  const shell = await readFile(
    new URL("components/SiteShell.tsx", root),
    "utf8",
  );
  const home = await readFile(new URL("components/HomePage.tsx", root), "utf8");
  assert.doesNotMatch(shell, /className="brand/);
  assert.match(shell, /<ReliableLink/);
  assert.match(home, /<Link href=\{`\/dialogues\/\$\{d\.slug\}`\}/);
  assert.match(shell, /publicEventRequest \?\?=/);
  assert.match(shell, /<a \{\.\.\.props\} href=\{href\}/);
});

test("頁首歷年對話使用可靠連結，歷年卡片不顯示論壇名稱", async () => {
  const shell = await readFile(
    new URL("components/SiteShell.tsx", root),
    "utf8",
  );
  const home = await readFile(
    new URL("components/HomePage.tsx", root),
    "utf8",
  );
  const detail = await readFile(
    new URL("components/EventDetailPages.tsx", root),
    "utf8",
  );
  assert.match(shell, /\["歷年對話", "\/dialogues"\]/);
  assert.match(shell, /<a \{\.\.\.props\} href=\{href\}/);
  assert.doesNotMatch(shell, /from "next\/link"/);
  assert.match(home, /<span>\{d\.theme\}<\/span>/);
  assert.doesNotMatch(home, /<span>\{d\.name\}<\/span>/);
  assert.match(detail, /<span>\{d\.isPublished \? "歷年對話"/);
  assert.match(detail, /<h2>\{event\.themeZh\}<\/h2>/);
  assert.doesNotMatch(detail, /<h2>\{event\.nameZh\}<\/h2>/);
  assert.match(detail, /<h2>\{d\.theme\}<\/h2>/);
  assert.doesNotMatch(detail, /<h2>\{d\.name\}<\/h2>/);
});

test("公開頁使用發佈快取，不在訪客請求時讀取 Google Sheet", async () => {
  const route = await readFile(
    new URL("app/api/public/event/route.ts", root),
    "utf8",
  );
  const cache = await readFile(new URL("lib/publishedEvent.ts", root), "utf8");
  const shell = await readFile(
    new URL("components/SiteShell.tsx", root),
    "utf8",
  );
  assert.match(route, /getPublishedEvent/);
  assert.doesNotMatch(route, /applyGoogleSheetEventOverrides/);
  assert.match(route, /s-maxage=86400/);
  assert.match(cache, /publishedEventSnapshot \?\?= ensureDatabase\(\)/);
  assert.match(cache, /\.then\(\(\) => getCurrentEvent\(\)\)/);
  assert.match(shell, /const publicEventCacheTtl = 86_400_000/);
  assert.match(shell, /if \(initialEvent\)/);
});
