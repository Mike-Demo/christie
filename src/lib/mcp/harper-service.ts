/**
 * Client for the companion Harper service.
 *
 * Harper's WebAssembly model is far larger than the edge runtime's bundle
 * budget, so server-side checks are delegated to a small dedicated service
 * (see `services/harper-service/`). The submitted text is forwarded in the
 * request body, held in memory for the duration of that request, and never
 * persisted on either side.
 */

import {
  grammarFailure,
  type GrammarResult,
  type ResolvedCheckOptions,
} from "@/lib/grammar/contract";
import { readHarperServiceToken, readHarperServiceUrl } from "@/lib/grammar/config";
import { normalizeLints, type RawLint } from "@/lib/grammar/normalize";

interface ServiceResponse {
  lints?: RawLint[];
}

export async function checkWithHarperService(
  text: string,
  options: ResolvedCheckOptions,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<GrammarResult> {
  const baseUrl = readHarperServiceUrl();
  if (!baseUrl) {
    return grammarFailure(
      "internal",
      "The grammar service is not configured. Set HARPER_SERVICE_URL and try again.",
    );
  }

  const token = readHarperServiceToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  const startedAt = Date.now();

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, language: "en" }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return grammarFailure("internal", "The grammar service could not complete this check.");
    }

    const payload = (await response.json()) as ServiceResponse;
    return await normalizeLints(
      text,
      Array.isArray(payload.lints) ? payload.lints : [],
      options,
      Date.now() - startedAt,
    );
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return aborted
      ? grammarFailure("timeout", "The grammar check took too long and was cancelled.")
      : grammarFailure("internal", "The grammar service could not be reached.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
