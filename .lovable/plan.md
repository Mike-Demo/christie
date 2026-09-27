# Harper Grammar Checker — MVP + Remote MCP Server

A privacy-first English grammar checker with two front doors: a browser editor that runs Harper entirely on the device, and a remote MCP server that AI clients (ChatGPT, Claude, Cursor) connect to by signing in.

## Product decisions (from your answers)

- Full MVP in one pass.
- MCP clients authenticate by signing in (OAuth), not with pasted temporary keys.
- UI built with the Web Awesome design system already attached to this project (not shadcn).

## What gets built

**Pages**
1. Landing — what it is, "Try the editor" and "Connect an AI client" calls to action, privacy statement, English-only notice, Harper attribution.
2. Editor — large text area, Check grammar, findings side panel (range, plain-language message, suggestions, rule/category), Apply suggestion, Apply all safe suggestions, Clear, character count, loading/empty/success/error states, visible "your text never leaves this device" note.
3. Connect (MCP) — sign in, see the endpoint URL, copyable client configuration, connection status, list of connected clients with a revoke action.
4. MCP documentation — client JSON config, request and tool-call examples, success / unauthorized / rate-limited responses, all with placeholders only.
5. Privacy — what is and is not stored, retention.
6. Terms and attribution — independent project, not endorsed by Automattic, Harper Apache 2.0 notice and license link.
7. Health dashboard — sign-in protected, shows anonymous usage counters only.

**Grammar engine**
- `harper.js` (WebAssembly) is the only checker. No language model anywhere in the path.
- In the browser editor it runs locally, so text never leaves the device.
- For MCP calls it runs server-side per request, with the text held in memory only.

**MCP server**
- Mounted at `/mcp`, Streamable HTTP, standard discovery and tool listing.
- One tool `check_grammar` with `text` (required), `language` ("en" only), and options for suggestions and rule IDs. Unsupported languages are rejected with a clear validation error.
- Returns the normalized JSON shape from your spec, mapped from Harper's real output.
- Sign-in based access: each caller connects as a real user and approves an on-site consent screen.

**Limits and abuse protection**
- Max characters per request, per-user hourly check limit, request timeout, safe error messages, HTTP 429 with a retry message. All limits read from configuration, not hardcoded in logic.

**Data**
- `usage_events`: id, user id, timestamp, operation, character count, success, latency. Row-level security so a user only sees their own rows.
- No submitted text, no fragments, no suggestions, no corrected output, no raw IP addresses, no authorization headers — not in the database and not in logs.
- Schema leaves room for plan id, quota, and subscription status later; no billing, no pricing claims now.

**Tests**
- Auth accepted / rejected, rate limiting, oversized input, empty input, unsupported language, Harper result mapping, MCP initialize + tool discovery + `check_grammar`, and a check that no submitted text reaches logs or database rows.

**Docs**
- README with local development, environment variables, deployment, MCP setup, threat model, Mermaid data-flow diagram, security assumptions, retention policy, Harper attribution, production-readiness checklist.

## Technical notes

- Stack stays TanStack Start + React + TypeScript. Backend is Lovable Cloud (Postgres, auth, server functions) — it needs to be enabled as the first step.
- MCP is built with `@lovable.dev/mcp-js` and the Vite MCP plugin; routes are generated, tools live in `src/lib/mcp/tools/`. OAuth uses the managed Cloud auth server plus an on-site consent route.
- Browser Harper: `harper.js` `LocalLinter` loaded client-side only (dynamic import after hydration) so the WASM module never touches server rendering.
- Server Harper: the same package invoked inside the MCP tool handler. Risk to verify early — the serverless edge runtime has strict WebAssembly and bundling rules, and Harper's WASM build is not confirmed to run there. If it does not, the fallback is to keep `check_grammar` behind a small dedicated Harper service with deployment config included in the repo, with the endpoint configured by environment variable. I will test this before building the rest of the MCP layer and tell you which path is in use.
- Design system deviation: your spec named shadcn/ui; per your answer the UI uses the attached Web Awesome components and tokens throughout.
- Deviation from spec: temporary 24-hour bearer keys, the `api_keys` table, and key-generation rate limits are dropped in favour of sign-in based access. Revocation becomes "disconnect this client".

