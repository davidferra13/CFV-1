# OpenClaw collector privacy boundary

## Purpose

Keep public-data collection operationally separate from the owner's personal browser, accounts, cookies, and residential identity. This boundary is for privacy and load discipline; it must not be used to defeat anti-bot controls or continue through an explicit block.

## Runtime invariants

- Direct retailer-site scraping requires `OPENCLAW_EGRESS_PROFILE=isolated`.
- Only set that flag after the collector is actually routed through approved isolated egress. The flag is a declaration, not a VPN.
- Session-derived scraping also requires `OPENCLAW_ALLOW_SESSION_SCRAPERS=1`.
- Session scrapers must never reuse a personal browser profile or ambient login state.
- Shared HTTP collection strips cookies, authorization, referrers, origins, request IDs, CSRF IDs, and page-view IDs by default.
- Anonymous context cookies may be narrowly allowlisted by name when they only select public context such as a store.
- Collector user-agent identity is stable. Consumer-browser user-agent rotation is prohibited.
- HTTP 401, 403, 407, and 429 responses create a persistent host cooldown before another network request.
- Canonical source fingerprints use SHA-256-derived opaque IDs while source provenance remains internally reconstructable.
- APIs, feeds, and structured public sources remain preferred over rendered-page scraping.

## Current privacy gate

Until isolated egress is configured and verified, the daily scheduler skips Instacart session scraping, Walmart direct scraping, Walmart nationwide HTML scraping, Hannaford, and Stop & Shop/Shaw's direct scraping. Structured/API lanes continue independently.

## Verification

Run:

`node --test .openclaw-build/tests/collector-policy.test.mjs`

`node --check .openclaw-build/lib/collector-policy.mjs`

`node --check .openclaw-build/lib/scrape-utils.mjs`

`bash -n .openclaw-build/scripts/schedule-all.sh`
