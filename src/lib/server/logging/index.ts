import "server-only";

import { appendFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createLogRecord,
  defaultFilePolicy,
  getLogFileName,
  getRolledLogFileName,
  isExpiredLogFile,
  normalizeLogLevel,
  sanitizeError,
  serializeLogRecord,
  shouldWriteLevel,
  resolveLogDirectory,
  type LogContext,
  type LogLevel,
  type LogRecord
} from "./core";

type LogInput = {
  context?: LogContext;
  durationMs?: number;
  error?: unknown;
  message: string;
  requestId?: string;
};

const filePolicy = defaultFilePolicy();
const minimumLevel = normalizeLogLevel(process.env.BLOMOON_LOG_LEVEL);
let writeChain = Promise.resolve();
let retentionDate: string | null = null;

export const logger = {
  debug(event: string, input: LogInput) {
    writeLog("debug", event, input);
  },
  info(event: string, input: LogInput) {
    writeLog("info", event, input);
  },
  warn(event: string, input: LogInput) {
    writeLog("warn", event, input);
  },
  error(event: string, input: LogInput) {
    writeLog("error", event, input);
  },
  async measure<T>(
    event: string,
    context: LogContext,
    operation: () => Promise<T>,
    options: { failureLevel?: Extract<LogLevel, "warn" | "error">; message?: string } = {}
  ): Promise<T> {
    const startedAt = performance.now();

    try {
      const result = await operation();
      writeLog("info", event, {
        context: {
          ...context,
          ok: true
        },
        durationMs: elapsedMs(startedAt),
        message: options.message ?? `${event} completed`
      });
      return result;
    } catch (error) {
      writeLog(options.failureLevel ?? "error", event, {
        context: {
          ...context,
          ok: false
        },
        durationMs: elapsedMs(startedAt),
        error,
        message: `${event} failed`
      });
      throw error;
    }
  }
};

export function flushLogsForTest() {
  return writeChain;
}

function writeLog(level: LogLevel, event: string, input: LogInput) {
  if (!shouldWriteLevel(level, minimumLevel)) {
    return;
  }

  const record = createLogRecord({
    context: {
      ...input.context,
      ...(input.error ? { error: sanitizeError(input.error) } : {})
    },
    durationMs: input.durationMs,
    event,
    level,
    message: input.message,
    requestId: input.requestId
  });

  mirrorToConsole(record);

  writeChain = writeChain
    .then(() => writeRecord(record))
    .catch((error) => {
      mirrorToConsole(createLogRecord({
        context: { error: sanitizeError(error) },
        event: "logging.write_failed",
        level: "error",
        message: "Failed to write application log"
      }));
    });
}

async function writeRecord(record: LogRecord) {
  const logDirectory = resolveLogDirectory(os.homedir());

  await mkdir(logDirectory, {
    mode: 0o700,
    recursive: true
  });
  await pruneExpiredLogs(logDirectory, new Date(record.timestamp));
  await appendFile(await resolveWritableLogFile(logDirectory, new Date(record.timestamp)), serializeLogRecord(record), {
    mode: 0o600
  });
}

async function resolveWritableLogFile(logDirectory: string, timestamp: Date) {
  const basePath = path.join(logDirectory, getLogFileName(timestamp));

  if (await canAppendToFile(basePath)) {
    return basePath;
  }

  for (let index = 1; index < 1_000; index += 1) {
    const candidatePath = path.join(logDirectory, getRolledLogFileName(timestamp, index));

    if (await canAppendToFile(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error("No writable Blomoon log file slot is available.");
}

async function canAppendToFile(filePath: string) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.size < filePolicy.maxBytes;
  } catch (error) {
    if (isMissingFileError(error)) {
      return true;
    }

    try {
      await access(filePath, constants.W_OK);
      return false;
    } catch {
      throw error;
    }
  }
}

async function pruneExpiredLogs(logDirectory: string, now: Date) {
  const today = now.toISOString().slice(0, 10);

  if (retentionDate === today) {
    return;
  }

  retentionDate = today;

  const fileNames = await readdir(logDirectory);
  await Promise.all(fileNames
    .filter((fileName) => isExpiredLogFile(fileName, now, filePolicy.retentionDays))
    .map((fileName) => unlink(path.join(logDirectory, fileName)).catch(() => undefined)));
}

function mirrorToConsole(record: LogRecord) {
  if (record.level === "debug" || (record.level === "info" && process.env.NODE_ENV === "production")) {
    return;
  }

  const line = serializeLogRecord(record).trimEnd();

  if (record.level === "error") {
    console.error(line);
    return;
  }

  if (record.level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

function elapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function isMissingFileError(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}
