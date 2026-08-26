import type { RadioStationRecord } from "./types";

export function getRandomOffset(total: number, random: () => number = Math.random) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.min(total - 1, Math.max(0, Math.floor(random() * total)));
}

export function getRandomCatalogRecord(
  records: RadioStationRecord[],
  {
    excludePointId,
    random = Math.random
  }: {
    excludePointId?: string | null;
    random?: () => number;
  } = {}
) {
  const alternativeRecords = excludePointId
    ? records.filter((record) => record.point.id !== excludePointId)
    : records;
  const recordPool = alternativeRecords.length > 0 ? alternativeRecords : records;

  if (recordPool.length === 0) {
    return null;
  }

  return recordPool[getRandomOffset(recordPool.length, random)] ?? null;
}
