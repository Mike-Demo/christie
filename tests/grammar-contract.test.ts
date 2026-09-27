import { describe, expect, test } from "bun:test";

import {
  CONTRACT_VERSION,
  applySafeSuggestions,
  grammarFailure,
  sortIssues,
  type Issue,
} from "../src/lib/grammar/contract";
import { normalizeLints, resolveOptions, type RawLint } from "../src/lib/grammar/normalize";
import { validateCheckRequest } from "../src/lib/grammar/validate";

const MAX = 10_000;

function issue(partial: Partial<Issue>): Issue {
  return {
    id: "x",
    rule_id: null,
    category: "grammar",
    message: "m",
    start: 0,
    end: 1,
    original_text: "a",
    suggestions: [],
    safe: false,
    ...partial,
  };
}

describe("validation", () => {
  test("rejects empty input", () => {
    const result = validateCheckRequest({ text: "   ", maxChars: MAX });
    expect(result?.error.code).toBe("invalid_input");
  });

  test("rejects non-string input", () => {
    const result = validateCheckRequest({ text: 42 as unknown as string, maxChars: MAX });
    expect(result?.error.code).toBe("invalid_input");
  });

  test("rejects oversized input", () => {
    const result = validateCheckRequest({ text: "a".repeat(MAX + 1), maxChars: MAX });
    expect(result?.error.code).toBe("too_large");
  });

  test("rejects unsupported languages", () => {
    const result = validateCheckRequest({ text: "Bonjour", language: "fr", maxChars: MAX });
    expect(result?.error.code).toBe("unsupported_language");
  });

  test("accepts English", () => {
    expect(validateCheckRequest({ text: "Hello there.", language: "en", maxChars: MAX })).toBeNull();
  });
});

describe("failures", () => {
  test("carry the contract version and retry hint", () => {
    const failure = grammarFailure("rate_limited", "slow down", 120);
    expect(failure.success).toBe(false);
    expect(failure.contract_version).toBe(CONTRACT_VERSION);
    expect(failure.error.retry_after_s).toBe(120);
  });
});

describe("sort stability", () => {
  test("orders by start, then end, then rule_id with nulls last", () => {
    const sorted = sortIssues([
      issue({ start: 5, end: 7, rule_id: "b" }),
      issue({ start: 5, end: 6, rule_id: "z" }),
      issue({ start: 1, end: 2, rule_id: null }),
      issue({ start: 5, end: 7, rule_id: null }),
      issue({ start: 5, end: 7, rule_id: "a" }),
    ]);
    expect(sorted.map((i) => [i.start, i.end, i.rule_id])).toEqual([
      [1, 2, null],
      [5, 6, "z"],
      [5, 7, "a"],
      [5, 7, "b"],
      [5, 7, null],
    ]);
  });
});

describe("safe suggestions", () => {
  test("applies non-overlapping safe replacements right to left", () => {
    const text = "I has a apple.";
    const { text: next, applied } = applySafeSuggestions(text, [
      issue({ start: 2, end: 5, original_text: "has", suggestions: ["have"], safe: true }),
      issue({ start: 6, end: 7, original_text: "a", suggestions: ["an"], safe: true }),
      issue({ start: 8, end: 13, original_text: "apple", suggestions: ["apple", "Apple"], safe: false }),
    ]);
    expect(applied).toBe(2);
    expect(next).toBe("I have an apple.");
  });
});

describe("normalization", () => {
  const lints: RawLint[] = [
    {
      rule_id: "SpellCheck",
      kind: "Spelling",
      message: "Did you mean sentence?",
      start: 13,
      end: 21,
      replacements: ["sentence"],
    },
  ];

  test("maps engine output onto the contract", async () => {
    const result = await normalizeLints(
      "This is a test sentance.",
      lints,
      resolveOptions({}),
      7,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.issue_count).toBe(1);
    expect(result.language).toBe("en");
    expect(result.issues[0]?.rule_id).toBe("SpellCheck");
    expect(result.issues[0]?.safe).toBe(true);
    expect(result.issues[0]?.id).toMatch(/^[0-9a-f]{12}$/);
  });

  test("honours include_suggestions and include_rule_ids", async () => {
    const result = await normalizeLints(
      "This is a test sentance.",
      lints,
      resolveOptions({ include_suggestions: false, include_rule_ids: false }),
      7,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.issues[0]?.suggestions).toEqual([]);
    expect(result.issues[0]?.rule_id).toBeNull();
  });

  test("is deterministic across runs", async () => {
    const options = resolveOptions({});
    const a = await normalizeLints("This is a test sentance.", lints, options, 1);
    const b = await normalizeLints("This is a test sentance.", lints, options, 1);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
