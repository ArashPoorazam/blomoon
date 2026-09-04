import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TerraPoint } from "@/lib/modes/types";
import { MobileCrosshair, type CrosshairPlaybackStatus } from "./MobileCrosshair";

const point: TerraPoint = {
  id: "test-station",
  latitude: 35.7,
  longitude: 51.4,
  modeId: "radio",
  name: "Test Station",
  summary: "Tehran, Iran"
};

function renderCrosshair(playbackStatus: CrosshairPlaybackStatus, selected = true) {
  return renderToStaticMarkup(createElement(MobileCrosshair, {
    metric: "128 kbps",
    onInfo: vi.fn(),
    onPause: vi.fn(),
    onPlay: vi.fn(),
    playbackStatus,
    point: selected ? point : null
  }));
}

describe("MobileCrosshair", () => {
  it("shows the dot only while no station is acquired", () => {
    expect(renderCrosshair("idle", false)).toContain("crosshair-dot");
    expect(renderCrosshair("idle")).not.toContain("crosshair-dot");
  });

  it("uses icon-only station actions", () => {
    const markup = renderCrosshair("idle");

    expect(markup).toContain('aria-label="View information for Test Station"');
    expect(markup).toContain('aria-label="Play Test Station"');
    expect(markup).not.toContain("<span>Info</span>");
    expect(markup).not.toContain("<span>Play</span>");
  });

  it("switches between bounded loading and pause states", () => {
    const loadingMarkup = renderCrosshair("loading");
    const playingMarkup = renderCrosshair("playing");

    expect(loadingMarkup).toContain('aria-label="Loading Test Station"');
    expect(loadingMarkup).toContain("disabled");
    expect(loadingMarkup).toContain("lucide-loader-circle");
    expect(playingMarkup).toContain('aria-label="Pause Test Station"');
    expect(playingMarkup).toContain("lucide-pause");
  });
});
