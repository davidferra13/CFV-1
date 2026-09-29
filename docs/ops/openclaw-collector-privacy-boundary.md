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

### Desktop fallback

`scripts/openclaw-collector-vpn-run.ps1` is the temporary desktop path while the Pi management stack is unavailable. It fails closed unless the installed NordVPN service is already running, records the normal public IP, connects NordVPN, requires both a live Nord/OpenVPN adapter and a changed public IP, and only then injects `OPENCLAW_EGRESS_PROFILE=isolated` into the child collector process. The flag is removed and VPN disconnect is requested in a `finally` block.

### Pi promotion

`scripts/deploy-collector-privacy-to-pi.ps1` is the recovery/deployment path once Pi SSH is healthy. It stages the exact privacy files, validates them before promotion, preserves timestamped copies of every replaced runtime file, promotes only after validation passes, reruns tests on the live Pi tree, and leaves direct scrapers fail-closed unless isolated egress is separately declared and verified.

## Verification

Run:

`node --test .openclaw-build/tests/collector-policy.test.mjs`

`node --check .openclaw-build/lib/collector-policy.mjs`

`node --check .openclaw-build/lib/scrape-utils.mjs`

`bash -n .openclaw-build/scripts/schedule-all.sh`
