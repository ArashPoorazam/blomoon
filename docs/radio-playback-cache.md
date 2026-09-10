# Radio playback URL lifetime

The radio resolver probes the final response but returns the original HTTPS entry URL when it validates successfully. This lets the browser follow redirects itself instead of reusing the server's signed destination. HTTP entries are never returned; a validated HTTPS destination can be used as an uncached fallback.

Only query-free HTTPS entry URLs receive the five-minute playable cache. Query-bearing entries and provider-resolved fallback destinations are not cached. On a cache miss or `POST .../playable?refresh=true`, station and click resolution use `cache: "no-store"`; catalog and persisted identity stream URLs are not playback candidates. Explicit fixture entries remain supported. A failed refresh discards the old playable cache entry.

`refresh` is optional; when present it must occur once and equal `true`. It never accepts a stream URL. The playable response shape is unchanged. `checkedAt` records server validation, not successful browser playback.

The player makes at most one automatic fresh-resolution retry per play command, only for startup network failures or startup timeouts. A manual retry from an error requests fresh resolution. Permission failures preserve the source for a direct user gesture; unsupported formats and cancellations do not trigger automatic resolution retries. Stop and station switches invalidate pending attempts. Diagnostics record cache hits/misses, refresh requests, and browser outcomes without stream URLs or tokens.

## Verification on 2026-09-10 UTC

- Focused automated coverage: signed redirect preservation, HTTPS enforcement, query/fallback cache exclusion, five-minute expiry, forced refresh, failed refresh, fixtures, refresh parameter validation, bounded startup retries, manual retry, non-retryable failures, station switching, and stop during retry.
- Typecheck and production build passed.
- Local app requests returned 502 because its database was unavailable. End-to-end player verification through the authenticated app remains blocked.
- A direct live provider/resolver check for `46d2e1f5-b7ec-464e-9913-cb848488abdc` (Smooth Jazz 101.1) followed the Surfernetwork redirect: HEAD returned 405 and GET timed out. A direct browser attempt with a play-button gesture produced media error 4, `MEDIA_ELEMENT_ERROR: Format error`, and `NotSupportedError`. This does not prove a codec issue or establish expiry as the cause; no browser HTTP status was captured.
- A direct native-browser KEXP HTTPS MP3 check started, paused, resumed after a scheduled 61-second pause, stopped, and restarted successfully. SomaFM did not start in this browser. A deliberately unavailable stream produced media error 4.

The example station never reached playback, so its one-minute pause/resume and fresh authorization cycle remain unverified. Native-browser checks do not substitute for the app's complete playback flow. No proxy, transcoding, HLS library, or Cloudflare changes were introduced.
