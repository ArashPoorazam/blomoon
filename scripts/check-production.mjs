const DEFAULT_ORIGIN = "https://blomoon.ir";
const DEFAULT_WWW_ORIGIN = "https://www.blomoon.ir";
const DEFAULT_TIMEOUT_MS = 20_000;

const origin = normalizeOrigin(process.env.BLOMOON_ORIGIN ?? DEFAULT_ORIGIN);
const wwwOrigin = resolveWwwOrigin();
const timeoutMs = parsePositiveInteger(process.env.BLOMOON_CHECK_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
const strictPlayback = process.env.BLOMOON_STRICT_PLAYBACK === "1";
const results = [];

console.log(`Blomoon production check`);
console.log(`origin=${origin}`);
console.log(`www_origin=${wwwOrigin ?? "skipped"}`);
console.log(`timestamp=${new Date().toISOString()}`);
console.log("");

await runCheck("health", true, async () => {
  const response = await request("/api/health", { expectJson: true });

  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(response.json?.service === "blomoon", "expected service=blomoon");
  assert(response.json?.status === "ok", "expected status=ok");
  assert(isIsoTimestamp(response.json?.timestamp), "expected ISO timestamp");
  assert(headerIncludes(response.headers, "cache-control", "no-store"), "expected cache-control to include no-store");

  return `status=${response.status}`;
});

await runCheck("http to https redirect", origin.startsWith("https://"), async () => {
  if (!origin.startsWith("https://")) {
    return warn("skipped for non-HTTPS origin");
  }

  const url = new URL(origin);
  url.protocol = "http:";
  url.pathname = "/api/health";
  url.search = "";

  const response = await request(url, { redirect: "manual" });
  const location = response.headers.get("location") ?? "";

  assert(isRedirectStatus(response.status), `expected redirect, got ${response.status}`);
  assert(location.startsWith(`https://${new URL(origin).host}/`), `expected redirect to https://${new URL(origin).host}/`);

  return `status=${response.status}`;
});

await runCheck("www to apex redirect", wwwOrigin !== null, async () => {
  if (wwwOrigin === null) {
    return warn("skipped; set BLOMOON_WWW_ORIGIN to verify a www hostname");
  }

  const path = "/api/health";
  const query = "probe=www-redirect";
  const url = new URL(`${path}?${query}`, wwwOrigin);

  const response = await request(url, { redirect: "manual" });
  const location = response.headers.get("location") ?? "";
  const redirectUrl = new URL(location, origin);

  assert(isRedirectStatus(response.status), `expected redirect, got ${response.status}`);
  assert(location.startsWith(`${origin}/`) || location.startsWith(`${origin}?`), `expected absolute redirect to ${origin}, got ${location}`);
  assert(redirectUrl.origin === origin, `expected redirect to ${origin}, got ${redirectUrl.origin}`);
  assert(redirectUrl.pathname === path, `expected path ${path}, got ${redirectUrl.pathname}`);
  assert(redirectUrl.searchParams.get("probe") === "www-redirect", "expected query string to be preserved");

  return `status=${response.status} location=${redirectUrl.toString()}`;
});

await runCheck("login page", true, async () => {
  const response = await request("/login", { expectText: true });

  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(typeof response.text === "string" && response.text.length > 0, "expected non-empty HTML response");

  return `status=${response.status}`;
});

await runCheck("protected home redirect", true, async () => {
  const response = await request("/", { redirect: "manual" });
  const location = response.headers.get("location") ?? "";
  const redirectUrl = new URL(location, origin);

  assert(isRedirectStatus(response.status), `expected redirect, got ${response.status}`);
  assert(redirectUrl.pathname === "/login", `expected redirect to /login, got ${redirectUrl.pathname}`);
  assert(redirectUrl.searchParams.get("next") === "/", "expected next=/");

  return `status=${response.status}`;
});

await runCheck("logged-out viewer guard", true, async () => {
  const response = await request("/api/users/me", { expectJson: true });

  assert(response.status === 401, `expected 401, got ${response.status}`);

  return `status=${response.status}`;
});

const radioPoints = await runCheck("radio points", true, async () => {
  const response = await request("/api/modes/radio/points", { expectJson: true });

  assert(response.status === 200, `expected 200, got ${response.status}`);
  validateDataset(response.json, { requirePoints: true });

  return {
    detail: `points=${response.json.points.length}${response.json.source?.isFallback ? " source=fallback" : ""}`,
    value: response.json
  };
});

const radioSearch = await runCheck("radio search", true, async () => {
  const response = await request("/api/modes/radio/search?limit=5&offset=0", { expectJson: true });

  assert(response.status === 200, `expected 200, got ${response.status}`);
  validateDataset(response.json, { requirePoints: true });
  assert(Number.isInteger(response.json.limit), "expected integer limit");
  assert(Number.isInteger(response.json.offset), "expected integer offset");
  assert(Number.isInteger(response.json.total), "expected integer total");
  assert(response.json.nextOffset === null || Number.isInteger(response.json.nextOffset), "expected nextOffset to be null or integer");

  return {
    detail: `points=${response.json.points.length} total=${response.json.total}`,
    value: response.json
  };
});

const randomPointResult = await runCheck("random radio point", true, async () => {
  const response = await request("/api/modes/radio/points/random", { expectJson: true });

  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(response.json?.modeId === "radio", "expected modeId=radio");
  validatePoint(response.json?.point);
  validateSource(response.json?.source);

  return {
    detail: `point=${response.json.point.name}`,
    value: response.json
  };
});

const detailResult = await runCheck("random point detail", true, async () => {
  const point = randomPointResult?.point;
  assert(point?.id, "random point unavailable");

  const response = await request(`/api/modes/radio/points/${encodeURIComponent(point.id)}`, { expectJson: true });

  assert(response.status === 200, `expected 200, got ${response.status}`);
  validatePoint(response.json);
  assert(response.json.id === point.id, "detail id did not match random point id");
  assert(Array.isArray(response.json.fields), "expected fields array");

  return {
    detail: `point=${response.json.name} fields=${response.json.fields.length}`,
    value: response.json
  };
});

await runCheck("radio playable resolution", strictPlayback, async () => {
  const candidates = uniquePoints([
    detailResult,
    randomPointResult?.point,
    ...(radioSearch?.points ?? []),
    ...(radioPoints?.points ?? [])
  ]).slice(0, 3);

  assert(candidates.length > 0, "no point candidates available");

  const failures = [];

  for (const point of candidates) {
    const response = await request(`/api/modes/radio/points/${encodeURIComponent(point.id)}/playable`, {
      expectJson: true,
      method: "POST"
    });

    if (response.status === 200) {
      validatePlayable(response.json, point.id);
      return `point=${point.name} status=${response.status}`;
    }

    failures.push(`${point.name}:${response.status}`);
  }

  throw new Error(`no playable candidate resolved (${failures.join(", ")})`);
});

console.log("");

const failed = results.filter((result) => result.status === "FAIL");
const warned = results.filter((result) => result.status === "WARN");

if (failed.length > 0) {
  console.log(`Result: FAIL (${failed.length} failed, ${warned.length} warned)`);
  process.exit(1);
}

console.log(warned.length > 0
  ? `Result: PASS with warnings (${warned.length} warned)`
  : "Result: PASS");

function normalizeOrigin(value) {
  const url = new URL(value);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function resolveWwwOrigin() {
  if (process.env.BLOMOON_WWW_ORIGIN) {
    return normalizeOrigin(process.env.BLOMOON_WWW_ORIGIN);
  }

  return origin === DEFAULT_ORIGIN ? DEFAULT_WWW_ORIGIN : null;
}

async function runCheck(name, critical, check) {
  const startedAt = performance.now();

  try {
    const result = await check();
    const durationMs = elapsedMs(startedAt);

    if (isWarning(result)) {
      results.push({ name, status: "WARN" });
      console.log(`WARN ${name} ${durationMs}ms ${result.message}`);
      return null;
    }

    const detail = typeof result === "string" ? result : result?.detail;
    const value = typeof result === "object" && result !== null && "value" in result ? result.value : null;
    results.push({ name, status: "PASS" });
    console.log(`PASS ${name} ${durationMs}ms${detail ? ` ${detail}` : ""}`);
    return value;
  } catch (error) {
    const durationMs = elapsedMs(startedAt);
    const status = critical ? "FAIL" : "WARN";
    results.push({ name, status });
    console.log(`${status} ${name} ${durationMs}ms ${formatError(error)}`);
    return null;
  }
}

function warn(message) {
  return { kind: "warning", message };
}

function isWarning(value) {
  return Boolean(value && typeof value === "object" && value.kind === "warning");
}

async function request(pathOrUrl, options = {}) {
  const {
    expectJson = false,
    expectText = false,
    method = "GET",
    redirect = "follow"
  } = options;
  const url = pathOrUrl instanceof URL ? pathOrUrl : new URL(pathOrUrl, origin);
  const startedAt = performance.now();
  const response = await fetch(url, {
    headers: {
      accept: expectText ? "text/html,*/*" : "application/json,*/*"
    },
    method,
    redirect,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const result = {
    durationMs: elapsedMs(startedAt),
    headers: response.headers,
    status: response.status,
    url: response.url
  };

  if (expectJson) {
    result.json = await readJson(response);
  }

  if (expectText) {
    result.text = await response.text();
  }

  return result;
}

async function readJson(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`expected JSON from ${response.url || "response"}, got ${text.slice(0, 120)}`);
  }
}

function validateDataset(value, { requirePoints }) {
  assert(value?.modeId === "radio", "expected modeId=radio");
  validateSource(value?.source);
  assert(Array.isArray(value?.points), "expected points array");

  if (requirePoints) {
    assert(value.points.length > 0, "expected at least one point");
  }

  for (const point of value.points.slice(0, 10)) {
    validatePoint(point);
  }
}

function validateSource(value) {
  assert(value && typeof value === "object", "expected source object");
  assert(isNonEmptyString(value.name), "expected source.name");
  assert(isHttpUrl(value.url), "expected source.url to be http(s)");
  assert(isNonEmptyString(value.attribution), "expected source.attribution");
  assert(isIsoTimestamp(value.lastUpdated), "expected source.lastUpdated ISO timestamp");
}

function validatePoint(value) {
  assert(value && typeof value === "object", "expected point object");
  assert(isNonEmptyString(value.id), "expected point.id");
  assert(value.modeId === "radio", "expected point.modeId=radio");
  assert(isNonEmptyString(value.name), "expected point.name");
  assert(isValidLatitude(value.latitude), "expected valid latitude");
  assert(isValidLongitude(value.longitude), "expected valid longitude");
  assert(isNonEmptyString(value.summary), "expected point.summary");
}

function validatePlayable(value, pointId) {
  assert(value?.mediaKind === "audio", "expected mediaKind=audio");
  assert(value?.pointId === pointId, "expected matching pointId");
  assert(isIsoTimestamp(value?.checkedAt), "expected checkedAt ISO timestamp");
  assert(isHttpUrl(value?.streamUrl), "expected streamUrl to be http(s)");
}

function uniquePoints(values) {
  const points = [];
  const seen = new Set();

  for (const value of values) {
    if (!value || seen.has(value.id)) {
      continue;
    }

    seen.add(value.id);
    points.push(value);
  }

  return points;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidLatitude(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isIsoTimestamp(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isHttpUrl(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRedirectStatus(status) {
  return status >= 300 && status < 400;
}

function headerIncludes(headers, name, expectedValue) {
  return (headers.get(name) ?? "").toLowerCase().includes(expectedValue.toLowerCase());
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function elapsedMs(startedAt) {
  return Math.round(performance.now() - startedAt);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
