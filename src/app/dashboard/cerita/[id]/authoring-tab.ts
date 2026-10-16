export type AuthoringStepId =
  | "identitas"
  | "halaman"
  | "preview"
  | "evaluasi"
  | "status";

export const AUTHORING_TAB_IDS: AuthoringStepId[] = [
  "identitas",
  "halaman",
  "preview",
  "evaluasi",
  "status",
];

export function parseAuthoringTab(
  raw: string | null | undefined,
): AuthoringStepId | null {
  if (!raw) return null;
  const normalized = raw === "priview" ? "preview" : raw;
  return AUTHORING_TAB_IDS.includes(normalized as AuthoringStepId)
    ? (normalized as AuthoringStepId)
    : null;
}
