# Approved P06 podcast sources

Owner approval: user in this chat, 2026-11-13 (Asia/Tehran), explicitly selected Podcast Index, Hacker Public Radio and LINUX Unplugged, authorized implementation and real-feed checks, and retained $0 new spending. This supersedes the earlier fixture-only decision. Approval covers this two-show ingestion pilot; it does not deploy a public mode or approve the rest of a directory.

## Directory

**Podcast Index**, official keyless `/search` and `/lookup` compatibility endpoints at `https://api.podcastindex.org`. [Official OpenAPI documentation](https://podcastindex-org.github.io/docs-api/pi_api.json), [terms v1.1](https://github.com/Podcastindex-org/legal/blob/main/TermsOfService.md), reviewed 2026-11-13. These endpoints require no account, key, payment or provider secret. No account was created and no paid API tier/fallback was configured. Their IDs are Apple-compatible IDs, stored with the `apple:` namespace under the `podcasts-index` provider, never misrepresented as native Podcast Index IDs.

Use for metadata discovery only. Directory inclusion does not approve audio or artwork. Display `Podcast Index` attribution in later discovery UI; retain publishers' separate credits. Provider limits and terms apply; no numeric guaranteed quota or capacity is claimed. The operator adapter requests at most 20 search results, bounds response size/count, caches 64 queries for five minutes, allows one in-flight request and spaces new requests at least one second apart per instance. Any failure triggers a 60-second cooldown. No automatic paid upgrade or unbounded retries. P07/P14 must address shared throttling before exposing multi-replica public search.

The adapter makes only fixed-origin HTTPS requests using public-address validation, TLS verification, bounded body decoding and deadlines. Returned feed URLs remain inert candidates. Privileged identity linking requires an exact match to an already verified curated feed alias; it never changes source approval or overwrites publisher metadata. Search/lookup access was exercised from this development environment; that does not establish all-region access or certify account eligibility for future authenticated APIs.

## Sources and delivery rights

| Record | Hacker Public Radio | LINUX Unplugged |
| --- | --- | --- |
| Stable source UUID | `1a3bdc6f-598a-4ba6-b341-bc6a9df67a01` | `1a3bdc6f-598a-4ba6-b341-bc6a9df67a02` |
| Official homepage | [HPR](https://hackerpublicradio.org/) | [Jupiter Broadcasting show page](https://www.jupiterbroadcasting.com/show/linux-unplugged/) |
| Feed | [Two-week MP3 RSS](https://hackerpublicradio.org/hpr_rss.php) | [Publisher feed host](https://feeds.jupiterbroadcasting.com/lup) |
| Provenance | Official [subscription page](https://hackerpublicradio.org/syndication.html) | Official [subscription page](https://www.jupiterbroadcasting.com/show/linux-unplugged/subscribe/) links `linuxunplugged.com/rss`; Podcast Index resolves the show to the publisher's `feeds.jupiterbroadcasting.com/lup`. The latter is used because the website URL timed out here. |
| Permission basis | [Publisher reuse policy](https://hackerpublicradio.org/about.html): CC BY-SA 4.0 by default, retaining any episode-specific terms | Publisher show page states CC BY-SA 4.0 |
| Attribution | HPR and individual episode creators, original episode/source links, applicable licence notices | LINUX Unplugged / Jupiter Broadcasting, original episode/source links, CC BY-SA 4.0 |
| Directory identity | `apple:281699640` | `apple:687598126` |
| Status | Owner approved for ingestion pilot | Owner approved for ingestion pilot |

For both, direct delivery and metadata use rely on the stated publisher licence and its conditions; retain author/copyright notices in `media_items.provider_metadata` and the last-good source document. Do not assume unrelated logos or website assets are covered. Artwork is not imported in P06. Use publisher audio unchanged, including ads and tracking/enclosure redirects, without rehosting or transcription. Embedding a third-party player is not required or assessed.

CC BY-SA permits redistribution/adaptation subject to attribution, licence links, changes notices, ShareAlike for adaptations and no additional restrictions; those capabilities are not implemented or added to product scope. Recording, downloads, offline delivery and rehosting remain excluded. No exclusive content or membership feeds are used. There are no content licence fees for this approved use. See [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

No territory exclusions are stated in the reviewed licence basis; intended territory is worldwide, subject to publisher-specific notices and actual availability. This is not measured global reachability. No fixed licence expiry stated; review date 2026-11-13, next review **2027-02-11** (90 days), or earlier on a notice. Preserve existing saved references while blocking new use upon a valid takedown or permission issue. Contacts: [HPR contact](https://hackerpublicradio.org/about.html#contact), [LINUX Unplugged official contact links](https://www.jupiterbroadcasting.com/show/linux-unplugged/).

## Ingestion limits and deployment

The source manifest is inert; no production source is seeded. HPR uses the default 2 MiB wire/4 MiB decoded budget and the rolling feed, not its >15 MB archive. LINUX Unplugged's 692-episode feed measured 9,566,913 decoded bytes. Only its exact approved source UUID **and** canonical URL select the larger profile: 12 MiB wire/decoded, 25-second fetch deadline, 45-second child lifetime and 256 MiB V8 heap. The child's format/URL checks also gate the byte exception. Default feeds retain the original budgets. XML node/depth/field limits, 12 MiB serialized output, 1,000 episodes, host/global concurrency and source-origin checks are unchanged. The fetch deadline stays below the 30-second host-slot lease; normal workers heartbeat their 60-second job leases.

DNS fallback tries at most four addresses from the wholly validated DNS response, with four seconds per header attempt inside the overall deadline. It never resolves again while connecting, disables certificate checks, retries HTTP errors, or retries partial response bodies. A mixed public/private DNS response is rejected before any connection.

For previously provisioned podcast roles, the operator must grant the additional `provider_metadata` update column before deploying this revision:

```sql
GRANT UPDATE (provider_metadata) ON media_items TO blomoon_podcast_ingestion;
```

Fresh role setup includes this grant. No schema migration is needed beyond 0022. Do not rerun CREATE ROLE scripts against existing roles. Stop the worker on rollback; preserve tables and aliases. No production deployment, service activation or spending occurred. The 100-show/20,000-episode sizing target is unchanged.
