import { env } from "cloudflare:workers";
import type { EventData } from "./types";
import type { RegistrationInput } from "./validation";

type GoogleSheetsEnv = {
  GOOGLE_SHEETS_WEBHOOK_URL?: string;
  GOOGLE_SHEETS_WEBHOOK_TOKEN?: string;
};

type RegistrationResult = {
  id: string;
  applicationNo: string;
  status: "pending_review";
};

function configuration() {
  const runtime = env as unknown as GoogleSheetsEnv;
  const url = runtime.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  const token = runtime.GOOGLE_SHEETS_WEBHOOK_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

async function callGoogleSheets(payload: Record<string, unknown>) {
  const config = configuration();
  if (!config) return null;
  const response = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, token: config.token }),
  });
  if (!response.ok) throw new Error(`Google Sheets HTTP ${response.status}`);
  const result = (await response.json()) as {
    ok?: boolean;
    [key: string]: unknown;
  };
  if (!result.ok) throw new Error("Google Sheets rejected the request");
  return result;
}

export async function syncRegistrationToGoogleSheet(
  input: RegistrationInput,
  result: RegistrationResult,
) {
  await callGoogleSheets({
    action: "appendRegistration",
    submittedAt: new Date().toISOString(),
    ...result,
    ...input,
    companyWebsite: undefined,
    formStartedAt: undefined,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function applyGoogleSheetEventOverrides(
  base: EventData,
): Promise<EventData> {
  try {
    const response = await callGoogleSheets({ action: "readEvent" });
    const patch = response?.event;
    if (!isRecord(patch)) return base;

    const textKeys = [
      "nameZh",
      "nameEn",
      "themeZh",
      "themeEn",
      "dateLabel",
      "timeLabel",
      "checkinLabel",
      "locationName",
      "locationAddress",
      "venueDetail",
      "organizer",
      "guidingOrganization",
      "planningOrganization",
      "coOrganizers",
      "contactPhone",
      "contactEmail",
      "audience",
      "feeLabel",
      "capacityLabel",
      "deadlineLabel",
    ] as const;
    const safe: Partial<EventData> = {};
    for (const key of textKeys) {
      if (typeof patch[key] === "string" && patch[key].trim()) {
        (safe as Record<string, unknown>)[key] = patch[key].trim();
      }
    }
    if (typeof patch.registrationOpen === "boolean") {
      safe.registrationOpen = patch.registrationOpen;
    }
    if (isRecord(patch.transport)) {
      safe.transport = {
        ...base.transport,
        ...Object.fromEntries(
          Object.entries(patch.transport).filter(
            ([key, value]) =>
              ["metro", "bus", "walk", "parking", "accessibility"].includes(
                key,
              ) && typeof value === "string",
          ),
        ),
      };
    }
    if (Array.isArray(patch.agenda))
      safe.agenda = patch.agenda as EventData["agenda"];
    if (Array.isArray(patch.speakers))
      safe.speakers = patch.speakers as EventData["speakers"];
    if (Array.isArray(patch.faqs)) safe.faqs = patch.faqs as EventData["faqs"];
    if (Array.isArray(patch.dialogues)) {
      const overrides = patch.dialogues.filter(isRecord);
      safe.dialogues = base.dialogues.map((dialogue) => {
        const override = overrides.find(
          (item) => Number(item.year) === dialogue.year,
        );
        if (!override) return dialogue;
        const photoUrls = Array.isArray(override.photoUrls)
          ? override.photoUrls.filter(
              (url): url is string => typeof url === "string" && Boolean(url),
            )
          : [];
        return {
          ...dialogue,
          ...override,
          year: dialogue.year,
          id: dialogue.id,
          slug: dialogue.slug,
          photoUrls: photoUrls.length ? photoUrls : dialogue.photoUrls,
        } as EventData["dialogues"][number];
      });
    }
    return { ...base, ...safe };
  } catch (error) {
    console.error("Google Sheets content sync unavailable", error);
    return base;
  }
}
