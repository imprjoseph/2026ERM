# 保險業風險管理趨勢論壇官網暨報名管理系統

正式、可跨年度延伸的論壇品牌官網與會議報名管理系統。前台提供年度內容、講者、議程、歷年對話、活動資訊、FAQ 與報名申請；後台提供名單審核、內容新增、通知測試、QR Code 與現場報到。

目前活動資料：2026 年 11 月 16 日，晶華酒店；主辦單位為財團法人保險安定基金。首頁使用 2026 主視覺提案，並提供倒數計時與跨頁常駐報名入口。活動時間、樓層廳別、費用、名額與正式報名截止時間尚待主辦單位確認。

歷年對話已依 2022–2025 年結案報告整理年度主題、日期、場地、參與統計、議題與講者；簽到名冊、Email 等個人資料不匯入公開網站。

## 技術架構

- Vinext（Next.js App Router 相容）＋ React 19＋ TypeScript
- Tailwind CSS 4 與專案設計系統
- Cloudflare D1（SQLite）＋ Drizzle schema
- Sites／Cloudflare Worker ESM 部署
- Sign in with ChatGPT（正式環境管理後台身分驗證）
- QR Code 產生與 BarcodeDetector 相機掃碼

平台選擇 D1 而非 PostgreSQL，是為了讓目前 Sites 部署具備真正可保存的關聯式資料，而非建立無法運作的假後端。`db/schema.ts` 保留 ORM 型別結構；未來若改部署至一般 Node.js／Vercel，可依相同模型遷移至 PostgreSQL。

## 本機啟動

需求：Node.js 22.13 或更新版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

開啟 `http://localhost:3000`。開發模式會使用專案內的本機 D1；管理後台本機入口為 `/admin`。正式環境不啟用本機管理者替代模式。

## 資料庫與 migration

- Drizzle schema：`db/schema.ts`
- 初始 migration：`migrations/0000_forum_core.sql`
- 執行時安全初始化與示意 seed：`lib/db.ts`

產生新的 migration：

```bash
npm run db:generate
```

每次 schema 變更都應提交新的 migration。部署打包會一併包含 migrations；請勿刪除舊年度資料。所有示意內容都明確使用「待確認」或「待補入歷年資料」，不包含虛構真實人物。

## 環境變數

複製 `.env.example`，設定：

- `ADMIN_EMAIL_ALLOWLIST`：可進入後台的管理者 Email，逗號分隔。正式環境必填。
- `SMTP_RELAY_URL`、`SMTP_RELAY_TOKEN`：選用 HTTPS SMTP relay。
- `SMTP_FROM_NAME`、`SMTP_FROM_EMAIL`：活動寄件者資訊。
- `PUBLIC_SITE_URL`：正式網站網址，供 QR Code、行事曆及 SEO 使用。

不得提交 `.env.local`、密碼、Token 或 SMTP 帳密。管理者權限由伺服器端檢查，不信任前端顯示狀態。

## 管理後台操作

1. 前往 `/admin` 並完成 Sign in with ChatGPT。
2. 正式環境會再以 `ADMIN_EMAIL_ALLOWLIST` 驗證授權。
3. 「報名名單」可搜尋、篩選、查看個資、更新狀態與匯出安全 CSV。
4. 審核通過時自動產生不可猜測的專屬 QR Token。
5. 「講者管理」、「議程管理」、「歷年對話」可新增年度內容。
6. 「信件範本」可建立測試寄送紀錄；正式 SMTP relay 設定後再接上實際寄送。
7. `/admin/check-in` 可掃描 QR Code，亦可用姓名、手機末三碼或申請編號報到。

目前後台已完成核心可操作流程；年度活動、焦點、FAQ、單位、Logo、網站設定、權限與操作紀錄已有資料模型與模組入口，完整欄位編輯 UI 列在後續設定清單。

## 內容更新原則

- `events` 的 `is_current` 決定首頁年度。
- 當年度與歷年共用年度資料概念；切換年度不可刪除舊資料。
- 新增的講者、議程與歷年對話立即由公開 API 讀取。
- 未確認資訊應填「待確認」，不得以推測資料發布。
- 歷年資料需確認後將 `is_published` 設為公開。

## 報名與通知流程

填寫表單 → 收件紀錄 → 待審核 → 通過／候補／未通過 → QR 與行前通知 → 現場報到 → 感謝信與問卷。

公開報名包含伺服器驗證、Email 正規化、年度＋Email 唯一限制、蜜罐欄位、最短填表時間、IP 速率限制及同源檢查。每次狀態更新會寫入歷程及稽核紀錄。CSV 欄位會防止公式注入。

目前寄信採可測試的本機替代模式：建立寄送佇列／測試紀錄，不假裝已寄出。正式上線前需接妥 HTTPS SMTP relay，並驗證 SPF、DKIM、DMARC 與退信處理。

## 備份與還原

正式環境應定期使用 Cloudflare D1 匯出功能建立 SQL 備份，保存在受控且加密的儲存位置，並設定保存週期。還原前先建立當下快照，在非正式環境演練匯入、筆數核對、唯一索引與報名狀態歷程，再安排維護時段還原正式資料。R2 尚未啟用；未來加入照片／文件上傳時，需同步備份 R2 物件與 D1 中的檔案中繼資料。

## 測試與品質檢查

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

自動測試涵蓋：必填欄位、Email、手機、個資同意、防垃圾、狀態轉換、CSV 公式注入、核心路由、敏感設定、SEO 與 migration。另以本機 API 流程測試重複報名、審核通過、QR Token、首次報到及重複報到警示。

## 部署

Sites 會建置 Cloudflare Worker 相容輸出、建立 D1、套用 migration 並發布。若改部署至 Vercel／一般 Node.js，需將 D1 adapter 替換為 PostgreSQL adapter、設定連線池，並保留相同的伺服器驗證、權限與稽核規則。

## 已完成

- 響應式品牌首頁及所有主要公開頁面
- 長期年度模型、講者、議程、FAQ 與歷年對話
- 可實際寫入的報名表與完成畫面
- 報名重複阻擋、審核狀態歷程、稽核紀錄
- 管理名單搜尋、篩選、審核、CSV 匯出
- QR Token、QR Code、相機掃描、手動與重複報到
- 信件範本清單、測試寄送及寄送紀錄替代模式
- 隱私／個資／條款頁、sitemap、robots、Event SEO 基礎
- 404／錯誤頁、鍵盤與 reduced-motion 支援

## 正式上線前待設定

- 主辦單位 Logo、定稿主視覺、活動時間、廳別、費用、名額、正式截止時間
- 已確認的 2026 講者、議程與可公開下載的歷年 PDF
- 主辦單位核准的個資告知、隱私政策與網站條款
- 管理者 Email allowlist、正式 SMTP relay、寄件網域 DNS
- 正式索引開放（目前因活動資訊尚未完整確認，網站設定為 `noindex`）
- 資料保存年限、匿名化／刪除程序與備份排程
- 完整年度／FAQ／單位／Logo 欄位編輯 UI 與細緻 RBAC

## 已知限制

- 瀏覽器原生 `BarcodeDetector` 並非所有裝置支援；不支援時可使用 QR 連結或手動搜尋。
- 離線報到目前提供錯誤提示與重試，尚未建立可離線寫入後再同步的本機佇列。
- SMTP 實際傳送、批次寄信排程、Excel `.xlsx` 匯出與電子證明產製需在取得正式服務與版型後接入。
