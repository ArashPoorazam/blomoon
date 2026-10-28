import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRadioRecommendations } from "./recommendations";

const state = vi.hoisted(() => ({
  inTransaction: false,
  snapshot: {
    id: "snapshot", points: [{ id: "station", modeId: "radio" }],
    source: { name: "Test" }, personalized: false
  },
  existing: true,
  ranked: vi.fn(),
  hydrate: vi.fn()
}));
vi.mock("./directory", () => ({
  activeRadioDirectory: async () => ({ id: "generation", publishedAt: new Date() }),
  directorySource: async () => ({ name: "Test" })
}));
vi.mock("@/lib/persistence/favouriteFolders", () => ({ listFavouritePoints: vi.fn() }));
vi.mock("@/lib/playback-history/repository", () => ({ listPlaybackHistory: vi.fn() }));
vi.mock("./recommendationRanking", () => ({ rankRadioRecommendations: state.ranked }));
vi.mock("./health/query", () => ({
  discoveryEligibility: vi.fn(),
  eligibleSnapshotPoints: state.hydrate
}));
vi.mock("@/db", async () => {
  const schema = await import("@/db/schema");
  const query = (rows: unknown[]) => ({
    from: () => ({ where: () => Object.assign(Promise.resolve(rows), {
      limit: async () => rows, orderBy: async () => rows
    }) })
  });
  return {
    schema,
    getDb: () => ({
      select: () => {
        if (state.inTransaction) throw new Error("Page hydration acquired a connection before releasing its transaction");
        return query([{ total: 10 }]);
      },
      transaction: async (work: (tx: unknown) => Promise<unknown>) => {
        state.inTransaction = true;
        let selects = 0;
        try {
          return await work({
            execute: async () => {},
            select: () => query(++selects === 1 && state.existing ? [state.snapshot] : []),
            insert: () => ({ values: () => ({ returning: async () => [state.snapshot] }) })
          });
        } finally {
          state.inTransaction = false;
        }
      }
    })
  };
});

beforeEach(() => {
  state.existing = true;
  state.ranked.mockReset().mockReturnValue({ points: state.snapshot.points, personalized: false });
  state.hydrate.mockReset().mockImplementation(async (points) => {
    expect(state.inTransaction).toBe(false);
    return points;
  });
});

describe("recommendation connection lifetime", () => {
  it.each([true, false])("releases the transaction before hydrating a page (cached: %s)", async (cached) => {
    state.existing = cached;
    const page = await getRadioRecommendations(null, 50, 0);
    expect(page).toMatchObject({ pageToken: "snapshot", catalogTotal: 10, total: 1, nextOffset: null });
    expect(state.hydrate).toHaveBeenCalledOnce();
    expect(state.ranked).toHaveBeenCalledTimes(cached ? 0 : 1);
  });
});
