# Mission Control — Project Stats Bar

## What Changed

Added an auto-refreshing stats bar at the top of the Mission Control Home panel. Shows four key project metrics at a glance, updated every 60 seconds.

## Stats Displayed

| Card              | Value                                        | Subtitle                                      | Color                         |
| ----------------- | -------------------------------------------- | --------------------------------------------- | ----------------------------- |
| **Dev Hours**     | Total estimated development hours (midpoint) | Commit count + active days                    | Brand orange                  |
| **Remy Training** | Hours spent on Remy-related files            | Commit count on Remy files                    | Purple (#a78bfa)              |
| **Remy Eval**     | Latest eval pass rate %                      | Tests passed/total + trend arrow + eval count | Green/yellow/red by threshold |
| **Total Spent**   | Sum of all project expenses                  | Monthly burn rate + item count                | Green                         |

## How It Works

### Data Sources

1. **Dev Hours** — Calculated from `git log` timestamps using session-based estimation (same algorithm as Timeline panel). Includes pre-telemetry hours from `project-timeline.json`.
2. **Remy Training Hours** — Git commits filtered to files matching: `lib/ai/remy*`, `components/ai/remy*`, `scripts/remy-eval/*`, `docs/remy*`, `app/**/remy*`. Same session estimation algorithm.
3. **Remy Eval** — Reads latest eval report from `scripts/remy-eval/reports/`. Shows pass rate, trend (up/down/neutral vs previous eval), and total eval count.
4. **Total Spent** — Reads `docs/project-expenses.json` and sums all `totalSpent` + `monthlyRate` fields.

### Auto-Update

- Stats refresh every **60 seconds** via `setInterval(fetchProjectStats, 60000)`
- Server caches results for **60 seconds** to avoid redundant git/file operations
- On refresh, stat card borders briefly flash brighter to indicate fresh data

### API Endpoint

`GET /api/stats` — Returns:

```json
{
  "ok": true,
  "devHours": {
    "totalHours": 450.2,
    "totalCommits": 629,
    "activeDays": 45,
    "remyHours": 85.3,
    "remyCommits": 120
  },
  "remy": {
    "totalEvals": 18,
    "latestPassRate": 75.8,
    "latestPassed": 25,
    "latestTotal": 33,
    "avgResponseTime": 40.4,
    "totalEvalHours": 0.37,
    "trend": "up",
    "lastEvalDate": "2026-02-28T..."
  },
  "costs": {
    "totalSpent": 1492.5,
    "monthlyBurn": 1.04,
    "entryCount": 28
  },
  "updatedAt": 1709312345678
}
```

## Files Modified

- `scripts/launcher/server.mjs` — Added `getProjectStats()`, `getDevHoursStats()`, `getRemyStats()`, `getCostStats()` functions + `/api/stats` endpoint
- `scripts/launcher/index.html` — Added stats bar HTML in Home panel, `fetchProjectStats()` JS function, CSS hover styles, auto-refresh interval

## How to Update

- **Adding new expenses:** Update `docs/project-expenses.json` — stats auto-reflect
- **New Remy eval reports:** Drop JSON into `scripts/remy-eval/reports/` — stats auto-reflect
- **More Remy files:** If new Remy-related paths are added outside the current glob patterns, update the git log filter in `getDevHoursStats()` in server.mjs
