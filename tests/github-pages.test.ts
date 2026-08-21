import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("GitHub Pages 首頁、議程、歷年與報名頁已產生", async () => {
  for (const target of [
    "docs/index.html",
    "docs/2026/agenda/index.html",
    "docs/2026/speakers/index.html",
    "docs/2026/speakers/peng-jin-long/index.html",
    "docs/2026/speakers/wang-li-hui/index.html",
    "docs/2026/speakers/shi-bai-da/index.html",
    "docs/2026/speakers/chen-chang-cheng/index.html",
    "docs/dialogues/index.html",
    "docs/dialogues/2025/index.html",
    "docs/register/index.html",
    "docs/github-pages.js",
    "docs/site.css",
    "docs/config.js",
    "docs/.nojekyll",
  ]) {
    await access(new URL(target, root));
  }
});

test("GitHub Pages 使用子目錄連結並移除原站執行碼", async () => {
  const html = await readFile(new URL("docs/index.html", root), "utf8");
  assert.match(html, /href="\/2026ERM\/dialogues"/);
  assert.match(html, /src="\/2026ERM\/hero-2026\.jpg"/);
  assert.match(html, /src="\/2026ERM\/github-pages\.js"/);
  assert.match(html, /href="\/2026ERM\/site\.css"/);
  assert.match(html, /\/2026ERM\/fonts\/noto-(sans|serif)-tc-/);
  assert.doesNotMatch(html, /\/2026ERM\/2026ERM\//);
  assert.doesNotMatch(html, /\/Users\//);
  assert.doesNotMatch(html, /\/_next\//);
  assert.doesNotMatch(html, /vinext\.navigationRuntime/);
  assert.doesNotMatch(html, /insurance-risk-forum-2026\.impr-joseph/);
  assert.doesNotMatch(html, />管理後台<\/a>/);
});

test("GitHub Pages 保留完整網站排版樣式", async () => {
  const css = await readFile(new URL("docs/site.css", root), "utf8");
  assert.match(css, /\.site-header/);
  assert.match(css, /\.hero/);
  assert.match(css, /\.speaker-grid/);
  assert.match(css, /\.floating-registration/);
  assert.ok(css.length > 40_000);
});

test("Google Sheet API 與報名寫入已串接", async () => {
  const config = await readFile(new URL("docs/config.js", root), "utf8");
  const runtime = await readFile(new URL("docs/github-pages.js", root), "utf8");
  assert.match(config, /script\.google\.com\/macros\/s\/AKfycbw-/);
  assert.match(runtime, /action: "appendRegistration"/);
  assert.match(runtime, /url\.searchParams\.set\("action", "readEvent"\)/);
  assert.match(runtime, /duplicate_registration/);
});

test("GitHub Pages 站內絕對連結皆有對應檔案", async () => {
  const htmlFiles = [
    "docs/index.html",
    "docs/2026/agenda/index.html",
    "docs/2026/speakers/index.html",
    "docs/dialogues/index.html",
    "docs/register/index.html",
  ];
  const links = new Set<string>();
  for (const file of htmlFiles) {
    const html = await readFile(new URL(file, root), "utf8");
    for (const match of html.matchAll(/href="(\/2026ERM\/[^"#?]*)/g)) {
      links.add(match[1]);
    }
  }
  for (const link of links) {
    const relative = link.replace(/^\/2026ERM\/?/, "");
    if (!relative || /\.[a-z0-9]+$/i.test(relative)) continue;
    await access(
      path.join(new URL("docs/", root).pathname, relative, "index.html"),
    );
  }
});
