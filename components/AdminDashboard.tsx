"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import QRCode from "react-qr-code";
import type { RegistrationRecord, RegistrationStatus } from "../lib/types";
import { statusLabels } from "./SiteShell";

type Stats = {
  status: { status: string; total: number }[];
  dietary: { dietary: string; total: number }[];
  categories: { category: string; total: number }[];
  organizations: { organization: string; total: number }[];
};

const statusOptions = [
  "pending_review",
  "approved",
  "waitlisted",
  "rejected",
  "cancelled",
  "notified",
  "checked_in",
  "no_show",
];
const modules = [
  "儀表板",
  "年度活動",
  "論壇焦點",
  "講者管理",
  "議程管理",
  "歷年對話",
  "報名名單",
  "信件範本",
  "現場報到",
  "FAQ 管理",
  "活動資訊",
  "單位與 Logo",
  "網站設定",
  "管理者權限",
  "操作紀錄",
];

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const [active, setActive] = useState("儀表板");
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<RegistrationRecord | null>(null);
  const [contentForm, setContentForm] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    const res = await fetch(`/api/admin/registrations?${p}`);
    if (res.ok) {
      const data = (await res.json()) as {
        registrations: RegistrationRecord[];
        stats: Stats;
      };
      setRecords(data.registrations);
      setStats(data.stats);
    }
    setLoading(false);
  }, [search, status]);
  useEffect(() => {
    let current = true;
    fetch("/api/admin/registrations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (
          current &&
          data &&
          typeof data === "object" &&
          "registrations" in data &&
          "stats" in data
        ) {
          const payload = data as {
            registrations: RegistrationRecord[];
            stats: Stats;
          };
          setRecords(payload.registrations);
          setStats(payload.stats);
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, []);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        (stats?.status || []).map((row) => [row.status, row.total]),
      ),
    [stats],
  );
  async function changeStatus(
    record: RegistrationRecord,
    next: RegistrationStatus,
  ) {
    const res = await fetch("/api/admin/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: record.id,
        status: next,
        fromStatus: record.status,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error || "狀態更新失敗");
      return;
    }
    setMessage(`${record.applicationNo} 已更新為「${statusLabels[next]}」`);
    await load();
  }
  async function createContent(e: FormEvent) {
    e.preventDefault();
    const kinds: Record<string, string> = {
      年度活動: "event",
      論壇焦點: "focus",
      講者管理: "speaker",
      議程管理: "agenda",
      歷年對話: "dialogue",
      "FAQ 管理": "faq",
    };
    const kind = kinds[active];
    const dataPayload: Record<string, string | boolean> = { ...contentForm };
    if (active === "年度活動" && contentForm.isCurrent === "true")
      dataPayload.isCurrent = true;
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data: dataPayload }),
    });
    const data = (await res.json()) as { error?: string };
    setMessage(
      res.ok
        ? "內容已新增，公開頁面將讀取最新資料。"
        : data.error || "儲存失敗",
    );
    if (res.ok) setContentForm({});
  }
  async function testEmail(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: email }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    setMessage(data.message || data.error || "測試失敗");
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <span>R</span>
          <div>
            <b>論壇管理中心</b>
            <small>IRMF ADMIN</small>
          </div>
        </Link>
        <nav>
          {modules.map((m) => (
            <button
              key={m}
              onClick={() => setActive(m)}
              className={active === m ? "active" : ""}
            >
              <i />
              {m}
            </button>
          ))}
        </nav>
        <div className="admin-user">
          <span>{adminName.slice(0, 1).toUpperCase()}</span>
          <div>
            <b>{adminName}</b>
            <small>管理者</small>
          </div>
        </div>
      </aside>
      <main className="admin-main">
        <header>
          <div>
            <p>2026 年保險業風險管理趨勢論壇</p>
            <h1>{active}</h1>
          </div>
          <div className="admin-header-actions">
            <Link href="/" target="_blank">
              查看網站 ↗
            </Link>
            <Link className="admin-primary" href="/admin/check-in">
              現場報到
            </Link>
          </div>
        </header>
        {message && (
          <div className="admin-message" role="status">
            {message}
            <button onClick={() => setMessage("")}>關閉</button>
          </div>
        )}
        {active === "儀表板" && (
          <>
            <section className="stat-grid">
              <article>
                <span>報名總數</span>
                <strong>{records.length}</strong>
                <small>目前資料</small>
              </article>
              <article>
                <span>待審核</span>
                <strong>{counts.pending_review || 0}</strong>
                <small>需要處理</small>
              </article>
              <article>
                <span>審核通過</span>
                <strong>{counts.approved || 0}</strong>
                <small>含已通知</small>
              </article>
              <article>
                <span>已報到</span>
                <strong>{counts.checked_in || 0}</strong>
                <small>現場即時</small>
              </article>
            </section>
            <section className="admin-grid">
              <div className="admin-card">
                <div className="card-title">
                  <h2>最新報名</h2>
                  <button onClick={() => setActive("報名名單")}>
                    管理全部 →
                  </button>
                </div>
                <RegistrationTable
                  records={records.slice(0, 6)}
                  onSelect={setSelected}
                  onStatus={changeStatus}
                />
              </div>
              <div className="admin-card">
                <h2>身分類別統計</h2>
                <div className="bars">
                  {(stats?.categories || []).slice(0, 6).map((row) => (
                    <div key={row.category}>
                      <span>{row.category}</span>
                      <i>
                        <b
                          style={{
                            width: `${Math.max(8, (row.total / Math.max(1, records.length)) * 100)}%`,
                          }}
                        />
                      </i>
                      <strong>{row.total}</strong>
                    </div>
                  ))}
                </div>
                {!records.length && <p className="empty-small">尚無報名資料</p>}
              </div>
            </section>
          </>
        )}
        {active === "報名名單" && (
          <section className="admin-card full">
            <div className="list-toolbar">
              <div>
                <input
                  placeholder="搜尋姓名、單位、Email、申請編號"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">全部狀態</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
                <button onClick={load}>搜尋</button>
              </div>
              <a href="/api/admin/registrations/export">匯出 CSV</a>
            </div>
            {loading ? (
              <p>載入中…</p>
            ) : (
              <RegistrationTable
                records={records}
                onSelect={setSelected}
                onStatus={changeStatus}
              />
            )}
          </section>
        )}
        {active === "年度活動" ||
        active === "論壇焦點" ||
        active === "FAQ 管理" ||
        active === "講者管理" ||
        active === "議程管理" ||
        active === "歷年對話" ? (
          <section className="admin-card full">
            <div className="card-title">
              <div>
                <h2>新增{active.replace("管理", "")}</h2>
                <p>
                  所有資料均儲存於年度內容資料庫；未確認項目請明確填寫「待確認」。
                </p>
              </div>
            </div>
            <form className="admin-form" onSubmit={createContent}>
              {active === "年度活動" && (
                <>
                  <input
                    required
                    type="number"
                    placeholder="年度，例如 2027"
                    value={contentForm.year || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, year: e.target.value })
                    }
                  />
                  <input
                    required
                    placeholder="中文論壇名稱"
                    value={contentForm.nameZh || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, nameZh: e.target.value })
                    }
                  />
                  <input
                    placeholder="英文論壇名稱（待確認亦可）"
                    value={contentForm.nameEn || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, nameEn: e.target.value })
                    }
                  />
                  <input
                    placeholder="中文年度主題"
                    value={contentForm.themeZh || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        themeZh: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="英文年度主題"
                    value={contentForm.themeEn || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        themeEn: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="活動日期"
                    value={contentForm.dateLabel || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        dateLabel: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="活動地點"
                    value={contentForm.locationName || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        locationName: e.target.value,
                      })
                    }
                  />
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={contentForm.isCurrent === "true"}
                      onChange={(e) =>
                        setContentForm({
                          ...contentForm,
                          isCurrent: String(e.target.checked),
                        })
                      }
                    />
                    設為目前年度（舊年度資料會保留）
                  </label>
                </>
              )}
              {active === "論壇焦點" && (
                <>
                  <input
                    required
                    placeholder="焦點標題"
                    value={contentForm.title || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, title: e.target.value })
                    }
                  />
                  <input
                    placeholder="排序數字"
                    type="number"
                    value={contentForm.sortOrder || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        sortOrder: e.target.value,
                      })
                    }
                  />
                  <textarea
                    required
                    placeholder="簡短說明"
                    value={contentForm.description || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        description: e.target.value,
                      })
                    }
                  />
                </>
              )}
              {active === "FAQ 管理" && (
                <>
                  <input
                    required
                    placeholder="問題"
                    value={contentForm.question || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        question: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="排序數字"
                    type="number"
                    value={contentForm.sortOrder || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        sortOrder: e.target.value,
                      })
                    }
                  />
                  <textarea
                    required
                    placeholder="答案"
                    value={contentForm.answer || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, answer: e.target.value })
                    }
                  />
                </>
              )}
              {active === "講者管理" && (
                <>
                  <input
                    required
                    placeholder="中文姓名（可填：講者待確認）"
                    value={contentForm.nameZh || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, nameZh: e.target.value })
                    }
                  />
                  <input
                    placeholder="英文姓名"
                    value={contentForm.nameEn || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, nameEn: e.target.value })
                    }
                  />
                  <input
                    required
                    placeholder="服務單位"
                    value={contentForm.organization || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        organization: e.target.value,
                      })
                    }
                  />
                  <input
                    required
                    placeholder="職稱"
                    value={contentForm.title || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, title: e.target.value })
                    }
                  />
                  <input
                    placeholder="講者類型"
                    value={contentForm.type || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, type: e.target.value })
                    }
                  />
                  <input
                    placeholder="演講或與談主題"
                    value={contentForm.topic || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, topic: e.target.value })
                    }
                  />
                  <textarea
                    placeholder="簡歷"
                    value={contentForm.bio || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, bio: e.target.value })
                    }
                  />
                </>
              )}
              {active === "議程管理" && (
                <>
                  <input
                    required
                    placeholder="議程名稱"
                    value={contentForm.title || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, title: e.target.value })
                    }
                  />
                  <input
                    placeholder="場次類別"
                    value={contentForm.category || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        category: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="開始時間"
                    value={contentForm.startTime || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        startTime: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="結束時間"
                    value={contentForm.endTime || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        endTime: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="講者／主持人／與談人"
                    value={contentForm.participants || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        participants: e.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="場地"
                    value={contentForm.venue || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, venue: e.target.value })
                    }
                  />
                  <textarea
                    placeholder="議題說明"
                    value={contentForm.description || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        description: e.target.value,
                      })
                    }
                  />
                </>
              )}
              {active === "歷年對話" && (
                <>
                  <input
                    required
                    type="number"
                    placeholder="年度"
                    value={contentForm.year || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, year: e.target.value })
                    }
                  />
                  <input
                    placeholder="論壇名稱"
                    value={contentForm.name || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, name: e.target.value })
                    }
                  />
                  <input
                    placeholder="年度主題"
                    value={contentForm.theme || ""}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, theme: e.target.value })
                    }
                  />
                  <textarea
                    placeholder="年度背景"
                    value={contentForm.background || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        background: e.target.value,
                      })
                    }
                  />
                  <textarea
                    placeholder="重要觀點摘要"
                    value={contentForm.insights || ""}
                    onChange={(e) =>
                      setContentForm({
                        ...contentForm,
                        insights: e.target.value,
                      })
                    }
                  />
                </>
              )}
              <button className="admin-primary" type="submit">
                儲存內容
              </button>
            </form>
          </section>
        ) : null}
        {active === "信件範本" && (
          <section className="admin-card full">
            <h2>通知信測試</h2>
            <p>
              預設使用本機替代模式保留寄送紀錄；設定正式 SMTP relay
              後即可切換實際寄送。
            </p>
            <form className="email-test" onSubmit={testEmail}>
              <input
                type="email"
                required
                placeholder="測試收件信箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="admin-primary">建立測試寄送</button>
            </form>
            <div className="template-list">
              {[
                "報名收件確認",
                "審核通過",
                "候補",
                "未通過",
                "報名取消",
                "行前通知",
                "活動前一天提醒",
                "QR Code 報到通知",
                "會後感謝",
                "滿意度調查",
                "參加證明",
              ].map((x, i) => (
                <div key={x}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <b>{x}</b>
                  <i>可編輯</i>
                </div>
              ))}
            </div>
          </section>
        )}
        {[
          "活動資訊",
          "單位與 Logo",
          "網站設定",
          "管理者權限",
          "操作紀錄",
        ].includes(active) && (
          <section className="admin-card full">
            <h2>{active}</h2>
            <div className="module-placeholder">
              <span>管理模組已納入資料架構</span>
              <p>
                此版本已完成核心報名、審核、內容新增、信件測試與報到流程；這個模組將沿用相同的權限與稽核機制擴充欄位編輯介面。
              </p>
            </div>
          </section>
        )}
      </main>
      {selected && (
        <div className="modal-backdrop">
          <div
            className="record-modal"
            role="dialog"
            aria-modal="true"
            aria-label="報名資料"
          >
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="關閉"
            >
              ×
            </button>
            <span className={`status-pill ${selected.status}`}>
              {statusLabels[selected.status]}
            </span>
            <h2>{selected.nameZh}</h2>
            <p>
              {selected.organization}｜{selected.jobTitle}
            </p>
            <dl>
              <div>
                <dt>申請編號</dt>
                <dd>{selected.applicationNo}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{selected.email}</dd>
              </div>
              <div>
                <dt>手機</dt>
                <dd>{selected.mobile}</dd>
              </div>
              <div>
                <dt>飲食</dt>
                <dd>{selected.dietary || "未填"}</dd>
              </div>
              <div>
                <dt>備註</dt>
                <dd>{selected.notes || "無"}</dd>
              </div>
            </dl>
            {selected.checkinToken && (
              <div className="qr-block">
                <QRCode
                  value={`${typeof location !== "undefined" ? location.origin : ""}/admin/check-in?token=${selected.checkinToken}`}
                  size={144}
                />
                <small>專屬報到 QR Code</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RegistrationTable({
  records,
  onSelect,
  onStatus,
}: {
  records: RegistrationRecord[];
  onSelect: (r: RegistrationRecord) => void;
  onStatus: (r: RegistrationRecord, s: RegistrationStatus) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>申請人</th>
            <th>單位／職稱</th>
            <th>身分類別</th>
            <th>狀態</th>
            <th>送出時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>
                <button className="person-link" onClick={() => onSelect(r)}>
                  <b>{r.nameZh}</b>
                  <small>{r.applicationNo}</small>
                </button>
              </td>
              <td>
                {r.organization}
                <small>{r.jobTitle}</small>
              </td>
              <td>{r.category}</td>
              <td>
                <span className={`status-pill ${r.status}`}>
                  {statusLabels[r.status]}
                </span>
              </td>
              <td>
                {new Date(r.createdAt).toLocaleString("zh-TW", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td>
                <select
                  aria-label={`更新 ${r.nameZh} 狀態`}
                  value={r.status}
                  onChange={(e) =>
                    onStatus(r, e.target.value as RegistrationStatus)
                  }
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!records.length && (
        <div className="empty-table">尚無符合條件的報名資料</div>
      )}
    </div>
  );
}
