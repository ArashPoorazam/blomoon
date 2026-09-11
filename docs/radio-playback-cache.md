# Radio playback resolution and lifetime

Playback resolves addresses; only the browser establishes whether audio plays. The resolver never probes stream servers, loads the world catalog, or writes account data. It validates provider metadata separately from geographic catalog normalization.

A cache miss looks up the canonical provider UUID, then at most two known aliases in sorted order if the canonical station has disappeared. The response retains the requested public point ID. Identity lookup and provider requests share an eight-second deadline. Provider requests receive cancellation and use no-store; the client allows ten seconds for resolution.

Sources are the original entry and, when distinct, the provider-resolved alternative. Recognizable PLS/M3U/ASX playlists use the resolved source. Provider HTTPS addresses are preferred. Public HTTP addresses are upgraded to HTTPS; ports, paths, and queries remain intact. Credentials, local/private literals, unsupported schemes and malformed addresses are rejected. Certificate checks remain enabled; there is no insecure fallback, stream proxy, or transcoding.

POST `/api/modes/radio/points/{id}/playable` preserves `streamUrl`, `mediaKind`, `pointId`, and `checkedAt`; it adds `format` (`audio` or `hls`) and `alternatives` (at most one source). `checkedAt` means address validation, not a successful network or playback test. HLS requires native browser support. Provider click counting is deferred with Next.js `after` and bounded to two seconds; its result never changes playback.

Only responses containing reusable original entries without query strings are cached for five minutes, with a 500-entry process limit. Temporary resolved alternatives are not cached. `refresh=true` bypasses and removes the previous entry; a failed refresh cannot resurrect it. Explicit fixture entries use no provider or database lookup.

Resolution errors carry codes: `invalid_input` (400), `not_found` (404), `no_source` (409), `provider_failure` (502), `resolution_timeout` (503), and `internal_error` (500). Unexpected details stay in server logs.

The client maintains one cancellable session with one active audio element. A distinct source can be tried after a media error, within one shared 30-second startup budget. A timeout does not restart another 30-second cycle. Explicit Retry refreshes resolution. Permission retry and pause/resume reuse the prepared source. Stop, mode changes, unmount and station switches detach listeners and invalidate pending work. Buffering and ended streams have explicit states; history is recorded only once on first successful session playback.

Diagnostics correlate the client session UUID with the resolution request ID. They identify resolution/startup/playback stage, HTTP status, candidate index, timings, and native media error codes. They do not contain stream URLs or query tokens. Browser media error 4 alone is not classified as a codec incompatibility.
