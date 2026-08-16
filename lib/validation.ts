import { REGISTRATION_STATUSES, type RegistrationStatus } from "./types";

export type RegistrationInput = {
  nameZh: string;
  nameEn?: string;
  organization: string;
  department?: string;
  jobTitle: string;
  category: string;
  mobile: string;
  email: string;
  needsEnglishBadge?: boolean;
  dietary?: string;
  dietaryNotes?: string;
  accessibilityNeeds?: string;
  notes?: string;
  acceptsUpdates?: boolean;
  privacyConsent: boolean;
  companyWebsite?: string;
  formStartedAt: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s()-]{7,19}$/;
const CATEGORIES = new Set([
  "壽險業", "產險業", "再保險業", "保險經紀／代理", "金融相關機構",
  "政府機關", "學術研究", "專業服務機構", "媒體", "其他",
]);

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validateRegistration(raw: unknown, now = Date.now()) {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data: RegistrationInput = {
    nameZh: text(source.nameZh, 80),
    nameEn: text(source.nameEn, 120),
    organization: text(source.organization, 180),
    department: text(source.department, 120),
    jobTitle: text(source.jobTitle, 120),
    category: text(source.category, 40),
    mobile: text(source.mobile, 30),
    email: text(source.email, 180).toLowerCase(),
    needsEnglishBadge: source.needsEnglishBadge === true,
    dietary: text(source.dietary, 60),
    dietaryNotes: text(source.dietaryNotes, 300),
    accessibilityNeeds: text(source.accessibilityNeeds, 300),
    notes: text(source.notes, 800),
    acceptsUpdates: source.acceptsUpdates === true,
    privacyConsent: source.privacyConsent === true,
    companyWebsite: text(source.companyWebsite, 200),
    formStartedAt: Number(source.formStartedAt) || 0,
  };

  const errors: Record<string, string> = {};
  if (!data.nameZh) errors.nameZh = "請填寫中文姓名";
  if (!data.organization) errors.organization = "請填寫服務單位";
  if (!data.jobTitle) errors.jobTitle = "請填寫職稱";
  if (!CATEGORIES.has(data.category)) errors.category = "請選擇身分類別";
  if (!PHONE_RE.test(data.mobile)) errors.mobile = "請輸入有效的手機號碼";
  if (!EMAIL_RE.test(data.email)) errors.email = "請輸入有效的電子信箱";
  if (!data.privacyConsent) errors.privacyConsent = "請先閱讀並同意個人資料告知事項";
  if (data.needsEnglishBadge && !data.nameEn) errors.nameEn = "需要英文名牌時，請填寫英文姓名";
  if (data.companyWebsite) errors.form = "無法送出此申請";
  if (!data.formStartedAt || now - data.formStartedAt < 2500) errors.form = "請稍候片刻再送出";
  return { data, errors, valid: Object.keys(errors).length === 0 };
}

const transitions: Record<RegistrationStatus, RegistrationStatus[]> = {
  submitted: ["pending_review", "cancelled"],
  pending_review: ["approved", "waitlisted", "rejected", "cancelled"],
  approved: ["notified", "checked_in", "cancelled", "no_show"],
  waitlisted: ["approved", "rejected", "cancelled"],
  rejected: [],
  cancelled: [],
  notified: ["checked_in", "cancelled", "no_show"],
  checked_in: ["approved", "notified"],
  no_show: ["checked_in"],
};

export function isRegistrationStatus(value: unknown): value is RegistrationStatus {
  return typeof value === "string" && (REGISTRATION_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: RegistrationStatus, to: RegistrationStatus) {
  return from === to || transitions[from].includes(to);
}

export function csvSafe(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
