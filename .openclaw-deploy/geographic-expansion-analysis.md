# OpenClaw Geographic Expansion Analysis

**Date:** 2026-03-31
**Author:** Claude Code agent
**Status:** Investigation complete, path identified

## The Problem

Instacart sessions are locked to one geographic region. The session cookie (set by server-side GeoIP) determines which physical store serves each retailer. Changing postal code in API calls has no effect; `shopId` and `zoneId` are the real geographic locks.

## What Was Tested

| Approach                                     | Result                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| CDP geolocation override                     | No effect. Instacart uses server-side GeoIP, not browser geolocation           |
| Address UI automation (keyboard)             | Address input found but autocomplete suggestions couldn't be reliably selected |
| postalCode parameter override in GraphQL     | Same results returned regardless of postalCode value                           |
| /v3/retailers API with different postal_code | Returns same data (90KB), ignores postal_code param                            |
| Storefront HTML with ?postal_code= param     | Returns same shopId/zoneId from session cookies                                |
| Fresh browser context (incognito)            | Gets fresh cookies but still same GeoIP-based location                         |

## Root Cause

Instacart's `GeolocationFromIp` GraphQL query resolves the requester's IP to a postal code on the SERVER side. All subsequent API calls use this resolved location. The cookies encode this location. There is no client-side override mechanism.

## Path Forward

### Short Term (now): Maximize NE depth

Added 6 new chains to the walker and crontab v7 (48 jobs):

- Star Market, Price Rite, Eataly, Restaurant Depot, CVS, 7-Eleven
- Projected to add 20K-30K more catalog products within existing NE session
- Restaurant Depot is especially valuable for chef customers (wholesale pricing)

### Medium Term: Residential Proxy Sessions

The only reliable way to break the geographic lock:

1. Use a residential proxy service (BrightData, Oxylabs, SmartProxy)
2. Route initial session creation through proxy in target region
3. Captured session cookies retain the geographic binding
4. Subsequent API calls from Pi use those cookies (no proxy needed for ongoing scraping)

Cost: ~$15-25/month for residential rotating proxies (one session capture per region per week). This is one-time per region since sessions last 7-14 days.

### Long Term: VPN-Based Auto-Capture

Deploy the capture script on a cloud VM with multi-region VPN capability. Rotate through target regions, capture sessions, distribute to Pi. Cost: ~$5/month (cheap VM + VPN).

## Files Created

- `capture-multizip-v3.mjs` - CDP geo override approach (tested, doesn't work for Instacart)
- `patch-session-override.mjs` - Walker now accepts `--session-file` flag (deployed, ready for multi-zip)
- `run-multizip-catalog.sh` - Pi-side multi-zip orchestrator (deployed, ready)
- `patch-add-chains.mjs` - Added 6 new NE chains (deployed, confirmed working)
- `crontab-v7.txt` - 48 jobs with 4 Instacart slots (deployed)

## Current Numbers (Post-Expansion)

| Metric                | Before         | After               |
| --------------------- | -------------- | ------------------- |
| Instacart chains      | 14             | 20                  |
| Cron jobs             | 37             | 48                  |
| Catalog products      | 49,498         | 53,687+ (growing)   |
| Store products        | 65,369         | 72,799+ (growing)   |
| Instacart daily slots | 3 (AM/Noon/PM) | 4 (AM/Noon/PM/Late) |
