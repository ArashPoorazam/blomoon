# Playback coordinator contract (P04)

The application mounts one `usePlaybackCoordinator` in `BlomoonApp`. It owns the active session, request cancellation, source alternatives, history notification, diagnostics and policy lifecycle. `useAudioPlayback` is a compatibility facade for existing radio consumers. Mounting independent coordinators for separate players is not supported; future mode surfaces must use the application coordinator.

## Descriptors and engines

`TerraPlaybackConfig` binds a mode ID, expected audio/video kind, resolver endpoint and response format. New modes return the strict version-1 `PlaybackDescriptor`: mode/item identity, media kind, live/on-demand timeline, expiry (ISO timestamp or explicitly unknown `null`), pause/seek/rate controls and one or two HTTPS sources. Each source declares direct/HLS/embed transport and optional content type. Live descriptors cannot advertise seek or rate in P04; DVR is outside this scope. Unknown fields, credential-bearing URLs, invalid controls, wrong identities/kinds and expired sources fail before engine creation. No provider headers or secrets are accepted in descriptors.

The radio adapter consumes the existing server response without a server/API migration. It supplies live audio controls and unknown expiry, and preserves native-HLS detection and the bounded fallback source list. A saved radio alias may resolve to a different canonical station ID; the server remains responsible for resolving aliases and enforcing policy. The adapter retains the requested UI/history identity, preserving existing saved-link behavior. New descriptor responses must match their requested mode and item.

The `PlaybackEngine` interface owns media resources, startup, events, snapshots, pause, seek/rate and disposal. The native audio engine preserves radio playback. Video and embed transports are represented but safely fail as unsupported until P11 implements their engines. A synthetic video engine tests coordinator independence; it is not a video player or supported-browser claim.

Source URLs remain in the internal session and media element only, never in returned UI state or diagnostics. Browser-required publisher URLs, including signed URLs, are inherently visible to that browser. Provider API credentials remain server-side; future resolvers must not put those credentials into media URLs. This contract does not implement a media relay.

## Lifecycle and controls

| Action | Behavior |
| --- | --- |
| Play | Reject discovery-only shows/wrong-mode points; cancel/dispose the previous session before resolving a different item. Same active item is a no-op. Resolution has a 10-second deadline; all alternative startup attempts share 30 seconds. |
| Pause | If supported, abort pending lookup/startup and remove listeners; pause the engine while retaining its loaded position and source. Terminal sessions cannot be revived by pause. |
| Resume | Retry the retained engine/source without duplicate history; repeat resolution if no descriptor was obtained. Recheck expiry even if a background tab delayed its timer. A new attempt signal fences callbacks from the old attempt. |
| Stop/mode change/unmount | Abort requests/listeners, clear expiry timer, pause and unload the engine. Stop/mode change clear navigation history, matching existing radio behavior. No overlapping media survives source replacement. |
| Seek/rate | Return false unless advertised and supported by the engine. Audio seek requires a finite nonnegative target inside a browser seekable range; legitimate rewinds are allowed. Rate is bounded to 0.5–3. These primitives do not yet add P08 podcast UI/progress persistence. |
| End/error | Unload media; expose stopped/error state. Unsupported startup alternatives may advance within the original deadline. Browser permission rejection retains the source for a user gesture. |
| Expiry | A cancellable, overflow-safe timer stops active or paused media and reports expiry. No automatic renewal loop. A subsequent Play resolves again with `refresh=true`; on a delayed-timer resume, expiry is reported and the next Play refreshes. |

An attempt can update state only while both its session identity and signal remain current. Engine callbacks additionally check the source-attempt signal. Cancellation is silent; it never becomes a publisher failure or a history write. History is recorded once per successfully started session; explicit stop/error followed by a new play remains a new session as before.

## Policy and diagnostics

Registered modes use their detail endpoint every 15 seconds while a selected session is loading, playing, buffering, paused or awaiting a permission gesture. Checks do not restart when buffering/playing status changes. Only one policy request may be in flight; each has a 10-second timeout and is aborted on cleanup. HTTP 401/403/404/503 or disabled availability stop/reset playback. Network failures do not independently revoke the item; the existing `ApplicationGate` separately checks account/application access and unmounts the player when access is lost. This is foreground best effort; browser timer throttling and already disclosed third-party URLs prevent a hard background revocation guarantee.

Diagnostics retain the existing bounded schema and server rate limit. They contain identity/session IDs, stage, bounded timing, source index and numeric media state, never source URLs, arbitrary errors, credentials or progress. One successful-start diagnostic is sent per play/resume attempt, and failures per attempted source or terminal failure; repeated playing/buffering/time-update events emit no extra diagnostics. Added categories distinguish invalid descriptors and expiry; the taxonomy reserves policy denial for future resolver use. Full telemetry, shared rate limits and request-budget measurement remain P14.

## Compatibility and verification

P04 adds no database migration, package dependency or registered mode. Apply prerequisite P03 migration 0020 for the cumulative working tree; retain that additive schema on application rollback. Reverting P04 restores the previous hook without rewriting saved user state. See [P04 evidence](evidence/P04.md) for exact checks and their limits. Real-source, physical-device, podcast UI/progress and adaptive-TV acceptance remain their later roadmap gates.
