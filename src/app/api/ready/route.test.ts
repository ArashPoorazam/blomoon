import { beforeEach, describe, expect, it, vi } from "vitest";
const { query, end } = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));
vi.mock("postgres", () => ({ default: () => Object.assign(query, { end }) }));
import { GET } from "./route";
describe("database readiness", () => {
  beforeEach(() => { vi.stubEnv("DATABASE_URL", "postgres://test"); query.mockReset(); end.mockReset(); });
  it("returns uncached success after a database query", async () => {
    query.mockResolvedValue([]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(end).toHaveBeenCalled();
  });
  it("returns a generic 503 on a database failure", async () => {
    query.mockRejectedValue(new Error("private connection details"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect(end).toHaveBeenCalled();
  });
});
