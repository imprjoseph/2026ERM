const REGISTRATION_SHEET = "報名名單";

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    const expected =
      PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN");
    if (!expected || body.token !== expected) {
      return jsonResponse({ ok: false, error: "unauthorized" });
    }
    if (body.action === "appendRegistration") return appendRegistration(body);
    if (body.action === "readEvent") return readEvent();
    return jsonResponse({ ok: false, error: "unknown_action" });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: "invalid_request" });
  }
}

function appendRegistration(body) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATION_SHEET);
  if (!sheet) throw new Error("Registration sheet not found");
  const existing = sheet
    .getRange(7, 1, Math.max(sheet.getLastRow() - 6, 1), 1)
    .getDisplayValues()
    .flat();
  if (existing.includes(body.applicationNo)) {
    return jsonResponse({ ok: true, duplicate: true });
  }
  if (existing[0] === "範例－請刪除") sheet.deleteRow(7);
  const now = body.submittedAt ? new Date(body.submittedAt) : new Date();
  sheet.appendRow([
    body.applicationNo,
    now,
    body.nameZh || "",
    body.nameEn || "",
    body.organization || "",
    body.department || "",
    body.jobTitle || "",
    body.category || "",
    body.mobile || "",
    body.email || "",
    body.needsEnglishBadge ? "是" : "否",
    body.dietary || "",
    body.dietaryNotes || "",
    body.accessibilityNeeds || "",
    body.notes || "",
    body.acceptsUpdates ? "是" : "否",
    "待審核",
    "",
    "",
    now,
  ]);
  return jsonResponse({ ok: true });
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
