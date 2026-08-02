import "server-only";

import * as Sentry from "@sentry/nextjs";

type LogContext = Record<string, string | number | boolean | null | undefined>;

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return { error: String(error) };
  return {
    errorName: error.name,
    errorMessage: error.message,
    ...(process.env.NODE_ENV === "production" ? {} : { errorStack: error.stack }),
  };
}

function write(
  level: "info" | "warn" | "error",
  event: string,
  context: LogContext,
  error?: unknown,
) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
    ...(error === undefined ? {} : serializeError(error)),
  });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);
}

export function logInfo(event: string, context: LogContext = {}) {
  write("info", event, context);
}

export function logWarning(event: string, context: LogContext = {}) {
  write("warn", event, context);
}

export function logError(
  event: string,
  error: unknown,
  context: LogContext = {},
) {
  write("error", event, context, error);
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    Sentry.captureException(error, { tags: { event } });
  }
}
