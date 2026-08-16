"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { EventData } from "../lib/types";

const registrationDeadline = new Date("2026-11-06T23:59:59+08:00").getTime();
const publicEventCacheTtl = 60_000;
let publicEventCache: { data: EventData; expiresAt: number } | null = null;
let publicEventRequest: Promise<EventData> | null = null;
let navigationFallbackTimer: number | undefined;

type ReliableLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function ReliableLink({
  href,
  onClick,
  target,
  ...props
}: ReliableLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === "_blank"
    )
      return;

    const destination = new URL(href, window.location.href);
    if (destination.href === window.location.href) return;
    document.documentElement.classList.add("navigation-pending");
    window.clearTimeout(navigationFallbackTimer);
    navigationFallbackTimer = window.setTimeout(() => {
      document.documentElement.classList.remove("navigation-pending");
      if (window.location.href !== destination.href) {
        window.location.assign(destination.href);
      }
    }, 700);
  }

  return <Link {...props} href={href} target={target} onClick={handleClick} />;
}

function loadPublicEvent() {
  if (publicEventCache && publicEventCache.expiresAt > Date.now()) {
    return Promise.resolve(publicEventCache.data);
  }
  publicEventRequest ??= fetch("/api/public/event")
    .then(async (response) => {
      if (!response.ok) throw new Error("Public event request failed");
      return response.json() as Promise<EventData>;
    })
    .then((data) => {
      publicEventCache = {
        data,
        expiresAt: Date.now() + publicEventCacheTtl,
      };
      return data;
    })
    .finally(() => {
      publicEventRequest = null;
    });
  return publicEventRequest;
}

function getCountdown(now: number) {
  const remaining = Math.max(0, registrationDeadline - now);
  return {
    ended: remaining === 0,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}

export function useEventData(initialEvent: EventData | null = null) {
  const [event, setEvent] = useState<EventData | null>(
    () => publicEventCache?.data ?? initialEvent,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadPublicEvent()
      .then((data) => {
        if (active) setEvent(data);
      })
      .catch(() => {
        if (active) setError("會議資料暫時無法載入，請稍後重新整理。");
      });
    return () => {
      active = false;
    };
  }, []);
  return { event, error };
}

const navigation = [
  ["2026論壇", "/#forum"],
  ["論壇焦點", "/#focus"],
  ["講者陣容", "/2026/speakers"],
  ["會議議程", "/2026/agenda"],
  ["歷年對話", "/dialogues"],
  ["會議資訊", "/#info"],
  ["常見問題", "/#faq"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <span className="header-spacer" aria-hidden="true" />
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
            <ReliableLink
              key={label}
              href={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </ReliableLink>
          ))}
          <ReliableLink
            href="/register"
            className="nav-register"
            onClick={() => setOpen(false)}
          >
            立即報名
          </ReliableLink>
        </nav>
      </div>
    </header>
  );
}

export function Footer({
  organizer = "財團法人保險安定基金",
}: {
  organizer?: string;
}) {
  const { event } = useEventData();
  const guidingOrganization =
    event?.guidingOrganization || "金融監督管理委員會";
  const planningOrganization =
    event?.planningOrganization || "金融監督管理委員會保險局";
  const displayedOrganizer = event?.organizer || organizer;
  const coOrganizers = (
    event?.coOrganizers || "財團法人保險事業發展中心；中華民國精算學會"
  )
    .split(/[；;\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
  const contactPhone = event?.contactPhone || "02-27635666#106";
  const contactEmail = event?.contactEmail || "penny@impr.com.tw";

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
          <p>指導單位｜{guidingOrganization}</p>
          <p>策畫單位｜{planningOrganization}</p>
          <p>主辦單位｜{displayedOrganizer}</p>
          {coOrganizers.map((name) => (
            <p key={name}>協辦單位｜{name}</p>
          ))}
        </div>
        <div>
          <h3>會議聯絡</h3>
          <p>
            電話｜<a href="tel:+886227635666,106">{contactPhone}</a>
          </p>
          <p>
            信箱｜<a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
          <div className="footer-links">
            <ReliableLink href="/privacy">隱私權政策</ReliableLink>
            <ReliableLink href="/personal-data">個資告知</ReliableLink>
            <ReliableLink href="/terms">使用條款</ReliableLink>
            <ReliableLink href="/admin">管理後台</ReliableLink>
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
        <strong>報名已截止</strong>
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
          倒數至 11/6 報名截止；截止日期以主辦單位公告為準。
        </small>
      )}
    </div>
  );
}

export function FloatingRegistration() {
  return (
    <aside className="floating-registration" aria-label="常駐報名入口">
      <RegistrationCountdown compact />
      <ReliableLink href="/register">
        <span>2026 FORUM</span>
        <b>立即報名</b>
        <i aria-hidden="true">→</i>
      </ReliableLink>
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
