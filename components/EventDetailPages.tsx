"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { PageShell, LoadingState, useEventData } from "./SiteShell";
import SpeakerCard from "./SpeakerCard";
import type { EventData } from "../lib/types";

export function SpeakersPage({
  initialEvent = null,
}: {
  initialEvent?: EventData | null;
}) {
  const { event, error } = useEventData(initialEvent);
  if (!event)
    return (
      <PageShell>
        <LoadingState error={error} />
      </PageShell>
    );
  const speakers = event.speakers.filter((s) => s.isVisible);
  return (
    <PageShell organizer={event.organizer}>
      <section className="page-hero">
        <div>
          <span className="eyebrow light">2026 SPEAKERS</span>
          <h1>講者陣容</h1>
          <p>跨越政策、產業、學術與專業服務領域，形成面向未來的多元對話。</p>
        </div>
      </section>
      <section className="section inner-section">
        <div className="section-label">
          <span>01</span> SPEAKER LINEUP
        </div>
        {speakers.length ? (
          <div className="speaker-grid detailed">
            {speakers.map((s) => (
              <SpeakerCard speaker={s} headingLevel="h2" key={s.id} />
            ))}
          </div>
        ) : (
          <div className="announcement large">
            <span className="announcement-mark">+</span>
            <div>
              <p className="eyebrow">COMING SOON</p>
              <h2>講者陣容陸續公布</h2>
              <p>
                主管機關、保險業領袖、專家學者與專業機構代表資訊，將由主辦單位確認後更新。本頁不使用虛構人物或未確認資料。
              </p>
            </div>
          </div>
        )}
        <div className="back-cta">
          <p>先掌握本年度論壇的關鍵議題與會議安排。</p>
          <a href="/2026/agenda">查看會議議程 →</a>
        </div>
      </section>
    </PageShell>
  );
}

