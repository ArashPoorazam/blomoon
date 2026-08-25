---
type: process
status: verified
verified: 2026-08-25
consumes:
  - ../objects/surfaces/playback.md
  - ../objects/modes/radio-provider-adapter.md
  - ../objects/surfaces/rest-api.md
produces:
  - ../objects/surfaces/playback.md
---

# Resolve Playback

Selecting play resolves a server-validated stream URL and then plays it with the browser audio element.

## Input -> Movement -> Output

Input is a `TerraPointDetail` and a mode playback config. The client posts to the playable endpoint, the server resolves and validates a safe stream URL, and the client creates an audio element with loading/playing/paused/error state. Output is direct browser playback or a visible error.

## Steps

1. The radio mode registry provides a `playableEndpoint` builder. Citation: `src/lib/modes/registry.ts:50`.
2. `RadioPlaybackPanel` passes selected detail to playback controls. Citation: `src/components/RadioPlaybackPanel.tsx:14`.
3. `useAudioPlayback.play` posts to the configured playable endpoint. Citation: `src/lib/modes/useAudioPlayback.ts:82`.
4. The playable route awaits async `params`, calls `getRadioPlayableStream`, returns no-store JSON, 404, or 502. Citation: `src/app/api/modes/radio/points/[id]/playable/route.ts:5`.
5. `getRadioPlayableStream` resolves a clicked station URL or cached record stream URL, validates it, and caches the playable result. Citation: `src/lib/modes/radio/catalog.ts:173`.
6. Stream validation accepts only safe URLs and probes with `HEAD`, then ranged `GET`. Citation: `src/lib/modes/radio/catalog.ts:487`.
7. The client creates `new Audio(playable.streamUrl)` and updates status from audio events. Citation: `src/lib/modes/useAudioPlayback.ts:102`.

## If You Change This

- **Hits:** playback UI states, stream URL security, route method/status, server provider lookup, browser verification.
- **Does not hit:** globe country picking or marker rendering.

## Surfaces

| Surface | Role |
|---|---|
| End user | Clicks play/pause/stop |
| Browser audio | Plays direct stream |
| API route | Validates selected stream |
| Radio provider | Supplies stream URL candidates |

## See

- Objects: `../objects/surfaces/playback.md`, `../objects/modes/radio-provider-adapter.md`
- Source: `src/lib/modes/useAudioPlayback.ts`
