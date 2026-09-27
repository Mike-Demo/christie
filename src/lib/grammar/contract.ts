/**
 * The single normalized grammar-checking contract.
 *
 * Both front doors — the in-browser editor and the remote MCP tool — produce
 * and consume exactly these shapes, so a caller can move between them without
 * changing any parsing code.
 *
 * Privacy: `original_text` is returned to the caller in the response only. It
 * is never persisted and never logged.
 */

export const CONTRACT_VERSION = "1" as const;

/** The only language this service supports. */
export const SUPPORTED_LANGUAGE = "en" as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGE;

export type GrammarErrorCode =
  | "invalid_input"
  | "unsupported_language"
  | "too_large"
  | "rate_limited"
  | "unauthorized"
  | "timeout"
  | "internal";

export interface Issue {
  /** Stable within a response: first 12 hex chars of sha-256(`rule_id:start:end`). */
  id: string;
  /** Harper's originating rule name, or null when unavailable or not requested. */
  rule_id: string | null;
  /** Harper lint kind, lower-cased. "other" when Harper reports none. */
  category: string;
  /** Plain-language description of the problem. */
  message: string;
  /** Inclusive start offset, in UTF-16 code units. */
  start: number;
  /** Exclusive end offset, in UTF-16 code units. */
  end: number;
  /** The offending slice of the submitted text. Returned only, never stored. */
  original_text: string;
  /** Replacement candidates. Empty when none, or when suggestions were not requested. */
  suggestions: string[];
  /** True only when exactly one replacement suggestion exists (safe to auto-apply). */
  safe: boolean;
}

export interface GrammarSuccess {
  contract_version: typeof CONTRACT_VERSION;
  success: true;
  language: SupportedLanguage;
  /** Length of the submitted text in UTF-16 code units — same unit as start/end. */
  document_length: number;
  /** Always equal to issues.length. */
  issue_count: number;
  /** Sorted by start, then end, then rule_id. See sortIssues for the full tie-break. */
  issues: Issue[];
  /** Whole-request processing time in whole milliseconds. */
  processing_ms: number;
}

export interface GrammarFailure {
  contract_version: typeof CONTRACT_VERSION;
  success: false;
  error: {
    code: GrammarErrorCode;
    message: string;
    /** Seconds the caller should wait before retrying, or null when not applicable. */
    retry_after_s: number | null;
  };
}

export type GrammarResult = GrammarSuccess | GrammarFailure;

export interface CheckGrammarOptions {
  language?: string;
  include_suggestions?: boolean;
  include_rule_ids?: boolean;
}

/** Normalized options with every default resolved. */
export interface ResolvedCheckOptions {
  language: SupportedLanguage;
  include_suggestions: boolean;
  include_rule_ids: boolean;
}

export function grammarFailure(
  code: GrammarErrorCode,
  message: string,
  retryAfterSeconds: number | null = null,
): GrammarFailure {
  return {
    contract_version: CONTRACT_VERSION,
    success: false,
    error: { code, message, retry_after_s: retryAfterSeconds },
  };
}

/**
 * Deterministic ordering contract.
 *
 * Issues sort ascending by `start`, then by `end`, then by `rule_id`
 * (lexicographic, with null sorted last). Entries that are still identical on
 * all three keys keep the engine's emission order, so repeated checks of the
 * same text always produce a byte-identical response.
 */
export function sortIssues(issues: Issue[]): Issue[] {
  return issues
    .map((issue, index) => ({ issue, index }))
    .sort((a, b) => {
      if (a.issue.start !== b.issue.start) return a.issue.start - b.issue.start;
      if (a.issue.end !== b.issue.end) return a.issue.end - b.issue.end;

      const left = a.issue.rule_id;
      const right = b.issue.rule_id;
      if (left !== right) {
        if (left === null) return 1;
        if (right === null) return -1;
        return left < right ? -1 : 1;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.issue);
}

/**
 * Applies only the issues marked `safe`, right to left so earlier offsets stay
 * valid, skipping any issue that overlaps one already applied.
 */
export function applySafeSuggestions(
  text: string,
  issues: readonly Issue[],
): { text: string; applied: number } {
  const candidates = issues
    .filter((issue) => issue.safe && issue.suggestions.length === 1)
    .slice()
    .sort((a, b) => b.start - a.start);

  let output = text;
  let applied = 0;
  let lowestAppliedStart = Number.POSITIVE_INFINITY;

  for (const issue of candidates) {
    if (issue.end > lowestAppliedStart) continue; // overlaps an applied edit
    output = output.slice(0, issue.start) + issue.suggestions[0] + output.slice(issue.end);
    lowestAppliedStart = issue.start;
    applied += 1;
  }

  return { text: output, applied };
}
