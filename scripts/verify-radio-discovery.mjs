import nextEnv from "@next/env";
import postgres from "postgres";
import { createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.BLOMOON_VERIFY_URL ?? "http://localhost:3000";
const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  const [session] = await db`select s.token from sessions s join users u on u.id=s.user_id
    where s.expires_at > now() and u.email_verified = true order by s.updated_at desc limit 1`;
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  const cookie = session && secret ? encodeURIComponent(`${session.token}.${createHmac("sha256", secret).update(session.token).digest("base64")}`) : null;
  const headers = cookie ? { cookie: `better-auth.session_token=${cookie}` } : {};
  if (process.argv.includes("--browser")) {
    assert(cookie, "An existing verified local session is required for browser verification");
    const result = spawnSync("agent-browser", ["cookies", "set", "better-auth.session_token", cookie, "--url", base], { encoding: "utf8" });
    assert.equal(result.status, 0, "Could not initialize browser session");
    console.log("Browser session initialized; credential not printed.");
  }
  const request = async (path, requestHeaders = headers) => {
    const started = performance.now();
    const response = await fetch(base + path, { headers: requestHeaders });
    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify({ path, status: response.status, error: payload.error }));
    return { payload, response, ms: Math.round(performance.now() - started) };
  };
  for (const query of ["Radio Paradise", "paradse", "germnay jazz", "united king", "bbc", "zzzxqvnotastation"]) {
    const { payload, ms } = await request(`/api/modes/radio/search?q=${encodeURIComponent(query)}`);
    console.log(JSON.stringify({ query, ms, total: payload.total, first: payload.points[0]?.name, notice: payload.source.notice }));
    if (query !== "zzzxqvnotastation") assert(payload.points.length, `No matches for ${query}`);
  }
  const { payload: first, response } = await request("/api/modes/radio/recommendations");
  assert(response.headers.get("cache-control")?.includes("no-store"));
  assert(first.pageToken, "Catalog must be synchronized before verification");
  const { payload: second } = await request(`/api/modes/radio/recommendations?offset=50&pageToken=${first.pageToken}`);
  assert(!second.points.some((point) => first.points.some((other) => other.id === point.id)), "Pagination repeats stations");
  const { payload: repeat } = await request(`/api/modes/radio/recommendations?pageToken=${first.pageToken}`);
  assert.deepEqual(repeat.points, first.points);
  if (cookie) {
    const denied = await fetch(`${base}/api/modes/radio/recommendations?pageToken=${first.pageToken}`);
    assert.equal(denied.status, 409, "Guest could read a personalized snapshot");
  }
  console.log(JSON.stringify({ recommendation: first.recommendation, total: first.total, stablePagination: true, authenticated: Boolean(cookie) }));
  const timings = [];
  for (let i = 0; i < 20; i++) {
    const search = await request("/api/modes/radio/search?q=germnay%20jazz");
    const recommendations = await request("/api/modes/radio/recommendations");
    timings.push({ search: search.ms, recommendations: recommendations.ms });
  }
  const p95 = (key) => timings.map((entry) => entry[key]).sort((a, b) => a - b)[18];
  console.log(JSON.stringify({ warmP95Ms: { search: p95("search"), recommendations: p95("recommendations") } }));
} finally {
  await db.end();
}
