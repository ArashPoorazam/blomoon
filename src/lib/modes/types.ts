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
  artworkUrl?: string;
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

export type TerraDetailField = {
  label: string;
  value: string;
};

export type TerraDetailSection = {
  fields: TerraDetailField[];
  title: string;
};

export type DataSourceInfo = {
  name: string;
  url: string;
  attribution: string;
  lastUpdated: string;
  isFallback?: boolean;
  notice?: string;
};

export type TerraDataset = {
  modeId: TerraModeId;
  source: DataSourceInfo;
  points: TerraPoint[];
};

export type TerraPointPage = TerraDataset & {
  /** Full published catalog size; independent of the paginated selection. */
  catalogTotal?: number;
  pageToken?: string;
  recommendation?: { kind: "personalized" | "discovery" };
  limit: number;
  nextOffset: number | null;
  offset: number;
  total: number;
  totalKind: "exact" | "lowerBound";
};

export type TerraRandomPoint = {
  modeId: TerraModeId;
  point: TerraPoint;
  source: DataSourceInfo;
};

export type TerraPlaybackConfig = {
  label: string;
  mediaKind: "audio";
  playableEndpoint: (id: string) => string;
  randomPointEndpoint?: string;
};

export type TerraModeCopy = {
  countryLoadingLabel: string;
  emptyLabel: string;
  fallbackNotice: string;
  itemPlural: string;
  itemSingular: string;
  listSubtitle: string;
  loadingLabel: string;
  loadingMoreLabel: string;
  randomPlaybackError: string;
  searchPlaceholder: string;
  searchingLabel: string;
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
  pageToken?: string;
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
  controlIcon: "radio" | "podcast" | "tv";
  copy: TerraModeCopy;
  dataEndpoint: string;
  defaultSortId: string;
  searchSortId?: string;
  recommendations?: { sortId: string; label: string; endpoint: (params: { limit: number; offset: number; pageToken?: string }) => string };
  listEndpoint: (params: TerraModeListParams) => string;
  sortOptions: TerraModeSortOption[];
  countryCatalog?: {
    markerEndpoint: (countryCode: string) => string;
    searchEndpoint: (countryCode: string, params: { limit: number; offset: number; query: string }) => string;
  };
  detailEndpoint: (id: string) => string;
  clickEndpoint?: (id: string) => string;
  playback?: TerraPlaybackConfig;
  markerMetricLabel: string;
  markerColorMode: MarkerColorMode;
  markerColorToken?: MarkerColorToken;
  formatDetailSections: (detail: TerraPointDetail | null) => TerraDetailSection[];
  formatPointMetric: (point: TerraPoint) => string;
  matchCountry: (point: TerraPoint, countryCode: string) => boolean;
  matchPoint: (point: TerraPoint, query: string) => boolean;
  sortPoints: (points: TerraPoint[]) => TerraPoint[];
};
