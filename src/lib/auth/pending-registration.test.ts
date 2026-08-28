import { describe, expect, it } from "vitest";
import {
  getPendingRegistrationAttemptsRemaining,
  hashPendingRegistrationOtp,
  isIncompleteCredentialUserCleanupEligible,
  isPendingRegistrationExpired,
  normalizeAuthEmail,
  verifyPendingRegistrationOtp
} from "./pending-registration";

describe("pending registration validation", () => {
  it("normalizes auth email addresses before storage", () => {
    expect(normalizeAuthEmail("  USER@Example.COM ")).toBe("user@example.com");
  });
});

describe("pending registration OTPs", () => {
  it("hashes OTPs with email, secret, and salt", () => {
    const hash = hashPendingRegistrationOtp({
      email: "user@example.com",
      otp: "123456",
      salt: "fixed-salt",
      secret: "test-secret"
    });

    expect(hash).toMatch(/^sha256:fixed-salt:[a-f0-9]{64}$/);
    expect(verifyPendingRegistrationOtp({
      email: "user@example.com",
      hash,
      otp: "123456",
      secret: "test-secret"
    })).toBe(true);
    expect(verifyPendingRegistrationOtp({
      email: "user@example.com",
      hash,
      otp: "000000",
      secret: "test-secret"
    })).toBe(false);
  });

  it("expires codes at or after the expiry timestamp", () => {
    const expiresAt = new Date("2026-08-28T10:00:00.000Z");

    expect(isPendingRegistrationExpired(expiresAt, new Date("2026-08-28T09:59:59.999Z"))).toBe(false);
    expect(isPendingRegistrationExpired(expiresAt, new Date("2026-08-28T10:00:00.000Z"))).toBe(true);
  });

  it("caps attempts remaining at zero", () => {
    expect(getPendingRegistrationAttemptsRemaining(0)).toBe(5);
    expect(getPendingRegistrationAttemptsRemaining(4)).toBe(1);
    expect(getPendingRegistrationAttemptsRemaining(5)).toBe(0);
    expect(getPendingRegistrationAttemptsRemaining(9)).toBe(0);
  });
});

describe("incomplete user cleanup eligibility", () => {
  it("allows cleanup only for unverified credential-only users with no owned activity", () => {
    expect(isIncompleteCredentialUserCleanupEligible({
      clickHistoryCount: 0,
      emailVerified: false,
      favouriteCount: 0,
      hasCredentialAccount: true,
      hasNonCredentialAccount: false
    })).toBe(true);
  });

  it("preserves verified, social, favourite, and click-history users", () => {
    const base = {
      clickHistoryCount: 0,
      emailVerified: false,
      favouriteCount: 0,
      hasCredentialAccount: true,
      hasNonCredentialAccount: false
    };

    expect(isIncompleteCredentialUserCleanupEligible({ ...base, emailVerified: true })).toBe(false);
    expect(isIncompleteCredentialUserCleanupEligible({ ...base, hasNonCredentialAccount: true })).toBe(false);
    expect(isIncompleteCredentialUserCleanupEligible({ ...base, favouriteCount: 1 })).toBe(false);
    expect(isIncompleteCredentialUserCleanupEligible({ ...base, clickHistoryCount: 1 })).toBe(false);
    expect(isIncompleteCredentialUserCleanupEligible({ ...base, hasCredentialAccount: false })).toBe(false);
  });
});
