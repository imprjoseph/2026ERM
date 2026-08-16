export type EventData = {
  id: string;
  year: number;
  slug: string;
  isCurrent: boolean;
  isPublished: boolean;
  nameZh: string;
  nameEn: string;
  themeZh: string;
  themeEn: string;
  conceptZh: string;
  conceptEn: string;
  dateLabel: string;
  timeLabel: string;
  checkinLabel: string;
  locationName: string;
  locationAddress: string;
  venueDetail: string;
  organizer: string;
  guidingOrganization: string;
  planningOrganization: string;
  coOrganizers: string;
  contactPhone: string;
  contactEmail: string;
  heroUrl: string;
  audience: string;
  feeLabel: string;
  capacityLabel: string;
  deadlineLabel: string;
  requiresApproval: boolean;
  registrationOpen: boolean;
  waitlistEnabled: boolean;
  transport: {
    metro: string;
    bus: string;
    walk: string;
    parking: string;
    accessibility: string;
  };
  focuses: FocusData[];
  speakers: SpeakerData[];
  agenda: AgendaData[];
  faqs: FaqData[];
  dialogues: DialogueData[];
};

export type FocusData = {
  id: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
};

export type SpeakerData = {
  id: string;
  nameZh: string;
  nameEn: string;
  organization: string;
  title: string;
  type: string;
  topic: string;
  bio: string;
  photoUrl: string;
  sortOrder: number;
  isVisible: boolean;
};

export type AgendaData = {
  id: string;
  dayLabel: string;
  period: string;
  startTime: string;
  endTime: string;
  category: string;
  title: string;
  description: string;
  participants: string;
  venue: string;
  sortOrder: number;
  isVisible: boolean;
};

export type FaqData = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
};

export type DialogueData = {
  id: string;
  year: number;
  slug: string;
  name: string;
  theme: string;
  dateLabel: string;
  location: string;
  background: string;
  insights: string;
  participantsCount: string;
  speakersCount: string;
  sessionsCount: string;
  isPublished: boolean;
  highlights: string[];
  speakers: string[];
  agenda: string[];
  photoUrls: string[];
};

export const REGISTRATION_STATUSES = [
  "submitted",
  "pending_review",
  "approved",
  "waitlisted",
  "rejected",
  "cancelled",
  "notified",
  "checked_in",
  "no_show",
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export type RegistrationRecord = {
  id: string;
  applicationNo: string;
  eventId: string;
  nameZh: string;
  nameEn: string;
  organization: string;
  department: string;
  jobTitle: string;
  category: string;
  mobile: string;
  email: string;
  needsEnglishBadge: boolean;
  dietary: string;
  dietaryNotes: string;
  accessibilityNeeds: string;
  notes: string;
  acceptsUpdates: boolean;
  privacyConsent: boolean;
  status: RegistrationStatus;
  checkinToken: string | null;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
};
