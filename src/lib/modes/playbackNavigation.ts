import type { TerraPoint } from "./types";
import { uniquePoints } from "./pointCollections";

export type PlaybackQueueSource = "list" | "favourites" | "history";

export function getPlaybackQueuePoints(source: PlaybackQueueSource, sources: Record<PlaybackQueueSource, TerraPoint[]>) {
  return uniquePoints(sources[source]);
}

export function getNextPlaybackPoint(queue: TerraPoint[], currentPointId: string | null) {
  if (queue.length === 0) {
    return null;
  }

  const currentIndex = currentPointId ? queue.findIndex((point) => point.id === currentPointId) : -1;
  return queue[currentIndex === -1 ? 0 : (currentIndex + 1) % queue.length] ?? null;
}

export function appendPlaybackHistory(
  history: TerraPoint[],
  currentPoint: TerraPoint | null,
  nextPoint: TerraPoint
) {
  if (!currentPoint || currentPoint.id === nextPoint.id) {
    return history;
  }

  return [...history, currentPoint];
}

export function takePreviousPlaybackPoint(history: TerraPoint[], currentPointId: string | null) {
  const nextHistory = [...history];

  while (nextHistory.length > 0) {
    const point = nextHistory.pop() ?? null;

    if (point && point.id !== currentPointId) {
      return {
        history: nextHistory,
        point
      };
    }
  }

  return {
    history: nextHistory,
    point: null
  };
}
