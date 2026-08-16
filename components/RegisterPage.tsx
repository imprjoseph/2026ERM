"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PageShell, LoadingState, useEventData } from "./SiteShell";

const categories = [
  "壽險業",
  "產險業",
  "再保險業",
  "保險經紀／代理",
  "金融相關機構",
  "政府機關",
  "學術研究",
  "專業服務機構",
  "媒體",
  "其他",
];
type FormValues = Record<string, string | boolean | number>;
const initial: FormValues = {
  nameZh: "",
  nameEn: "",
  organization: "",
  department: "",
  jobTitle: "",
  category: "",
  mobile: "",
  email: "",
  needsEnglishBadge: false,
  dietary: "一般",
  dietaryNotes: "",
  accessibilityNeeds: "",
  notes: "",
  acceptsUpdates: false,
  privacyConsent: false,
  companyWebsite: "",
};

function Field({
  label,
  name,
  required,
  error,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <em>必填</em>}
      </label>
      {children}
      {error && (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { event, error: eventError } = useEventData();
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    applicationNo: string;
    status: string;
  } | null>(null);
  const [serverError, setServerError] = useState("");
  const [formStartedAt] = useState(() => Date.now());
  if (!event)
    return (
      <PageShell>
        <LoadingState error={eventError} />
      </PageShell>
    );

  function update(name: string, value: string | boolean) {
    setValues((old) => ({ ...old, [name]: value }));
    setErrors((old) => ({ ...old, [name]: "" }));
  }
  function validateLocal() {
    const next: Record<string, string> = {};
    [
      "nameZh",
      "organization",
      "jobTitle",
      "category",
      "mobile",
      "email",
    ].forEach((key) => {
      if (!String(values[key] ?? "").trim()) next[key] = "此欄位為必填";
    });
    if (values.needsEnglishBadge && !String(values.nameEn).trim())
      next.nameEn = "需要英文名牌時，請填寫英文姓名";
    if (!/^\S+@\S+\.\S+$/.test(String(values.email)))
      next.email = "請輸入有效的電子信箱";
    if (!/^[+\d][\d\s()-]{7,19}$/.test(String(values.mobile)))
      next.mobile = "請輸入有效的手機號碼";
    if (!values.privacyConsent)
      next.privacyConsent = "請先閱讀並同意個人資料告知事項";
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  function review(event: FormEvent) {
    event.preventDefault();
    if (validateLocal()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  async function submit() {
    setSubmitting(true);
    setServerError("");
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, formStartedAt }),
    });
    const payload = (await response.json()) as {
      error?: string;
      errors?: Record<string, string>;
      applicationNo?: string;
      status?: string;
    };
    setSubmitting(false);
    if (!response.ok) {
      setServerError(payload.error || "送出失敗，請稍後再試。");
      setErrors(payload.errors || {});
      if (payload.errors) setStep(1);
      return;
    }
    if (!payload.applicationNo || !payload.status) {
      setServerError("回應格式不正確，請聯絡會議小組。");
      return;
    }
    setResult({ applicationNo: payload.applicationNo, status: payload.status });
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <PageShell organizer={event.organizer}>
      <section className="page-hero compact">
        <div>
          <span className="eyebrow light">REGISTRATION · 2026</span>
          <h1>報名申請</h1>
          <p>請填寫正確資料，以利主辦單位進行資格審核與會議通知。</p>
        </div>
        <div className="registration-steps" aria-label="報名進度">
          <span className={step >= 1 ? "active" : ""}>
            1 <b>填寫資料</b>
          </span>
          <i />
          <span className={step >= 2 ? "active" : ""}>
            2 <b>確認資料</b>
          </span>
          <i />
          <span className={step >= 3 ? "active" : ""}>
            3 <b>完成送出</b>
          </span>
        </div>
      </section>
      <section className="section register-layout">
        <aside>
          <span className="eyebrow">EVENT</span>
          <h2>{event.nameZh}</h2>
          <dl>
            <div>
              <dt>日期</dt>
              <dd>{event.dateLabel}</dd>
            </div>
            <div>
              <dt>地點</dt>
              <dd>{event.locationName}</dd>
            </div>
            <div>
              <dt>截止</dt>
              <dd>{event.deadlineLabel}</dd>
            </div>
          </dl>
          <p className="notice">
            本會議採資格審核制。送出申請不代表審核通過，請以通知信為準。
          </p>
        </aside>
        <div className="form-panel">
          {step === 1 && (
            <form onSubmit={review} noValidate>
              <div className="form-intro">
                <span>01</span>
                <div>
                  <h2>基本資料</h2>
                  <p>
                    <em>*</em> 為必填欄位。個人資料僅供本會議聯繫與管理使用。
                  </p>
                </div>
              </div>
              <div className="field-grid">
                <Field
                  label="中文姓名"
                  name="nameZh"
                  required
                  error={errors.nameZh}
                >
                  <input
                    id="nameZh"
                    value={String(values.nameZh)}
                    onChange={(e) => update("nameZh", e.target.value)}
                    aria-invalid={!!errors.nameZh}
                  />
                </Field>
                <Field label="英文姓名" name="nameEn" error={errors.nameEn}>
                  <input
                    id="nameEn"
                    value={String(values.nameEn)}
                    onChange={(e) => update("nameEn", e.target.value)}
                    placeholder="如需英文名牌請填寫"
                  />
                </Field>
                <Field
                  label="服務單位全名"
                  name="organization"
                  required
                  error={errors.organization}
                >
                  <input
                    id="organization"
                    value={String(values.organization)}
                    onChange={(e) => update("organization", e.target.value)}
                  />
                </Field>
                <Field label="部門" name="department">
                  <input
                    id="department"
                    value={String(values.department)}
                    onChange={(e) => update("department", e.target.value)}
                  />
                </Field>
                <Field
                  label="職稱"
                  name="jobTitle"
                  required
                  error={errors.jobTitle}
                >
                  <input
                    id="jobTitle"
                    value={String(values.jobTitle)}
                    onChange={(e) => update("jobTitle", e.target.value)}
                  />
                </Field>
                <Field
                  label="身分類別"
                  name="category"
                  required
                  error={errors.category}
                >
                  <select
                    id="category"
                    value={String(values.category)}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    <option value="">請選擇</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="手機號碼"
                  name="mobile"
                  required
                  error={errors.mobile}
                >
                  <input
                    id="mobile"
                    inputMode="tel"
                    value={String(values.mobile)}
                    onChange={(e) => update("mobile", e.target.value)}
                    placeholder="09xx xxx xxx"
                  />
                </Field>
                <Field
                  label="電子信箱"
                  name="email"
                  required
                  error={errors.email}
                >
                  <input
                    id="email"
                    type="email"
                    value={String(values.email)}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="name@example.com"
                  />
                </Field>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={Boolean(values.needsEnglishBadge)}
                  onChange={(e) =>
                    update("needsEnglishBadge", e.target.checked)
                  }
                />
                需要英文名牌
              </label>
              <div className="form-intro second">
                <span>02</span>
                <div>
                  <h2>需求與備註</h2>
                  <p>協助會議小組提早安排必要服務。</p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="飲食需求" name="dietary">
                  <select
                    id="dietary"
                    value={String(values.dietary)}
                    onChange={(e) => update("dietary", e.target.value)}
                  >
                    <option>一般</option>
                    <option>素食</option>
                    <option>不需餐點</option>
                    <option>其他</option>
                  </select>
                </Field>
                <Field label="特殊飲食或過敏" name="dietaryNotes">
                  <input
                    id="dietaryNotes"
                    value={String(values.dietaryNotes)}
                    onChange={(e) => update("dietaryNotes", e.target.value)}
                  />
                </Field>
                <Field label="無障礙協助需求" name="accessibilityNeeds">
                  <textarea
                    id="accessibilityNeeds"
                    value={String(values.accessibilityNeeds)}
                    onChange={(e) =>
                      update("accessibilityNeeds", e.target.value)
                    }
                    rows={3}
                  />
                </Field>
                <Field label="備註" name="notes">
                  <textarea
                    id="notes"
                    value={String(values.notes)}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
              <div className="honeypot" aria-hidden="true">
                <label htmlFor="companyWebsite">網站</label>
                <input
                  id="companyWebsite"
                  tabIndex={-1}
                  autoComplete="off"
                  value={String(values.companyWebsite)}
                  onChange={(e) => update("companyWebsite", e.target.value)}
                />
              </div>
              <div className="consents">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(values.acceptsUpdates)}
                    onChange={(e) => update("acceptsUpdates", e.target.checked)}
                  />
                  同意接收本會議相關通知
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(values.privacyConsent)}
                    onChange={(e) => update("privacyConsent", e.target.checked)}
                  />
                  我已閱讀並同意
                  <Link href="/personal-data" target="_blank">
                    個人資料蒐集及利用告知事項
                  </Link>
                  （需由主辦單位確認）
                </label>
                {errors.privacyConsent && (
                  <p className="field-error">{errors.privacyConsent}</p>
                )}
              </div>
              <button className="button primary form-submit" type="submit">
                檢查並確認資料 →
              </button>
            </form>
          )}
          {step === 2 && (
            <div className="review-panel">
              <div className="form-intro">
                <span>02</span>
                <div>
                  <h2>確認報名資料</h2>
                  <p>送出後將無法直接於此頁修改，請再次確認。</p>
                </div>
              </div>
              <dl>
                {[
                  ["中文姓名", values.nameZh],
                  ["英文姓名", values.nameEn || "—"],
                  ["服務單位", values.organization],
                  [
                    "部門／職稱",
                    `${values.department || "—"}／${values.jobTitle}`,
                  ],
                  ["身分類別", values.category],
                  ["手機號碼", values.mobile],
                  ["電子信箱", values.email],
                  ["英文名牌", values.needsEnglishBadge ? "需要" : "不需要"],
                  [
                    "飲食需求",
                    `${values.dietary}${values.dietaryNotes ? `；${values.dietaryNotes}` : ""}`,
                  ],
                  ["無障礙協助", values.accessibilityNeeds || "無"],
                  ["備註", values.notes || "無"],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
              {serverError && (
                <p className="server-error" role="alert">
                  {serverError}
                </p>
              )}
              <div className="review-actions">
                <button
                  className="button secondary dark"
                  onClick={() => setStep(1)}
                >
                  返回修改
                </button>
                <button
                  className="button primary"
                  onClick={submit}
                  disabled={submitting}
                >
                  {submitting ? "送出中…" : "送出報名申請 →"}
                </button>
              </div>
              <p className="fineprint">
                點擊送出即表示您確認資料正確；送出申請不等於審核通過。
              </p>
            </div>
          )}
          {step === 3 && result && (
            <div className="success-panel">
              <span className="success-mark">✓</span>
              <p className="eyebrow">APPLICATION RECEIVED</p>
              <h2>已收到您的報名申請</h2>
              <p>申請編號</p>
              <strong>{result.applicationNo}</strong>
              <p>
                收件確認已建立寄送紀錄。請保留申請編號，並留意後續審核通知。
              </p>
              <div className="success-note">
                <b>目前狀態：待審核</b>
                <span>送出申請不代表審核通過。</span>
              </div>
              <Link href="/" className="button secondary dark">
                返回論壇首頁
              </Link>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
