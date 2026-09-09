"use client";

import { ChevronLeft, RefreshCw } from "lucide-react";
import type { TerraMode, TerraPoint } from "@/lib/modes/types";
import { groupPlaybackHistory } from "@/lib/playback-history/history";
import type { PlaybackHistoryItemDto } from "@/lib/persistence/types";
import { useProgressiveRows } from "../drawer/useProgressiveRows";
import { DrawerHeader } from "../drawer/DrawerHeader";
import { PointListRow } from "../drawer/PointListRow";
import type { PlaybackHistoryModeState } from "./usePlaybackHistory";

export function PlaybackHistoryDrawer({ activeMode, activePlaybackPointKey, favouritePointIds, history, selectedId, onBack, onInspect, onPlay, onRetry, onShare, onToggleFavourite }: {
  activeMode: TerraMode;
  activePlaybackPointKey: string | null;
  favouritePointIds: Set<string>;
  history: PlaybackHistoryModeState;
  selectedId: string | null;
  onBack: () => void;
  onInspect: (point: TerraPoint) => void;
  onPlay: (point: TerraPoint) => void;
  onRetry: () => void;
  onShare: (point: TerraPoint) => void;
  onToggleFavourite: (point: TerraPoint) => void;
}) {
  const { rows, pending } = useProgressiveRows(history.items);
  const groups = groupPlaybackHistory(rows);
  return (
    <div className="history-view" aria-label={`${activeMode.label} playback history`}>
      <DrawerHeader
        className="history-header"
        title="History"
        subtitle={`Your 50 most recent ${activeMode.copy.itemSingular.toLowerCase()}-day plays`}
        actions={<button className="icon-button" type="button" aria-label="Back to station list" onClick={onBack}><ChevronLeft size={17} aria-hidden="true" /></button>}
      />
      {history.status === "error" ? (
        <div className="history-notice" role="status">
          <span>{history.items.length > 0 ? "Showing saved results. Refresh failed." : history.error}</span>
          <button type="button" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" /> Retry</button>
        </div>
      ) : null}
      <div className="point-list history-list" aria-busy={history.status === "loading" || pending}>
        {(history.status === "loading" && history.items.length === 0) || (pending && rows.length === 0) ? <div className="empty-state">Loading playback history</div> : null}
        {history.status !== "loading" && history.items.length === 0 && history.status !== "error" ? <div className="empty-state">Play a {activeMode.copy.itemSingular.toLowerCase()} to start your history.</div> : null}
        {groups.map((group) => (
          <HistoryGroup
            activeMode={activeMode}
            activePlaybackPointKey={activePlaybackPointKey}
            favouritePointIds={favouritePointIds}
            group={group}
            key={group.playedOn}
            selectedId={selectedId}
            onInspect={onInspect}
            onPlay={onPlay}
            onShare={onShare}
            onToggleFavourite={onToggleFavourite}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryGroup({ activeMode, activePlaybackPointKey, favouritePointIds, group, selectedId, onInspect, onPlay, onShare, onToggleFavourite }: {
  activeMode: TerraMode;
  activePlaybackPointKey: string | null;
  favouritePointIds: Set<string>;
  group: { items: PlaybackHistoryItemDto[]; label: string; playedOn: string };
  selectedId: string | null;
  onInspect: (point: TerraPoint) => void;
  onPlay: (point: TerraPoint) => void;
  onShare: (point: TerraPoint) => void;
  onToggleFavourite: (point: TerraPoint) => void;
}) {
  return <section className="history-group" aria-labelledby={`history-${group.playedOn}`}>
    <div className="history-date-heading"><h2 id={`history-${group.playedOn}`}>{group.label}</h2><span aria-hidden="true" /></div>
    {group.items.map((item) => <PointListRow
      activeMode={activeMode}
      activePlaybackPointKey={activePlaybackPointKey}
      favouritePointIds={favouritePointIds}
      key={`${item.playedOn}:${item.point.modeId}:${item.point.id}`}
      point={item.point}
      selected={selectedId === item.point.id}
      onInspect={onInspect}
      onPlay={onPlay}
      onShare={onShare}
      onToggleFavourite={onToggleFavourite}
    />)}
  </section>;
}
