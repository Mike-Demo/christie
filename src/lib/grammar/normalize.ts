/**
 * Maps Harper's raw lint output onto the shared response contract.
 *
 * Kept free of any engine import so it runs unchanged in the browser, in the
 * companion service, and in tests.
 */

import {
  CONTRACT_VERSION,
  SUPPORTED_LANGUAGE,
  sortIssues,
  type CheckGrammarOptions,
  type GrammarSuccess,
  type Issue,
  type ResolvedCheckOptions,
} from "./contract";

/** The engine-shaped input this module accepts, decoupled from harper.js types. */
export interface RawLint {
  rule_id: string | null;
  kind: string | null;
  message: string;
  start: number;
  end: number;
  /** Replacement strings only — deletions and insertions are not auto-applied. */
  replacements: string[];
}

export function resolveOptions(options: CheckGrammarOptions = {}): ResolvedCheckOptions {
  return {
    language: SUPPORTED_LANGUAGE,
    include_suggestions: options.include_suggestions !== false,
    include_rule_ids: options.include_rule_ids !== false,
  };
}

/** Synchronous, dependency-free FNV-1a-seeded digest fallback. */
function fallbackDigest(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + code, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 12);
}

/** Stable issue id: first 12 hex characters of sha-256(`rule_id:start:end`). */
export async function issueId(ruleId: string | null, start: number, end: number): Promise<string> {
  const material = `${ruleId ?? ""}:${start}:${end}`;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fallbackDigest(material);

  const bytes = new TextEncoder().encode(material);
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

function clampSpan(start: number, end: number, length: number): { start: number; end: number } {
  const safeStart = Math.max(0, Math.min(Math.trunc(start), length));
  const safeEnd = Math.max(safeStart, Math.min(Math.trunc(end), length));
  return { start: safeStart, end: safeEnd };
}

export async function normalizeLints(
  text: string,
  lints: readonly RawLint[],
  options: ResolvedCheckOptions,
  processingMs: number,
): Promise<GrammarSuccess> {
  const documentLength = text.length;

  const issues: Issue[] = await Promise.all(
    lints.map(async (lint): Promise<Issue> => {
      const { start, end } = clampSpan(lint.start, lint.end, documentLength);
      const ruleId = options.include_rule_ids ? (lint.rule_id ?? null) : null;
      const suggestions = options.include_suggestions
        ? lint.replacements.filter((entry) => typeof entry === "string")
        : [];

      return {
        id: await issueId(lint.rule_id ?? null, start, end),
        rule_id: ruleId,
        category: (lint.kind ?? "other").toLowerCase() || "other",
        message: lint.message,
        start,
        end,
        original_text: text.slice(start, end),
        suggestions,
        // Auto-apply only when the engine is unambiguous: exactly one replacement.
        safe: lint.replacements.length === 1,
      };
    }),
  );

  const sorted = sortIssues(issues);

  return {
    contract_version: CONTRACT_VERSION,
    success: true,
    language: SUPPORTED_LANGUAGE,
    document_length: documentLength,
    issue_count: sorted.length,
    issues: sorted,
    processing_ms: Math.max(0, Math.round(processingMs)),
  };
}
