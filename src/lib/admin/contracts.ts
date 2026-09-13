import { z } from "zod";

export const settingsInput = z
  .object({
    version: z.number().int().nonnegative(),
    maintenance: z.boolean(),
    maintenanceMessage: z.string().trim().min(1).max(500),
    registrationEnabled: z.boolean(),
    supportEmail: z.email().max(254),
    announcement: z.string().trim().max(500),
    announcementExpiresAt: z.iso.datetime().nullable(),
  })
  .strict();
export type ApplicationSettings = z.infer<typeof settingsInput>;
export const defaultSettings: ApplicationSettings = {
  version: 0,
  maintenance: false,
  maintenanceMessage:
    "Blomoon is undergoing maintenance. Please check back shortly.",
  registrationEnabled: true,
  supportEmail: "blomoon.support@gmail.com",
  announcement: "",
  announcementExpiresAt: null,
};
export const modeSettingsInput = z
  .object({
    version: z.number().int().nonnegative(),
    enabled: z.boolean(),
    policy: z.enum(["observe", "enforce"]).optional(),
  })
  .strict();
export type ModeSettings = z.infer<typeof modeSettingsInput>;
export type AdminModeDescriptor = {
  id: string;
  label: string;
  itemLabel: string;
  provider: { name: string; url: string; attribution: string };
  capabilities: {
    create: boolean;
    block: boolean;
    recheck: boolean;
    sync: boolean;
  };
  policyOptions?: { value: "observe" | "enforce"; label: string }[];
};
export type CatalogItem = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  provider: string;
  blocked: boolean;
  status: string;
  updatedAt: string | null;
};
export const catalogQueryInput = z.object({
  q: z.string().max(120).default(""),
  country: z.string().max(8).default(""),
  provider: z.enum(["", "curated", "provider"]).default(""),
  status: z
    .enum(["", "available", "unavailable", "unverified", "disabled"])
    .default(""),
  blocked: z.enum(["", "true", "false"]).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type CatalogQuery = z.infer<typeof catalogQueryInput>;
export type CatalogPage = {
  items: CatalogItem[];
  page: number;
  total: number;
  pageSize: number;
};
