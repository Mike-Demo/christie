/**
 * Allowlist-only logging.
 *
 * Submitted text, fragments of it, suggestions, messages derived from it,
 * request headers, tokens and IP addresses must never reach a log line. This
 * helper is the single logging entry point for the grammar paths: it accepts a
 * fixed set of scalar fields and silently drops everything else, so an
 * accidental `logEvent({ text })` cannot leak a document.
 */

import type { GrammarErrorCode } from "./contract";

export interface LoggableEvent {
  event: string;
  user_id?: string | null;
  operation?: string;
  character_count?: number;
  issue_count?: number;
  success?: boolean;
  latency_ms?: number;
  error_code?: GrammarErrorCode | null;
}

const ALLOWED_KEYS = [
  "event",
  "user_id",
  "operation",
  "character_count",
  "issue_count",
  "success",
  "latency_ms",
  "error_code",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

type LogSink = (line: string) => void;

let sink: LogSink = (line) => {
  // eslint-disable-next-line no-console -- the single sanctioned log sink
  console.info(line);
};

/** Redirects log output. Used by the privacy tests to capture emitted lines. */
export function setLogSink(next: LogSink | null): void {
  sink =
    next ??
    ((line) => {
      // eslint-disable-next-line no-console -- the single sanctioned log sink
      console.info(line);
    });
}

function scalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, 64);
  return undefined;
}

export function logEvent(event: LoggableEvent): void {
  const safe: Record<string, string | number | boolean | null> = {};

  for (const key of ALLOWED_KEYS) {
    const value = scalar((event as Record<AllowedKey, unknown>)[key]);
    if (value !== undefined) safe[key] = value;
  }

  sink(JSON.stringify(safe));
}
