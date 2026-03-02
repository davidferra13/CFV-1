# Overnight Audit Script Fixes — March 2026

## What Happened

The overnight audit (`node scripts/overnight-audit.mjs`) was run on 2026-03-02 at 3:02 AM. It hit two critical bugs and one environmental issue:

### Bug 1: Unit Tests Showed 0/0 (Phase 2)

**Root cause:** The output-parsing regex looked for `# pass (\d+)` (TAP format), but Node 24 outputs `ℹ pass 577` (spec format). The regex never matched, so the audit reported 0 pass / 0 fail.

**Fix:** Updated regex to match both formats: `(?:# pass|ℹ pass|pass)\s+(\d+)`

### Bug 2: Chef Routes All Timed Out (Phase 3)

**Root causes (multiple):**

1. **`waitUntil: 'networkidle'`** — In dev mode, this waits for ALL network activity to stop, including HMR websockets, analytics pings, and real-time subscriptions (PresenceBeacon). These never stop, so the page "never finishes loading."
2. **30s timeout** — Next.js dev mode compiles each page on-demand. First visits to complex routes can take 10-30s just for compilation. Combined with `networkidle`, 30s was never enough.
3. **No auth refresh** — JWT tokens expire after 1 hour. The crawl started with tokens from 02:36. By the time it reached deep routes, the tokens had expired, causing redirects to signin.
4. **No bail-out** — When pages started timing out, the crawl kept trying every single route (426 chef routes × 30s each = 3.5 hours of pure timeout).

**Fixes:**

- Changed `waitUntil` from `'networkidle'` to `'domcontentloaded'` — 10-50x faster
- Increased `NAV_TIMEOUT` from 30s to 60s
- Added auth verification before starting each role's crawl
- Added API-based re-authentication when auth expires mid-crawl
- Added consecutive failure bail-out (10 in a row = skip remaining)
- Skip heavy analysis (screenshots, a11y) for auth-redirected pages
- Added `npm run seed:e2e` at startup to refresh auth tokens
- Added warm-up phase to pre-compile key routes before crawling

### Environmental Issue: Dev Server Using 14 GB RAM

**Root cause:** The dev server (PID 53088) had been running since 6:48 PM and accumulated 14.4 GB of memory from compiling 577 pages over multiple hours. This made ALL page loads take 25+ seconds.

**Fix:** Killed the bloated process, cleared `.next-dev` (1.9 GB stale cache), restarted fresh. Homepage went from 25s to 2.8s.

## Files Changed

- `scripts/overnight-audit.mjs` — All bug fixes above

## Prevention

- **Memory monitoring:** If the dev server exceeds ~4 GB, restart it. Consider adding a memory watchdog.
- **`.next-dev` cleanup:** Periodically clear `.next-dev` to prevent stale cache accumulation.
- **Token freshness:** The audit now runs `seed:e2e` automatically, but if auth files are more than 1 hour old, the audit will re-authenticate via API.
