const REGISTRATION_SHEET = "報名名單";
const MIN_FORM_FILL_MS = 2500;
const MAX_TEXT_LENGTH = 500;

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || "readEvent");
    if (action === "readEvent") return readEvent();
    return jsonResponse({ ok: false, error: "unknown_action" });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: "invalid_request" });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    if (body.action === "appendRegistration") return appendRegistration(body);
    return jsonResponse({ ok: false, error: "unknown_action" });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: "invalid_request" });
  }
}

function appendRegistration(body) {
  const validationError = validateRegistration(body);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError });
  }

  const email = cleanText(body.email, 160).toLowerCase();
  const cache = CacheService.getScriptCache();
  const throttleKey = "registration:" + digest(email);
  if (cache.get(throttleKey)) {
    return jsonResponse({ ok: false, error: "too_many_requests" });
  }
  cache.put(throttleKey, "1", 60);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return appendRegistrationLocked(body, email);
  } finally {
    lock.releaseLock();
  }
}

function appendRegistrationLocked(body, email) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATION_SHEET);
  if (!sheet) throw new Error("Registration sheet not found");
  const rowCount = Math.max(sheet.getLastRow() - 6, 1);
  const existingApplications = sheet
    .getRange(7, 1, rowCount, 1)
    .getDisplayValues()
    .flat();
  const existingEmails = sheet
    .getRange(7, 10, rowCount, 1)
    .getDisplayValues()
    .flat()
    .map(function (value) {
      return String(value || "").trim().toLowerCase();
    });
  if (existingEmails.includes(email)) {
    return jsonResponse({ ok: false, error: "duplicate_registration" });
  }
  if (existingApplications[0] === "範例－請刪除") sheet.deleteRow(7);
  const now = new Date();
  const applicationNo = createApplicationNo(now);
  sheet.appendRow([
    applicationNo,
    now,
    cleanText(body.nameZh, 80),
    cleanText(body.nameEn, 120),
    cleanText(body.organization, 160),
    cleanText(body.department, 120),
    cleanText(body.jobTitle, 120),
    cleanText(body.category, 80),
    cleanText(body.mobile, 40),
    email,
    body.needsEnglishBadge ? "是" : "否",
    cleanText(body.dietary, 80),
    cleanText(body.dietaryNotes, 300),
    cleanText(body.accessibilityNeeds, 300),
    cleanText(body.notes, MAX_TEXT_LENGTH),
    body.acceptsUpdates ? "是" : "否",
    "待審核",
    "",
    "",
    now,
  ]);
  return jsonResponse({
    ok: true,
    result: {
      id: applicationNo,
      applicationNo: applicationNo,
      status: "pending_review",
    },
  });
}

function validateRegistration(body) {
  if (cleanText(body.companyWebsite, 200)) return "spam_detected";
  const startedAt = Number(body.formStartedAt || 0);
  if (!startedAt || Date.now() - startedAt < MIN_FORM_FILL_MS) {
    return "submitted_too_quickly";
  }
  if (!body.privacyConsent) return "privacy_consent_required";
  const required = [
    "nameZh",
    "organization",
    "jobTitle",
    "category",
    "mobile",
    "email",
  ];
  for (let index = 0; index < required.length; index += 1) {
    if (!cleanText(body[required[index]], 200)) return "missing_required_field";
  }
  const email = cleanText(body.email, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalid_email";
  const mobile = cleanText(body.mobile, 40).replace(/[\s()-]/g, "");
  if (!/^[+\d][\d-]{7,19}$/.test(mobile)) return "invalid_mobile";
  return "";
}

function cleanText(value, limit) {
  return String(value == null ? "" : value)
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, limit || MAX_TEXT_LENGTH);
}

function digest(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8,
  );
  return bytes
    .map(function (byte) {
      return ("0" + ((byte + 256) % 256).toString(16)).slice(-2);
    })
    .join("");
}

function createApplicationNo(now) {
  const stamp = Utilities.formatDate(now, "Asia/Taipei", "yyyyMMddHHmmss");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return "ERM-" + stamp + "-" + suffix;
}

