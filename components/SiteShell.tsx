"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { EventData } from "../lib/types";

const forumStartsAt = new Date("2026-11-16T00:00:00+08:00").getTime();

function getCountdown(now: number) {
  const remaining = Math.max(0, forumStartsAt - now);
  return {
    ended: remaining === 0,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}

export function useEventData() {
  const [event, setEvent] = useState<EventData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/event", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<EventData>;
      })
      .then(setEvent)
      .catch((reason) => {
        if (reason?.name !== "AbortError")
          setError("活動資料暫時無法載入，請稍後重新整理。");
      });
    return () => controller.abort();
  }, []);
  return { event, error };
}

const navigation = [
  ["2026論壇", "/#forum"],
  ["論壇焦點", "/#focus"],
  ["講者陣容", "/2026/speakers"],
  ["活動議程", "/2026/agenda"],
  ["歷年對話", "/dialogues"],
  ["活動資訊", "/#info"],
  ["常見問題", "/#faq"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link
          href="/"
          className="brand"
          aria-label="保險業風險管理趨勢論壇首頁"
        >
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            <b>風險管理趨勢論壇</b>
            <small>RISK · VALUE · DIALOGUE</small>
          </span>
        </Link>
        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="main-navigation"
        >
          {open ? "關閉" : "選單"}
        </button>
        <nav
          id="main-navigation"
          className={open ? "nav-links open" : "nav-links"}
          aria-label="主要選單"
        >
          {navigation.map(([label, href]) => (
            <Link key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link
            href="/register"
            className="nav-register"
            onClick={() => setOpen(false)}
          >
            立即報名
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer({
  organizer = "主辦單位待確認",
}: {
  organizer?: string;
}) {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <span className="eyebrow light">2026 FORUM</span>
          <h2>
            持續對話，
            <br />
            與產業共同前行。
          </h2>
        </div>
        <div>
          <h3>主辦資訊</h3>
          <p>指導單位｜待確認</p>
          <p>主辦單位｜{organizer}</p>
          <p>協辦／執行單位｜待確認</p>
        </div>
        <div>
          <h3>活動聯絡</h3>
          <p>電話｜待確認</p>
          <p>信箱｜待確認</p>
          <div className="footer-links">
            <Link href="/privacy">隱私權政策</Link>
            <Link href="/personal-data">個資告知</Link>
            <Link href="/terms">使用條款</Link>
            <Link href="/admin">管理後台</Link>
          </div>
        </div>
      </div>
      <p className="copyright">
        © 2026 保險業風險管理趨勢論壇。網站內容與法律文字均需由主辦單位確認。
      </p>
    </footer>
  );
}

export function RegistrationCountdown({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [countdown, setCountdown] = useState<ReturnType<
    typeof getCountdown
  > | null>(null);
  useEffect(() => {
    const update = () => setCountdown(getCountdown(Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!countdown)
    return (
      <div
        className={compact ? "countdown compact" : "countdown"}
        aria-label="正在計算報名倒數"
      />
    );
  if (countdown.ended)
    return (
      <div className={compact ? "countdown compact" : "countdown"}>
        <strong>活動日已到</strong>
      </div>
    );
  const values = [
    [countdown.days, "天"],
    [countdown.hours, "時"],
    [countdown.minutes, "分"],
    [countdown.seconds, "秒"],
  ] as const;
  return (
    <div
      className={compact ? "countdown compact" : "countdown"}
      aria-label="報名倒數"
      aria-live="polite"
    >
      {!compact && <span className="countdown-label">報名倒數</span>}
      <div>
        {values.map(([value, label]) => (
          <span key={label}>
            <b>{String(value).padStart(2, "0")}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>
      {!compact && (
        <small className="countdown-note">
          倒數至 11/16 活動日；正式截止時間以主辦單位公告為準。
        </small>
      )}
    </div>
  );
}

export function FloatingRegistration() {
  return (
    <aside className="floating-registration" aria-label="常駐報名入口">
      <RegistrationCountdown compact />
      <Link href="/register">
        <span>2026 FORUM</span>
        <b>立即報名</b>
        <i aria-hidden="true">→</i>
      </Link>
    </aside>
  );
}

export function PageShell({
  children,
  organizer,
}: {
  children: ReactNode;
  organizer?: string;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer organizer={organizer} />
      <FloatingRegistration />
    </>
  );
}

export function LoadingState({ error }: { error?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-line" />
      {error || "正在載入論壇資料…"}
    </div>
  );
}

export const statusLabels: Record<string, string> = {
  submitted: "已送出",
  pending_review: "待審核",
  approved: "審核通過",
  waitlisted: "候補",
  rejected: "未通過",
  cancelled: "已取消",
  notified: "已寄行前通知",
  checked_in: "已報到",
  no_show: "未出席",
};
