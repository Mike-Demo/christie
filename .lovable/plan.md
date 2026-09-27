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

## Sequence

1. Enable Lovable Cloud; confirm Harper runs in the browser and test whether it runs in the server runtime.
2. Migration for `usage_events` with grants and row-level security.
3. Grammar adapter mapping Harper output to the normalized shape, shared by editor and MCP.
4. Editor page, then landing and static pages.
5. MCP server, OAuth activation, consent route, connect page, documentation page.
6. Health dashboard, tests, README and metadata.
