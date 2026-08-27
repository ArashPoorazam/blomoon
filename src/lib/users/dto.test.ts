import { describe, expect, it } from "vitest";
import { toViewerDto } from "./dto";

describe("toViewerDto", () => {
  it("returns a safe account DTO with auth method status", () => {
    const viewer = toViewerDto({
      accountProviderIds: ["credential", "google"],
      email: "user@example.com",
      emailVerified: true,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      selectedTheme: "atlas"
    });

    expect(viewer).toEqual({
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      email: "user@example.com",
      emailVerified: true,
      image: null,
      selectedTheme: "atlas",
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
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      selectedTheme: "unknown"
    }).selectedTheme).toBe("night");
  });

  it("keeps any known stored theme", () => {
    expect(toViewerDto({
      accountProviderIds: [],
      email: "user@example.com",
      emailVerified: false,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      selectedTheme: "catppuccin"
    }).selectedTheme).toBe("catppuccin");
  });

  it("omits unavailable auth methods", () => {
    expect(toViewerDto({
      accountProviderIds: ["credential"],
      availableProviderIds: ["credential"],
      email: "user@example.com",
      emailVerified: false,
      id: "8bdb6947-f995-46c5-8266-c3c94f93fcd9",
      image: null,
      selectedTheme: "night"
    }).authMethods).toEqual([
      { id: "password", label: "Password", enabled: true }
    ]);
  });
});
