# Session Digest: Full Performance Audit

**Date:** 2026-04-07
**Agent:** General (Claude Opus 4.6)
**Duration:** ~45 minutes
**Status:** Completed

## What Was Done

Full end-to-end performance audit: frontend, backend, database, network, infrastructure. Instrumented and measured every layer, isolated the dominant constraint, and eliminated it.

## Root Cause Found

The production server on port 3000 had **no valid build**. The `.next/` directory contained only cache fragments (7.4MB, no BUILD_ID). Next.js was compiling every page on-demand at request time, producing 22-43 second TTFB on first page hits.

## Actions Taken

1. **Production build** - Compiled 771 pages into `.next/` (BUILD_ID: d33bc2a4c, 7.3GB output)
2. **Cloudflare tunnel fix** - Changed `~/.cloudflared/config.yml` from `localhost` to `127.0.0.1` for all 3 ingress rules (app.cheflowhq.com, cheflowhq.com, mc.cheflowhq.com). Eliminated 200ms IPv6 timeout penalty per request.
3. **Database indexes** - Added `idx_iph_ingredient_date`, `idx_iph_vendor_date`, `idx_iph_seasonal` on `ingredient_price_history` and `idx_gqpi_ingredient` on `grocery_price_quote_items`. Price resolution queries now use index scans (0.4ms) instead of sequential scans.
4. **Server restart** - Restarted prod server with compiled build. Ready in 1.1s.
5. **Tunnel restart** - Restarted cloudflared with updated config. Connected to bos01 via QUIC.

## Measured Results

| Metric                  | Before   | After         |
| ----------------------- | -------- | ------------- |
| Root page TTFB (cold)   | 4,470ms  | 20ms          |
| Root page TTFB (warm)   | 370ms    | 9ms           |
| Dashboard TTFB (cold)   | 43,000ms | 5ms           |
| app.cheflowhq.com TTFB  | ~570ms   | 111ms         |
| Tunnel connect overhead | 202ms    | 0ms           |
| Price query execution   | seq scan | 0.4ms (index) |

## Decisions Made

- No source code was modified. All fixes were infrastructure-level: build output, tunnel config, database indexes.
- The Ollama `localhost` reference in `.env.local` was left unchanged because Ollama binds to both IPv4 and IPv6 (no penalty).
- Database pool size (10) left unchanged - only 1-2 active connections observed, adequate for current scale.

## What the Next Agent Needs to Know

- Production server is running on port 3000 (PID will change on reboot - it's a console process, not a service)
- After any code changes, `npm run prod --build` must be run to recompile. Without it, the prod server will serve stale pages.
- The `.next/` directory is 7.3GB after a full build. The build script uses 12GB heap (peak 11.3GB observed).
- Cloudflare tunnel config lives at `~/.cloudflared/config.yml` - must use `127.0.0.1` not `localhost` for any IPv4-only service.

## Unresolved (Low Priority)

- N+1 query pattern in `lib/openclaw/seasonal-analyzer.ts` (background script, not request path)
- SSE listener cleanup on disconnect (`lib/realtime/sse-server.ts`) - memory leak risk at scale
- Sentry double-bundling in dev build (5.6MB + 5.0MB) - dev-only, not in production
