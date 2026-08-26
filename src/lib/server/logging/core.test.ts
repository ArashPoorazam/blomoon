import { describe, expect, it } from "vitest";
import {
  createLogRecord,
  getLogFileName,
  getRolledLogFileName,
  isExpiredLogFile,
  normalizeRequestId,
  resolveLogDirectory,
  sanitizeLogContext,
  serializeLogRecord,
  shouldWriteLevel
} from "./core";

describe("logging core", () => {
  it("serializes structured JSONL records", () => {
    const record = createLogRecord({
      context: { pathname: "/api/modes/radio/points" },
      event: "api.request.complete",
      level: "info",
      message: "API request completed",
      requestId: "request-123",
      timestamp: "2026-08-26T12:00:00.000Z"
    });

    expect(JSON.parse(serializeLogRecord(record))).toMatchObject({
      app: "blomoon",
      context: { pathname: "/api/modes/radio/points" },
      event: "api.request.complete",
      level: "info",
      message: "API request completed",
      requestId: "request-123",
      timestamp: "2026-08-26T12:00:00.000Z"
    });
    expect(serializeLogRecord(record).endsWith("\n")).toBe(true);
  });

  it("redacts sensitive context fields and sensitive URL parameters", () => {
    expect(sanitizeLogContext({
      authorization: "Bearer secret",
      nested: {
        password: "secret",
        providerUrl: "https://example.com/listen?token=abc&station=123"
      },
      okUrl: "https://example.com/search?q=radio"
    })).toEqual({
      authorization: "[redacted]",
      nested: {
        password: "[redacted]",
        providerUrl: "https://example.com/listen?token=%5Bredacted%5D&station=123"
      },
      okUrl: "https://example.com/search?q=radio"
    });
  });

  it("redacts database parameter text from serialized errors", () => {
    const record = createLogRecord({
      context: {
        error: new Error("Failed query\nparams: user-secret")
      },
      event: "db.error",
      level: "error",
      message: "Database failed",
      timestamp: "2026-08-26T12:00:00.000Z"
    });

    const serialized = serializeLogRecord(record);

    expect(serialized).toContain("params: [redacted]");
    expect(serialized).not.toContain("user-secret");
  });

  it("resolves the default Blomoon log directory", () => {
    expect(resolveLogDirectory("/home/example")).toBe("/home/example/.local/share/blomoon/log");
  });

  it("uses daily JSONL file names and numeric rollover names", () => {
    const date = new Date("2026-08-26T12:00:00.000Z");

    expect(getLogFileName(date)).toBe("blomoon-2026-08-26.jsonl");
    expect(getRolledLogFileName(date, 3)).toBe("blomoon-2026-08-26.3.jsonl");
  });

  it("detects expired Blomoon log files only", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");

    expect(isExpiredLogFile("blomoon-2026-08-01.jsonl", now, 14)).toBe(true);
    expect(isExpiredLogFile("blomoon-2026-08-20.1.jsonl", now, 14)).toBe(false);
    expect(isExpiredLogFile("other-2026-08-01.jsonl", now, 14)).toBe(false);
  });

  it("filters by minimum log level", () => {
    expect(shouldWriteLevel("debug", "info")).toBe(false);
    expect(shouldWriteLevel("warn", "info")).toBe(true);
    expect(shouldWriteLevel("error", "warn")).toBe(true);
  });

  it("keeps valid request ids and replaces unsafe request ids", () => {
    expect(normalizeRequestId(" incoming-request:123 ", "fallback")).toBe("incoming-request:123");
    expect(normalizeRequestId("bad header", "fallback")).toBe("fallback");
    expect(normalizeRequestId(null, "fallback")).toBe("fallback");
  });
});
