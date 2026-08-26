import "server-only";

import type { AppClientConfig, ContactLink } from "./types";

export function getAppClientConfig(): AppClientConfig {
  return {
    contactLinks: getContactLinks(),
    googleAuthEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  };
}

function getContactLinks(): ContactLink[] {
  return [
    getUrlContactLink("github", "GitHub", process.env.TERRAVUE_CONTACT_GITHUB_URL),
    getUrlContactLink("telegram", "Telegram", process.env.TERRAVUE_CONTACT_TELEGRAM_URL),
    getEmailContactLink(process.env.TERRAVUE_CONTACT_EMAIL)
  ].filter((link): link is ContactLink => Boolean(link));
}

function getUrlContactLink(id: ContactLink["id"], label: string, value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return {
      href: url.toString(),
      id,
      label,
      value: url.hostname.replace(/^www\./, "")
    } satisfies ContactLink;
  } catch {
    return null;
  }
}

function getEmailContactLink(value?: string) {
  const email = value?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return {
    href: `mailto:${email}`,
    id: "email",
    label: "Email",
    value: email
  } satisfies ContactLink;
}
