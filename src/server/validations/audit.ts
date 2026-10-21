import { z } from "zod";
import {
  OPTIONAL_AUDIT_ACTIONS,
  REQUIRED_AUDIT_ACTIONS,
} from "@/lib/audit-actions";

export const AUDIT_ENTITY_TYPES = [
  "User",
  "Student",
  "Story",
  "StoryPage",
  "StoryVersion",
  "MediaAsset",
  "LearningSession",
  "SessionObservation",
  "TherapistAssignment",
  "ParentLink",
  "InviteToken",
  "FaqItem",
  "GuideDocument",
  "UserPreference",
  "InstitutionBranding",
  "PageMcq",
  "SessionMcqResponse",
] as const;

export const ALL_AUDIT_ACTIONS = [
  ...REQUIRED_AUDIT_ACTIONS,
  ...OPTIONAL_AUDIT_ACTIONS,
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export type AuditActionName = (typeof ALL_AUDIT_ACTIONS)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
  .optional();

/** Filter tambahan di luar parseListQuery (rentang tanggal bebas). */
export const auditDateRangeSchema = z.object({
  from: isoDate,
  to: isoDate,
});

export type AuditDateRange = z.infer<typeof auditDateRangeSchema>;
