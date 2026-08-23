import type { MarkerColorMode, MarkerColorToken } from "@/lib/theme/globe";

export type TerraModeId = "earthquakes" | "radio" | "weather" | (string & {});

export type TerraPoint = {
  id: string;
  modeId: TerraModeId;
  name: string;
  latitude: number;
  longitude: number;
  /** ISO 3166-1 numeric country code. */
  countryCode?: string;
  severity?: number;
  timestamp?: string;
  summary: string;
  metrics?: Record<string, string | number | null>;
};

export type TerraPointDetail = TerraPoint & {
  fields: Array<{
    label: string;
    value: string;
  }>;
  sourceUrl?: string;
};

export type DataSourceInfo = {
  name: string;
  url: string;
  attribution: string;
  lastUpdated: string;
  isFallback?: boolean;
};

export type TerraDataset = {
  modeId: TerraModeId;
  source: DataSourceInfo;
  points: TerraPoint[];
};

export type TerraMode = {
  id: TerraModeId;
  label: string;
  dataEndpoint: string;
  detailEndpoint: (id: string) => string;
  detailAccessory?: "radioPlayback";
  loadingLabel: string;
  emptyLabel: string;
  searchPlaceholder: string;
  markerMetricLabel: string;
  markerColorMode: MarkerColorMode;
  markerColorToken?: MarkerColorToken;
  fallbackNotice: string;
  formatPointMetric: (point: TerraPoint) => string;
  matchCountry: (point: TerraPoint, countryCode: string) => boolean;
  matchPoint: (point: TerraPoint, query: string) => boolean;
  sortPoints: (points: TerraPoint[]) => TerraPoint[];
};