## Locked specifics

**1. Response contract** (one shared TypeScript type in `src/lib/grammar/contract.ts`, used by editor and MCP; `contract_version: "1"`)

```text
GrammarResult {
  contract_version: "1"
  success: true
  language: "en"
  document_length: number        // UTF-16 code units, same unit as start/end
  issue_count: number            // === issues.length
  issues: Issue[]                // sorted by start, then end, then rule_id
  processing_ms: number          // integer
}
Issue {
  id: string                     // stable: sha-256 of `${rule_id ?? ""}:${start}:${end}`, first 12 hex chars
  rule_id: string | null         // null only if Harper gives no rule name
  category: string               // Harper lint kind, lower-case; "other" if absent
  message: string
  start: number                  // inclusive
  end: number                    // exclusive
  original_text: string          // returned to the caller only, never stored
  suggestions: string[]          // [] when none or include_suggestions=false
  safe: boolean                  // true only when exactly one replacement suggestion exists
}
GrammarError { success: false, error: { code: "invalid_input" | "unsupported_language" | "too_large" | "rate_limited" | "unauthorized" | "timeout" | "internal", message: string, retry_after_s: number | null } }
```
`rule_id` is omitted (null) when `include_rule_ids=false`. No `corrected_text` in v1. "Apply all safe suggestions" applies only `safe: true` issues, right-to-left, skipping overlaps.

**2. OAuth lifecycle**
- Tokens are issued and refreshed by the managed Cloud auth server; the app never stores tokens.
- Access tokens are short-lived (auth server default, about 1 hour); clients refresh with their refresh token. Every MCP request re-verifies the token signature, issuer, expiry and client claim.
- A "connected client" is an approved OAuth grant (user + client) held by the auth server, not an app table. The Connect page lists grants and "Disconnect" revokes the grant, which stops refreshes; an already issued access token keeps working until it expires (up to about 1 hour). This limit is stated on the page.
- If the auth server does not expose grant listing/revocation to the app, the Connect page falls back to "Sign out everywhere" (ends all sessions) and this is reported to you as a limitation.

**3. Rate limiting**
- Key: authenticated user id. Window: fixed one-hour window (UTC hour bucket).
- Store: a `rate_limits` table (user_id, window_start, count) updated by one atomic database function that increments and returns the new count.
- Limits: `MAX_CHARS_PER_REQUEST` (default 10000), `CHECKS_PER_HOUR` (default 60), `REQUEST_TIMEOUT_MS` (default 10000), from environment with defaults.
- Fail-closed: if the limit check errors, the request is refused with `internal` and no grammar check runs.
- Over limit: `rate_limited` with `retry_after_s` = seconds until the next hour.

**4. Logging policy**
- Allowlist only. A single `logEvent()` helper accepts: event name, user id, operation, character count, success, latency, error code. Any other field is dropped.
- Never logged: text, fragments, suggestions, messages derived from text, headers, tokens, IPs, raw error objects from Harper.
- Errors are caught at the tool boundary and reduced to a fixed error code before logging or returning.
- Tests feed a unique marker string through success, validation-failure, oversize, timeout and thrown-exception paths, then assert the marker never appears in captured console output or `usage_events` / `rate_limits` rows.

**5. Server-side Harper fallback criteria**
Server Harper is accepted only if all pass on a production build in the edge runtime:
- `harper.js` loads and initialises without a bundling or WebAssembly error.
- A fixed 5-sentence fixture returns the same issues (rule, start, end) as the browser run.
- Cold initialisation under 3 seconds and a 10,000-character check under 2 seconds.
- Output bundle stays within the hosting size limit.
Any failure triggers the fallback: `check_grammar` calls a dedicated Harper service at `HARPER_SERVICE_URL` (source and deployment config included), and you are told which path shipped.

## Sequence

1. Enable Lovable Cloud; confirm Harper runs in the browser and test whether it runs in the server runtime.
2. Migration for `usage_events` with grants and row-level security.
3. Grammar adapter mapping Harper output to the normalized shape, shared by editor and MCP.
4. Editor page, then landing and static pages.
5. MCP server, OAuth activation, consent route, connect page, documentation page.
6. Health dashboard, tests, README and metadata.
