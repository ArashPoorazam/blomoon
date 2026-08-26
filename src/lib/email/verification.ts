import "server-only";

import { createHash } from "node:crypto";
import { Resend } from "resend";
import { logger } from "@/lib/server/logging";

type VerificationEmailInput = {
  email: string;
  token: string;
  url: string;
};

let resendClient: Resend | null = null;
let resendClientKey: string | null = null;

export async function sendAccountVerificationEmail({ email, token, url }: VerificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveSender();

  if (!apiKey || !from) {
    logger.warn("auth.email.verification.skipped", {
      context: {
        hasApiKey: Boolean(apiKey),
        hasSender: Boolean(from),
        to: email
      },
      message: "Verification email was not sent because Resend is not configured"
    });
    return;
  }

  try {
    const result = await getResendClient(apiKey).emails.send({
      from,
      html: renderVerificationEmailHtml(url),
      subject: "Verify your Blomoon email",
      text: renderVerificationEmailText(url),
      to: email
    }, {
      headers: {
        "Idempotency-Key": `auth-email-verification-${hashToken(token)}`
      }
    });

    if (result.error) {
      logger.error("auth.email.verification.failed", {
        context: {
          provider: "resend",
          to: email
        },
        error: result.error,
        message: "Resend failed to send verification email"
      });
      return;
    }

    logger.info("auth.email.verification.sent", {
      context: {
        emailId: result.data?.id,
        provider: "resend",
        to: email
      },
      message: "Verification email sent"
    });
  } catch (error) {
    logger.error("auth.email.verification.failed", {
      context: {
        provider: "resend",
        to: email
      },
      error,
      message: "Verification email delivery failed"
    });
  }
}

function getResendClient(apiKey: string) {
  if (!resendClient || resendClientKey !== apiKey) {
    resendClient = new Resend(apiKey);
    resendClientKey = apiKey;
  }

  return resendClient;
}

function resolveSender() {
  const configuredSender = process.env.BLOMOON_AUTH_EMAIL_FROM?.trim();

  if (configuredSender) {
    return configuredSender;
  }

  return process.env.NODE_ENV === "production" ? null : "Blomoon <onboarding@resend.dev>";
}

function renderVerificationEmailText(url: string) {
  return [
    "Verify your Blomoon email address",
    "",
    "Click this link to finish setting up your account:",
    url,
    "",
    "This link expires in 1 hour. If you did not request this email, you can ignore it."
  ].join("\n");
}

function renderVerificationEmailHtml(url: string) {
  const escapedUrl = escapeHtml(url);

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h1 style="font-size: 20px; margin: 0 0 14px;">Verify your Blomoon email address</h1>
      <p style="margin: 0 0 18px;">Click the button below to finish setting up your account.</p>
      <p style="margin: 0 0 22px;">
        <a href="${escapedUrl}" style="display: inline-block; padding: 10px 14px; border-radius: 6px; background: #1f2937; color: #ffffff; font-weight: 700; text-decoration: none;">Verify email</a>
      </p>
      <p style="margin: 0 0 10px; color: #4b5563;">This link expires in 1 hour.</p>
      <p style="margin: 0; color: #4b5563;">If you did not request this email, you can ignore it.</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
