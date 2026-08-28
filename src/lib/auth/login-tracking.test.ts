import { describe, expect, it } from "vitest";
import { applySuccessfulLogin } from "./login-tracking";

describe("applySuccessfulLogin", () => {
  it("sets first login on the first successful login", () => {
    const now = new Date("2026-08-28T10:00:00.000Z");

    expect(applySuccessfulLogin({
      firstLoginAt: null,
      loginCount: 0
    }, now)).toEqual({
      firstLoginAt: now,
      lastLoginAt: now,
      loginCount: 1,
      updatedAt: now
    });
  });

  it("preserves first login on later successful logins", () => {
    const firstLoginAt = new Date("2026-08-27T10:00:00.000Z");
    const now = new Date("2026-08-28T10:00:00.000Z");

    expect(applySuccessfulLogin({
      firstLoginAt,
      loginCount: 1
    }, now).firstLoginAt).toBe(firstLoginAt);
  });

  it("increments login count", () => {
    expect(applySuccessfulLogin({
      firstLoginAt: new Date("2026-08-27T10:00:00.000Z"),
      loginCount: 4
    }, new Date("2026-08-28T10:00:00.000Z")).loginCount).toBe(5);
  });
});
