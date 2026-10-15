import { describe, expect, it } from "vitest";
import { APP_NAME, APP_VERSION, appVersionLabel } from "@/lib/app-version";
import packageJson from "../../package.json";

describe("app-version", () => {
  it("matches package.json semver", () => {
    expect(APP_VERSION).toBe(packageJson.version);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("builds display label", () => {
    expect(appVersionLabel()).toBe(`${APP_NAME} v${APP_VERSION}`);
  });
});
