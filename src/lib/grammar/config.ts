/**
 * Operational limits. Every value is configuration-driven, never hardcoded in
 * request-handling logic. Read lazily inside handlers: the serverless runtime
 * injects environment variables per request, not at module evaluation.
 */

export interface GrammarLimits {
  /** Maximum characters accepted in one check request. */
  maxCharsPerRequest: number;
  /** Maximum checks a single authenticated user may run per rolling UTC hour. */
  checksPerHour: number;
  /** Hard ceiling for a single check, in milliseconds. */
  requestTimeoutMs: number;
}

export const DEFAULT_LIMITS: GrammarLimits = {
  maxCharsPerRequest: 10_000,
  checksPerHour: 60,
  requestTimeoutMs: 10_000,
};

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

export function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  const value = runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
  return value?.trim() || undefined;
}

function positiveInt(name: string, fallback: number): number {
  const raw = runtimeEnv(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Resolve limits from the environment. Call inside a handler, not at module scope. */
export function readLimits(): GrammarLimits {
  return {
    maxCharsPerRequest: positiveInt("MAX_CHARS_PER_REQUEST", DEFAULT_LIMITS.maxCharsPerRequest),
    checksPerHour: positiveInt("CHECKS_PER_HOUR", DEFAULT_LIMITS.checksPerHour),
    requestTimeoutMs: positiveInt("REQUEST_TIMEOUT_MS", DEFAULT_LIMITS.requestTimeoutMs),
  };
}

/**
 * Endpoint of the companion Harper service used by the MCP tool. The engine's
 * WebAssembly payload is far too large to bundle into the app's own edge
 * runtime, so server-side checks are delegated to this service.
 */
export function readHarperServiceUrl(): string | undefined {
  return runtimeEnv("HARPER_SERVICE_URL");
}

/** Optional shared token sent to the companion service as a bearer credential. */
export function readHarperServiceToken(): string | undefined {
  return runtimeEnv("HARPER_SERVICE_TOKEN");
}
