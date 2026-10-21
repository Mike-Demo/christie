# Security audit remediation backlog (2026-10-21)

## Priority

1. **Low — post-auth open redirect via backslash `next` parameter.** This is the only confirmed finding, and is reachable by a lower-trust caller through a crafted sign-in link; exploitation redirects a user off-origin after authentication, without appending credentials or session tokens. Fixing the duplicated helpers by using the existing shared validator is a small, contained change. No confirmed findings share this root cause.

## Issue ready to file

### Title

`[security][low] Post-auth open redirect via backslash next parameter`

### Body

Parent: [Security audit 2026-10-21 — prioritize findings and create remediation issues](https://github.com/Mike-Demo/christie/issues/3)

**Finding:** `post-auth-open-redirect-backslash-next`

Both page-level `safeNext` copies in `src/routes/auth.tsx` and `src/routes/auth_.callback.tsx` reject only the literal `//` prefix and pass a value starting with `/\` through unchanged. Browsers normalize `/\` to `//`, resolving the value against the app origin to an attacker-chosen external origin. A victim following a crafted sign-in link and authenticating, or an already-authenticated victim, can therefore be redirected off-origin immediately after authentication. No session token or credential is appended to the redirect target.

**Root cause:** The two duplicated page-level helpers check for `//` but not `/\`, diverging from the shared `safeNext` in `src/lib/auth/gravatar.ts`, which already rejects `/\`.

**Smallest fix:** Delete the two page-level helper copies and import the shared `safeNext` from `src/lib/auth/gravatar.ts`. Add a regression test asserting both routes reject backslash destinations.

## Needs-validation checklist issue ready to file

### Title

`[security][needs-validation] Audit leads to validate`

### Body

Parent: [Security audit 2026-10-21 — prioritize findings and create remediation issues](https://github.com/Mike-Demo/christie/issues/3)

Validate each lead and record evidence for the missing deployment fact:

- [ ] **Harper companion service is unauthenticated whenever `HARPER_SERVICE_TOKEN` is unset, bypassing the MCP auth and rate-limit path** (`harper-service-token-fail-open`). Claimed root cause: `authorized()` in `services/harper-service/server.ts` fails open when `HARPER_SERVICE_TOKEN` is unset, and the shipped Dockerfile provides no token by default. **Exact missing fact:** Whether the production deployment of `services/harper-service` (a) sets `HARPER_SERVICE_TOKEN` in the service environment and (b) is network-reachable by unauthenticated callers (public port 8787 vs private/internal networking only). Neither fact appears anywhere in this repository; there is no deployment config for the service in the repo.
- [ ] **MCP handler trusts `X-Forwarded-Host` and `X-Forwarded-Proto` without the platform-trust guard its sibling metadata route documents** (`mcp-handler-trusts-forwarded-host`). Claimed root cause: `src/routes/mcp.ts` enables `trustForwardedHost` and `trustForwardedProto` with no platform-trust flag, diverging from the sibling route that documents this trust as safe only when the platform proxy overwrites the headers. **Exact missing fact:** Whether the actual hosting path serving `/mcp` overwrites or strips client-supplied `X-Forwarded-Host` and `X-Forwarded-Proto` headers (as the sibling route's comment asserts for Lovable hosting). The repository contains both `lovable.toml` and `wrangler.jsonc` and no deployment record identifying which platform or proxy chain serves `/mcp` in production.

Do not assign severity until the missing deployment fact for each lead is established. The independently rejected candidate `gravatar-verified-email-account-linking` is intentionally not included.
