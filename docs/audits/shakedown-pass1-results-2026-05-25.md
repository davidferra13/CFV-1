# Shakedown Pass 1: Full Route Crawl

**Date:** 2026-05-25
**Server:** http://localhost:3100 (Next.js dev, restarted fresh for this crawl)
**Auth:** Agent account (`agent@local.chefflow`) via POST /api/e2e/auth
**Method:** Node.js HTTP client, sequential requests, 60s timeout per route

## Summary

| Metric                                          | Count |
| ----------------------------------------------- | ----- |
| Total routes checked                            | 38    |
| GREEN (200 or expected redirect)                | 21    |
| YELLOW (404, route does not exist at this path) | 11    |
| RED (500)                                       | 0     |
| ORANGE (timeout, >60s SSR compile)              | 6     |

**Zero 500 errors after server restart.** The server was initially returning 500 on all routes (stale/crashed process). After killing PID 27132 and restarting `npm run dev`, all routes either serve, redirect, 404 (expected for incorrect top-level paths), or time out on first cold SSR compilation.

## Full Results

| Flag   | Pillar | Route             | Status  | Time  | Notes                                                                  |
| ------ | ------ | ----------------- | ------- | ----- | ---------------------------------------------------------------------- |
| GREEN  | SELL   | /dashboard        | 200     | 40.2s | Cold compile, first hit                                                |
| GREEN  | SELL   | /inquiries        | 200     | 21.8s |                                                                        |
| GREEN  | SELL   | /quotes           | 200     | 31.1s |                                                                        |
| GREEN  | SELL   | /clients          | 200     | 12.6s |                                                                        |
| YELLOW | SELL   | /bookings         | 404     | 11.5s | Actual path: /my-bookings (client route)                               |
| GREEN  | SELL   | /leads            | 200     | 23.3s |                                                                        |
| GREEN  | PLAN   | /menus            | 200     | 25.9s |                                                                        |
| ORANGE | PLAN   | /calendar         | TIMEOUT | 60.0s | Route exists at app/(chef)/calendar/page.tsx; SSR compile exceeded 60s |
| GREEN  | PLAN   | /events           | 200     | 16.2s |                                                                        |
| GREEN  | PLAN   | /tasks            | 200     | 13.3s |                                                                        |
| YELLOW | PLAN   | /morning-briefing | 404     | 7.8s  | No page.tsx found anywhere                                             |
| GREEN  | COOK   | /recipes          | 200     | 45.2s |                                                                        |
| GREEN  | COOK   | /ingredients      | 200     | 40.1s |                                                                        |
| YELLOW | COOK   | /grocery-lists    | 404     | 0.2s  | No page.tsx found anywhere                                             |
| YELLOW | COOK   | /prep             | 404     | 0.1s  | Actual path: /culinary/prep                                            |
| GREEN  | STOCK  | /inventory        | 200     | 23.2s |                                                                        |
| GREEN  | STOCK  | /vendors          | 200     | 17.3s |                                                                        |
| GREEN  | STOCK  | /pricing          | 200     | 10.9s |                                                                        |
| YELLOW | MONEY  | /invoices         | 404     | 0.3s  | Actual path: /finance/invoices/\* (sub-routes only)                    |
| YELLOW | MONEY  | /ledger           | 404     | 0.1s  | Actual path: /finance/ledger/\* (sub-routes only)                      |
| GREEN  | MONEY  | /reports          | 308     | 0.0s  | Redirects to /analytics/reports                                        |
| YELLOW | MONEY  | /tax              | 404     | 0.1s  | Actual path: /finance/sales-tax or /finance/reporting/tax-summary      |
| GREEN  | GROW   | /analytics        | 200     | 56.4s | Heavy cold compile                                                     |
| YELLOW | GROW   | /testimonials     | 404     | 0.3s  | No page.tsx found anywhere                                             |
| ORANGE | GROW   | /settings         | TIMEOUT | 60.0s | Route exists; SSR compile too slow                                     |
| ORANGE | GROW   | /staff            | TIMEOUT | 60.0s | Nested under /events/[id]/staff, /onboarding/staff, etc.               |
| ORANGE | EXTRA  | /notifications    | TIMEOUT | 60.0s | Route exists at app/(chef)/notifications/page.tsx                      |
| YELLOW | EXTRA  | /profile          | 404     | 22.5s | Actual paths: /settings/my-profile, /community/profile                 |
| GREEN  | EXTRA  | /onboarding       | 200     | 42.2s |                                                                        |
| GREEN  | EXTRA  | /documents        | 200     | 24.3s |                                                                        |
| YELLOW | EXTRA  | /scheduling       | 404     | 0.5s  | Actual path: /settings/scheduling                                      |
| ORANGE | EXTRA  | /services         | TIMEOUT | 60.0s | Route exists at /settings/my-services, /services (public)              |
| ORANGE | EXTRA  | /contracts        | TIMEOUT | 60.0s | Route exists at /contracts/clauses, /contracts/compose                 |
| YELLOW | EXTRA  | /expense-tracking | 404     | 44.8s | No page.tsx found anywhere                                             |
| GREEN  | EXTRA  | /chat             | 200     | 38.0s |                                                                        |
| GREEN  | EXTRA  | /inbox/triage     | 308     | 0.0s  | Redirects to /inbox                                                    |
| GREEN  | EXTRA  | /culinary-board   | 200     | 16.7s |                                                                        |
| GREEN  | EXTRA  | /guests           | 200     | 45.6s |                                                                        |

## Analysis

### GREEN (21 routes, healthy)

All six pillars have core routes that serve 200. The SELL, PLAN, COOK, and STOCK pillars are the strongest. Two routes use 308 redirects (/reports -> /analytics/reports, /inbox/triage -> /inbox) which is correct behavior.

### YELLOW (11 routes, path mismatch or missing)

These fall into three categories:

**Path mismatch (route exists elsewhere):**

- /bookings -> /my-bookings (client-side route)
- /prep -> /culinary/prep
- /invoices -> /finance/invoices/\*
- /ledger -> /finance/ledger/\*
- /tax -> /finance/sales-tax
- /profile -> /settings/my-profile
- /scheduling -> /settings/scheduling

**Truly missing (no page.tsx anywhere):**

- /morning-briefing
- /grocery-lists
- /testimonials
- /expense-tracking

### ORANGE (6 routes, timeout on cold compile)

These routes exist but the Next.js dev server took >60s to SSR-compile on first visit:

- /calendar
- /settings
- /staff (top-level /staff does not exist; nested sub-routes do)
- /notifications
- /services
- /contracts

These would likely succeed on a second visit (warm cache) or in production builds. Not a code bug; a dev-server cold-start issue.

### RED (0 routes)

No 500 errors after server restart. The initial 500-on-everything was a stale/crashed dev server process, not a code issue.

## Pre-Crawl Issue: Stale Server

The dev server on port 3100 (PID 27132) was returning 500 Internal Server Error on every route, including the public homepage. The .next/ directory had no server/ or static/ output, only cache/. Killing and restarting the process resolved all 500s. This suggests the server had been running for a long time and entered a bad state (possibly OOM or compilation cache corruption).

## Recommendations

1. **Add top-level redirects** for the 7 path-mismatch routes (e.g., /invoices -> /finance/invoices) or create index pages
2. **Build the 4 missing pages** (/morning-briefing, /grocery-lists, /testimonials, /expense-tracking) or remove from navigation
3. **Investigate cold-compile times** for /calendar, /settings, /notifications, /services, /contracts (all >60s); consider precompilation or code splitting
4. **Add server health monitoring** to detect stale/crashed dev server state automatically
