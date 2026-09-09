import type { PlaybackHistoryItemDto } from "@/lib/persistence/types";

export const PLAYBACK_HISTORY_LIMIT = 50;

export type PlaybackHistoryGroup = {
  items: PlaybackHistoryItemDto[];
  label: string;
  playedOn: string;
};

export function deriveLocalPlayedOn(now: Date, timezoneOffsetMinutes: number) {
  return new Date(now.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function mergePlaybackHistoryItem(
  items: PlaybackHistoryItemDto[],
  item: PlaybackHistoryItemDto,
  limit = PLAYBACK_HISTORY_LIMIT
) {
  return [
    item,
    ...items.filter((current) => !(current.playedOn === item.playedOn
      && current.point.modeId === item.point.modeId
      && current.point.id === item.point.id))
  ]
    .sort((left, right) => right.playedAt.localeCompare(left.playedAt))
    .slice(0, limit);
}

export function groupPlaybackHistory(items: PlaybackHistoryItemDto[], now = new Date()): PlaybackHistoryGroup[] {
  const today = localDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);
  const groups = new Map<string, PlaybackHistoryItemDto[]>();

  for (const item of [...items].sort((left, right) => right.playedAt.localeCompare(left.playedAt))) {
    groups.set(item.playedOn, [...(groups.get(item.playedOn) ?? []), item]);
  }

  return [...groups].map(([playedOn, groupedItems]) => ({
    items: groupedItems,
    label: playedOn === today
      ? "Today"
      : playedOn === yesterday
        ? "Yesterday"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${playedOn}T00:00:00Z`)),
    playedOn
  }));
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
