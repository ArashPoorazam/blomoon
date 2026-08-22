export type TerraModeId = "earthquakes" | "radio" | "weather" | (string & {});

export type TerraPoint = {
  id: string;
  modeId: TerraModeId;
  name: string;
  latitude: number;
  longitude: number;
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
  loadingLabel: string;
  emptyLabel: string;
  searchPlaceholder: string;
  markerMetricLabel: string;
  fallbackNotice: string;
  formatPointMetric: (point: TerraPoint) => string;
  matchPoint: (point: TerraPoint, query: string) => boolean;
  sortPoints: (points: TerraPoint[]) => TerraPoint[];
};