export function SpeakerDetail({
  speakerId,
  initialEvent = null,
}: {
  speakerId: string;
  initialEvent?: EventData | null;
}) {
  const { event, error } = useEventData(initialEvent);
  if (!event)
    return (
      <PageShell>
        <LoadingState error={error} />
      </PageShell>
    );

  const speaker = event.speakers.find(
    (candidate) => candidate.id === speakerId && candidate.isVisible,
  );
  if (!speaker)
    return (
      <PageShell organizer={event.organizer}>
        <section className="section missing">
          <h1>找不到這位講者的資料</h1>
          <Link href="/2026/speakers">返回講者陣容</Link>
        </section>
      </PageShell>
    );

  const isTemplate = speaker.nameZh.includes("範本");
  return (
    <PageShell organizer={event.organizer}>
      <section className="page-hero speaker-detail-hero">
        <div>
          <span className="eyebrow light">2026 SPEAKER PROFILE</span>
          <h1>{speaker.nameZh}</h1>
          <p>
            {speaker.organization}｜{speaker.title}
          </p>
        </div>
      </section>
      <section className="section speaker-detail-section">
        <div className="speaker-detail-photo">
          {speaker.photoUrl ? (
            <img src={speaker.photoUrl} alt={`${speaker.nameZh}講者照片`} />
          ) : (
            <span>{speaker.nameZh.slice(0, 1)}</span>
          )}
        </div>
        <div className="speaker-detail-content">
          {isTemplate && (
            <p className="speaker-template-note">
              此頁為講者資料版型範本，正式姓名、照片、單位、職稱、講題與簡介將於確認後更新。
            </p>
          )}
          <dl className="speaker-facts">
            <div>
              <dt>單位</dt>
              <dd>{speaker.organization || "待確認"}</dd>
            </div>
            <div>
              <dt>姓名</dt>
              <dd>{speaker.nameZh}</dd>
            </div>
            {speaker.nameEn && (
              <div>
                <dt>英文姓名</dt>
                <dd>{speaker.nameEn}</dd>
              </div>
            )}
            <div>
              <dt>職稱</dt>
              <dd>{speaker.title || "待確認"}</dd>
            </div>
            <div>
              <dt>講者類型</dt>
              <dd>{speaker.type || "待確認"}</dd>
            </div>
          </dl>
          <div className="speaker-profile-block">
            <span className="eyebrow">TOPIC</span>
            <h2>{speaker.topic || "講題待確認"}</h2>
          </div>
          <div className="speaker-profile-block">
            <span className="eyebrow">PROFILE</span>
            <h2>講者簡介</h2>
            <p>{speaker.bio || "講者簡介待確認"}</p>
          </div>
          <Link className="speaker-back-link" href="/2026/speakers">
            ← 返回講者陣容
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

export function AgendaPage() {
  const { event, error } = useEventData();
  if (!event)
    return (
      <PageShell>
        <LoadingState error={error} />
      </PageShell>
    );
  return (
    <PageShell organizer={event.organizer}>
      <section className="page-hero">
        <div>
          <span className="eyebrow light">2026 PROGRAMME</span>
          <h1>會議議程</h1>
          <p>以年度焦點串連專題演講與高峰對談，完整議程將於確認後公布。</p>
        </div>
      </section>
      <section className="section inner-section">
        <div className="agenda-toolbar">
          <span>
            {event.dateLabel} · {event.locationName}
          </span>
          <div>
            <button disabled>下載議程 PDF</button>
            <button onClick={() => downloadCalendar(event.nameZh)}>
              加入行事曆
            </button>
          </div>
        </div>
        <div className="agenda-list full">
          {event.agenda
            .filter((a) => a.isVisible)
            .map((item) => (
              <article key={item.id}>
                <time>
                  {item.startTime}
                  <small>{item.endTime}</small>
                </time>
                <div>
                  <span>{item.category}</span>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <small>
                    {item.participants} · {item.venue}
                  </small>
                </div>
              </article>
            ))}
        </div>
        <p className="fineprint">
          主辦單位保留議程及講者調整權利。正式日期與時間確認前，行事曆檔案僅保留功能入口。
        </p>
        <div className="back-cta">
          <p>符合參加對象並有意出席？送出申請後請留意審核通知。</p>
          <Link href="/register">立即報名 →</Link>
        </div>
      </section>
    </PageShell>
  );
}

function downloadCalendar(title: string) {
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IRMF//Forum//ZH-TW",
    "BEGIN:VEVENT",
    "UID:2026-forum@irmf.local",
    "SUMMARY:" + title,
    "DESCRIPTION:會議時間 09:00–16:30；晶華酒店詳細廳別待主辦單位公告。",
    "LOCATION:晶華酒店",
    "DTSTART;TZID=Asia/Taipei:20261116T090000",
    "DTEND;TZID=Asia/Taipei:20261116T163000",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "2026-insurance-risk-forum.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function DialoguesPage({
  initialEvent = null,
}: {
  initialEvent?: import("../lib/types").EventData | null;
}) {
  const { event, error } = useEventData(initialEvent);
  if (!event)
    return (
      <PageShell>
        <LoadingState error={error} />
      </PageShell>
    );
  return (
    <PageShell organizer={event.organizer}>
      <section className="page-hero">
        <div>
          <span className="eyebrow light">ONGOING DIALOGUES</span>
          <h1>歷年對話</h1>
          <p>不只是會議相簿，而是一套持續累積的產業觀點資料庫。</p>
        </div>
      </section>
      <section className="section inner-section">
        <div className="archive-intro">
          <h2>
            讓每一年的討論，
            <br />
            成為下一年的起點。
          </h2>
          <p>
            年度內容可無限新增，保留穩定網址與完整背景、議程、觀點、照片、影片及成果連結。
          </p>
        </div>
        <div className="archive-list">
          <a href="/2026">
            <strong>2026</strong>
            <div>
              <span>目前年度</span>
              <h2>{event.nameZh}</h2>
              <p>{event.themeZh}</p>
            </div>
            <i>→</i>
          </a>
          {event.dialogues.map((d) => (
            <a href={`/dialogues/${d.slug}`} key={d.id}>
              <strong>{d.year}</strong>
              <div>
                <span>{d.isPublished ? "年度回顧" : "資料整理中"}</span>
                <h2>{d.name}</h2>
                <p>{d.theme}</p>
              </div>
              <i>→</i>
            </a>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function DialogueDetail({
  year,
  initialEvent = null,
}: {
  year: string;
  initialEvent?: import("../lib/types").EventData | null;
}) {
  const { event, error } = useEventData(initialEvent);
  if (!event)
    return (
      <PageShell>
        <LoadingState error={error} />
      </PageShell>
    );
  const dialogue = event.dialogues.find((d) => d.slug === year);
  if (!dialogue)
    return (
      <PageShell organizer={event.organizer}>
        <section className="section missing">
          <h1>找不到這個年度的內容</h1>
          <Link href="/dialogues">返回歷年對話</Link>
        </section>
      </PageShell>
    );
  return (
    <PageShell organizer={event.organizer}>
      <section className="page-hero year-hero">
        <div>
          <span className="eyebrow light">YEAR IN REVIEW</span>
          <h1>{dialogue.year}</h1>
          <p>{dialogue.name}</p>
        </div>
      </section>
      <section className="section inner-section">
        <div className="year-summary">
          <div>
            <span>年度主題</span>
            <h2>{dialogue.theme}</h2>
          </div>
          <dl>
            <div>
              <dt>日期</dt>
              <dd>{dialogue.dateLabel}</dd>
            </div>
            <div>
              <dt>地點</dt>
              <dd>{dialogue.location}</dd>
            </div>
          </dl>
        </div>
        <div className="article-grid">
          <article>
            <span className="eyebrow">BACKGROUND</span>
            <h2>年度背景</h2>
            <p>{dialogue.background}</p>
          </article>
          <article>
            <span className="eyebrow">KEY INSIGHTS</span>
            <h2>重要觀點摘要</h2>
            <p>{dialogue.insights}</p>
          </article>
        </div>
        <div className="year-stats">
          <div>
            <strong>{dialogue.participantsCount}</strong>
            <span>參與人數</span>
          </div>
          <div>
            <strong>{dialogue.speakersCount}</strong>
            <span>講者人數</span>
          </div>
          <div>
            <strong>{dialogue.sessionsCount}</strong>
            <span>場次數</span>
          </div>
        </div>
        {dialogue.photoUrls.length > 0 && (
          <section className="history-block history-gallery-block">
            <span className="eyebrow">PHOTO GALLERY</span>
            <h2>會議現場</h2>
            <div className="history-gallery">
              {dialogue.photoUrls.map((url, index) => (
                <figure key={url}>
                  <img
                    src={url}
                    alt={`${dialogue.year}年保險業風險管理趨勢論壇會議現場照片 ${index + 1}`}
                    loading="lazy"
                  />
                  <figcaption>
                    {dialogue.year} 保險業風險管理趨勢論壇
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        {dialogue.highlights.length > 0 && (
          <section className="history-block">
            <span className="eyebrow">HIGHLIGHTS</span>
            <h2>年度成果</h2>
            <ul className="history-list">
              {dialogue.highlights.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
        {dialogue.agenda.length > 0 && (
          <section className="history-block">
            <span className="eyebrow">PROGRAMME</span>
            <h2>議題紀錄</h2>
            <ol className="history-list">
              {dialogue.agenda.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ol>
          </section>
        )}
        {dialogue.speakers.length > 0 && (
          <section className="history-block">
            <span className="eyebrow">SPEAKERS</span>
            <h2>講者與對談代表</h2>
            <div className="history-speakers">
              {dialogue.speakers.map((speaker) => (
                <span key={speaker}>{speaker}</span>
              ))}
            </div>
          </section>
        )}
        <p className="legal-note">
          資料依該年度結案報告之公開會議內容整理；不包含簽到名冊、Email
          或其他與會者個人資料。
        </p>
        <div className="back-cta">
          <p>返回目前年度，繼續參與產業對話。</p>
          <Link href="/register">前往 2026 論壇報名 →</Link>
        </div>
      </section>
    </PageShell>
  );
}

export function LegalPage({
  kind,
}: {
  kind: "privacy" | "personal" | "terms";
}) {
  const content = {
    privacy: [
      "隱私權政策",
      "本頁架構供主辦單位正式法務內容使用。網站將依必要範圍蒐集、處理及利用資料，並採取合理安全措施；正式政策需由主辦單位確認。",
    ],
    personal: [
      "個人資料蒐集及利用告知事項",
      "為辦理會議報名、資格審核、通知、報到及會後聯繫，系統將蒐集報名者提供的聯絡與服務需求資料。保存期間、利用地區、對象、方式及當事人權利等正式文字，需由主辦單位依法務意見確認。",
    ],
    terms: [
      "網站使用條款",
      "網站內容、會議資訊與服務條件以主辦單位正式公告為準。未確認資料均清楚標示；主辦單位保留會議調整權利。正式條款需由主辦單位確認。",
    ],
  }[kind];
  return (
    <PageShell>
      <section className="page-hero legal">
        <div>
          <span className="eyebrow light">LEGAL</span>
          <h1>{content[0]}</h1>
        </div>
      </section>
      <article className="section legal-content">
        <div className="legal-warning">需由主辦單位確認</div>
        <p>{content[1]}</p>
        <h2>您的權利與聯繫方式</h2>
        <p>
          如需查詢、閱覽、複製、補充、更正、停止蒐集處理利用或刪除個人資料，請致電
          02-27635666 分機 106，或寄信至 penny@impr.com.tw。
        </p>
        <h2>資料安全與保存</h2>
        <p>
          管理功能採身分驗證與權限控管；敏感操作保留稽核紀錄。正式保存年限、匿名化與刪除政策待主辦單位確認。
        </p>
        <Link href="/">返回首頁 →</Link>
      </article>
    </PageShell>
  );
}