function readEvent() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const settings = readKeyValueSheet(
    spreadsheet.getSheetByName("活動設定"),
    4,
    1,
    3,
  );
  const eventDate =
    settings.event_date instanceof Date
      ? Utilities.formatDate(
          settings.event_date,
          "Asia/Taipei",
          "yyyy 年 M 月 d 日",
        )
      : String(settings.event_date || "");
  return jsonResponse({
    ok: true,
    event: {
      nameZh: settings.name_zh,
      nameEn: settings.name_en,
      themeZh: settings.theme_zh,
      themeEn: settings.theme_en,
      dateLabel: eventDate,
      timeLabel: settings.event_time,
      checkinLabel: settings.checkin_time,
      locationName: settings.venue,
      locationAddress: settings.address,
      venueDetail: settings.venue_detail,
      organizer: settings.organizer,
      guidingOrganization: settings.guiding_organization,
      planningOrganization: settings.planning_organization,
      coOrganizers: settings.co_organizers,
      contactPhone: settings.contact_phone,
      contactEmail: settings.contact_email,
      audience: settings.audience,
      feeLabel: settings.fee,
      capacityLabel: settings.capacity,
      deadlineLabel: settings.deadline,
      registrationOpen: String(settings.registration_open).trim() === "是",
      transport: {
        metro: settings.metro,
        bus: settings.bus,
        parking: settings.parking,
      },
      agenda: readAgenda(spreadsheet.getSheetByName("2026議程")),
      speakers: readSpeakers(spreadsheet.getSheetByName("2026講者")),
      faqs: readFaqs(spreadsheet.getSheetByName("FAQ")),
      dialogues: readDialogues(spreadsheet.getSheetByName("歷年論壇")),
    },
  });
}

function readKeyValueSheet(sheet, firstRow, keyColumn, valueColumn) {
  if (!sheet) return {};
  const count = Math.max(sheet.getLastRow() - firstRow + 1, 0);
  if (!count) return {};
  const values = sheet
    .getRange(firstRow, keyColumn, count, valueColumn)
    .getValues();
  return values.reduce(function (result, row) {
    if (row[0]) result[String(row[0]).trim()] = row[valueColumn - 1];
    return result;
  }, {});
}

function tableRows(sheet, width) {
  if (!sheet || sheet.getLastRow() < 4) return [];
  return sheet.getRange(4, 1, sheet.getLastRow() - 3, width).getDisplayValues();
}

function readAgenda(sheet) {
  return tableRows(sheet, 10)
    .filter(function (row) {
      return row[5];
    })
    .map(function (row, index) {
      return {
        id: "sheet-agenda-" + index,
        sortOrder: Number(row[0]) || index + 1,
        period: row[1] || "全天",
        dayLabel: "2026/11/16",
        startTime: row[2],
        endTime: row[3],
        category: row[4],
        title: row[5],
        description: row[6],
        participants: row[7],
        venue: row[8],
        isVisible: row[9] === "是",
      };
    });
}

function readSpeakers(sheet) {
  return tableRows(sheet, 10)
    .filter(function (row) {
      return row[1];
    })
    .map(function (row, index) {
      return {
        id: "sheet-speaker-" + index,
        sortOrder: Number(row[0]) || index + 1,
        nameZh: row[1],
        nameEn: row[2],
        organization: row[3],
        title: row[4],
        type: row[5],
        topic: row[6],
        bio: row[7],
        photoUrl: row[8],
        isVisible: row[9] === "是",
      };
    });
}

function readFaqs(sheet) {
  return tableRows(sheet, 4)
    .filter(function (row) {
      return row[1];
    })
    .map(function (row, index) {
      return {
        id: "sheet-faq-" + index,
        sortOrder: Number(row[0]) || index + 1,
        question: row[1],
        answer: row[2],
        isVisible: row[3] === "是",
      };
    });
}

function readDialogues(sheet) {
  return tableRows(sheet, 11)
    .filter(function (row) {
      return row[0];
    })
    .map(function (row) {
      const date =
        row[2] instanceof Date
          ? Utilities.formatDate(row[2], "Asia/Taipei", "yyyy 年 M 月 d 日")
          : row[2];
      return {
        year: Number(row[0]),
        theme: row[1],
        dateLabel: date,
        location: row[3],
        participantsCount: row[4],
        speakersCount: row[5],
        sessionsCount: row[6],
        speakers: String(row[8] || "")
          .split("、")
          .filter(Boolean),
        agenda: String(row[9] || "")
          .split("；")
          .filter(Boolean),
        photoUrls: String(row[10] || "")
          .split(/\s*[；;,\n]\s*/)
          .filter(Boolean),
      };
    });
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
