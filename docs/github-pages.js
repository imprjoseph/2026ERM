(function () {
  "use strict";

  const config = window.ERM_CONFIG || {};
  const sheetApiUrl = config.sheetApiUrl || "";
  const basePath = config.basePath || "/2026ERM";
  const startedAt = Date.now();

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setupMenu() {
    const button = document.querySelector(".menu-button");
    const navigation = document.querySelector(".nav-links");
    if (!button || !navigation) return;
    button.addEventListener("click", function () {
      const open = navigation.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "關閉" : "選單";
    });
  }

  function setupCountdown() {
    const deadline = new Date("2026-11-06T23:59:59+08:00").getTime();
    const targets = document.querySelectorAll(".countdown");
    if (!targets.length) return;
    function update() {
      const remaining = Math.max(0, deadline - Date.now());
      if (!remaining) {
        targets.forEach(function (target) {
          target.innerHTML = "<strong>報名已截止</strong>";
        });
        return;
      }
      const values = [
        [Math.floor(remaining / 86400000), "天"],
        [Math.floor((remaining / 3600000) % 24), "時"],
        [Math.floor((remaining / 60000) % 60), "分"],
        [Math.floor((remaining / 1000) % 60), "秒"],
      ];
      const markup = `<div>${values
        .map(function (item) {
          return `<span><b>${String(item[0]).padStart(2, "0")}</b><small>${item[1]}</small></span>`;
        })
        .join("")}</div>`;
      targets.forEach(function (target) {
        target.innerHTML = markup;
      });
    }
    update();
    window.setInterval(update, 1000);
  }

  async function getEventData() {
    if (!sheetApiUrl) return null;
    const cacheKey = "erm-public-event-v1";
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && Date.now() - cached.savedAt < 3600000) return cached.event;
    } catch {
      localStorage.removeItem(cacheKey);
    }
    const url = new URL(sheetApiUrl);
    url.searchParams.set("action", "readEvent");
    const response = await fetch(url.toString(), { redirect: "follow" });
    const payload = await response.json();
    if (!payload.ok || !payload.event)
      throw new Error("Sheet data unavailable");
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ savedAt: Date.now(), event: payload.event }),
    );
    return payload.event;
  }

  function renderAgenda(event) {
    const tables = document.querySelectorAll(".agenda-table tbody");
    if (!tables.length || !Array.isArray(event.agenda)) return;
    const rows = event.agenda
      .filter(function (item) {
        return item.isVisible;
      })
      .map(function (item) {
        return `<tr><td><time class="agenda-time">${escapeHtml(item.startTime)}–${escapeHtml(item.endTime)}</time></td><td class="agenda-item-cell"><span>${escapeHtml(item.category)}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></td><td class="agenda-speaker-cell"><strong>${escapeHtml(item.participants)}</strong></td></tr>`;
      })
      .join("");
    tables.forEach(function (table) {
      table.innerHTML = rows;
    });
  }

  function renderFaqs(event) {
    const list = document.querySelector(".faq-list");
    if (!list || !Array.isArray(event.faqs)) return;
    list.innerHTML = event.faqs
      .filter(function (item) {
        return item.isVisible;
      })
      .map(function (item) {
        return `<details><summary>${escapeHtml(item.question)}<span>＋</span></summary><p>${escapeHtml(item.answer)}</p></details>`;
      })
      .join("");
  }

  function renderSpeakers(event) {
    const grid = document.querySelector(".speaker-grid.detailed");
    if (!grid || !Array.isArray(event.speakers)) return;
    grid.innerHTML = event.speakers
      .filter(function (speaker) {
        return speaker.isVisible;
      })
      .map(function (speaker) {
        const detailUrl = `${basePath}/2026/speakers/${encodeURIComponent(speaker.id)}/`;
        return `<article class="speaker-card"><div class="speaker-photo placeholder"><span>${escapeHtml((speaker.nameZh || "講").slice(0, 1))}</span></div><div class="speaker-card-body"><p class="speaker-organization">${escapeHtml(speaker.organization)}</p><h2>${escapeHtml(speaker.nameZh)}</h2><p>${escapeHtml(speaker.title)}</p><a href="${detailUrl}">查看詳細 →</a></div></article>`;
      })
      .join("");
  }

  function registrationPayload(form, quick) {
    if (quick) {
      const fields = form.querySelectorAll(
        ".quick-form-grid input, .quick-form-grid select",
      );
      const privacy = form.querySelector(".quick-consent input");
      return {
        action: "appendRegistration",
        nameZh: fields[0] && fields[0].value,
        nameEn: "",
        organization: fields[1] && fields[1].value,
        department: "",
        jobTitle: fields[2] && fields[2].value,
        category: fields[3] && fields[3].value,
        mobile: fields[4] && fields[4].value,
        email: fields[5] && fields[5].value,
        needsEnglishBadge: false,
        dietary: "一般",
        dietaryNotes: "",
        accessibilityNeeds: "",
        notes: "",
        acceptsUpdates: false,
        privacyConsent: Boolean(privacy && privacy.checked),
        companyWebsite:
          (form.querySelector("#quick-company-website") || {}).value || "",
        formStartedAt: startedAt,
      };
    }
    const checks = form.querySelectorAll('input[type="checkbox"]');
    return {
      action: "appendRegistration",
      nameZh: form.querySelector("#nameZh").value,
      nameEn: form.querySelector("#nameEn").value,
      organization: form.querySelector("#organization").value,
      department: form.querySelector("#department").value,
      jobTitle: form.querySelector("#jobTitle").value,
      category: form.querySelector("#category").value,
      mobile: form.querySelector("#mobile").value,
      email: form.querySelector("#email").value,
      needsEnglishBadge: Boolean(checks[0] && checks[0].checked),
      dietary: form.querySelector("#dietary").value,
      dietaryNotes: form.querySelector("#dietaryNotes").value,
      accessibilityNeeds: form.querySelector("#accessibilityNeeds").value,
      notes: form.querySelector("#notes").value,
      acceptsUpdates: Boolean(checks[1] && checks[1].checked),
      privacyConsent: Boolean(checks[2] && checks[2].checked),
      companyWebsite: form.querySelector("#companyWebsite").value,
      formStartedAt: startedAt,
    };
  }

  function registrationError(code) {
    const messages = {
      duplicate_registration: "此 Email 已完成報名，請勿重複送出。",
      invalid_email: "請確認電子信箱格式。",
      invalid_mobile: "請確認手機號碼格式。",
      privacy_consent_required: "請勾選個人資料告知事項。",
      missing_required_field: "請完整填寫所有必填欄位。",
      submitted_too_quickly: "請確認資料後稍候再送出。",
      too_many_requests: "送出次數過多，請一分鐘後再試。",
    };
    return messages[code] || "目前無法送出，請稍後再試。";
  }

  function setupRegistration(form, quick) {
    if (!form || !sheetApiUrl) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const original = button ? button.textContent : "";
      if (button) {
        button.disabled = true;
        button.textContent = "送出中…";
      }
      let message = form.querySelector(".github-form-message");
      if (!message) {
        message = document.createElement("p");
        message.className = "github-form-message";
        message.setAttribute("role", "alert");
        form.appendChild(message);
      }
      message.textContent = "";
      try {
        const response = await fetch(sheetApiUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(registrationPayload(form, quick)),
          redirect: "follow",
        });
        const payload = await response.json();
        if (!payload.ok || !payload.result) {
          throw new Error(payload.error || "registration_failed");
        }
        form.innerHTML = `<div class="quick-success" role="status"><span>✓</span><div><p class="eyebrow">APPLICATION RECEIVED</p><h3>已收到您的報名申請</h3><p>申請編號：${escapeHtml(payload.result.applicationNo)}</p><small>送出申請不代表審核通過，請留意後續通知。</small></div></div>`;
      } catch (error) {
        message.textContent = registrationError(error.message);
        if (button) {
          button.disabled = false;
          button.textContent = original;
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupMenu();
    setupCountdown();
    setupRegistration(document.querySelector("form.quick-form"), true);
    setupRegistration(document.querySelector(".form-panel form"), false);
    getEventData()
      .then(function (event) {
        if (!event) return;
        renderAgenda(event);
        renderFaqs(event);
        renderSpeakers(event);
      })
      .catch(function () {
        document.documentElement.dataset.sheetStatus = "fallback";
      });
  });
})();
