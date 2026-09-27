# Roadmap

- [x] 1. Verify Harper in the browser and on the server runtime
      (browser: works; edge server: WASM too large → companion service)
- [x] 2. Migration for `usage_events`, `rate_limits`, `user_roles` and RLS
- [x] 3. Shared grammar contract, normalization, validation, config, logging
- [x] 4. Editor, landing page, privacy, terms, licenses
- [x] 5. MCP server, OAuth sign-in, consent screen, connect and docs pages
- [x] 6. Health dashboard, tests, README, companion service + deploy config

## Open (needs input or deployment)

- [ ] Deploy the companion grammar service and set `HARPER_SERVICE_URL`
      (blocked on where you want it hosted)
- [ ] Grant an `admin` role so the health dashboard is reachable
- [ ] Publish the app so the MCP endpoint is live for external clients
