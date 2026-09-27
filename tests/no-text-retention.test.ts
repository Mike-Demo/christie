/**
 * Guards the central privacy promise: submitted text must never reach the
 * database or the logs.
 */

import { describe, expect, test } from "bun:test";

import { logEvent, setLogSink, type LoggableEvent } from "../src/lib/grammar/log";

function columnNames(sql: string, table: string): string[] {
  const start = sql.indexOf(`CREATE TABLE ${table}`);
  const body = sql.slice(sql.indexOf("(", start) + 1, sql.indexOf(");", start));
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^(primary|unique|foreign|constraint|check)\b/i.test(line))
    .map((line) => line.split(/\s+/)[0]?.replace(/[",]/g, "") ?? "")
    .filter((name) => name.length > 0);
}

const SECRET = "Confidential paragraph about acquisition plans.";

describe("logging", () => {
  test("drops every key that is not an allow-listed counter", () => {
    const captured: Record<string, unknown>[] = [];
    const lines: string[] = [];
    setLogSink((line) => {
      lines.push(line);
      captured.push(JSON.parse(line) as Record<string, unknown>);
    });

    logEvent({
      event: "mcp_check_grammar",
      user_id: "user-1",
      operation: "check_grammar",
      character_count: SECRET.length,
      issue_count: 2,
      success: true,
      latency_ms: 12,
      // Anything else must be stripped, even when a caller passes it by mistake.
      text: SECRET,
      original_text: SECRET,
      suggestions: ["redacted"],
    } as unknown as LoggableEvent);

    setLogSink(null);

    expect(captured).toHaveLength(1);
    expect(lines[0]).not.toContain(SECRET);
    expect(lines[0]).not.toContain("acquisition");
    expect(Object.keys(captured[0] ?? {}).sort()).toEqual([
      "character_count",
      "event",
      "issue_count",
      "latency_ms",
      "operation",
      "success",
      "user_id",
    ]);
  });
});

describe("usage rows", () => {
  test("the usage_events schema has no column able to hold submitted text", async () => {
    const migration = await Bun.file("drizzle/migrations/0000_grammar_usage_and_limits.sql").text();
    const table = migration.slice(
      migration.indexOf("CREATE TABLE public.usage_events"),
      migration.indexOf(");", migration.indexOf("CREATE TABLE public.usage_events")),
    );

    expect(table.length).toBeGreaterThan(0);
    for (const forbidden of [
      "text ",
      "content",
      "body",
      "excerpt",
      "snippet",
      "suggestion",
      "ip",
      "authorization",
    ]) {
      expect(table.toLowerCase().includes(forbidden)).toBe(false);
    }
  });

  test("the recorded payload contains only counters", () => {
    const payload = {
      _operation: "check_grammar",
      _character_count: SECRET.length,
      _issue_count: 1,
      _success: true,
      _error_code: null,
      _latency_ms: 30,
    };
    expect(JSON.stringify(payload)).not.toContain(SECRET);
    expect(Object.keys(payload)).toEqual([
      "_operation",
      "_character_count",
      "_issue_count",
      "_success",
      "_error_code",
      "_latency_ms",
    ]);
  });
});
