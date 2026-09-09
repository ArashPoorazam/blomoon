"use client";

import { formatDateTime } from "@/lib/geo";
import { getPointKey } from "@/lib/modes/pointKeys";
import type { TerraMode, TerraPoint } from "@/lib/modes/types";
import { FavouriteStarButton } from "../favourites/FavouriteStarButton";
import { PointRow } from "./PointRow";
import { PointActionMenu } from "./PointActionMenu";

export function PointListRow({ activeMode, activePlaybackPointKey, favouritePointIds, point, selected, onInspect, onPlay, onShare, onToggleFavourite }: {
  activeMode: TerraMode;
  activePlaybackPointKey: string | null;
  favouritePointIds: Set<string>;
  point: TerraPoint;
  selected: boolean;
  onInspect: (point: TerraPoint) => void;
  onPlay: (point: TerraPoint) => void;
  onShare: (point: TerraPoint) => void;
  onToggleFavourite: (point: TerraPoint) => void;
}) {
  return <PointRow
    point={point}
    selected={selected}
    playing={activePlaybackPointKey === getPointKey(point)}
    metadata={[point.summary, activeMode.formatPointMetric(point), formatDateTime(point.timestamp)].filter(Boolean).join(" · ")}
    onPlay={onPlay}
    actions={<>
      <FavouriteStarButton favourited={favouritePointIds.has(getPointKey(point))} point={point} onToggle={onToggleFavourite} />
      <PointActionMenu point={point} onInfo={onInspect} onShare={onShare} />
    </>}
  />;
}
