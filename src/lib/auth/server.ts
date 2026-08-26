import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { ensureDatabaseReady } from "@/db/readiness";
import type { TerraThemeId } from "@/lib/theme/themes";

export type SafeUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  name: string;
  selectedTheme: TerraThemeId;
};

type AuthSessionUser = {
  email?: string | null;
  emailVerified?: boolean | null;
  id?: string | null;
  image?: string | null;
  name?: string | null;
  selectedTheme?: string | null;
};

type AuthSessionPayload = {
  user?: AuthSessionUser | null;
};

type AuthLike = {
  api: {
    getSession: (input: { headers: Headers }) => Promise<AuthSessionPayload | null>;
  };
  handler: (request: Request) => Promise<Response>;
};

export class AuthUnavailableError extends Error {
  constructor() {
    super("Account data is unavailable because DATABASE_URL is not configured.");
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication is required.");
  }
}

export const auth = createAuth();

export async function getOptionalUser(): Promise<SafeUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDatabaseReady();

  const session = await (auth as AuthLike).api.getSession({
    headers: await headers()
  });

  return session?.user ? sanitizeUser(session.user) : null;
}

export async function requireUser(): Promise<SafeUser> {
  if (!isDatabaseConfigured()) {
    throw new AuthUnavailableError();
  }

  await ensureDatabaseReady();

  const user = await getOptionalUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export function sanitizeUser(user: AuthSessionUser): SafeUser {
  return {
    id: String(user.id ?? ""),
    email: String(user.email ?? ""),
    emailVerified: Boolean(user.emailVerified),
    image: user.image ? String(user.image) : null,
    name: String(user.name ?? "Terravue user"),
    selectedTheme: normalizeThemeId(user.selectedTheme)
  };
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function createAuth() {
  if (!isDatabaseConfigured()) {
    return {
      api: {
        getSession: async () => null
      },
      handler: async () => Response.json({ error: "Account data is unavailable." }, { status: 503 })
    } satisfies AuthLike;
  }

  return betterAuth({
    advanced: {
      database: {
        generateId: "uuid"
      }
    },
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications
      },
      transaction: true
    }),
    emailAndPassword: {
      enabled: true
    },
    plugins: [nextCookies()],
    secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
    socialProviders: createSocialProviders(),
    user: {
      additionalFields: {
        selectedTheme: {
          type: "string",
          required: false,
          defaultValue: "night",
          input: false
        }
      }
    }
  });
}

function createSocialProviders() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    return {};
  }

  return {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret
    }
  };
}

function normalizeThemeId(value?: string | null): TerraThemeId {
  return value === "atlas" || value === "night" ? value : "night";
}
