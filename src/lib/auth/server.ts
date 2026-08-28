import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { ensureDatabaseReady } from "@/db/readiness";
import { sendAccountVerificationEmail, sendAccountVerificationOtp } from "@/lib/email/verification";
import { recordSuccessfulLogin } from "@/lib/auth/login-tracking";
import { logger } from "@/lib/server/logging";
import { isTerraThemeId, type TerraThemeId } from "@/lib/theme/ids";

export type SafeUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
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
    logger.info("auth.session.skipped", {
      message: "Optional auth session lookup skipped because DATABASE_URL is not configured"
    });
    return null;
  }

  await ensureDatabaseReady();

  const session = await (auth as AuthLike).api.getSession({
    headers: await headers()
  });

  const user = session?.user ? sanitizeUser(session.user) : null;
  logger.info("auth.session.lookup", {
    context: {
      authenticated: Boolean(user),
      userId: user?.id
    },
    message: "Auth session lookup completed"
  });

  return user;
}

export async function requireUser(): Promise<SafeUser> {
  if (!isDatabaseConfigured()) {
    logger.warn("auth.required.unavailable", {
      message: "Required auth session failed because DATABASE_URL is not configured"
    });
    throw new AuthUnavailableError();
  }

  await ensureDatabaseReady();

  const user = await getOptionalUser();

  if (!user) {
    logger.warn("auth.required.unauthorized", {
      message: "Required auth session failed because no user is authenticated"
    });
    throw new UnauthorizedError();
  }

  logger.info("auth.required.authorized", {
    context: {
      userId: user.id
    },
    message: "Required auth session completed"
  });

  return user;
}

export async function hasCompletedAuthentication(user: SafeUser | null): Promise<boolean> {
  if (!user) {
    return false;
  }

  if (user.emailVerified) {
    return true;
  }

  const [socialAccount] = await getDb()
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(and(
      eq(schema.accounts.userId, user.id),
      ne(schema.accounts.providerId, "credential")
    ))
    .limit(1);

  return Boolean(socialAccount);
}

export function sanitizeUser(user: AuthSessionUser): SafeUser {
  return {
    id: String(user.id ?? ""),
    email: String(user.email ?? ""),
    emailVerified: Boolean(user.emailVerified),
    image: user.image ? String(user.image) : null,
    selectedTheme: normalizeThemeId(user.selectedTheme)
  };
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function createAuth() {
  if (!isDatabaseConfigured()) {
    logger.warn("auth.init.unavailable", {
      message: "Auth initialized without database-backed account data"
    });
    return {
      api: {
        getSession: async () => null
      },
      handler: async () => Response.json({ error: "Account data is unavailable." }, { status: 503 })
    } satisfies AuthLike;
  }

  logger.info("auth.init", {
    context: {
      googleAuthConfigured: isGoogleAuthConfigured()
    },
    message: "Initializing auth"
  });

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
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            const userId = typeof session.userId === "string" ? session.userId : null;

            if (!userId) {
              logger.warn("auth.login_tracking.missing_user", {
                message: "Login tracking skipped because the created session did not include a user id"
              });
              return;
            }

            try {
              await recordSuccessfulLogin(userId);
            } catch (error) {
              logger.error("auth.login_tracking.failed", {
                context: { userId },
                error,
                message: "Failed to update user login tracking after session creation"
              });
            }
          }
        }
      }
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignIn: false,
      sendOnSignUp: false,
      sendVerificationEmail: async ({ user, url, token }) => {
        await sendAccountVerificationEmail({
          email: user.email,
          token,
          url
        });
      }
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true
    },
    plugins: [
      emailOTP({
        allowedAttempts: 5,
        changeEmail: {
          enabled: true,
          verifyCurrentEmail: false
        },
        expiresIn: 600,
        otpLength: 6,
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "email-verification" && type !== "change-email" && type !== "forget-password") {
            return;
          }

          await sendAccountVerificationOtp({
            email,
            otp,
            purpose: type === "change-email"
              ? "email-change"
              : type === "forget-password"
                ? "password-reset"
                : "email-verification"
          });
        },
        storeOTP: "hashed"
      }),
      nextCookies()
    ],
    secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
    socialProviders: createSocialProviders(),
    user: {
      fields: {
        name: "email"
      },
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
  return isTerraThemeId(value) ? value : "night";
}
