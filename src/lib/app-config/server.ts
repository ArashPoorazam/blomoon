import "server-only";

import { BLOMOON_SUPPORT_EMAIL } from "./public";
import type { AppClientConfig, ContactLink } from "./types";

export function getAppClientConfig(): AppClientConfig {
  return {
    contactLinks: getContactLinks(),
    googleAuthEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  };
}

function getContactLinks(): ContactLink[] {
  return [{
    href: `mailto:${BLOMOON_SUPPORT_EMAIL}`,
    id: "email",
    label: "Email",
    value: BLOMOON_SUPPORT_EMAIL
  }];
}
