import type { MarkerColorMode, MarkerColorToken } from "@/lib/theme/globe";

export type TerraModeId = "radio" | "podcasts" | "tv" | (string & {});

export type TerraPoint = {
  id: string;
  modeId: TerraModeId;
  name: string;
  latitude: number;
  longitude: number;
  locationPrecision?: "station" | "country";
  /** ISO 3166-1 numeric country code, or a documented atlas-only X-* code. */
  countryCode?: string;
  prominence?: number;
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

export type TerraPointPage = TerraDataset & {
  limit: number;
  nextOffset: number | null;
  offset: number;
  total: number;
  totalKind: "exact" | "lowerBound";
};

export type TerraPlaybackConfig = {
  label: string;
  mediaKind: "audio";
  playableEndpoint: (id: string) => string;
};

export type TerraModeSortOption = {
  id: string;
  label: string;
};

export type TerraModeListParams = {
  countryCode: string | null;
  limit: number;
  offset: number;
  query: string;
  sortId: string;
};

export type TerraPlayableAudio = {
  checkedAt: string;
  contentType?: string;
  mediaKind: "audio";
  pointId: string;
  streamUrl: string;
};

export type TerraMode = {
  id: TerraModeId;
  label: string;
  dataEndpoint: string;
  defaultSortId: string;
  listEndpoint: (params: TerraModeListParams) => string;
  sortOptions: TerraModeSortOption[];
  countryCatalog?: {
    markerEndpoint: (countryCode: string) => string;
    searchEndpoint: (countryCode: string, params: { limit: number; offset: number; query: string }) => string;
  };
  detailEndpoint: (id: string) => string;
  playback?: TerraPlaybackConfig;
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
