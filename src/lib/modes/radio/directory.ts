import "server-only";
import { getModeSettings } from "@/lib/admin/settings";
import { discoveryEligibility } from "./health/query";
import { healthFilteringEnabled } from "./health/policy";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { editDistance, normalizeSearchText, searchTerms } from "@/lib/search/text";
import { logger } from "@/lib/server/logging";
import type { TerraPointPage } from "../types";
import type { RadioSortOption } from "./api";
import { createRadioLiveSource } from "./source";

const entries = schema.radioDirectory;

export async function activeRadioDirectory() {
  if (!isDatabaseConfigured()) return null;
  try {
    const [generation] = await getDb()
      .select()
      .from(schema.radioCatalogGenerations)
      .where(eq(schema.radioCatalogGenerations.active, true))
      .limit(1);
    return generation?.publishedAt ? generation : null;
  } catch (error) {
    logger.warn("radio.directory.unavailable", { error, message: "Radio catalog metadata unavailable" });
    return null;
  }
}

export async function directorySource(publishedAt: Date | null | undefined) {
  const [curated] = await getDb()
    .select({ updatedAt: sql<Date | null>`max(${schema.radioCuratedStations.updatedAt})` })
    .from(schema.radioCuratedStations);
  const updatedAt = Math.max(
    publishedAt?.getTime() ?? 0,
    curated.updatedAt ? new Date(curated.updatedAt).getTime() : 0,
  );
  return {
    ...createRadioLiveSource(),
    name: "Blomoon radio catalog",
    attribution: "Radio Browser community data and Blomoon curated stations.",
    lastUpdated: new Date(updatedAt).toISOString(),
  };
}

export async function searchRadioDirectory({
  countryCode,
  query,
  sort,
  limit,
  offset,
}: {
  countryCode: string | null;
  query: string;
  sort: RadioSortOption;
  limit: number;
  offset: number;
}): Promise<TerraPointPage> {
  const generation = await activeRadioDirectory();
  const modeSettings = await getModeSettings("radio");
  const enforceHealth = (modeSettings.policy ?? (healthFilteringEnabled() ? "enforce" : "observe")) === "enforce";
  const source = await directorySource(generation?.publishedAt);
  const updatedAt = new Date(source.lastUpdated).getTime();
  if (!generation && !updatedAt)
    source.notice = "The station catalog is warming up. Verified stations appear as checks complete.";
  else if (!enforceHealth)
    source.notice = "Availability checks are in observation mode; stations may be unverified.";
  else if (generation?.publishedAt && Date.now() - generation.publishedAt.getTime() > 12 * 60 * 60 * 1000)
    source.notice = "Catalog refresh is delayed. Showing recently verified stations.";
  const normalized = normalizeSearchText(query);
  const terms = searchTerms(query);
  const score = sql`(case when ${entries.nameText} = ${normalized} then 1000000
    when ${entries.nameText} like ${`${normalized}%`} then 100000
    when ${entries.nameText} like ${`%${normalized}%`} then 10000
    when ${entries.countryText} like ${`%${normalized}%`} then 3000
    when ${entries.languageText} like ${`%${normalized}%`} then 2000
    when ${entries.tagText} like ${`%${normalized}%`} then 1000 else 0 end)
    + ${
      terms.length
        ? sql.join(
            terms.map(
              (term) => sql`greatest(
      4 * word_similarity(${term}, ${entries.nameText}),
      3 * word_similarity(${term}, ${entries.countryText}),
      2 * word_similarity(${term}, ${entries.languageText}),
      word_similarity(${term}, ${entries.tagText}))`,
            ),
            sql` + `,
          )
        : sql`0`
    }`;
  const ordering =
    sort === "relevance" && normalized
      ? [desc(score), desc(entries.votes), desc(entries.clicks), asc(entries.stationId)]
      : [
          sort === "votes_asc" ? asc(entries.votes) : desc(entries.votes),
          sort === "votes_asc" ? asc(entries.clicks) : desc(entries.clicks),
          asc(entries.nameText),
          asc(entries.stationId),
        ];
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`set local pg_trgm.similarity_threshold = 0.1`);
    await tx.execute(sql`set local statement_timeout = '3000ms'`);
    // Trigrams retrieve vocabulary candidates; edit distance rejects accidental
    // matches such as "notastation" matching every occurrence of "station".
    const predicates = await Promise.all(
      terms.map(async (term) => {
        const document = sql`to_tsvector('simple', ${entries.searchText})`;
        if (term.length < 4) return sql`${document} @@ to_tsquery('simple', ${`${term}:*`})`;
        const distance = term.length >= 6 ? 2 : 1;
        const vocab = schema.radioCatalogTerms;
        const candidates = await tx
          .select({ term: vocab.term })
          .from(vocab)
          .where(
            and(
              generation ? eq(vocab.generationId, generation.id) : undefined,
              sql`${vocab.term} % ${term}`,
              sql`abs(length(${vocab.term}) - ${term.length}) <= ${distance}`,
            ),
          )
          .orderBy(desc(sql`similarity(${vocab.term}, ${term})`), asc(vocab.term))
          .limit(1000);
        const alternatives = candidates
          .filter((candidate) => editDistance(term, candidate.term) <= distance)
          .map((candidate) => candidate.term);
        return alternatives.length
          ? sql`(${entries.searchText} like ${`%${term}%`} or ${document} @@ to_tsquery('simple', ${alternatives.join(" | ")}))`
          : sql`${entries.searchText} like ${`%${term}%`}`;
      }),
    );
    const where = and(
      discoveryEligibility(entries.stationId),
      countryCode ? eq(entries.countryCode, countryCode) : undefined,
      ...predicates,
    );
    const rows = await tx
      .select({ record: entries.record })
      .from(entries)
      .where(where)
      .orderBy(...ordering)
      .limit(limit)
      .offset(offset);
    const [count] = await tx
      .select({ total: sql<number>`count(*)::integer` })
      .from(entries)
      .where(where);
    if (enforceHealth) {
      const [worker] = await tx.select().from(schema.radioHealthWorker).limit(1);
      if (!worker || Date.now() - worker.heartbeat.getTime() > 5 * 60_000 || worker.status !== "running")
        source.notice =
          "Station checks are delayed. Only stations verified within the last 24 hours are shown.";
      else if (!count.total && !normalized && !countryCode)
        source.notice = "No recently verified stations yet. Stations appear as checks complete.";
    }
    return {
      modeId: "radio",
      points: rows.map(({ record }) => record.point),
      source,
      limit,
      offset,
      total: count.total,
      totalKind: "exact",
      nextOffset: offset + limit < count.total ? offset + limit : null,
    };
  });
}
