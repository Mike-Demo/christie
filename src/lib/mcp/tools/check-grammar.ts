import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { readLimits } from "@/lib/grammar/config";
import { SUPPORTED_LANGUAGE, grammarFailure, type GrammarResult } from "@/lib/grammar/contract";
import { logEvent } from "@/lib/grammar/log";
import { resolveOptions } from "@/lib/grammar/normalize";
import { validateCheckRequest } from "@/lib/grammar/validate";
import { checkWithHarperService } from "../harper-service";
import { supabaseForUser } from "../supabase";

const OPERATION = "check_grammar";

// Mapped explicitly to plain JSON shapes: named interfaces do not satisfy the
// SDK's recursive JSON type for `structuredContent`.
function toJson(result: GrammarResult) {
  if (!result.success) {
    return {
      success: false,
      contract_version: result.contract_version,
      error: {
        code: result.error.code,
        message: result.error.message,
        ...(result.error.retry_after_seconds === undefined
          ? {}
          : { retry_after_seconds: result.error.retry_after_seconds }),
      },
    };
  }

  return {
    success: true,
    contract_version: result.contract_version,
    language: result.language,
    document_length: result.document_length,
    issue_count: result.issue_count,
    processing_ms: result.processing_ms,
    issues: result.issues.map((issue) => ({
      id: issue.id,
      rule_id: issue.rule_id,
      category: issue.category,
      message: issue.message,
      start: issue.start,
      end: issue.end,
      original_text: issue.original_text,
      suggestions: issue.suggestions.map((suggestion) => suggestion),
      safe: issue.safe,
    })),
  };
}

function toResult(result: GrammarResult) {
  const json = toJson(result);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(json) }],
    structuredContent: json,
    ...(result.success ? {} : { isError: true as const }),
  };
}

export default defineTool({
  name: "check_grammar",
  title: "Check grammar",
  description:
    "Check English text for grammar, spelling, punctuation and style problems using the Harper engine. Returns structured findings with character offsets and suggested replacements. The submitted text is processed in memory only and is never stored or logged.",
  inputSchema: {
    text: z.string().describe("The English text to check. Required."),
    language: z
      .string()
      .optional()
      .describe("Language code. Only 'en' is supported; anything else is rejected."),
    include_suggestions: z
      .boolean()
      .optional()
      .describe("Include suggested replacements for each finding. Defaults to true."),
    include_rule_ids: z
      .boolean()
      .optional()
      .describe("Include the Harper rule identifier for each finding. Defaults to true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return toResult(
        grammarFailure("unauthorized", "Sign in to this app to use the grammar checker."),
      );
    }

    const limits = readLimits();
    const invalid = validateCheckRequest({
      text: args.text,
      language: args.language,
      maxChars: limits.maxCharsPerRequest,
    });
    if (invalid) return toResult(invalid);

    const supabase = supabaseForUser(ctx);

    const { data: gate, error: gateError } = await supabase.rpc("consume_rate_limit", {
      _limit: limits.checksPerHour,
    });
    if (gateError) {
      return toResult(grammarFailure("internal", "Usage limits could not be checked."));
    }

    const quota = Array.isArray(gate) ? gate[0] : gate;
    if (quota && quota.allowed === false) {
      const retryAfter = Number(quota.retry_after_s ?? 60);
      return toResult(
        grammarFailure(
          "rate_limited",
          `Hourly limit of ${limits.checksPerHour} checks reached. Try again in ${retryAfter} seconds.`,
          retryAfter,
        ),
      );
    }

    const startedAt = Date.now();
    const result = await checkWithHarperService(
      args.text,
      resolveOptions({
        language: SUPPORTED_LANGUAGE,
        include_suggestions: args.include_suggestions,
        include_rule_ids: args.include_rule_ids,
      }),
      limits.requestTimeoutMs,
      ctx.signal,
    );
    const latency = Date.now() - startedAt;

    // Counters only: character counts and timings, never the text itself.
    await supabase.rpc("record_usage_event", {
      _operation: OPERATION,
      _character_count: args.text.length,
      _issue_count: result.success ? result.issue_count : 0,
      _success: result.success,
      _error_code: result.success ? null : result.error.code,
      _latency_ms: latency,
    });

    logEvent({
      event: "mcp_check_grammar",
      user_id: ctx.getUserId(),
      operation: OPERATION,
      character_count: args.text.length,
      issue_count: result.success ? result.issue_count : 0,
      success: result.success,
      latency_ms: latency,
      ...(result.success ? {} : { error_code: result.error.code }),
    });

    return toResult(result);
  },
});
