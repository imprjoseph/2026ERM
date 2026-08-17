import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceOrigin =
  "https://insurance-risk-forum-2026.impr-joseph.chatgpt.site";
const githubOrigin = "https://imprjoseph.github.io";
const basePath = "/2026ERM";
const outputRoot = path.resolve("docs");
const sheetApiUrl =
  "https://script.google.com/macros/s/AKfycbw-kdSD2axQgT1ZwhfupOlHRIyHI4fGeIVPfftaer58YFR_bes4r3LkU9zmOdZjAxkU/exec";
const sheetAdminUrl =
  "https://docs.google.com/spreadsheets/d/1PoJOTdzcYF6vx-TeB2p4Y3-M8W6YX2NxctwY4dAjxfU/edit";

const pages = [
  ["/", "index.html", "home"],
  ["/2026", "2026/index.html", "home"],
  ["/2026/agenda", "2026/agenda/index.html", "agenda"],
  ["/2026/speakers", "2026/speakers/index.html", "speakers"],
  [
    "/2026/speakers/speaker-template-01",
    "2026/speakers/speaker-template-01/index.html",
    "speaker-detail",
  ],
  [
    "/2026/speakers/speaker-template-02",
    "2026/speakers/speaker-template-02/index.html",
    "speaker-detail",
  ],
  [
    "/2026/speakers/speaker-template-03",
    "2026/speakers/speaker-template-03/index.html",
    "speaker-detail",
  ],
  ["/dialogues", "dialogues/index.html", "dialogues"],
  ["/dialogues/2025", "dialogues/2025/index.html", "dialogue-detail"],
  ["/dialogues/2024", "dialogues/2024/index.html", "dialogue-detail"],
  ["/dialogues/2023", "dialogues/2023/index.html", "dialogue-detail"],
  ["/dialogues/2022", "dialogues/2022/index.html", "dialogue-detail"],
  ["/register", "register/index.html", "register"],
  ["/privacy", "privacy/index.html", "legal"],
  ["/personal-data", "personal-data/index.html", "legal"],
  ["/terms", "terms/index.html", "legal"],
];

async function fetchPage(route) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${sourceOrigin}${route}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function transform(html, route, pageKind) {
  let result = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*\/_next\/[^>]*>/gi, "")
    .replaceAll(sourceOrigin, `${githubOrigin}${basePath}`)
    .replace(
      /href="\/admin"/g,
      `href="${sheetAdminUrl}" target="_blank" rel="noopener noreferrer"`,
    )
    .replace(/(href|src)="\/(?!\/)/g, `$1="${basePath}/`)
    .replace(
      /<body([^>]*)>/i,
      `<body$1 data-static-page="${pageKind}" data-source-route="${route}">`,
    )
    .replace(
      /<\/head>/i,
      `<link rel="icon" href="${basePath}/favicon.svg" />\n<script src="${basePath}/config.js"></script>\n</head>`,
    )
    .replace(
      /<\/body>/i,
      `<script src="${basePath}/github-pages.js" defer></script>\n</body>`,
    );

  result = result.replace(
    /<meta name="robots" content="noindex, follow">/g,
    '<meta name="robots" content="index, follow">',
  );
  return result;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(path.resolve("public"), outputRoot, { recursive: true });

for (const [route, output, pageKind] of pages) {
  const html = transform(await fetchPage(route), route, pageKind);
  const target = path.join(outputRoot, output);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
}

await writeFile(path.join(outputRoot, ".nojekyll"), "");
await writeFile(
  path.join(outputRoot, "config.js"),
  `window.ERM_CONFIG = ${JSON.stringify({
    basePath,
    sheetApiUrl,
    sheetAdminUrl,
  })};\n`,
);
await cp(
  path.resolve("github-pages/github-pages.js"),
  path.join(outputRoot, "github-pages.js"),
);
await writeFile(
  path.join(outputRoot, "admin", "index.html"),
  `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${sheetAdminUrl}"><title>開啟 Google Sheet 後台</title><p><a href="${sheetAdminUrl}">開啟 Google Sheet 後台</a></p>`,
).catch(async () => {
  await mkdir(path.join(outputRoot, "admin"), { recursive: true });
  await writeFile(
    path.join(outputRoot, "admin", "index.html"),
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${sheetAdminUrl}"><title>開啟 Google Sheet 後台</title><p><a href="${sheetAdminUrl}">開啟 Google Sheet 後台</a></p>`,
  );
});
await writeFile(
  path.join(outputRoot, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${githubOrigin}${basePath}/sitemap.xml\n`,
);
await writeFile(
  path.join(outputRoot, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages
    .map(
      ([route]) =>
        `<url><loc>${githubOrigin}${basePath}${route === "/" ? "/" : `${route}/`}</loc></url>`,
    )
    .join("")}</urlset>`,
);
await cp(
  path.join(outputRoot, "index.html"),
  path.join(outputRoot, "404.html"),
);

console.log(`Generated ${pages.length} GitHub Pages routes in ${outputRoot}`);
