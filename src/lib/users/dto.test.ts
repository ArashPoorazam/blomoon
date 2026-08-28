import { describe, expect, it } from "vitest";
import { toViewerDto } from "./dto";

describe("toViewerDto", () => {
  it("returns a safe account DTO with auth method status", () => {
    const viewer = toViewerDto({
      accountProviderIds: ["credential", "google"],
      email: "user@example.com",
      emailVerified: true,
      firstLoginAt: new Date("2026-08-28T10:00:00.000Z"),
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: new Date("2026-08-28T10:00:00.000Z"),
      loginCount: 1,
      selectedTheme: "atlas",
      tipsDismissedAt: null
    });

    expect(viewer).toEqual({
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      email: "user@example.com",
      emailVerified: true,
      firstLoginAt: "2026-08-28T10:00:00.000Z",
      image: null,
      isFirstLogin: true,
      lastLoginAt: "2026-08-28T10:00:00.000Z",
      loginCount: 1,
      selectedTheme: "atlas",
      shouldShowTips: true,
      authMethods: [
        { id: "password", label: "Password", enabled: true },
        { id: "google", label: "Google", enabled: true }
      ],
      canChangeEmail: true
    });
  });

  it("falls back to the default theme for unknown stored values", () => {
    expect(toViewerDto({
      accountProviderIds: [],
      email: "user@example.com",
      emailVerified: false,
      firstLoginAt: null,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: null,
      loginCount: 0,
      selectedTheme: "unknown",
      tipsDismissedAt: null
    }).selectedTheme).toBe("night");
  });

  it("keeps any known stored theme", () => {
    expect(toViewerDto({
      accountProviderIds: [],
      email: "user@example.com",
      emailVerified: false,
      firstLoginAt: null,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: null,
      loginCount: 0,
      selectedTheme: "catppuccin",
      tipsDismissedAt: null
    }).selectedTheme).toBe("catppuccin");
  });

  it("omits unavailable auth methods", () => {
    expect(toViewerDto({
      accountProviderIds: ["credential"],
      availableProviderIds: ["credential"],
      email: "user@example.com",
      emailVerified: false,
      firstLoginAt: null,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: null,
      loginCount: 0,
      selectedTheme: "night",
      tipsDismissedAt: null
    }).authMethods).toEqual([
      { id: "password", label: "Password", enabled: true }
    ]);
  });

  it("marks a first login user", () => {
    expect(toViewerDto({
      accountProviderIds: [],
      email: "user@example.com",
      emailVerified: true,
      firstLoginAt: new Date("2026-08-28T10:00:00.000Z"),
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: new Date("2026-08-28T10:00:00.000Z"),
      loginCount: 1,
      selectedTheme: "night",
      tipsDismissedAt: null
    }).isFirstLogin).toBe(true);
  });

  it("marks a returning user", () => {
    expect(toViewerDto({
      accountProviderIds: [],
      email: "user@example.com",
      emailVerified: true,
      firstLoginAt: new Date("2026-08-27T10:00:00.000Z"),
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: new Date("2026-08-28T10:00:00.000Z"),
      loginCount: 2,
      selectedTheme: "night",
      tipsDismissedAt: null
    }).isFirstLogin).toBe(false);
  });

  it("shows tips until they are dismissed", () => {
    expect(toViewerDto({
      accountProviderIds: [],
      email: "user@example.com",
      emailVerified: true,
      firstLoginAt: null,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: null,
      loginCount: 0,
      selectedTheme: "night",
      tipsDismissedAt: null
    }).shouldShowTips).toBe(true);
  });

  it("hides tips after dismissal", () => {
    expect(toViewerDto({
      accountProviderIds: [],
      email: "user@example.com",
      emailVerified: true,
      firstLoginAt: null,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      lastLoginAt: null,
      loginCount: 3,
      selectedTheme: "night",
      tipsDismissedAt: new Date("2026-08-28T10:00:00.000Z")
    }).shouldShowTips).toBe(false);
  });
});
