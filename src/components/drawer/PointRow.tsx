"use client";

import { AudioLines } from "lucide-react";
import type { ReactNode } from "react";
import type { TerraPoint } from "@/lib/modes/types";
import { StationArtwork } from "../ui/StationArtwork";

export function PointRow({ point, metadata, selected = false, playing, actions, onPlay }: {
  point: TerraPoint;
  metadata: string;
  selected?: boolean;
  playing: boolean;
  actions: ReactNode;
  onPlay: (point: TerraPoint) => void;
}) {
  return <div className={`point-row ${selected ? "selected" : ""} ${playing ? "playback-active" : ""}`}>
    <button className="point-row-main" type="button" onClick={() => onPlay(point)}>
      <StationArtwork key={`${point.modeId}:${point.id}`} name={point.name} artworkUrl={point.artworkUrl} />
      <span className="point-copy">
        <span className="point-name">{point.name}</span>
        <span className="point-meta">{metadata}</span>
      </span>
      {playing ? <span className="point-playing-indicator"><AudioLines size={13} aria-hidden="true" /><span className="sr-only">Current playback</span></span> : null}
    </button>
    <div className="point-row-actions">{actions}</div>
  </div>;
}
