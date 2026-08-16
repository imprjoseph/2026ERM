"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import {
  FloatingRegistration,
  Header,
  Footer,
  LoadingState,
  ReliableLink as Link,
  RegistrationCountdown,
  useEventData,
} from "./SiteShell";
import QuickRegistrationForm from "./QuickRegistrationForm";
import SpeakerCard from "./SpeakerCard";
import type { EventData } from "../lib/types";

const values = [
  [
    "持續觀察",
    "追蹤制度、市場與新興風險",
    "從快速變動的環境中，辨識值得長期關注的訊號。",
  ],
  [
    "跨界交流",
    "連結政策、產業、學術與專業觀點",
    "在不同角色之間建立理解，共同回應實務挑戰。",
  ],
  [
    "累積價值",
    "將年度討論轉化為長期知識資產",
    "讓每一次對話都成為下一階段決策的基礎。",
  ],
];

const reasons = [
  "掌握保險業風險管理與資本制度最新趨勢",
  "聽取主管機關、產業領袖及專家的實務觀點",
  "理解市場波動與新興風險對經營策略的影響",
  "與保險、金融及專業服務領域代表交流",
  "建立從風險管理走向價值創造的決策視角",
];

export default function HomePage({
  initialEvent = null,
}: {
  initialEvent?: EventData | null;
}) {
  const { event, error } = useEventData(initialEvent);
  const [period, setPeriod] = useState("全部");
  if (!event)
    return (
      <>
        <Header />
        <main>
          <LoadingState error={error} />
        </main>
      </>
    );
  const agenda = event.agenda.filter(
    (item) => item.isVisible && (period === "全部" || item.period === period),
  );
  const periods = [
    "全部",
    ...Array.from(
      new Set(
        event.agenda
          .filter((item) => item.isVisible)
          .map((item) => item.period),
      ),
    ),
  ];
  const eventSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.nameZh,
    description: event.themeZh,
    startDate: "2026-11-16",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.locationName,
      address: event.locationAddress,
    },
    organizer: { "@type": "Organization", name: event.organizer },
    url: "https://insurance-risk-forum-2026.impr-joseph.chatgpt.site/",
  }).replace(/</g, "\\u003c");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: eventSchema }}
      />
      <Header />
      <main>
        <section className="hero" id="forum">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-axis" />
          {event.heroUrl && (
            <figure className="hero-visual">
              <img
                src={event.heroUrl}
                alt="2026年保險業風險管理趨勢論壇主視覺提案：棋盤與棋子象徵風險策略"
              />
              <figcaption>2026 主視覺提案</figcaption>
            </figure>
          )}
          <div className="hero-content">
            <p className="hero-kicker">
              <span>2026</span> ENTERPRISE RISK MANAGEMENT
            </p>
            <h1>{event.nameZh}</h1>
            <p className="hero-en">{event.nameEn}</p>
            <div className="hero-theme">
              <span>年度主題</span>
              <strong>{event.themeZh}</strong>
              <small>{event.themeEn}</small>
            </div>
            <div className="hero-details" aria-label="會議重點資訊">
              <div>
                <span>DATE</span>
                <b>{event.dateLabel}</b>
              </div>
              <div>
                <span>VENUE</span>
                <b>{event.locationName}</b>
              </div>
              <div>
                <span>HOST</span>
                <b>{event.organizer}</b>
              </div>
            </div>
            <RegistrationCountdown />
            <div className="hero-actions">
              <Link href="/register" className="button primary">
                立即報名 <span>→</span>
              </Link>
              <Link href="/2026/agenda" className="button secondary">
                查看議程
              </Link>
            </div>
            <p className="hero-note">
              {event.requiresApproval
                ? "本會議採資格審核制，送出申請不代表審核通過。"
                : "完成報名後，請留意會議通知信。"}
            </p>
          </div>
          <div className="hero-index">
            <span>RISK</span>
            <span>VALUE</span>
            <span>CAPITAL</span>
            <i />
          </div>
        </section>

        <section className="section about-section">
          <div className="section-label">
            <span>01</span> ABOUT THE FORUM
          </div>
          <div className="about-grid">
            <h2>
              風險不斷變化，
              <br />
              對話因而不能停止。
            </h2>
            <div className="prose">
              <p>
                保險業面對的風險持續變化，從國際制度接軌、市場波動、資本管理與巨災風險，到公平待客、數位轉型及永續經營，每一個階段都需要產官學界持續交流與共同回應。
              </p>
              <p>
                保險業風險管理趨勢論壇透過年度議題、專題演講及高峰對談，匯集主管機關、保險業領袖、專家學者與專業機構代表，持續追蹤產業環境變化，累積風險管理觀點，並探索保險業穩健經營與長期價值的新方向。
              </p>
            </div>
          </div>
        </section>

        <section className="dialogue-band">
          <div className="section">
            <span className="eyebrow light">AN ONGOING DIALOGUE</span>
            <h2>{event.conceptZh}</h2>
            <p>{event.conceptEn}</p>
            <div className="value-grid">
              {values.map((v, i) => (
                <article key={v[0]}>
                  <span>0{i + 1}</span>
                  <h3>{v[0]}</h3>
                  <strong>{v[1]}</strong>
                  <p>{v[2]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section focus-section" id="focus">
          <div className="section-heading">
            <div>
              <div className="section-label">
                <span>02</span> 2026 FORUM FOCUS
              </div>
              <h2>
                從風險辨識，
                <br />
                走向價值決策。
              </h2>
            </div>
            <p>聚焦制度、韌性、資本與永續四個面向，建立更完整的經營視角。</p>
          </div>
          <div className="focus-grid">
            {event.focuses
              .filter((f) => f.isVisible)
              .map((focus) => (
                <article key={focus.id}>
                  <span className="focus-no">{focus.icon}</span>
                  <div className="focus-line" />
                  <h3>{focus.title}</h3>
                  <p>{focus.description}</p>
                </article>
              ))}
          </div>
        </section>

        <section className="section speakers-preview" id="speakers">
          <div className="section-heading">
            <div>
              <div className="section-label">
                <span>03</span> SPEAKERS
              </div>
              <h2>
                匯聚關鍵角色，
                <br />
                開啟高品質對話。
              </h2>
            </div>
            <Link href="/2026/speakers" className="text-link">
              查看完整講者陣容 →
            </Link>
          </div>
          {event.speakers.filter((s) => s.isVisible).length ? (
            <div className="speaker-grid">
              {event.speakers
                .filter((s) => s.isVisible)
                .slice(0, 4)
                .map((speaker) => (
                  <SpeakerCard speaker={speaker} key={speaker.id} />
                ))}
            </div>
          ) : (
            <div className="announcement">
              <span className="announcement-mark">+</span>
              <div>
                <h3>講者陣容陸續公布</h3>
                <p>主管機關、產業領袖與專業講者資訊，將於確認後更新。</p>
              </div>
            </div>
          )}
        </section>

        <section className="agenda-section" id="agenda">
          <div className="section">
            <div className="section-heading">
              <div>
                <div className="section-label">
                  <span>04</span> PROGRAMME
                </div>
                <h2>會議議程</h2>
              </div>
              <div className="agenda-actions">
                <button disabled title="待主辦單位上傳正式檔案">
                  下載議程 PDF
                </button>
                <Link href="/2026/agenda">完整議程 →</Link>
              </div>
            </div>
            <div className="tabs" role="tablist" aria-label="議程時段">
              {periods.map((p) => (
                <button
                  key={p}
                  className={period === p ? "active" : ""}
                  onClick={() => setPeriod(p)}
                  role="tab"
                  aria-selected={period === p}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="agenda-table-wrap">
              <table className="agenda-table" aria-label="2026 會議議程">
                <thead>
                  <tr>
                    <th scope="col">時間</th>
                    <th scope="col">項目</th>
                    <th scope="col">講者</th>
                  </tr>
                </thead>
                <tbody>
                  {agenda.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <time className="agenda-time">
                          {item.startTime}–{item.endTime}
                        </time>
                      </td>
                      <td className="agenda-item-cell">
                        <span>{item.category}</span>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        {item.venue && <small>{item.venue}</small>}
                      </td>
                      <td className="agenda-speaker-cell">
                        <strong>{item.participants || "待確認"}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fineprint">主辦單位保留議程及講者調整權利。</p>
          </div>
        </section>

        <section className="section attend-section">
          <div className="section-label">
            <span>05</span> WHY ATTEND
          </div>
          <div className="attend-grid">
            <h2>
              在變動中看見
              <br />
              更長期的價值。
            </h2>
            <ol>
              {reasons.map((reason, index) => (
                <li key={reason}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {reason}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="timeline-section" id="dialogues">
          <div className="section">
            <div className="section-heading">
              <div>
                <div className="section-label">
                  <span>06</span> ARCHIVE
                </div>
                <h2>歷年對話</h2>
              </div>
              <p>
                每一年度都是產業思考的座標；內容將持續新增，不受固定屆數限制。
              </p>
            </div>
            <div className="timeline">
              <Link href="/2026" className="year current">
                <strong>2026</strong>
                <span>{event.themeZh}</span>
                <i>現在</i>
              </Link>
              {event.dialogues.map((d) => (
                <Link href={`/dialogues/${d.slug}`} key={d.id} className="year">
                  <strong>{d.year}</strong>
                  <span>{d.name}</span>
                  <i>{d.isPublished ? "查看" : "整理中"}</i>
                </Link>
              ))}
              <div className="year future">
                <strong>→</strong>
                <span>對話持續向前</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="info">
          <div className="section-heading">
            <div>
              <div className="section-label">
                <span>07</span> EVENT INFORMATION
              </div>
              <h2>會議資訊</h2>
            </div>
          </div>
          <div className="info-grid">
            <dl>
              <div>
                <dt>會議日期</dt>
                <dd>{event.dateLabel}</dd>
              </div>
              <div>
                <dt>報到時間</dt>
                <dd>{event.checkinLabel}</dd>
              </div>
              <div>
                <dt>會議時間</dt>
                <dd>{event.timeLabel}</dd>
              </div>
              <div>
                <dt>會議地點</dt>
                <dd>
                  {event.locationName}
                  <small>{event.venueDetail}</small>
                </dd>
              </div>
              <div>
                <dt>參加對象</dt>
                <dd>{event.audience}</dd>
              </div>
              <div>
                <dt>報名截止</dt>
                <dd>{event.deadlineLabel}</dd>
              </div>
            </dl>
            <div className="map-embed">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1176.5649025479272!2d121.52218166672672!3d25.05417797780344!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3442a968fd15c21d%3A0x1b494fb2ade1569a!2z5pm26I-v6YWS5bqX!5e1!3m2!1szh-TW!2stw!4v1786840543814!5m2!1szh-TW!2stw"
                title="晶華酒店 Google 地圖"
                width="600"
                height="450"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
              <div>
                <strong>{event.locationName}</strong>
                <span>{event.locationAddress}</span>
              </div>
            </div>
          </div>
          <div className="transport-grid">
            <div>
              <span>捷運</span>
              <p>{event.transport.metro}</p>
            </div>
            <div>
              <span>公車</span>
              <p>{event.transport.bus}</p>
            </div>
            <div>
              <span>停車</span>
              <p>{event.transport.parking}</p>
            </div>
            <div>
              <span>無障礙</span>
              <p>{event.transport.accessibility}</p>
            </div>
          </div>
        </section>

        <section className="quick-registration-section" id="registration-form">
          <div className="section">
            <div className="quick-registration-heading">
              <div>
                <div className="section-label">
                  <span>08</span> REGISTRATION
                </div>
                <h2>
                  立即提出
                  <br />
                  報名申請。
                </h2>
              </div>
              <p>
                填寫必要資料即可送出；如有英文名牌、飲食或無障礙需求，可改用完整報名表。
              </p>
            </div>
            <QuickRegistrationForm />
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="section">
            <div className="section-label">
              <span>09</span> FAQ
            </div>
            <div className="faq-grid">
              <h2>常見問題</h2>
              <div>
                {event.faqs
                  .filter((f) => f.isVisible)
                  .map((faq) => (
                    <details key={faq.id}>
                      <summary>
                        {faq.question}
                        <span>＋</span>
                      </summary>
                      <p>{faq.answer}</p>
                    </details>
                  ))}
              </div>
            </div>
          </div>
        </section>
        <section className="register-cta">
          <div>
            <span>2026 FORUM</span>
            <h2>
              與產業同行，
              <br />
              從一場對話開始。
            </h2>
            <p>報名資料送出後，請留意審核結果與行前通知。</p>
            <Link href="/register" className="button gold">
              送出報名申請 →
            </Link>
          </div>
        </section>
      </main>
      <Footer organizer={event.organizer} />
      <FloatingRegistration />
    </>
  );
}
