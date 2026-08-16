"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

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
const initial = {
  nameZh: "",
  organization: "",
  jobTitle: "",
  category: "",
  mobile: "",
  email: "",
  privacyConsent: false,
  companyWebsite: "",
};

export default function QuickRegistrationForm() {
  const [values, setValues] = useState(initial);
  const [startedAt] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [applicationNo, setApplicationNo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(name: keyof typeof initial, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
    setMessage("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          nameEn: "",
          department: "",
          needsEnglishBadge: false,
          dietary: "一般",
          dietaryNotes: "",
          accessibilityNeeds: "",
          notes: "",
          acceptsUpdates: false,
          formStartedAt: startedAt,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        applicationNo?: string;
      };
      if (!response.ok || !result.applicationNo) {
        setMessage(result.error || "送出失敗，請檢查欄位後再試一次。");
        return;
      }
      setApplicationNo(result.applicationNo);
    } catch {
      setMessage("目前無法連線，請稍後再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  if (applicationNo) {
    return (
      <div className="quick-success" role="status">
        <span>✓</span>
        <div>
          <p className="eyebrow">APPLICATION RECEIVED</p>
          <h3>已收到您的報名申請</h3>
          <p>申請編號：{applicationNo}</p>
          <small>送出申請不代表審核通過，請留意後續通知。</small>
        </div>
      </div>
    );
  }

  return (
    <form className="quick-form" onSubmit={submit} noValidate>
      <div className="quick-form-grid">
        <label>
          <span>中文姓名 *</span>
          <input
            autoComplete="name"
            value={values.nameZh}
            onChange={(e) => update("nameZh", e.target.value)}
            required
          />
        </label>
        <label>
          <span>公司／機構 *</span>
          <input
            autoComplete="organization"
            value={values.organization}
            onChange={(e) => update("organization", e.target.value)}
            required
          />
        </label>
        <label>
          <span>職稱 *</span>
          <input
            autoComplete="organization-title"
            value={values.jobTitle}
            onChange={(e) => update("jobTitle", e.target.value)}
            required
          />
        </label>
        <label>
          <span>身分類別 *</span>
          <select
            value={values.category}
            onChange={(e) => update("category", e.target.value)}
            required
          >
            <option value="">請選擇</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          <span>手機號碼 *</span>
          <input
            inputMode="tel"
            autoComplete="tel"
            value={values.mobile}
            onChange={(e) => update("mobile", e.target.value)}
            required
          />
        </label>
        <label>
          <span>電子信箱 *</span>
          <input
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </label>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="quick-company-website">網站</label>
        <input
          id="quick-company-website"
          tabIndex={-1}
          autoComplete="off"
          value={values.companyWebsite}
          onChange={(e) => update("companyWebsite", e.target.value)}
        />
      </div>
      <label className="quick-consent">
        <input
          type="checkbox"
          checked={values.privacyConsent}
          onChange={(e) => update("privacyConsent", e.target.checked)}
          required
        />
        <span>
          我已閱讀並同意
          <Link href="/personal-data" target="_blank">
            個人資料蒐集及利用告知事項
          </Link>
        </span>
      </label>
      {message && (
        <p className="quick-error" role="alert">
          {message}
        </p>
      )}
      <div className="quick-actions">
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "送出中…" : "送出報名申請 →"}
        </button>
        <Link href="/register">填寫完整需求與備註 →</Link>
      </div>
    </form>
  );
}
