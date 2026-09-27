/**
 * Companion Harper grammar service.
 *
 * Harper's WebAssembly model is far larger than an edge worker bundle may be,
 * so the MCP tool delegates checks to this small standalone service. It has no
 * database, writes no files, and logs only counters — the submitted text lives
 * in memory for the length of one request and is then discarded.
 *
 * Run with:  bun run services/harper-service/server.ts
 * Env:       PORT (default 8787), HARPER_SERVICE_TOKEN (optional shared secret)
 */

import { LocalLinter, binaryInlined } from "harper.js";

interface HarperSpan {
  start: number;
  end: number;
}

interface HarperSuggestion {
  kind(): number;
  get_replacement_text(): string;
}

interface HarperLint {
  lint_kind(): string;
  message(): string;
  span(): HarperSpan;
  suggestions(): HarperSuggestion[];
}

const REPLACE_KIND = 0;
const MAX_CHARS = Number(process.env['MAX_CHARS_PER_REQUEST'] ?? 10_000);
const PORT = Number(process.env['PORT'] ?? 8787);
const TOKEN = process.env['HARPER_SERVICE_TOKEN']?.trim();

const linter = new LocalLinter({ binary: binaryInlined });
const ready = linter.setup();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorized(request: Request): boolean {
  if (!TOKEN) return true;
  return request.headers.get("authorization") === `Bearer ${TOKEN}`;
}

async function handleCheck(request: Request): Promise<Response> {
  let payload: { text?: unknown; language?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const text = payload.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return json({ error: "invalid_input" }, 400);
  }
  if (text.length > MAX_CHARS) {
    return json({ error: "too_large" }, 413);
  }
  if (payload.language !== undefined && payload.language !== "en") {
    return json({ error: "unsupported_language" }, 400);
  }

  await ready;
  const organized = (await (
    linter as unknown as {
      organizedLints(input: string): Promise<Record<string, HarperLint[]>>;
    }
  ).organizedLints(text)) as Record<string, HarperLint[]>;

  const lints = Object.entries(organized).flatMap(([ruleId, group]) =>
    group.map((lint) => {
      const span = lint.span();
      return {
        rule_id: ruleId || null,
        kind: lint.lint_kind(),
        message: lint.message(),
        start: span.start,
        end: span.end,
        replacements: lint
          .suggestions()
          .filter((suggestion) => suggestion.kind() === REPLACE_KIND)
          .map((suggestion) => suggestion.get_replacement_text()),
      };
    }),
  );

  // Counters only — never the text, a fragment of it, or a suggestion.
  console.log(
    JSON.stringify({ event: "check", character_count: text.length, lint_count: lints.length }),
  );

  return json({ lints });
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/check" && request.method === "POST") {
      if (!authorized(request)) return json({ error: "unauthorized" }, 401);
      try {
        return await handleCheck(request);
      } catch {
        return json({ error: "internal" }, 500);
      }
    }

    return json({ error: "not_found" }, 404);
  },
});

console.log(JSON.stringify({ event: "listening", port: PORT }));
