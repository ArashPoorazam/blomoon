export const terraThemeIds = ["night", "atlas", "retro-82", "hackerman", "catppuccin"] as const;

export type TerraThemeId = typeof terraThemeIds[number];

const terraThemeIdSet: ReadonlySet<string> = new Set(terraThemeIds);

export function isTerraThemeId(value?: string | null): value is TerraThemeId {
  return typeof value === "string" && terraThemeIdSet.has(value);
}

export const terraThemeIdList = terraThemeIds.join(", ");
