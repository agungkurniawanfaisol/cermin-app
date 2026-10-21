export type AuthoringStepId =
  | "identitas"
  | "halaman"
  | "preview"
  | "status";

export const AUTHORING_TAB_IDS: AuthoringStepId[] = [
  "identitas",
  "halaman",
  "preview",
  "status",
];

export function parseAuthoringTab(
  raw: string | null | undefined,
): AuthoringStepId | null {
  if (!raw) return null;
  // Legacy: tab=evaluasi → halaman (soal sekarang di per-halaman)
  if (raw === "evaluasi") return "halaman";
  const normalized = raw === "priview" ? "preview" : raw;
  return AUTHORING_TAB_IDS.includes(normalized as AuthoringStepId)
    ? (normalized as AuthoringStepId)
    : null;
}
