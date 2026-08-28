import { isTerraThemeId, type TerraThemeId } from "@/lib/theme/ids";

export type UserAuthMethod = {
  id: "password" | "google" | string;
  label: string;
  enabled: boolean;
};

export type ViewerDto = {
  id: string;
  email: string;
  emailVerified: boolean;
  firstLoginAt: string | null;
  image: string | null;
  isFirstLogin: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  selectedTheme: TerraThemeId;
  shouldShowTips: boolean;
  authMethods: UserAuthMethod[];
  canChangeEmail: boolean;
};

export function toViewerDto(input: {
  accountProviderIds: string[];
  availableProviderIds?: Array<"credential" | "google">;
  email: string;
  emailVerified: boolean;
  firstLoginAt: Date | null;
  id: string;
  image: string | null;
  lastLoginAt: Date | null;
  loginCount: number;
  selectedTheme: string;
  tipsDismissedAt: Date | null;
}): ViewerDto {
  const providers = new Set(input.accountProviderIds);
  const availableProviderIds = input.availableProviderIds ?? ["credential", "google"];

  return {
    id: input.id,
    email: input.email,
    emailVerified: input.emailVerified,
    firstLoginAt: input.firstLoginAt?.toISOString() ?? null,
    image: input.image,
    isFirstLogin: input.loginCount <= 1,
    lastLoginAt: input.lastLoginAt?.toISOString() ?? null,
    loginCount: input.loginCount,
    selectedTheme: isTerraThemeId(input.selectedTheme) ? input.selectedTheme : "night",
    shouldShowTips: input.tipsDismissedAt === null,
    authMethods: availableProviderIds.map((providerId) => providerId === "credential"
      ? { id: "password", label: "Password", enabled: providers.has("credential") }
      : { id: "google", label: "Google", enabled: providers.has("google") }
    ),
    canChangeEmail: true
  };
}
