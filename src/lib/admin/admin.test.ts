import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdmin, isOwnerId, assertAdminOrigin } from "./access";
import { readAdminBody } from "./http";
import { catalogQueryInput, defaultSettings, settingsInput } from "./contracts";
import { isStale, monitorInput } from "./monitor-contract";
import { checkCollectorToken } from "./monitor";
vi.mock("@/lib/auth/server", () => ({
  getOptionalUser: vi.fn(async () => null),
}));
afterEach(() => vi.unstubAllEnvs());
describe("Omnisire boundaries", () => {
  it("only authorizes verified allowlisted owners", () => {
    expect(isAdmin({ id: "owner", emailVerified: true }, "other, owner")).toBe(
      true,
    );
    expect(isAdmin({ id: "owner", emailVerified: false }, "owner")).toBe(false);
    expect(isAdmin(null, "owner")).toBe(false);
    expect(isOwnerId("own", "owner")).toBe(false);
  });
  it("requires a canonical same-origin mutation", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://blomoon.example");
    expect(() =>
      assertAdminOrigin(
        new Request("https://blomoon.example", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertAdminOrigin(
        new Request("https://blomoon.example", {
          headers: { origin: "https://blomoon.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects oversized and malformed bodies", async () => {
    await expect(
      readAdminBody(
        new Request("https://app.example", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: '{"long":"123456789"}',
        }),
        5,
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      readAdminBody(
        new Request("https://app.example", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("validates pagination and settings instead of accepting loose values", () => {
    expect(catalogQueryInput.safeParse({ page: "-1" }).success).toBe(false);
    expect(
      settingsInput.safeParse({
        ...defaultSettings,
        supportEmail: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      settingsInput.safeParse({ ...defaultSettings, secret: "hidden" }).success,
    ).toBe(false);
  });
  it("authenticates collector separately and rejects absent configuration", () => {
    vi.stubEnv("BLOMOON_COLLECTOR_TOKEN", "");
    expect(checkCollectorToken("Bearer abc")).toBe(false);
    vi.stubEnv("BLOMOON_COLLECTOR_TOKEN", "a".repeat(32));
    expect(checkCollectorToken(`Bearer ${"a".repeat(32)}`)).toBe(true);
    expect(checkCollectorToken(`Bearer ${"b".repeat(32)}`)).toBe(false);
  });
  it("marks old data stale and rejects invented metric shapes", () => {
    expect(isStale(new Date(0), 60001)).toBe(true);
    expect(isStale(new Date(0), 60000)).toBe(false);
    expect(monitorInput.safeParse({ host: "primary", cpu: -1 }).success).toBe(
      false,
    );
  });
});
