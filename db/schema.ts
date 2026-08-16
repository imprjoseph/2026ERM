import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  year: integer("year").notNull().unique(),
  slug: text("slug").notNull().unique(),
  isCurrent: integer("is_current", { mode: "boolean" })
    .notNull()
    .default(false),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(false),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  themeZh: text("theme_zh").notNull(),
  themeEn: text("theme_en").notNull(),
  conceptZh: text("concept_zh").notNull(),
  conceptEn: text("concept_en").notNull(),
  dateLabel: text("date_label").notNull(),
  timeLabel: text("time_label").notNull(),
  checkinLabel: text("checkin_label").notNull(),
  locationName: text("location_name").notNull(),
  locationAddress: text("location_address").notNull(),
  venueDetail: text("venue_detail").notNull(),
  organizer: text("organizer").notNull(),
  audience: text("audience").notNull(),
  heroUrl: text("hero_url").notNull().default(""),
  feeLabel: text("fee_label").notNull(),
  capacityLabel: text("capacity_label").notNull(),
  deadlineLabel: text("deadline_label").notNull(),
  requiresApproval: integer("requires_approval", { mode: "boolean" })
    .notNull()
    .default(true),
  registrationOpen: integer("registration_open", { mode: "boolean" })
    .notNull()
    .default(true),
  waitlistEnabled: integer("waitlist_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  transportJson: text("transport_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const focuses = sqliteTable("focuses", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
});

export const speakers = sqliteTable("speakers", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull().default(""),
  organization: text("organization").notNull().default(""),
  title: text("title").notNull().default(""),
  speakerType: text("speaker_type").notNull().default(""),
  topic: text("topic").notNull().default(""),
  bio: text("bio").notNull().default(""),
  photoUrl: text("photo_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
});

export const agendaItems = sqliteTable("agenda_items", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  dayLabel: text("day_label").notNull(),
  period: text("period").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  participants: text("participants").notNull(),
  venue: text("venue").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
});

export const faqs = sqliteTable("faqs", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
});

export const dialogues = sqliteTable("dialogues", {
  id: text("id").primaryKey(),
  year: integer("year").notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  theme: text("theme").notNull(),
  dateLabel: text("date_label").notNull(),
  location: text("location").notNull(),
  background: text("background").notNull(),
  insights: text("insights").notNull(),
  participantsCount: text("participants_count").notNull(),
  speakersCount: text("speakers_count").notNull(),
  sessionsCount: text("sessions_count").notNull(),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(false),
  highlightsJson: text("highlights_json").notNull().default("[]"),
  speakersJson: text("speakers_json").notNull().default("[]"),
  agendaJson: text("agenda_json").notNull().default("[]"),
});

export const registrations = sqliteTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    applicationNo: text("application_no").notNull().unique(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    nameZh: text("name_zh").notNull(),
    nameEn: text("name_en").notNull().default(""),
    organization: text("organization").notNull(),
    department: text("department").notNull().default(""),
    jobTitle: text("job_title").notNull(),
    category: text("category").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    needsEnglishBadge: integer("needs_english_badge", { mode: "boolean" })
      .notNull()
      .default(false),
    dietary: text("dietary").notNull().default(""),
    dietaryNotes: text("dietary_notes").notNull().default(""),
    accessibilityNeeds: text("accessibility_needs").notNull().default(""),
    notes: text("notes").notNull().default(""),
    acceptsUpdates: integer("accepts_updates", { mode: "boolean" })
      .notNull()
      .default(false),
    privacyConsent: integer("privacy_consent", { mode: "boolean" }).notNull(),
    status: text("status").notNull(),
    checkinToken: text("checkin_token").unique(),
    checkedInAt: text("checked_in_at"),
    customJson: text("custom_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_registrations_event_email").on(
      table.eventId,
      table.emailNormalized,
    ),
    index("idx_registrations_event_status").on(table.eventId, table.status),
    index("idx_registrations_created_at").on(table.createdAt),
  ],
);

export const registrationHistory = sqliteTable(
  "registration_history",
  {
    id: text("id").primaryKey(),
    registrationId: text("registration_id")
      .notNull()
      .references(() => registrations.id),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorId: text("actor_id").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_history_registration").on(table.registrationId, table.createdAt),
  ],
);

export const emailLogs = sqliteTable("email_logs", {
  id: text("id").primaryKey(),
  registrationId: text("registration_id"),
  templateKey: text("template_key").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  actorId: text("actor_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_audit_created_at").on(table.createdAt)],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull(),
  windowStartedAt: integer("window_started_at").notNull(),
});

export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
