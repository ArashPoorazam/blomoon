import "server-only";
import { assertRegistrationEnabled } from "@/lib/admin/settings";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb, schema } from "@/db";
import { ensureDatabaseReady } from "@/db/readiness";
import { sendAccountVerificationOtp } from "@/lib/email/verification";
import { logger } from "@/lib/server/logging";
import { ensureDefaultFavouriteFolders } from "@/lib/persistence/favouriteFolders";

const OTP_DIGITS = 6;
const OTP_EXPIRES_IN_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const CREDENTIAL_PROVIDER_ID = "credential";
const CREDENTIAL_ISSUER = "local:credential";

export type PendingRegistrationStartResult =
  | { kind: "created"; email: string; expiresAt: Date }
  | { kind: "duplicate-email"; email: string };

export type PendingRegistrationVerifyResult =
  | { kind: "verified"; email: string }
  | { kind: "duplicate-email"; email: string }
  | { kind: "expired"; email: string }
  | { kind: "invalid-code"; attemptsRemaining: number; email: string }
  | { kind: "not-found"; email: string };

export type PendingRegistrationInput = {
  email: string;
  password: string;
};

export type PendingOtpHashInput = {
  email: string;
  otp: string;
  secret: string;
  salt?: string;
};

export type CleanupEligibilityInput = {
  clickHistoryCount: number;
  emailVerified: boolean;
  favouriteCount: number;
  hasCredentialAccount: boolean;
  hasNonCredentialAccount: boolean;
};

export async function startPendingRegistration({ email, password }: PendingRegistrationInput): Promise<PendingRegistrationStartResult> {
  await assertRegistrationEnabled();
  const normalizedEmail = normalizeAuthEmail(email);
  await ensureDatabaseReady();

  if (await emailBelongsToUser(normalizedEmail)) {
    return { kind: "duplicate-email", email: normalizedEmail };
  }

  const otp = generateNumericOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN_MS);
  const passwordHash = await hashPassword(password);
  const otpHash = hashPendingRegistrationOtp({
    email: normalizedEmail,
    otp,
    secret: getOtpSecret()
  });
  const now = new Date();

  await logger.measure("auth.pending_registration.start", {
    email: normalizedEmail
  }, () => getDb()
      .insert(schema.pendingRegistrations)
      .values({
        attempts: 0,
        email: normalizedEmail,
        expiresAt,
        otpHash,
        passwordHash,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: schema.pendingRegistrations.email,
        set: {
          attempts: 0,
          expiresAt,
          otpHash,
          passwordHash,
          updatedAt: now
        }
      }));

  await sendAccountVerificationOtp({
    email: normalizedEmail,
    otp,
    purpose: "email-verification"
  });

  return { kind: "created", email: normalizedEmail, expiresAt };
}

export async function verifyPendingRegistration(email: string, otp: string): Promise<PendingRegistrationVerifyResult> {
  await assertRegistrationEnabled();
  const normalizedEmail = normalizeAuthEmail(email);
  await ensureDatabaseReady();

  const [pending] = await getDb()
    .select()
    .from(schema.pendingRegistrations)
    .where(eq(schema.pendingRegistrations.email, normalizedEmail))
    .limit(1);

  if (!pending) {
    return { kind: "not-found", email: normalizedEmail };
  }

  if (isExpired(pending.expiresAt)) {
    await deletePendingRegistration(normalizedEmail);
    return { kind: "expired", email: normalizedEmail };
  }

  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    return { kind: "invalid-code", attemptsRemaining: 0, email: normalizedEmail };
  }

  if (!verifyPendingRegistrationOtp({
    email: normalizedEmail,
    hash: pending.otpHash,
    otp,
    secret: getOtpSecret()
  })) {
    const attempts = pending.attempts + 1;
    await getDb()
      .update(schema.pendingRegistrations)
      .set({
        attempts,
        updatedAt: new Date()
      })
      .where(eq(schema.pendingRegistrations.email, normalizedEmail));

    return {
      kind: "invalid-code",
      attemptsRemaining: Math.max(0, MAX_OTP_ATTEMPTS - attempts),
      email: normalizedEmail
    };
  }

  if (await emailBelongsToUser(normalizedEmail)) {
    await deletePendingRegistration(normalizedEmail);
    return { kind: "duplicate-email", email: normalizedEmail };
  }

  await logger.measure("auth.pending_registration.verify", {
    email: normalizedEmail
  }, () => getDb().transaction(async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          email: normalizedEmail,
          emailVerified: true,
          updatedAt: new Date()
        })
        .returning({ id: schema.users.id });

      await tx
        .insert(schema.accounts)
        .values({
          accountId: user.id,
          issuer: CREDENTIAL_ISSUER,
          password: pending.passwordHash,
          providerId: CREDENTIAL_PROVIDER_ID,
          userId: user.id
        });

      await ensureDefaultFavouriteFolders(user.id, tx);

      await tx
        .delete(schema.pendingRegistrations)
        .where(eq(schema.pendingRegistrations.email, normalizedEmail));
    }));

  return { kind: "verified", email: normalizedEmail };
}

export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

export function generateNumericOtp() {
  const max = 10 ** OTP_DIGITS;
  return randomInt(0, max).toString().padStart(OTP_DIGITS, "0");
}

export function hashPendingRegistrationOtp({ email, otp, secret, salt = randomBytes(16).toString("hex") }: PendingOtpHashInput) {
  const digest = createOtpDigest({ email, otp, secret, salt });
  return `sha256:${salt}:${digest}`;
}

export function verifyPendingRegistrationOtp({
  email,
  hash,
  otp,
  secret
}: PendingOtpHashInput & { hash: string }) {
  const [, salt, digest] = hash.split(":");

  if (!salt || !digest) {
    return false;
  }

  const expected = createOtpDigest({ email, otp, secret, salt });
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(digest, "hex");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function isPendingRegistrationExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function getPendingRegistrationAttemptsRemaining(attempts: number) {
  return Math.max(0, MAX_OTP_ATTEMPTS - attempts);
}

export function isIncompleteCredentialUserCleanupEligible(input: CleanupEligibilityInput) {
  return !input.emailVerified
    && input.hasCredentialAccount
    && !input.hasNonCredentialAccount
    && input.favouriteCount === 0
    && input.clickHistoryCount === 0;
}

async function emailBelongsToUser(email: string) {
  const [user] = await getDb()
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${email}`)
    .limit(1);

  return Boolean(user);
}

async function deletePendingRegistration(email: string) {
  await getDb()
    .delete(schema.pendingRegistrations)
    .where(eq(schema.pendingRegistrations.email, email));
}

function isExpired(expiresAt: Date) {
  return isPendingRegistrationExpired(expiresAt);
}

function createOtpDigest({ email, otp, secret, salt }: Required<PendingOtpHashInput>) {
  return createHmac("sha256", secret)
    .update(`${salt}:${normalizeAuthEmail(email)}:${otp.trim()}`)
    .digest("hex");
}

function getOtpSecret() {
  return process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? "blomoon-development-auth-secret";
}
