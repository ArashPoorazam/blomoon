import "server-only";

import { and, asc, desc, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { GLOBE_COUNTRY_POINT_GUARANTEE, GLOBE_DISPLAY_BUDGET, limitGlobePoints } from "../displayBudget";
import type { TerraDataset } from "../types";
import { radioDirectoryContext } from "./directory";
import { discoveryEligibility } from "./health/query";

/** Country coverage must be selected before a global popularity cap is applied. */
export async function getRadioDataset(): Promise<TerraDataset> {
  const { source, enforceHealth } = await radioDirectoryContext();
  const entries = schema.radioDirectory;
  const ordering = sql`${entries.votes} desc, ${entries.clicks} desc, ${entries.nameText} asc, ${entries.stationId} asc`;
  const latitude = sql`${entries.record}->'point'->'latitude'`;
  const longitude = sql`${entries.record}->'point'->'longitude'`;

  const points = await getDb().transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = '3000ms'`);
    const ranked = tx.$with("ranked_globe_stations").as(tx.select({
      votes: entries.votes,
      clicks: entries.clicks,
      name: entries.nameText,
      id: entries.stationId,
      countryCode: entries.countryCode,
      countryRank: sql<number>`row_number() over (partition by ${entries.countryCode} order by ${ordering})`.as("country_rank"),
      globalRank: sql<number>`row_number() over (order by ${ordering})`.as("global_rank"),
    }).from(entries).where(and(
      discoveryEligibility(entries.stationId),
      sql`jsonb_typeof(${latitude}) = 'number' and ${latitude} between '-90'::jsonb and '90'::jsonb`,
      sql`jsonb_typeof(${longitude}) = 'number' and ${longitude} between '-180'::jsonb and '180'::jsonb`,
    )));
    // Rank IDs only; fetching records in a second bounded query avoids sorting
    // provider JSON or a poorly estimated join back through the directory view.
    const selected = await tx.with(ranked).select({ id: ranked.id }).from(ranked)
      .where(sql`${ranked.globalRank} <= ${GLOBE_DISPLAY_BUDGET}
        or (${ranked.countryCode} <> '' and ${ranked.countryRank} <= ${GLOBE_COUNTRY_POINT_GUARANTEE})`)
      .orderBy(desc(ranked.votes), desc(ranked.clicks), asc(ranked.name), asc(ranked.id));
    if (!selected.length) return [];
    const rows = await tx.select({ id: entries.stationId, record: entries.record }).from(entries)
      .where(inArray(entries.stationId, selected.map(({ id }) => id)));
    const byId = new Map(rows.map(({ id, record }) => [id, record.point]));
    return selected.map(({ id }) => {
      const point = byId.get(id);
      if (!point) throw new Error("Selected globe station disappeared during catalog read");
      return point;
    });
  }, { isolationLevel: "repeatable read", accessMode: "read only" });

  if (!points.length && enforceHealth && !source.notice)
    source.notice = "No recently verified stations yet. Stations appear as checks complete.";
  return {
    modeId: "radio",
    source,
    points: limitGlobePoints({ points, budget: GLOBE_DISPLAY_BUDGET,
      countryPointGuarantee: GLOBE_COUNTRY_POINT_GUARANTEE,
      selectedPoint: null, activePlaybackPoint: null }),
  };
}
