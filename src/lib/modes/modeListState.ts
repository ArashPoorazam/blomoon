import type { DataSourceInfo, TerraDataset, TerraPoint, TerraPointPage } from "./types";

export type ModeListSnapshot = {
  catalogTotal?: number;
  pageToken?: string;
  recommendation?: TerraPointPage["recommendation"];
  nextOffset: number | null;
  points: TerraPoint[];
  source: DataSourceInfo | null;
  total: number;
  totalKind: TerraPointPage["totalKind"];
};

export function createInitialModeListSnapshot(
  initialDataset: TerraDataset | null,
  pageSize: number
): ModeListSnapshot {
  return initialDataset
    ? {
      nextOffset: null,
      points: initialDataset.points.slice(0, pageSize),
      source: initialDataset.source,
      total: initialDataset.points.length,
      totalKind: "exact"
    }
    : createEmptyModeListSnapshot();
}

export function beginModeListRefresh({
  currentRequestKey,
  nextRequestKey,
  snapshot
}: {
  currentRequestKey: string | null;
  nextRequestKey: string;
  snapshot: ModeListSnapshot;
}) {
  return currentRequestKey === nextRequestKey
    ? snapshot
    : createEmptyModeListSnapshot();
}

export function createModeListSnapshot(page: TerraPointPage): ModeListSnapshot {
  return {
    ...(page.pageToken ? { pageToken: page.pageToken } : {}),
    ...(page.recommendation ? { recommendation: page.recommendation } : {}),
    ...(page.catalogTotal !== undefined ? { catalogTotal: page.catalogTotal } : {}),
    nextOffset: page.nextOffset,
    points: page.points,
    source: page.source,
    total: page.total,
    totalKind: page.totalKind
  };
}

export function createModeListRequestKey({
  countryCode,
  modeId,
  query,
  sortId
}: {
  countryCode: string | null;
  modeId: string;
  query: string;
  sortId: string;
}) {
  return JSON.stringify([modeId, countryCode, sortId, query.trim()]);
}

function createEmptyModeListSnapshot(): ModeListSnapshot {
  return {
    nextOffset: null,
    points: [],
    source: null,
    total: 0,
    totalKind: "exact"
  };
}
