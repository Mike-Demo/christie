# Harper companion service

The grammar engine's WebAssembly model is roughly 16 MB, which exceeds the
bundle budget of the edge runtime the web app is deployed to. Server-side
grammar checks (the ones made by AI clients through the MCP tool) are therefore
delegated to this small standalone service.

The browser editor does **not** use this service: it loads Harper directly in
the user's browser.

## Contract

`POST /check`

```json
{ "text": "<english text>", "language": "en" }
```

Response:

```json
{ "lints": [ { "rule_id": "…", "kind": "…", "message": "…", "start": 0, "end": 4, "replacements": ["…"] } ] }
```

Errors: `invalid_json` (400), `invalid_input` (400), `too_large` (413),
`unsupported_language` (400), `unauthorized` (401), `internal` (500).

`GET /health` returns `{ "ok": true }`.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Listening port |
| `HARPER_SERVICE_TOKEN` | unset | When set, requests must send `Authorization: Bearer <token>` |
| `MAX_CHARS_PER_REQUEST` | `10000` | Rejects larger bodies |

## Run locally

```bash
bun run services/harper-service/server.ts
```

Then point the web app at it:

```
HARPER_SERVICE_URL=http://localhost:8787
HARPER_SERVICE_TOKEN=<same value as the service, if set>
```

## Deploy

```bash
docker build -f services/harper-service/Dockerfile -t harper-service .
docker run -p 8787:8787 -e HARPER_SERVICE_TOKEN=<secret> harper-service
```

The image runs anywhere a container runs (Fly.io, Railway, Render, Cloud Run,
a VM). Give it ~512 MB of memory; the model is loaded once at start-up.

## Privacy

The service holds request text in memory for the duration of the request only.
It has no database, writes no files, and its single log line contains a
character count and a finding count — never the text, a fragment of it, or a
suggestion.
