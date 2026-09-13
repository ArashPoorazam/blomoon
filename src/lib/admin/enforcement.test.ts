import { beforeEach, expect, it, vi } from "vitest";
import { defaultSettings } from "./contracts";
vi.mock("./settings", () => ({
  getSettings: vi.fn(),
  getModeSettings: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({ getOptionalUser: vi.fn() }));
import { getSettings, getModeSettings } from "./settings";
import { getOptionalUser } from "@/lib/auth/server";
import { publicRestriction } from "./enforcement";
beforeEach(() => {
  vi.mocked(getSettings).mockResolvedValue(defaultSettings);
  vi.mocked(getModeSettings).mockResolvedValue({ enabled: true, version: 0 });
  vi.mocked(getOptionalUser).mockResolvedValue(null);
});
it("gates public business APIs during maintenance but preserves health and authentication", async () => {
  vi.mocked(getSettings).mockResolvedValue({
    ...defaultSettings,
    maintenance: true,
  });
  expect(
    (
      await publicRestriction(
        new Request("https://example.com/api/modes/radio/points"),
      )
    )?.status,
  ).toBe(503);
  for (const path of [
    "/api/health",
    "/api/ready",
    "/api/auth/sign-in/email",
    "/api/omnisire/settings",
    "/api/application-state",
  ]) {
    expect(
      await publicRestriction(new Request(`https://example.com${path}`)),
    ).toBeNull();
  }
});
it("disabled modes cannot expose public resources", async () => {
  vi.mocked(getModeSettings).mockResolvedValue({ enabled: false, version: 1 });
  expect(
    (
      await publicRestriction(
        new Request("https://example.com/api/modes/radio/points/a/playable"),
      )
    )?.status,
  ).toBe(503);
});
