/**
 * Versi aplikasi — sumber kebenaran: `package.json` → `version`.
 * Naikkan semver saat rilis fitur/perbaikan (major.minor.patch).
 */
import packageJson from "../../package.json";

export const APP_NAME = "CERMIN";
export const APP_VERSION = packageJson.version as string;

/** Label tampilan, mis. "CERMIN v0.2.0" */
export function appVersionLabel(): string {
  return `${APP_NAME} v${APP_VERSION}`;
}
