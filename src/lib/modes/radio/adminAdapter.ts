import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { AdminError } from "@/lib/admin/access";
import type { AdminModeAdapter } from "@/lib/admin/mode-contract";
import { enqueueJob } from "@/lib/admin/jobs";
import { findCountryByCode } from "@/lib/geo";
import { saveCuratedStation, radioHealthMetrics } from "./admin";
import { getRadioStationRecord } from "./catalog";
import { availabilityForStations } from "./health/query";

export const radioAdminAdapter: AdminModeAdapter = {
  descriptor: {
    id: "radio",
    label: "Radio",
    itemLabel: "station",
    policyOptions: [
      { value: "observe", label: "Observe stream health" },
      { value: "enforce", label: "Require verified streams" },
    ],
    provider: {
      name: "Radio Browser",
      url: "https://www.radio-browser.info",
      attribution: "Community radio directory",
    },
    capabilities: { create: true, block: true, recheck: true, sync: true },
  },
  async list(query) {
    const country = query.country ? findCountryByCode(query.country)?.code : "";
    if (query.country && !country)
      throw new AdminError(400, "Invalid country.");
    const filter = sql`name_text ilike ${`%${query.q}%`} and (${!country} or country_code=${country ?? ""})
      and (${!query.provider} or curated=${query.provider === "curated"})
      and (${!query.blocked} or blocked=${query.blocked === "true"}) and (${!query.status} or status=${query.status})`;
    const rows = await getDb().execute<{
      station_id: string;
      record: import("./types").RadioStationRecord;
      name_text: string;
      country_code: string;
      country_text: string;
      curated: boolean;
      blocked: boolean;
      status: string;
      total: number;
    }>(sql`
      with entries as (
        select d.station_id,d.record,d.name_text,d.country_code,d.country_text,false as curated from radio_directory d
        where not exists(select 1 from radio_curated_stations c where c.station_id=d.station_id)
        union all select station_id,record,name_text,country_code,country_text,true from radio_curated_stations
      ), states as (select e.*,
        (exists(select 1 from media_blocks b where b.mode_id='radio' and b.point_id=e.station_id) or exists(select 1 from radio_curated_stations c where c.station_id=e.station_id and not c.enabled)) as blocked,
        case when exists(select 1 from media_blocks b where b.mode_id='radio' and b.point_id=e.station_id) or exists(select 1 from radio_curated_stations c where c.station_id=e.station_id and not c.enabled) then 'disabled'
        when exists(select 1 from radio_stream_sources s where s.station_id=e.station_id and s.enabled and s.last_success>now()-interval '24 hours' and s.failures<3) then 'available'
        when exists(select 1 from radio_stream_sources s where s.station_id=e.station_id and s.last_attempt is not null) then 'unavailable' else 'unverified' end as status from entries e)
      select *, count(*) over()::int as total from states where ${filter} order by name_text,station_id limit 25 offset ${(query.page - 1) * 25}`);
    return {
      items: rows.map((r) => ({
        id: r.station_id,
        name: r.record.point.name,
        country: findCountryByCode(r.country_code)?.name ?? r.country_code,
        countryCode: r.country_code,
        provider: r.curated ? "Curated" : "Radio Browser",
        blocked: r.blocked,
        status: r.status,
        updatedAt: null,
      })),
      total: rows[0]?.total ?? 0,
      page: query.page,
      pageSize: 25,
    };
  },
  async detail(id) {
    z.uuid().parse(id);
    const [curated] = await getDb()
      .select()
      .from(schema.radioCuratedStations)
      .where(eq(schema.radioCuratedStations.stationId, id));
    const record = curated?.record ?? (await getRadioStationRecord(id));
    if (!record) throw new AdminError(404, "Station not found.");
    const stationId = record.point.id;
    const streams = await getDb()
      .select()
      .from(schema.radioStreamSources)
      .where(eq(schema.radioStreamSources.stationId, stationId));
    const [block] = await getDb()
      .select()
      .from(schema.mediaBlocks)
      .where(eq(schema.mediaBlocks.key, `radio:${stationId}`));
    return {
      id: stationId,
      record,
      streams,
      enabled: curated?.enabled ?? true,
      curated: Boolean(curated),
      curatedStreamUrls: curated?.streamUrls ?? [],
      block: block ?? null,
      availability: (await availabilityForStations([stationId])).get(stationId),
    };
  },
  save: saveCuratedStation,
  async block(actorId, id, blocked, reason) {
    z.uuid().parse(id);
    const detail = await radioAdminAdapter.detail(id);
    id = detail.id;
    return getDb().transaction(async (tx) => {
      if (blocked)
        await tx
          .insert(schema.mediaBlocks)
          .values({ key: `radio:${id}`, modeId: "radio", pointId: id, reason })
          .onConflictDoUpdate({
            target: schema.mediaBlocks.key,
            set: { reason, createdAt: new Date() },
          });
      else {
        await tx
          .delete(schema.mediaBlocks)
          .where(eq(schema.mediaBlocks.key, `radio:${id}`));
        await tx
          .update(schema.radioCuratedStations)
          .set({ enabled: true })
          .where(eq(schema.radioCuratedStations.stationId, id));
        const [curated] = await tx
          .select()
          .from(schema.radioCuratedStations)
          .where(eq(schema.radioCuratedStations.stationId, id));
        if (curated?.streamUrls.length)
          await tx
            .update(schema.radioStreamSources)
            .set({ enabled: true })
            .where(
              and(
                eq(schema.radioStreamSources.stationId, id),
                eq(schema.radioStreamSources.origin, "curated"),
                inArray(
                  schema.radioStreamSources.streamUrl,
                  curated.streamUrls,
                ),
              ),
            );
      }
      await tx.insert(schema.adminAudit).values({
        actorId,
        resource: `radio:${id}`,
        action: blocked ? "media.block" : "media.unblock",
        changes: { reason },
      });
      return { saved: true };
    });
  },
  async recheck(actor, id) {
    await radioAdminAdapter.detail(id);
    return enqueueJob("radio", "recheck", actor, id);
  },
  async metrics() {
    const m = await radioHealthMetrics();
    return {
      catalogUpdatedAt: m.generation?.publishedAt?.toISOString() ?? null,
      worker: m.worker
        ? {
            status: m.worker.status,
            heartbeat: m.worker.heartbeat.toISOString(),
          }
        : null,
      verified: m.queue?.verified ?? 0,
      due: m.queue?.due ?? 0,
      coverage: m.countries,
      outcomes: m.outcomes,
    };
  },
};
