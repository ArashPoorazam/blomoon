---
type: object
cluster: surfaces
universe: live
status: verified
verified: 2026-08-25
entity: src/lib/modes/useAudioPlayback.ts
---

# Playback

Playback is browser-native audio controlled by `useAudioPlayback`, surfaced through radio playback panels, and backed by the radio `/playable` POST endpoint.

## Why This Shape

The browser plays streams directly after the server validates the selected station URL. Terravue does not proxy, record, or transcode streams in v1.

## Shape

- `useAudioPlayback` maintains `idle`, `loading`, `playing`, `paused`, and `error` states and owns an `HTMLAudioElement`.
- `play` calls the mode's playable endpoint with `POST`, then creates `new Audio(playable.streamUrl)` and handles playing/pause/error events.
- `RadioPlaybackPanel` and `RadioMiniPlayer` expose play, pause/resume, stop, current station, and error state.
- Server-side playable resolution validates safe stream URLs and probes them before returning a playable response.

Citations: `src/lib/modes/useAudioPlayback.ts:8`, `src/lib/modes/useAudioPlayback.ts:26`, `src/lib/modes/useAudioPlayback.ts:82`, `src/lib/modes/useAudioPlayback.ts:102`, `src/components/RadioPlaybackPanel.tsx:14`, `src/components/RadioPlaybackPanel.tsx:56`, `src/app/api/modes/radio/points/[id]/playable/route.ts:5`, `src/lib/modes/radio/catalog.ts:173`, `src/lib/modes/radio/catalog.ts:487`

## Connected To

- **owns:** client audio element lifecycle and playback UI.
- **owned-by:** `src/lib/modes/useAudioPlayback.ts`, `src/components/RadioPlaybackPanel.tsx`.
- **joins:** `TerraPlaybackConfig`, playable route, radio stream validation, app shell.
- **looks-like-but-is-not:** server-side media processing; no stream proxy/transcoding exists.

## If You Change This

- **Hits:** playable endpoint contract, radio UI states, browser verification, security rules around stream URLs.
- **Does not hit:** catalog search/pagination unless playable resolution needs new provider data.

## Surfaces

| Surface | Role |
|---|---|
| End user | Starts, pauses, stops, sees errors |
| Browser audio | Plays direct stream URL |
| Radio adapter | Resolves and validates stream |

## See

- Source: `src/lib/modes/useAudioPlayback.ts`
- Source: `src/components/RadioPlaybackPanel.tsx`
- Source: `src/app/api/modes/radio/points/[id]/playable/route.ts`
