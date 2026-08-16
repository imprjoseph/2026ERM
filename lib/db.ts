import { env } from "cloudflare:workers";
import type {
  EventData,
  RegistrationRecord,
  RegistrationStatus,
} from "./types";

type RuntimeEnv = { DB: D1Database };

type D1Result<T> = { results?: T[]; success: boolean };

let initialized: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, year INTEGER NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE,
    is_current INTEGER NOT NULL DEFAULT 0, is_published INTEGER NOT NULL DEFAULT 0,
    name_zh TEXT NOT NULL, name_en TEXT NOT NULL, theme_zh TEXT NOT NULL, theme_en TEXT NOT NULL,
    concept_zh TEXT NOT NULL, concept_en TEXT NOT NULL, date_label TEXT NOT NULL, time_label TEXT NOT NULL,
    checkin_label TEXT NOT NULL, location_name TEXT NOT NULL, location_address TEXT NOT NULL,
    venue_detail TEXT NOT NULL, organizer TEXT NOT NULL, hero_url TEXT NOT NULL DEFAULT '', audience TEXT NOT NULL, fee_label TEXT NOT NULL,
    capacity_label TEXT NOT NULL, deadline_label TEXT NOT NULL, requires_approval INTEGER NOT NULL DEFAULT 1,
    registration_open INTEGER NOT NULL DEFAULT 1, waitlist_enabled INTEGER NOT NULL DEFAULT 1,
    transport_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS focuses (
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), title TEXT NOT NULL,
    description TEXT NOT NULL, icon TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS speakers (
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL DEFAULT '', organization TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '',
    speaker_type TEXT NOT NULL DEFAULT '', topic TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, is_visible INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS agenda_items (
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), day_label TEXT NOT NULL,
    period TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, category TEXT NOT NULL,
    title TEXT NOT NULL, description TEXT NOT NULL, participants TEXT NOT NULL, venue TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0, is_visible INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS faqs (
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), question TEXT NOT NULL,
    answer TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, is_visible INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS dialogues (
    id TEXT PRIMARY KEY, year INTEGER NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    theme TEXT NOT NULL, date_label TEXT NOT NULL, location TEXT NOT NULL, background TEXT NOT NULL,
    insights TEXT NOT NULL, participants_count TEXT NOT NULL, speakers_count TEXT NOT NULL,
    sessions_count TEXT NOT NULL, is_published INTEGER NOT NULL DEFAULT 0,
    highlights_json TEXT NOT NULL DEFAULT '[]', speakers_json TEXT NOT NULL DEFAULT '[]', agenda_json TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY, application_no TEXT NOT NULL UNIQUE, event_id TEXT NOT NULL REFERENCES events(id),
    name_zh TEXT NOT NULL, name_en TEXT NOT NULL DEFAULT '', organization TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT '', job_title TEXT NOT NULL, category TEXT NOT NULL, mobile TEXT NOT NULL,
    email TEXT NOT NULL, email_normalized TEXT NOT NULL, needs_english_badge INTEGER NOT NULL DEFAULT 0,
    dietary TEXT NOT NULL DEFAULT '', dietary_notes TEXT NOT NULL DEFAULT '', accessibility_needs TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '', accepts_updates INTEGER NOT NULL DEFAULT 0, privacy_consent INTEGER NOT NULL,
    status TEXT NOT NULL, checkin_token TEXT UNIQUE, checked_in_at TEXT, custom_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(event_id, email_normalized)
  )`,
  `CREATE TABLE IF NOT EXISTS registration_history (
    id TEXT PRIMARY KEY, registration_id TEXT NOT NULL REFERENCES registrations(id), from_status TEXT,
    to_status TEXT NOT NULL, actor_id TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY, registration_id TEXT, template_key TEXT NOT NULL, recipient TEXT NOT NULL,
    status TEXT NOT NULL, error_message TEXT, actor_id TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_event_status ON registrations(event_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_history_registration ON registration_history(registration_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)`,
];

function db() {
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB) throw new Error("Database binding is unavailable");
  return runtime.DB;
}

export async function ensureDatabase() {
  initialized ??= (async () => {
    for (const sql of schemaStatements) await db().prepare(sql).run();
    await ensureExtendedColumns();
    await seedIfEmpty();
    await syncConfirmed2026DetailsOnce();
    await importHistoricalArchiveOnce();
  })().catch((error) => {
    initialized = null;
    throw error;
  });
  return initialized;
}

async function ensureExtendedColumns() {
  const eventColumns = await db()
    .prepare("PRAGMA table_info(events)")
    .all<{ name: string }>();
  if (
    !(eventColumns.results ?? []).some((column) => column.name === "hero_url")
  ) {
    await db()
      .prepare(
        "ALTER TABLE events ADD COLUMN hero_url TEXT NOT NULL DEFAULT ''",
      )
      .run();
  }
  const dialogueColumns = await db()
    .prepare("PRAGMA table_info(dialogues)")
    .all<{ name: string }>();
  for (const name of ["highlights_json", "speakers_json", "agenda_json"]) {
    if (
      !(dialogueColumns.results ?? []).some((column) => column.name === name)
    ) {
      await db()
        .prepare(
          `ALTER TABLE dialogues ADD COLUMN ${name} TEXT NOT NULL DEFAULT '[]'`,
        )
        .run();
    }
  }
}

async function seedIfEmpty() {
  const existing = await db()
    .prepare("SELECT id FROM events LIMIT 1")
    .first<{ id: string }>();
  if (existing) return;
  const now = new Date().toISOString();
  const eventId = "event-2026";
  await db().batch([
    db()
      .prepare(
        `INSERT INTO events (
      id, year, slug, is_current, is_published, name_zh, name_en, theme_zh, theme_en,
      concept_zh, concept_en, date_label, time_label, checkin_label, location_name,
      location_address, venue_detail, organizer, hero_url, audience, fee_label, capacity_label,
      deadline_label, requires_approval, registration_open, waitlist_enabled, transport_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?)`,
      )
      .bind(
        eventId,
        2026,
        "2026",
        "2026年保險業風險管理趨勢論壇",
        "2026 Conference on ERM in the insurance industry",
        "新紀元：價值導向之風險管理與資本策略",
        "A New Era: Value-Oriented Risk Management and Capital Strategy",
        "持續對話，與產業共同前行",
        "An Ongoing Dialogue on Risk and Value",
        "2026 年 11 月 16 日",
        "09:00–16:30",
        "08:30–09:00",
        "晶華酒店",
        "地址待確認",
        "樓層及廳別待確認",
        "財團法人保險安定基金",
        "/hero-2026.jpg",
        "保險業高階主管、風險管理與金融專業人士等受邀對象",
        "免費",
        "名額待確認",
        "2026 年 11 月 6 日",
        JSON.stringify({
          metro:
            "搭乘捷運淡水線（紅線）至中山站 3 號出口，步行約 6 分鐘即可抵達。",
          bus: "搭乘 218、220、221、227、247、260、261、287、310、636，於國賓飯店站下車，步行約 3 分鐘即可抵達。",
          walk: "由捷運中山站 3 號出口步行約 6 分鐘。",
          parking: "飯店備有代客停車服務，地下 4、5 樓設有貴賓專用停車場。",
          accessibility: "無障礙動線待確認",
        }),
        now,
        now,
      ),
    ...[
      [
        "focus-1",
        "國際制度與監理趨勢",
        "追蹤國際制度接軌與監理環境變化，掌握產業下一步。",
        "01",
      ],
      [
        "focus-2",
        "市場波動與風險韌性",
        "從市場壓力與新興風險出發，思考組織韌性的建構。",
        "02",
      ],
      [
        "focus-3",
        "價值導向的資本策略",
        "連結資本效率、風險承擔與企業長期價值。",
        "03",
      ],
      [
        "focus-4",
        "公平待客與永續經營",
        "將客戶價值與永續治理納入風險決策的核心。",
        "04",
      ],
    ].map((item, index) =>
      db()
        .prepare(
          "INSERT INTO focuses (id,event_id,title,description,icon,sort_order,is_visible) VALUES (?,?,?,?,?,?,1)",
        )
        .bind(item[0], eventId, item[1], item[2], item[3], index),
    ),
    db()
      .prepare(
        "INSERT INTO agenda_items (id,event_id,day_label,period,start_time,end_time,category,title,description,participants,venue,sort_order,is_visible) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)",
      )
      .bind(
        "agenda-pending",
        eventId,
        "會議日",
        "全天",
        "待確認",
        "待確認",
        "議程公告",
        "完整議程待確認",
        "議程與講者資訊將由主辦單位確認後陸續公布。",
        "講者陣容陸續公布",
        "場地待確認",
        0,
      ),
    ...defaultFaqs.map((item, index) =>
      db()
        .prepare(
          "INSERT INTO faqs (id,event_id,question,answer,sort_order,is_visible) VALUES (?,?,?,?,?,1)",
        )
        .bind(`faq-${index + 1}`, eventId, item[0], item[1], index),
    ),
  ]);
}

const defaultFaqs = [
  [
    "送出資料後是否代表報名成功？",
    "不代表。送出後僅表示主辦單位已收到申請；若採資格審核，請以審核結果通知為準。",
  ],
  ["何時收到審核結果？", "審核時程待主辦單位確認，結果將寄至報名信箱。"],
  ["會議是否收費？", "本會議免費參加，採資格審核制。"],
  [
    "可否更換出席人員？",
    "請透過會議聯絡信箱提出申請，是否可更換由主辦單位確認。",
  ],
  ["無法出席如何取消？", "請使用通知信中的安全連結或聯絡會議小組辦理取消。"],
  ["是否提供餐點？", "餐點安排待確認；報名時仍可先填寫飲食需求。"],
  ["是否提供停車優惠？", "停車與優惠資訊待確認。"],
  ["是否提供進修時數或參加證明？", "相關認證與證明資訊待確認。"],
  ["會議當天如何報到？", "審核通過者將於會議前收到專屬 QR Code 與行前通知。"],
  ["沒有收到確認信怎麼辦？", "請先檢查垃圾郵件匣，再以報名信箱聯絡會議小組。"],
];

const historicalDialogues = [
  {
    year: 2025,
    name: "2025年保險業風險管理趨勢論壇",
    theme: "重塑保險新秩序：邁向新制度的轉型之路",
    dateLabel: "2025 年 10 月 29 日",
    location: "台北寒舍艾美酒店 3 樓宴會廳",
    background:
      "在 IFRS 17 與新一代清償能力制度接軌的關鍵階段，論壇聚焦資本、資產負債管理與財務溝通，整理國際制度落地後的實務經驗。",
    insights:
      "制度轉型不只是合規工程，也會改變商品、資產配置、風險偏好與績效溝通；跨部門治理與可比較的管理資訊，是穩健轉型的共同基礎。",
    participantsCount: "233",
    speakersCount: "5",
    sessionsCount: "7",
    highlights: [
      "整體會議滿意度 4.8／5",
      "場地與餐飲滿意度 4.9／5",
      "72.7% 與會者表示非常滿意",
    ],
    speakers: [
      "Jonathan Dixon",
      "Béatrice Semiond",
      "YongBum Jun",
      "Uemura Nobuyasu",
      "Keerti Sethia",
      "Greg Douglas",
      "蔡政憲",
    ],
    agenda: [
      "國際監理動態：保險資本標準與風險為本監理",
      "風險管理與資產負債匹配之實踐",
      "韓國保險業採行 K-ICS 之挑戰及經驗分享",
      "日本保險業採行經濟清償能力比率之挑戰及經驗分享",
      "新加坡健康保險發展趨勢",
      "IFRS 17 生效後，財務報表如何分析？英國經驗",
      "高峰對談：實施兩制度後之策略與行動",
    ],
  },
  {
    year: 2024,
    name: "2024年保險業風險管理趨勢論壇",
    theme: "世事變遷下的風險管理",
    dateLabel: "2024 年 9 月 13 日",
    location: "台北晶華酒店 3 樓宴會廳",
    background:
      "面對地緣政治、人工智慧、流動性與極端氣候等交織風險，論壇從國際環境到保險業日常治理，建立跨議題的風險管理視角。",
    insights:
      "風險情境需被納入 ORSA、流動性管理與決策節奏；人工智慧與氣候議題同時帶來機會與責任，治理架構必須保留可追溯性與韌性。",
    participantsCount: "231",
    speakersCount: "7",
    sessionsCount: "6",
    highlights: [
      "整體會議滿意度 4.8／5",
      "81.5% 與會者表示非常滿意",
      "跨國監理、產業與學術觀點同場交流",
    ],
    speakers: [
      "Masaaki Yoshimura",
      "Wanchin Chou",
      "Yosuke Fujisawa",
      "Tamara Burden",
      "Francisco Espejo Gil",
      "陳昌正",
      "王儷容",
      "林秉儒",
      "郭素綾",
    ],
    agenda: [
      "國際風險環境演變",
      "ORSA 實務與 ERM 風險評估",
      "人工智慧之機會與風險",
      "流動性風險管理",
      "氣候變遷及巨災風險管理",
      "高峰對談：外匯市場趨勢、風險管理及避險策略",
    ],
  },
  {
    year: 2023,
    name: "2023年保險業風險管理趨勢論壇",
    theme: "金融穩定及韌性",
    dateLabel: "2023 年 10 月 3 日",
    location: "台北晶華酒店宴會廳",
    background:
      "論壇以金融穩定與韌性為主軸，從保障缺口、氣候定價、資安保險到新興風險辨識，探討產業在不確定環境中的回應能力。",
    insights:
      "韌性來自更早辨識風險、讓承保與定價反映變化，並以跨域合作補足保障缺口；新興風險需要持續監測，而非一次性的風險清單。",
    participantsCount: "225",
    speakersCount: "5",
    sessionsCount: "6",
    highlights: [
      "225 位與會者參與",
      "涵蓋保障缺口、氣候、資安與新興風險",
      "國際監理與在地實務對話",
    ],
    speakers: [
      "Chlora Lindley-Myers",
      "Jeffery Yong",
      "Vincent Padula",
      "Nicolas Colpaert",
      "劉承宗",
      "陳昌正",
      "畠山毅一郎",
      "陳玟琪",
      "陳婉瑜",
      "Tiffany Chen",
    ],
    agenda: [
      "保障缺口因應之道",
      "氣候風險與保險商品定價及核保",
      "資安保險風險管理",
      "金融穩定及韌性",
      "新興風險辨識與管理",
      "高峰對談：新興風險管理實務分享",
    ],
  },
  {
    year: 2022,
    name: "2022年保險業風險管理趨勢論壇",
    theme: "氣候變遷與綠色金融：行動與因應",
    dateLabel: "2022 年 11 月 4 日",
    location: "凱達大飯店 3 樓宴會廳",
    background:
      "在淨零轉型與氣候揭露逐步成為金融核心議題之際，論壇串連監理、情境分析、責任投資與保險實務，回應氣候風險的治理需求。",
    insights:
      "氣候風險必須進入承保、投資、揭露與壓力測試；有效的轉型策略需要可衡量目標、治理責任與跨市場經驗交流。",
    participantsCount: "236",
    speakersCount: "11",
    sessionsCount: "7",
    highlights: [
      "236 位與會者參與",
      "聚焦氣候揭露、量化與責任投資",
      "國內外監理與產業經驗並陳",
    ],
    speakers: [
      "Jonathan Dixon",
      "Stephane Tardif",
      "Neil Dissanayake",
      "Josh Dobiac",
      "Casper Christophersen",
      "Ben Howarth",
      "林士喬",
      "陳昌正",
      "周桂田",
      "施敏智",
      "陳正哲",
      "黃志中",
    ],
    agenda: [
      "氣候變遷與綠色金融：行動與因應",
      "氣候變遷風險監理及最新發展（加拿大經驗）",
      "高峰對談：保險業氣候相關財務揭露之挑戰、心得與因應之道",
      "氣候危機下的保險業因應之道",
      "氣候風險量化（情境分析／壓力測試）",
      "淨零碳排趨勢與實務（英國保險產業經驗）",
      "氣候變遷責任投資經驗分享",
    ],
  },
];

const historicalPhotoUrls: Record<number, string[]> = {
  2025: [
    "/history/2025-forum-01.jpg",
    "/history/2025-forum-02.jpg",
    "/history/2025-forum-03.jpg",
  ],
  2024: [
    "/history/2024-forum-01.jpg",
    "/history/2024-forum-02.jpg",
    "/history/2024-forum-03.jpg",
  ],
  2023: [
    "/history/2023-forum-01.jpg",
    "/history/2023-forum-02.jpg",
    "/history/2023-forum-03.jpg",
  ],
  2022: [
    "/history/2022-forum-01.jpg",
    "/history/2022-forum-02.jpg",
    "/history/2022-forum-03.jpg",
  ],
};

async function syncConfirmed2026DetailsOnce() {
  const version = "2026-confirmed-details-v4";
  const applied = await db()
    .prepare(
      "SELECT value FROM app_meta WHERE key = 'current_event_content_version'",
    )
    .first<{ value: string }>();
  if (applied?.value === version) return;
  const transport = {
    metro: "搭乘捷運淡水線（紅線）至中山站 3 號出口，步行約 6 分鐘即可抵達。",
    bus: "搭乘 218、220、221、227、247、260、261、287、310、636，於國賓飯店站下車，步行約 3 分鐘即可抵達。",
    walk: "由捷運中山站 3 號出口步行約 6 分鐘。",
    parking:
      "飯店備有代客停車服務，地下 4、5 樓設有貴賓專用停車場，方便來賓使用。",
    accessibility: "無障礙動線待確認",
  };
  const eventId = "event-2026";
  const agendaTemplates = [
    [
      "agenda-template-01",
      "上午",
      "08:30",
      "09:00",
      "報到",
      "來賓報到與入場",
      "請攜帶審核通知或 QR Code 辦理報到。",
      "會議工作小組",
      1,
    ],
    [
      "agenda-template-02",
      "上午",
      "09:00",
      "09:10",
      "開幕",
      "開幕與主辦單位致詞（範本）",
      "正式致詞貴賓確認後更新。",
      "主辦單位代表｜待確認",
      2,
    ],
    [
      "agenda-template-03",
      "上午",
      "09:10",
      "10:00",
      "專題演講",
      "ERM 與國際監理趨勢（範本）",
      "議題與講者確認後替換本範本。",
      "專題講者｜待確認",
      3,
    ],
    [
      "agenda-template-04",
      "上午",
      "10:00",
      "10:20",
      "交流",
      "交流休息",
      "茶敘與交流時間。",
      "全體與會者",
      4,
    ],
    [
      "agenda-template-05",
      "上午",
      "10:20",
      "11:10",
      "專題演講",
      "資本策略與價值管理（範本）",
      "議題與講者確認後替換本範本。",
      "專題講者｜待確認",
      5,
    ],
    [
      "agenda-template-06",
      "上午",
      "11:10",
      "12:00",
      "高峰對談",
      "ERM 實務與組織韌性（範本）",
      "主持人與與談人確認後更新。",
      "主持人／與談人｜待確認",
      6,
    ],
    [
      "agenda-template-07",
      "下午",
      "12:00",
      "13:30",
      "午餐",
      "午餐交流",
      "餐飲與場地安排以會前通知為準。",
      "全體與會者",
      7,
    ],
    [
      "agenda-template-08",
      "下午",
      "13:30",
      "14:20",
      "專題演講",
      "新興風險與永續治理（範本）",
      "議題與講者確認後替換本範本。",
      "專題講者｜待確認",
      8,
    ],
    [
      "agenda-template-09",
      "下午",
      "14:20",
      "14:40",
      "交流",
      "交流休息",
      "茶敘與交流時間。",
      "全體與會者",
      9,
    ],
    [
      "agenda-template-10",
      "下午",
      "14:40",
      "15:30",
      "專題演講",
      "資料與 AI 風險治理（範本）",
      "議題與講者確認後替換本範本。",
      "專題講者｜待確認",
      10,
    ],
    [
      "agenda-template-11",
      "下午",
      "15:30",
      "16:20",
      "綜合座談",
      "價值導向 ERM 綜合座談（範本）",
      "主持人與與談人確認後更新。",
      "主持人／與談人｜待確認",
      11,
    ],
    [
      "agenda-template-12",
      "下午",
      "16:20",
      "16:30",
      "閉幕",
      "會議總結與閉幕",
      "主辦單位總結本日會議。",
      "主辦單位代表｜待確認",
      12,
    ],
  ];
  const speakerTemplates = [
    [
      "speaker-template-01",
      "主管機關代表（範本）",
      "主管機關｜待確認",
      "職稱待確認",
      "致詞貴賓",
      "開幕致詞（範本）",
      1,
    ],
    [
      "speaker-template-02",
      "保險業領袖（範本）",
      "保險機構｜待確認",
      "職稱待確認",
      "專題講者",
      "ERM 與資本策略（範本）",
      2,
    ],
    [
      "speaker-template-03",
      "風險管理專家（範本）",
      "專業機構｜待確認",
      "職稱待確認",
      "專題講者",
      "新興風險與治理（範本）",
      3,
    ],
  ];
  const statements = [
    db()
      .prepare(
        "UPDATE events SET name_en = ?, date_label = ?, time_label = ?, checkin_label = ?, location_name = ?, location_address = ?, venue_detail = ?, organizer = ?, hero_url = ?, fee_label = ?, deadline_label = ?, transport_json = ?, updated_at = ? WHERE year = 2026",
      )
      .bind(
        "2026 Conference on ERM in the insurance industry",
        "2026 年 11 月 16 日",
        "09:00–16:30",
        "08:30–09:00",
        "晶華酒店",
        "台北市中山區中山北路二段 39 巷 3 號",
        "3 樓宴會廳",
        "財團法人保險安定基金",
        "/hero-2026.jpg",
        "免費",
        "2026 年 11 月 6 日",
        JSON.stringify(transport),
        new Date().toISOString(),
      ),
    db().prepare("DELETE FROM agenda_items WHERE event_id = ?").bind(eventId),
    db().prepare("DELETE FROM speakers WHERE event_id = ?").bind(eventId),
    db()
      .prepare(
        "UPDATE faqs SET question = ?, answer = ? WHERE event_id = ? AND question IN ('活動是否收費？','會議是否收費？')",
      )
      .bind("會議是否收費？", "本會議免費參加，採資格審核制。", eventId),
  ];
  statements.push(
    ...agendaTemplates.map((item) =>
      db()
        .prepare(
          "INSERT INTO agenda_items (id,event_id,day_label,period,start_time,end_time,category,title,description,participants,venue,sort_order,is_visible) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)",
        )
        .bind(
          item[0],
          eventId,
          "會議日",
          item[1],
          item[2],
          item[3],
          item[4],
          item[5],
          item[6],
          item[7],
          "晶華酒店｜3 樓宴會廳",
          item[8],
        ),
    ),
    ...speakerTemplates.map((item) =>
      db()
        .prepare(
          "INSERT INTO speakers (id,event_id,name_zh,name_en,organization,title,speaker_type,topic,bio,photo_url,sort_order,is_visible) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)",
        )
        .bind(
          item[0],
          eventId,
          item[1],
          "",
          item[2],
          item[3],
          item[4],
          item[5],
          "本列為版型範本，正式姓名、職稱與簡介確認後更新。",
          "",
          item[6],
        ),
    ),
    db()
      .prepare(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('current_event_content_version', ?)",
      )
      .bind(version),
  );
  await db().batch(statements);
}

async function importHistoricalArchiveOnce() {
  const version = "historical-reports-2022-2025-v2";
  const applied = await db()
    .prepare(
      "SELECT value FROM app_meta WHERE key = 'historical_archive_version'",
    )
    .first<{ value: string }>();
  if (applied?.value === version) return;
  const statements = historicalDialogues.map((item) =>
    db()
      .prepare(
        `INSERT OR REPLACE INTO dialogues (
    id,year,slug,name,theme,date_label,location,background,insights,participants_count,speakers_count,sessions_count,
    is_published,highlights_json,speakers_json,agenda_json
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)`,
      )
      .bind(
        `dialogue-${item.year}`,
        item.year,
        String(item.year),
        item.name,
        item.theme,
        item.dateLabel,
        item.location,
        item.background,
        item.insights,
        item.participantsCount,
        item.speakersCount,
        item.sessionsCount,
        JSON.stringify(item.highlights),
        JSON.stringify(item.speakers),
        JSON.stringify(item.agenda),
      ),
  );
  statements.push(
    db()
      .prepare(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('historical_archive_version', ?)",
      )
      .bind(version),
  );
  await db().batch(statements);
}

function parseStringArray(value: unknown) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function bool(value: number) {
  return value === 1;
}

export async function getCurrentEvent(): Promise<EventData> {
  const readCurrentEvent = () =>
    db()
      .prepare("SELECT * FROM events WHERE is_current = 1 LIMIT 1")
      .first<Record<string, unknown>>();
  let event: Record<string, unknown> | null = null;
  try {
    event = await readCurrentEvent();
  } catch {
    await ensureDatabase();
    event = await readCurrentEvent();
  }
  if (!event) {
    await ensureDatabase();
    event = await readCurrentEvent();
  }
  if (!event) throw new Error("Current event not found");
  const eventId = String(event.id);
  const [focuses, speakers, agenda, faqs, dialogues] = await Promise.all([
    db()
      .prepare("SELECT * FROM focuses WHERE event_id = ? ORDER BY sort_order")
      .bind(eventId)
      .all<Record<string, unknown>>(),
    db()
      .prepare("SELECT * FROM speakers WHERE event_id = ? ORDER BY sort_order")
      .bind(eventId)
      .all<Record<string, unknown>>(),
    db()
      .prepare(
        "SELECT * FROM agenda_items WHERE event_id = ? ORDER BY sort_order",
      )
      .bind(eventId)
      .all<Record<string, unknown>>(),
    db()
      .prepare("SELECT * FROM faqs WHERE event_id = ? ORDER BY sort_order")
      .bind(eventId)
      .all<Record<string, unknown>>(),
    db()
      .prepare("SELECT * FROM dialogues ORDER BY year DESC")
      .all<Record<string, unknown>>(),
  ]);
  const transport = JSON.parse(String(event.transport_json || "{}"));
  return {
    id: eventId,
    year: Number(event.year),
    slug: String(event.slug),
    isCurrent: bool(Number(event.is_current)),
    isPublished: bool(Number(event.is_published)),
    nameZh: String(event.name_zh),
    nameEn: String(event.name_en),
    themeZh: String(event.theme_zh),
    themeEn: String(event.theme_en),
    conceptZh: String(event.concept_zh),
    conceptEn: String(event.concept_en),
    dateLabel: String(event.date_label),
    timeLabel: String(event.time_label),
    checkinLabel: String(event.checkin_label),
    locationName: String(event.location_name),
    locationAddress: String(event.location_address),
    venueDetail: String(event.venue_detail),
    organizer: String(event.organizer),
    guidingOrganization: "金融監督管理委員會",
    planningOrganization: "金融監督管理委員會保險局",
    coOrganizers: "財團法人保險事業發展中心；中華民國精算學會",
    contactPhone: "02-27635666#106",
    contactEmail: "penny@impr.com.tw",
    heroUrl: String(event.hero_url || ""),
    audience: String(event.audience),
    feeLabel: String(event.fee_label),
    capacityLabel: String(event.capacity_label),
    deadlineLabel: String(event.deadline_label),
    requiresApproval: bool(Number(event.requires_approval)),
    registrationOpen: bool(Number(event.registration_open)),
    waitlistEnabled: bool(Number(event.waitlist_enabled)),
    transport,
    focuses: (focuses.results ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      title: String(r.title),
      description: String(r.description),
      icon: String(r.icon),
      sortOrder: Number(r.sort_order),
      isVisible: bool(Number(r.is_visible)),
    })),
    speakers: (speakers.results ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      nameZh: String(r.name_zh),
      nameEn: String(r.name_en),
      organization: String(r.organization),
      title: String(r.title),
      type: String(r.speaker_type),
      topic: String(r.topic),
      bio: String(r.bio),
      photoUrl: String(r.photo_url),
      sortOrder: Number(r.sort_order),
      isVisible: bool(Number(r.is_visible)),
    })),
    agenda: (agenda.results ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      dayLabel: String(r.day_label),
      period: String(r.period),
      startTime: String(r.start_time),
      endTime: String(r.end_time),
      category: String(r.category),
      title: String(r.title),
      description: String(r.description),
      participants: String(r.participants),
      venue: String(r.venue),
      sortOrder: Number(r.sort_order),
      isVisible: bool(Number(r.is_visible)),
    })),
    faqs: (faqs.results ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      question: String(r.question),
      answer: String(r.answer),
      sortOrder: Number(r.sort_order),
      isVisible: bool(Number(r.is_visible)),
    })),
    dialogues: (dialogues.results ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      year: Number(r.year),
      slug: String(r.slug),
      name: String(r.name),
      theme: String(r.theme),
      dateLabel: String(r.date_label),
      location: String(r.location),
      background: String(r.background),
      insights: String(r.insights),
      participantsCount: String(r.participants_count),
      speakersCount: String(r.speakers_count),
      sessionsCount: String(r.sessions_count),
      isPublished: bool(Number(r.is_published)),
      highlights: parseStringArray(r.highlights_json),
      speakers: parseStringArray(r.speakers_json),
      agenda: parseStringArray(r.agenda_json),
      photoUrls: historicalPhotoUrls[Number(r.year)] ?? [],
    })),
  };
}

export async function checkRateLimit(
  key: string,
  limit = 6,
  windowMs = 60_000,
) {
  await ensureDatabase();
  const now = Date.now();
  const record = await db()
    .prepare(
      "SELECT attempts, window_started_at FROM rate_limits WHERE key = ?",
    )
    .bind(key)
    .first<{ attempts: number; window_started_at: number }>();
  if (!record || now - record.window_started_at > windowMs) {
    await db()
      .prepare(
        "INSERT OR REPLACE INTO rate_limits (key, attempts, window_started_at) VALUES (?,1,?)",
      )
      .bind(key, now)
      .run();
    return true;
  }
  if (record.attempts >= limit) return false;
  await db()
    .prepare("UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?")
    .bind(key)
    .run();
  return true;
}

export async function createRegistration(input: Record<string, unknown>) {
  await ensureDatabase();
  const event = await db()
    .prepare(
      "SELECT id, registration_open FROM events WHERE is_current = 1 LIMIT 1",
    )
    .first<{ id: string; registration_open: number }>();
  if (!event || event.registration_open !== 1)
    throw new Error("REGISTRATION_CLOSED");
  const id = crypto.randomUUID();
  const applicationNo = `IRMF-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  try {
    await db().batch([
      db()
        .prepare(
          `INSERT INTO registrations (
        id,application_no,event_id,name_zh,name_en,organization,department,job_title,category,mobile,email,email_normalized,
        needs_english_badge,dietary,dietary_notes,accessibility_needs,notes,accepts_updates,privacy_consent,status,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          id,
          applicationNo,
          event.id,
          input.nameZh,
          input.nameEn ?? "",
          input.organization,
          input.department ?? "",
          input.jobTitle,
          input.category,
          input.mobile,
          input.email,
          input.email,
          input.needsEnglishBadge ? 1 : 0,
          input.dietary ?? "",
          input.dietaryNotes ?? "",
          input.accessibilityNeeds ?? "",
          input.notes ?? "",
          input.acceptsUpdates ? 1 : 0,
          1,
          "pending_review",
          now,
          now,
        ),
      db()
        .prepare(
          "INSERT INTO registration_history (id,registration_id,from_status,to_status,actor_id,note,created_at) VALUES (?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          null,
          "pending_review",
          "public-form",
          "報名申請已送出",
          now,
        ),
      db()
        .prepare(
          "INSERT INTO email_logs (id,registration_id,template_key,recipient,status,actor_id,created_at) VALUES (?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          "submission_received",
          input.email,
          "queued-local",
          "system",
          now,
        ),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new Error("DUPLICATE_EMAIL");
    throw error;
  }
  return { id, applicationNo, status: "pending_review" as const };
}

function mapRegistration(r: Record<string, unknown>): RegistrationRecord {
  return {
    id: String(r.id),
    applicationNo: String(r.application_no),
    eventId: String(r.event_id),
    nameZh: String(r.name_zh),
    nameEn: String(r.name_en),
    organization: String(r.organization),
    department: String(r.department),
    jobTitle: String(r.job_title),
    category: String(r.category),
    mobile: String(r.mobile),
    email: String(r.email),
    needsEnglishBadge: bool(Number(r.needs_english_badge)),
    dietary: String(r.dietary),
    dietaryNotes: String(r.dietary_notes),
    accessibilityNeeds: String(r.accessibility_needs),
    notes: String(r.notes),
    acceptsUpdates: bool(Number(r.accepts_updates)),
    privacyConsent: bool(Number(r.privacy_consent)),
    status: r.status as RegistrationStatus,
    checkinToken: r.checkin_token ? String(r.checkin_token) : null,
    checkedInAt: r.checked_in_at ? String(r.checked_in_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listRegistrations(search = "", status = "") {
  await ensureDatabase();
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (search) {
    clauses.push(
      "(name_zh LIKE ? OR organization LIKE ? OR email LIKE ? OR application_no LIKE ?)",
    );
    values.push(...Array(4).fill(`%${search}%`));
  }
  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = (await db()
    .prepare(
      `SELECT * FROM registrations ${where} ORDER BY created_at DESC LIMIT 500`,
    )
    .bind(...values)
    .all<Record<string, unknown>>()) as D1Result<Record<string, unknown>>;
  return (result.results ?? []).map(mapRegistration);
}

export async function updateRegistrationStatus(
  id: string,
  toStatus: RegistrationStatus,
  actorId: string,
) {
  await ensureDatabase();
  const current = await db()
    .prepare("SELECT status, checkin_token FROM registrations WHERE id = ?")
    .bind(id)
    .first<{ status: RegistrationStatus; checkin_token: string | null }>();
  if (!current) throw new Error("NOT_FOUND");
  const now = new Date().toISOString();
  const token =
    toStatus === "approved" && !current.checkin_token
      ? crypto.randomUUID() + crypto.randomUUID()
      : current.checkin_token;
  await db().batch([
    db()
      .prepare(
        "UPDATE registrations SET status = ?, checkin_token = ?, checked_in_at = CASE WHEN ? = 'checked_in' THEN ? ELSE checked_in_at END, updated_at = ? WHERE id = ?",
      )
      .bind(toStatus, token, toStatus, now, now, id),
    db()
      .prepare(
        "INSERT INTO registration_history (id,registration_id,from_status,to_status,actor_id,note,created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        current.status,
        toStatus,
        actorId,
        "管理者更新狀態",
        now,
      ),
    db()
      .prepare(
        "INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        actorId,
        "registration.status.update",
        "registration",
        id,
        JSON.stringify({ from: current.status, to: toStatus }),
        now,
      ),
  ]);
  return { ...current, status: toStatus, checkinToken: token };
}

export async function checkInRegistration(
  query: { token?: string; search?: string },
  actorId: string,
) {
  await ensureDatabase();
  const record = query.token
    ? await db()
        .prepare("SELECT * FROM registrations WHERE checkin_token = ?")
        .bind(query.token)
        .first<Record<string, unknown>>()
    : await db()
        .prepare(
          "SELECT * FROM registrations WHERE application_no = ? OR name_zh = ? OR substr(replace(mobile,' ',''),-3) = ? LIMIT 1",
        )
        .bind(query.search ?? "", query.search ?? "", query.search ?? "")
        .first<Record<string, unknown>>();
  if (!record) throw new Error("NOT_FOUND");
  const registration = mapRegistration(record);
  if (!["approved", "notified", "checked_in"].includes(registration.status))
    throw new Error("NOT_ELIGIBLE");
  if (registration.checkedInAt) return { registration, duplicate: true };
  await updateRegistrationStatus(registration.id, "checked_in", actorId);
  return {
    registration: {
      ...registration,
      status: "checked_in" as const,
      checkedInAt: new Date().toISOString(),
    },
    duplicate: false,
  };
}

export async function getDashboardStats() {
  await ensureDatabase();
  const statusRows = await db()
    .prepare("SELECT status, COUNT(*) total FROM registrations GROUP BY status")
    .all<{ status: string; total: number }>();
  const dietary = await db()
    .prepare(
      "SELECT dietary, COUNT(*) total FROM registrations GROUP BY dietary ORDER BY total DESC",
    )
    .all<{ dietary: string; total: number }>();
  const categories = await db()
    .prepare(
      "SELECT category, COUNT(*) total FROM registrations GROUP BY category ORDER BY total DESC",
    )
    .all<{ category: string; total: number }>();
  const organizations = await db()
    .prepare(
      "SELECT organization, COUNT(*) total FROM registrations GROUP BY organization ORDER BY total DESC LIMIT 8",
    )
    .all<{ organization: string; total: number }>();
  return {
    status: statusRows.results ?? [],
    dietary: dietary.results ?? [],
    categories: categories.results ?? [],
    organizations: organizations.results ?? [],
  };
}

export async function saveContent(
  kind: string,
  input: Record<string, unknown>,
  actorId: string,
) {
  await ensureDatabase();
  const event = await db()
    .prepare("SELECT id FROM events WHERE is_current=1 LIMIT 1")
    .first<{ id: string }>();
  if (!event) throw new Error("NOT_FOUND");
  const id = crypto.randomUUID();
  if (kind === "event") {
    const year = Number(input.year);
    if (!year || year < 2000 || year > 2100) throw new Error("INVALID_YEAR");
    const now = new Date().toISOString();
    const makeCurrent = input.isCurrent === true;
    const statements = [];
    if (makeCurrent)
      statements.push(
        db().prepare("UPDATE events SET is_current = 0 WHERE is_current = 1"),
      );
    statements.push(
      db()
        .prepare(
          `INSERT INTO events (
      id,year,slug,is_current,is_published,name_zh,name_en,theme_zh,theme_en,concept_zh,concept_en,
      date_label,time_label,checkin_label,location_name,location_address,venue_detail,organizer,hero_url,audience,
      fee_label,capacity_label,deadline_label,requires_approval,registration_open,waitlist_enabled,transport_json,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          id,
          year,
          String(year),
          makeCurrent ? 1 : 0,
          0,
          String(input.nameZh || `${year}年保險業風險管理趨勢論壇`),
          String(input.nameEn || "英文名稱待確認"),
          String(input.themeZh || "年度主題待確認"),
          String(input.themeEn || "英文主題待確認"),
          "持續對話，與產業共同前行",
          "An Ongoing Dialogue on Risk and Value",
          String(input.dateLabel || "會議日期待確認"),
          String(input.timeLabel || "會議時間待確認"),
          "報到時間待確認",
          String(input.locationName || "會議地點待確認"),
          "地址待確認",
          "樓層及廳別待確認",
          String(input.organizer || "主辦單位待確認"),
          String(input.heroUrl || ""),
          "參加對象待確認",
          "費用待確認",
          "名額待確認",
          "報名截止時間待確認",
          1,
          1,
          1,
          JSON.stringify({
            metro: "捷運資訊待確認",
            bus: "公車資訊待確認",
            walk: "步行方式待確認",
            parking: "停車資訊待確認",
            accessibility: "無障礙動線待確認",
          }),
          now,
          now,
        ),
    );
    await db().batch(statements);
  } else if (kind === "focus") {
    await db()
      .prepare(
        "INSERT INTO focuses (id,event_id,title,description,icon,sort_order,is_visible) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        event.id,
        String(input.title || "焦點待確認"),
        String(input.description || "說明待確認"),
        String(input.icon || "—"),
        Number(input.sortOrder) || 0,
        input.isVisible === false ? 0 : 1,
      )
      .run();
  } else if (kind === "faq") {
    await db()
      .prepare(
        "INSERT INTO faqs (id,event_id,question,answer,sort_order,is_visible) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        id,
        event.id,
        String(input.question || "問題待確認"),
        String(input.answer || "答案待確認"),
        Number(input.sortOrder) || 0,
        input.isVisible === false ? 0 : 1,
      )
      .run();
  } else if (kind === "speaker") {
    await db()
      .prepare(
        "INSERT INTO speakers (id,event_id,name_zh,name_en,organization,title,speaker_type,topic,bio,photo_url,sort_order,is_visible) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        event.id,
        String(input.nameZh || "講者待確認"),
        String(input.nameEn || ""),
        String(input.organization || "待確認"),
        String(input.title || "待確認"),
        String(input.type || "講者"),
        String(input.topic || "待確認"),
        String(input.bio || "簡歷待確認"),
        String(input.photoUrl || ""),
        Number(input.sortOrder) || 0,
        input.isVisible === false ? 0 : 1,
      )
      .run();
  } else if (kind === "agenda") {
    await db()
      .prepare(
        "INSERT INTO agenda_items (id,event_id,day_label,period,start_time,end_time,category,title,description,participants,venue,sort_order,is_visible) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        event.id,
        String(input.dayLabel || "會議日"),
        String(input.period || "全天"),
        String(input.startTime || "待確認"),
        String(input.endTime || "待確認"),
        String(input.category || "論壇議程"),
        String(input.title || "議程待確認"),
        String(input.description || ""),
        String(input.participants || "待確認"),
        String(input.venue || "待確認"),
        Number(input.sortOrder) || 0,
        input.isVisible === false ? 0 : 1,
      )
      .run();
  } else if (kind === "dialogue") {
    const year = Number(input.year);
    if (!year || year < 2000 || year > 2100) throw new Error("INVALID_YEAR");
    await db()
      .prepare(
        "INSERT INTO dialogues (id,year,slug,name,theme,date_label,location,background,insights,participants_count,speakers_count,sessions_count,is_published,highlights_json,speakers_json,agenda_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        year,
        String(year),
        String(input.name || "待補入歷年資料"),
        String(input.theme || "待補入歷年資料"),
        String(input.dateLabel || "待補入歷年資料"),
        String(input.location || "待補入歷年資料"),
        String(input.background || "待補入歷年資料"),
        String(input.insights || "待補入歷年資料"),
        String(input.participantsCount || "待確認"),
        String(input.speakersCount || "待確認"),
        String(input.sessionsCount || "待確認"),
        input.isPublished === true ? 1 : 0,
        JSON.stringify(input.highlights || []),
        JSON.stringify(input.speakers || []),
        JSON.stringify(input.agenda || []),
      )
      .run();
  } else throw new Error("INVALID_KIND");
  await db()
    .prepare(
      "INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      actorId,
      `${kind}.create`,
      kind,
      id,
      "{}",
      new Date().toISOString(),
    )
    .run();
  return { id };
}

export async function updateCurrentEvent(
  input: {
    dateLabel?: string;
    locationName?: string;
    organizer?: string;
    heroUrl?: string;
  },
  actorId: string,
) {
  await ensureDatabase();
  const current = await db()
    .prepare(
      "SELECT id, date_label, location_name, organizer, hero_url FROM events WHERE is_current = 1 LIMIT 1",
    )
    .first<{
      id: string;
      date_label: string;
      location_name: string;
      organizer: string;
      hero_url: string;
    }>();
  if (!current) throw new Error("NOT_FOUND");
  const dateLabel = input.dateLabel?.trim().slice(0, 80) || current.date_label;
  const locationName =
    input.locationName?.trim().slice(0, 120) || current.location_name;
  const organizer = input.organizer?.trim().slice(0, 160) || current.organizer;
  const heroUrl = input.heroUrl?.trim().slice(0, 500) || current.hero_url;
  const now = new Date().toISOString();
  await db().batch([
    db()
      .prepare(
        "UPDATE events SET date_label = ?, location_name = ?, organizer = ?, hero_url = ?, updated_at = ? WHERE id = ?",
      )
      .bind(dateLabel, locationName, organizer, heroUrl, now, current.id),
    db()
      .prepare(
        "INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        actorId,
        "event.details.update",
        "event",
        current.id,
        JSON.stringify({ dateLabel, locationName, organizer, heroUrl }),
        now,
      ),
  ]);
  return { dateLabel, locationName, organizer, heroUrl };
}

export async function logTestEmail(recipient: string, actorId: string) {
  await ensureDatabase();
  const id = crypto.randomUUID();
  await db()
    .prepare(
      "INSERT INTO email_logs (id,registration_id,template_key,recipient,status,actor_id,created_at) VALUES (?,NULL,?,?,?,?,?)",
    )
    .bind(
      id,
      "test_email",
      recipient,
      "previewed-local",
      actorId,
      new Date().toISOString(),
    )
    .run();
  return {
    id,
    status: "previewed-local",
    message:
      "本機替代模式：已建立測試信預覽與寄送紀錄。正式寄送需設定 SMTP_RELAY_URL 與 SMTP_RELAY_TOKEN。",
  };
}
