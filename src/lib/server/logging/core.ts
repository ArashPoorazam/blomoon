export const APP_LOG_NAME = "blomoon";
export const DEFAULT_LOG_MAX_BYTES = 20 * 1024 * 1024;
export const DEFAULT_LOG_RETENTION_DAYS = 14;

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LogRecord = {
  app: typeof APP_LOG_NAME;
  context?: LogContext;
  durationMs?: number;
  event: string;
  level: LogLevel;
  message: string;
  pid: number;
  requestId?: string;
  runtimeEnv: string;
  timestamp: string;
};

export type LogFilePolicy = {
  maxBytes: number;
  retentionDays: number;
};

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const sensitiveKeyPattern = /(^|_|-)(authorization|cookie|database_url|password|secret|set-cookie|token|api[-_]?key|client[-_]?secret|stream[-_]?url)($|_|-)/i;
const sensitiveSearchParamPattern = /(authorization|password|secret|token|api[-_]?key|client[-_]?secret|signature|sig|key)/i;

export function createLogRecord({
  context,
  durationMs,
  event,
  level,
  message,
  requestId,
  timestamp = new Date().toISOString()
}: {
  context?: LogContext;
  durationMs?: number;
  event: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  timestamp?: string;
}): LogRecord {
  return stripUndefined({
    app: APP_LOG_NAME,
    context: context ? sanitizeLogContext(context) : undefined,
    durationMs,
    event,
    level,
    message,
    pid: process.pid,
    requestId,
    runtimeEnv: process.env.NODE_ENV ?? "development",
    timestamp
  });
}

export function serializeLogRecord(record: LogRecord) {
  return `${JSON.stringify(record)}\n`;
}

export function resolveLogDirectory(homeDirectory: string) {
  return `${trimTrailingSlash(homeDirectory)}/.local/share/${APP_LOG_NAME}/log`;
}

export function getLogFileName(timestamp = new Date()) {
  return `${APP_LOG_NAME}-${timestamp.toISOString().slice(0, 10)}.jsonl`;
}

export function getRolledLogFileName(timestamp: Date, index: number) {
  return `${APP_LOG_NAME}-${timestamp.toISOString().slice(0, 10)}.${index}.jsonl`;
}

export function shouldWriteLevel(level: LogLevel, minimumLevel: LogLevel) {
  return levelRank[level] >= levelRank[minimumLevel];
}

export function normalizeLogLevel(value: string | undefined): LogLevel {
  return value === "debug" || value === "info" || value === "warn" || value === "error"
    ? value
    : "info";
}

export function normalizeRequestId(value: string | null, fallback: string) {
  const requestId = value?.trim();
  return requestId && /^[a-z0-9._:-]{6,128}$/i.test(requestId) ? requestId : fallback;
}

export function defaultFilePolicy(): LogFilePolicy {
  return {
    maxBytes: DEFAULT_LOG_MAX_BYTES,
    retentionDays: DEFAULT_LOG_RETENTION_DAYS
  };
}

export function isExpiredLogFile(fileName: string, now: Date, retentionDays: number) {
  const match = new RegExp(`^${APP_LOG_NAME}-(\\d{4}-\\d{2}-\\d{2})(?:\\.\\d+)?\\.jsonl$`).exec(fileName);

  if (!match) {
    return false;
  }

  const createdAt = new Date(`${match[1]}T00:00:00.000Z`);

  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return createdAt.getTime() < cutoff;
}

export function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return stripUndefined({
      name: error.name,
      message: sanitizeErrorText(error.message),
      stack: error.stack ? sanitizeErrorText(error.stack) : undefined
    });
  }

  return sanitizeValue(error);
}

export function sanitizeLogContext(context: LogContext): LogContext {
  return sanitizeValue(context) as LogContext;
}

function sanitizeValue(value: unknown, key = "", depth = 0): unknown {
  if (key && sensitiveKeyPattern.test(key)) {
    return "[redacted]";
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (value instanceof URL) {
    return sanitizeUrl(value.toString());
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "undefined" || typeof value === "symbol" || typeof value === "function") {
    return undefined;
  }

  if (depth >= 6) {
    return "[max-depth]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, "", depth + 1));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 100)
      .map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey, depth + 1)] as const)
      .filter(([, entryValue]) => typeof entryValue !== "undefined");

    return Object.fromEntries(entries);
  }

  return String(value);
}

function sanitizeString(value: string) {
  const trimmed = value.length > 2_000 ? `${value.slice(0, 2_000)}...[truncated]` : value;

  try {
    return sanitizeUrl(trimmed);
  } catch {
    return trimmed;
  }
}

function sanitizeErrorText(value: string) {
  return sanitizeString(value.replace(/^params:\s*.*$/gim, "params: [redacted]"));
}

function sanitizeUrl(value: string) {
  const url = new URL(value);

  for (const key of [...url.searchParams.keys()]) {
    if (sensitiveSearchParamPattern.test(key)) {
      url.searchParams.set(key, "[redacted]");
    }
  }

  if (url.username) {
    url.username = "[redacted]";
  }

  if (url.password) {
    url.password = "[redacted]";
  }

  return url.toString();
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => typeof entryValue !== "undefined")
  ) as T;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
