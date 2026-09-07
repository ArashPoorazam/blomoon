"use client";

import { formatDateTime } from "@/lib/geo";
import { getPointKey } from "@/lib/modes/pointKeys";
import type { TerraMode, TerraPoint } from "@/lib/modes/types";
import { FavouriteStarButton } from "../favourites/FavouriteStarButton";
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
  return (
    <div className={`point-row ${selected ? "selected" : ""} ${activePlaybackPointKey === getPointKey(point) ? "playback-active" : ""}`}>
      <button className="point-row-main" type="button" onClick={() => onPlay(point)}>
        <span className="point-copy">
          <span className="point-name">{point.name}</span>
          <span className="point-meta">
            {point.summary} · {activeMode.formatPointMetric(point)} · {formatDateTime(point.timestamp)}
          </span>
        </span>
      </button>
      <FavouriteStarButton favourited={favouritePointIds.has(getPointKey(point))} point={point} onToggle={onToggleFavourite} />
      <PointActionMenu point={point} onInfo={onInspect} onShare={onShare} />
    </div>
  );
}
