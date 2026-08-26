import type { TerraThemeId } from "@/lib/theme/themes";

export type UserAuthMethod = {
  id: "password" | "google" | string;
  label: string;
  enabled: boolean;
};

export type ViewerDto = {
  id: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  name: string;
  selectedTheme: TerraThemeId;
  authMethods: UserAuthMethod[];
  canChangeEmail: false;
};

export function toViewerDto(input: {
  accountProviderIds: string[];
  availableProviderIds?: Array<"credential" | "google">;
  email: string;
  emailVerified: boolean;
  id: string;
  image: string | null;
  name: string;
  selectedTheme: string;
}): ViewerDto {
  const providers = new Set(input.accountProviderIds);
  const availableProviderIds = input.availableProviderIds ?? ["credential", "google"];

  return {
    id: input.id,
    email: input.email,
    emailVerified: input.emailVerified,
    image: input.image,
    name: input.name,
    selectedTheme: input.selectedTheme === "atlas" ? "atlas" : "night",
    authMethods: availableProviderIds.map((providerId) => providerId === "credential"
      ? { id: "password", label: "Password", enabled: providers.has("credential") }
      : { id: "google", label: "Google", enabled: providers.has("google") }
    ),
    canChangeEmail: false
  };
}
