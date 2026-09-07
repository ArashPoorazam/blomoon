"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TerraModeId, TerraPoint } from "@/lib/modes/types";

export type PlaybackQueueSource = "list" | "favourites";

type PointInteraction =
  | { kind: "preview"; point: TerraPoint }
  | { kind: "inspect"; point: TerraPoint }
  | { camera: "focus" | "preserve"; kind: "play"; point: TerraPoint; queueSource: PlaybackQueueSource };

type PointInteractionDependencies = {
  activeModeId: TerraModeId;
  focusPoint: (point: TerraPoint) => void;
  openPointDetail: (point: TerraPoint) => void;
  playPoint: (point: TerraPoint) => void | Promise<void>;
  recordPointInteraction: (point: TerraPoint) => void;
  selectPoint: (point: TerraPoint) => void;
  setActiveModeId: (modeId: TerraModeId) => void;
  setPlaybackQueueSource: (source: PlaybackQueueSource) => void;
};

export function usePointInteractions({
  activeModeId,
  focusPoint,
  openPointDetail,
  playPoint,
  recordPointInteraction,
  selectPoint,
  setActiveModeId,
  setPlaybackQueueSource
}: PointInteractionDependencies) {
  const [pendingInteraction, setPendingInteraction] = useState<PointInteraction | null>(null);
  const [crosshairPoint, setCrosshairPoint] = useState<TerraPoint | null>(null);

  const applyActiveInteraction = useCallback((interaction: PointInteraction) => {
    selectPoint(interaction.point);

    if (interaction.kind === "preview") {
      setCrosshairPoint(interaction.point);
      return;
    }

    recordPointInteraction(interaction.point);

    if (interaction.kind === "inspect") {
      openPointDetail(interaction.point);
      return;
    }

    void playPoint(interaction.point);
  }, [openPointDetail, playPoint, recordPointInteraction, selectPoint]);

  const dispatch = useCallback((interaction: PointInteraction) => {
    const shouldFocus = interaction.kind === "inspect"
      || (interaction.kind === "play" && interaction.camera === "focus");

    if (shouldFocus) {
      setCrosshairPoint(null);
      focusPoint(interaction.point);
    }

    if (interaction.kind === "play") {
      setPlaybackQueueSource(interaction.queueSource);
    }

    if (interaction.point.modeId !== activeModeId) {
      setPendingInteraction(interaction);
      setActiveModeId(interaction.point.modeId);
      return;
    }

    applyActiveInteraction(interaction);
  }, [activeModeId, applyActiveInteraction, focusPoint, setActiveModeId, setPlaybackQueueSource]);

  useEffect(() => {
    if (!pendingInteraction || pendingInteraction.point.modeId !== activeModeId) {
      return;
    }

    applyActiveInteraction(pendingInteraction);
    setPendingInteraction(null);
  }, [activeModeId, applyActiveInteraction, pendingInteraction]);

  const clearCrosshairPoint = useCallback(() => setCrosshairPoint(null), []);
  const inspect = useCallback((point: TerraPoint) => dispatch({ kind: "inspect", point }), [dispatch]);
  const play = useCallback(
    (point: TerraPoint, queueSource: PlaybackQueueSource) => dispatch({ camera: "focus", kind: "play", point, queueSource }),
    [dispatch]
  );
  const playInPlace = useCallback(
    (point: TerraPoint, queueSource: PlaybackQueueSource) => dispatch({ camera: "preserve", kind: "play", point, queueSource }),
    [dispatch]
  );
  const preview = useCallback((point: TerraPoint) => dispatch({ kind: "preview", point }), [dispatch]);

  return useMemo(() => ({
    clearCrosshairPoint,
    crosshairPoint,
    inspect,
    play,
    playInPlace,
    preview
  }), [clearCrosshairPoint, crosshairPoint, inspect, play, playInPlace, preview]);
}
