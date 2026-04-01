# Spec: OpenClaw Refresh Status Badge

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** `openclaw-canonical-scope-and-sequence.md`, `openclaw-internal-only-boundary-and-debranding.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                  | Date                | Agent/Session      | Commit |
| ---------------------- | ------------------- | ------------------ | ------ |
| Created                | 2026-03-31 23:55 ET | Planner + Research |        |
| Status: ready          | 2026-03-31 23:55 ET | Planner + Research |        |
| Research-informed edit | 2026-04-01 00:20 ET | Planner + Research |        |
| Claimed (in-progress)  |                     |                    |        |
| Spike completed        |                     |                    |        |
| Pre-flight passed      |                     |                    |        |
| Build completed        |                     |                    |        |
| Type check passed      |                     |                    |        |
| Build check passed     |                     |                    |        |
| Playwright verified    |                     |                    |        |
| Status: verified       |                     |                    |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

_The developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why." If the developer was on a voice-to-text rant, capture the gold._

The developer needs a simple answer to a practical problem: when they open the pricing page, when should they expect it to refresh? They keep going back to the store prices page and the food catalog page, and the numbers are not changing in front of them even though OpenClaw is still replenishing data in the background. The database is slowly growing, but there is no badge or status symbol telling them when the next meaningful change is likely or whether they are just looking too early. Right now they remember that it seems to replenish every couple of hours, but the product does not confirm that. They want the interface to stop making them guess.

Follow-up direction from the developer: research how chefs and restaurant purchasing tools already communicate this kind of pricing freshness and use that to tighten the spec. This phase stays docs-only. Do not build product code yet.

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** Add a truthful refresh-status surface to the chef-facing pricing pages so the developer can immediately see whether data should have changed yet.
- **Key constraints:** Do not fake an exact countdown the codebase cannot verify. Do not collapse Store Prices and Food Catalog into one pipeline when they are fed differently today.
- **Research constraint:** Follow real operator patterns where possible. Favor last verified truth, source clarity, and degraded-state honesty over invented "refresh ETA" language.
- **Motivation:** The current pages make unchanged numbers ambiguous. The developer needs operational trust, not more raw data.
- **Success from the developer's perspective:** When they land on Store Prices or Food Catalog, they can tell what pipeline that page is using, when it last refreshed, and whether reloading now is likely to help.

---

## What This Does (Plain English)

This adds a compact, shared refresh-status surface to the chef-facing pricing pages. `/prices` will show the timing of the local PostgreSQL mirror pull and store-catalog freshness. `/culinary/price-catalog` will show the timing of the live catalog scrape. Both pages will explicitly state that they do not live-auto-refresh in the browser, so the chef can tell whether they should wait, reload, or stop expecting immediate movement.

---

## Why It Matters

Right now the pages expose freshness fragments but not the page-level truth. The result is unnecessary rechecking, misleading copy, and no reliable mental model for when OpenClaw data is actually supposed to move.

External operator research points in the same direction. Restaurant tools like MarginEdge, Restaurant365, ChefMod, and meez emphasize last verified price, price history, variance alerts, availability status, and source context rather than a promised countdown to the next data update. Under cost volatility, chefs make rapid decisions about substitutions, vendor choices, and menu costing, which means the UI should optimize for trust and clarity, not false precision. See `docs/research/openclaw-refresh-status-operator-patterns.md`.

---

## Research-Informed Product Principles

These rules are non-optional for this spec and are based on external operator-pattern research documented in `docs/research/openclaw-refresh-status-operator-patterns.md`.

- Show the last verified update, not a guessed next refresh time.
- Always label the source or pipeline for the timestamp being shown.
- Separate page refresh status from item availability, substitutions, and row-level freshness.
- Use degraded or unknown states explicitly when truth is missing.
- Prefer operational wording like `last scrape`, `last local mirror update`, and `loads on search or reload`.
- Do not color-code age as healthy or unhealthy without a verified cadence contract.

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                             | Purpose                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `components/pricing/openclaw-refresh-status.tsx` | Shared UI surface for page-level OpenClaw refresh status                  |
| `lib/openclaw/refresh-status-actions.ts`         | Chef-safe server action that combines local mirror freshness and Pi stats |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                         | What to Change                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `app/(chef)/prices/page.tsx`                 | Remove misleading "updated daily" copy, stop presenting `stats.lastSync` as the only refresh signal, add shared status surface |
| `app/(chef)/culinary/price-catalog/page.tsx` | Replace local-mirror `synced ...` crumb with the correct page-level refresh surface for Pi-backed catalog browsing             |
| `lib/openclaw/sync.ts`                       | No behavior change. Reuse `getOpenClawStatsInternal()` from the new chef-safe status action                                    |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration.
- Use existing `openclaw.sync_runs`, `openclaw.stores.last_cataloged_at`, and `openclaw.store_products.last_seen_at`.

---

## Data Model

The new action returns a read-only status object assembled from existing sources:

- `localSyncStartedAt: string | null`
  Source: newest `openclaw.sync_runs.started_at`
- `localSyncFinishedAt: string | null`
  Source: newest `openclaw.sync_runs.finished_at`
- `latestStoreCatalogedAt: string | null`
  Source: `MAX(openclaw.stores.last_cataloged_at)`
- `latestStorePriceSeenAt: string | null`
  Source: `MAX(openclaw.store_products.last_seen_at)`
- `piLastScrapeAt: string | null`
  Source: Pi `/api/stats` via `getOpenClawStatsInternal()`
- `piReachable: boolean`
  True when the Pi stats call succeeds

Derived UI labels must be computed from those raw timestamps. Do not store or invent a `nextRefreshAt` field.

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

| Action                       | Auth            | Input | Output                                                                                                                     | Side Effects |
| ---------------------------- | --------------- | ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `getOpenClawRefreshStatus()` | `requireChef()` | none  | `{ localSyncStartedAt, localSyncFinishedAt, latestStoreCatalogedAt, latestStorePriceSeenAt, piLastScrapeAt, piReachable }` | None         |

Behavior:

1. Require chef auth.
2. Query the newest local sync run from `openclaw.sync_runs`.
3. Query `MAX(last_cataloged_at)` from `openclaw.stores`.
4. Query `MAX(last_seen_at)` from `openclaw.store_products`.
5. Call `getOpenClawStatsInternal()` to get `lastScrapeAt`.
6. Return raw ISO timestamps only. No guessed countdown and no thrown error when the Pi is unreachable. Missing data becomes `null`.

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

Add a compact, bordered status card directly under the page intro on both chef-facing pages:

- `/prices`
- `/culinary/price-catalog`

The component should feel like operational status, not marketing.

Global presentation requirements:

- Show one explicit status badge with one of these labels only:
  - `Verified`
  - `Degraded`
  - `Unknown`
- Badge color semantics are availability-of-truth semantics only:
  - neutral or informational when timestamps are available
  - warning when one required source is unavailable
  - muted when no trustworthy timestamp exists
- Do not use badge color to imply `fresh`, `stale`, or `late` based on elapsed time alone.
- Show timestamps in exact local time with timezone plus a relative helper. Relative time alone is not sufficient.
- Show a `Source:` line or equivalent labeled text so the chef can tell which pipeline the timestamp belongs to.

Required content on `/prices`:

- Primary label: `Local mirror status`
- Primary timestamp: last local pull using `localSyncFinishedAt` when present, otherwise `localSyncStartedAt`
- Source label: `Source: local price mirror`
- Secondary facts:
  - `Latest store catalog seen ...`
  - `Latest store price seen ...`
  - `Updates on page load or when you run a new search`
  - all visible copy must stay neutral and must not name OpenClaw

Required content on `/culinary/price-catalog`:

- Primary label: `Live catalog status`
- Primary timestamp: Pi `lastScrapeAt`
- Source label: `Source: live catalog scrape`
- Secondary facts:
  - `Catalog results load on search and reload`
  - optional secondary local mirror timestamp for cross-reference, but clearly labeled as local mirror, not live catalog
  - all visible copy must stay neutral and must not name OpenClaw

Replace misleading existing copy:

- Remove `/prices` subtitle claim "updated daily by OpenClaw"
- Remove `/culinary/price-catalog` trailing `synced {timeAgo(stats.lastSync)}` text

### States

- **Loading:** Not applicable as a client-side spinner. The status is server-rendered with the page.
- **Empty:** Show `No refresh data yet` and keep the explanatory copy about how the page updates. Never show fake zero dates.
- **Error:** If the Pi stats call fails, show `Pi status unavailable` on Food Catalog and continue rendering any verified local timestamps. Do not collapse the whole page.
- **Populated:** Show the relevant last-known timestamps plus explicit refresh mechanics text. No countdown.
- **Mixed:** If both local and Pi timestamps are shown on one page, label them separately and never merge them into a single `last updated` claim.

### Interactions

No user interaction in v1. This is an informational surface only.

Do not add a manual refresh button, polling interval, tooltip dependency, or background auto-refresh loop in this spec.

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                          | Correct Behavior                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Pi unreachable                                    | Show local mirror timestamps if available, mark Pi status unavailable, do not error the page |
| No local sync rows yet                            | Show unknown local mirror state, keep explanatory copy                                       |
| Store catalog has timestamps but sync run is null | Show the freshest verified store/store-product timestamps and keep local pull unknown        |
| Page data is old but unchanged                    | Show the old timestamp truthfully, not fake "fresh" marketing language                       |
| Local and Pi timestamps disagree                  | Show both with clear labels, do not collapse them into one blended refresh claim             |
| Timestamp exists but cadence is unclear           | Show the timestamp only. Do not infer healthy/unhealthy age from elapsed hours               |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Sign in as a chef.
2. Open `/prices`.
3. Verify the page shows a refresh-status surface under the header.
4. Verify the old "updated daily by OpenClaw" copy is gone.
5. Verify the status text references local mirror timing, shows an exact local timestamp plus relative helper, and explicitly says the page does not auto-refresh.
6. Open `/culinary/price-catalog`.
7. Verify the page shows a refresh-status surface under the header.
8. Verify the old `synced ...` crumb based on `stats.lastSync` is gone.
9. Verify the Food Catalog status references Pi scrape timing, not the local mirror only, and shows the correct source label.
10. Verify badge styling changes only for truth availability (`Verified`, `Degraded`, `Unknown`), not for arbitrary age buckets.
11. Temporarily simulate Pi unreachability during local testing and verify the page still renders with a degraded status state instead of throwing.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Not adding a real-time polling loop or websocket feed
- Not building a global OpenClaw admin health dashboard
- Not changing the sync schedule itself
- Not creating a guaranteed `next refresh at` countdown
- Not touching `/app/(admin)/admin/price-catalog/`
- Not changing row-level freshness dots on store cards or catalog rows
- Not adding item availability, substitution guidance, or supplier-order workflow UI
- Not adding threshold-based price alerts in v1

---

## Notes for Builder Agent

_Anything else the builder needs to know: gotchas, patterns to follow, files to reference for similar implementations._

- Reuse the existing Pi stats helper instead of duplicating fetch logic: `lib/openclaw/sync.ts:94-104`
- Use `requireChef()`, not admin auth
- Prefer `finished_at` over `started_at` when presenting the last local pull to the chef
- Keep the status component read-only and server-rendered
- Do not reuse `FreshnessDot` as the entire solution. That component is record-age language, not page-refresh language. `components/pricing/freshness-dot.tsx:8-27`
- Prefer exact local timestamps with timezone plus a relative helper, not relative-only text
- Badge colors must represent truth availability, not guessed freshness health
- If you include both local and Pi timestamps anywhere, label them explicitly as separate pipelines

---

## Spec Validation (Planner Gate Evidence)

### 1. What exists today that this touches?

- `/prices` is a chef page that loads `getStoreCatalogStats()` and shows a `Last Sync` stat card driven by `stats.lastSync`. `app/(chef)/prices/page.tsx:46-49,92-99`
- `/prices` currently claims the data is "updated daily by OpenClaw." `app/(chef)/prices/page.tsx:57-60`
- `/prices` store search is user-triggered only through `getNearbyStores()`. `app/(chef)/prices/prices-client.tsx:67-87`
- Store cards already show `lastCatalogedAt` with a freshness indicator. `app/(chef)/prices/prices-client.tsx:176-206`, `lib/openclaw/store-catalog-actions.ts:159-207`
- Store inventory rows already show `lastSeenAt` with a freshness indicator and reload only on filter/search/pagination actions. `app/(chef)/prices/store/[storeId]/store-inventory-browser.tsx:21-37,55-81,145-149,206`, `lib/openclaw/store-catalog-actions.ts:209-290`
- `/culinary/price-catalog` is a chef page that loads local mirror stats from `getStoreCatalogStats()` and currently renders `synced {timeAgo(stats.lastSync)}`. `app/(chef)/culinary/price-catalog/page.tsx:25-26,65`
- The Food Catalog browser fetches categories, stores, search results, and detail from Pi-backed actions with `cache: 'no-store'`. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:166-178,183-245,283-299`, `lib/openclaw/catalog-actions.ts:136-165,309-445`
- Relevant schema already exists:
  - `openclaw.stores.last_cataloged_at` `database/migrations/20260401000119_openclaw_inventory_schema.sql:23-41`
  - `openclaw.store_products.last_seen_at` `database/migrations/20260401000119_openclaw_inventory_schema.sql:85-98`
  - `openclaw.sync_runs.started_at/finished_at` `database/migrations/20260401000119_openclaw_inventory_schema.sql:127-141`
- Existing adjacent status surfaces:
  - admin Pi overview `app/(admin)/admin/price-catalog/price-catalog-client.tsx:40-44,139-147`
  - cron-only sentinel sync status `app/api/sentinel/sync-status/route.ts:6-42`

### 2. What exactly changes?

- Add `lib/openclaw/refresh-status-actions.ts` with a chef-safe read-only status action querying existing tables and Pi stats.
- Add `components/pricing/openclaw-refresh-status.tsx` as a shared presentational component.
- Modify `app/(chef)/prices/page.tsx` to:
  - remove "updated daily by OpenClaw" copy,
  - stop relying on the current `Last Sync` card as the only status signal,
  - render the new shared status surface. Existing page structure and stat dashboard otherwise stay intact. `app/(chef)/prices/page.tsx:53-135`
- Modify `app/(chef)/culinary/price-catalog/page.tsx` to:
  - stop rendering local-mirror `synced ...` copy as if it described live catalog results,
  - render the new shared status surface with Pi scrape timing. `app/(chef)/culinary/price-catalog/page.tsx:28-69`
- Remove nothing at the database level.

### 3. What assumptions are you making?

| Assumption                                                                             | Verified?                   | Evidence                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store Prices should describe local PostgreSQL mirror timing, not Pi scrape timing only | Verified                    | `/prices` reads local stats and local store data via `getStoreCatalogStats()` / `getNearbyStores()`. `app/(chef)/prices/page.tsx:46-49`, `lib/openclaw/store-catalog-actions.ts:79-207`                                                                                                                                                        |
| Food Catalog results are Pi-direct and should describe Pi scrape timing                | Verified                    | `searchCatalogV2()`, `getCatalogDetail()`, and `getCatalogCategories()` call Pi endpoints directly. `lib/openclaw/catalog-actions.ts:309-445`                                                                                                                                                                                                  |
| The page itself does not currently auto-refresh                                        | Verified                    | `/prices` and store inventory only re-fetch on explicit user actions. `app/(chef)/prices/prices-client.tsx:67-87`, `app/(chef)/prices/store/[storeId]/store-inventory-browser.tsx:55-81`                                                                                                                                                       |
| There is one canonical schedule the UI can safely convert into an exact countdown      | Unverified and contradicted | Page copy says daily, pull script says hourly, cron/docs say nightly, newer pipeline doc says multiple daily collection rounds. `app/(chef)/prices/page.tsx:57-60`, `scripts/openclaw-pull/pull.mjs:12-13`, `app/api/cron/price-sync/route.ts:5-11`, `docs/openclaw-data-pipeline.md:294-305`, `docs/food-catalog-pipeline-update.md:12,24-31` |
| A new status action can reuse existing tables without schema work                      | Verified                    | All needed timestamps already exist. `database/migrations/20260401000119_openclaw_inventory_schema.sql:23-41,85-98,127-141`                                                                                                                                                                                                                    |

### 4. Where will this most likely break?

1. The builder may use `started_at` again instead of `finished_at`, which keeps telling the chef when the pull began rather than when it finished. `lib/openclaw/store-catalog-actions.ts:101`, `scripts/openclaw-pull/pull.mjs:630-645`
2. The builder may keep Food Catalog tied to `getStoreCatalogStats().lastSync`, which would preserve the current pipeline mismatch between header and body. `app/(chef)/culinary/price-catalog/page.tsx:25-26,65`, `lib/openclaw/catalog-actions.ts:309-445`
3. The builder may treat Pi failure as fatal instead of degraded-read-only state, even though the existing helper already returns `null` on failure. `lib/openclaw/sync.ts:94-107`

### 5. What is underspecified?

- The current product language does not distinguish clearly between:
  - local mirror timing,
  - live Pi scrape timing,
  - and record freshness timing.
- The existing codebase does not define a canonical wording standard for "updates on reload/search, not live." The spec resolves this by making that text non-optional.
- The spec intentionally does not promise a `nextRefreshAt` countdown because the repo does not verify one consistent schedule. `scripts/openclaw-pull/pull.mjs:12-13`, `docs/openclaw-data-pipeline.md:294-305`, `docs/food-catalog-pipeline-update.md:12,24-31`

### 6. What dependencies or prerequisites exist?

- No migration prerequisite.
- Existing auth requirement is `requireChef()`. `lib/auth/get-user.ts:118-143`
- Existing Pi stats helper already exists and should be reused. `lib/openclaw/sync.ts:94-104`
- Existing timestamps live in current schema; no new tables are needed. `database/migrations/20260401000119_openclaw_inventory_schema.sql:23-41,85-98,127-141`

### 7. What existing logic could this conflict with?

- The admin price catalog already has a Pi status display. Do not mix chef UX work into the admin surface. `app/(admin)/admin/price-catalog/page.tsx:8-10`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:40-44,139-147`
- `components/pricing/freshness-dot.tsx` already communicates row freshness, but that is a different concern than page-level refresh status. `components/pricing/freshness-dot.tsx:8-27`
- `getStoreCatalogStats()` currently powers both `/prices` and `/culinary/price-catalog`; a careless builder could keep overloading that action instead of separating local mirror status from Pi status. `app/(chef)/prices/page.tsx:49`, `app/(chef)/culinary/price-catalog/page.tsx:25`, `lib/openclaw/store-catalog-actions.ts:79-138`

### 8. What is the end-to-end data flow?

For `/prices`:

1. Chef opens `/prices`.
2. Server loads page.
3. Page calls `getOpenClawRefreshStatus()` plus existing `getStoreCatalogStats()` / `getChains()`.
4. Status action reads `openclaw.sync_runs`, `openclaw.stores`, `openclaw.store_products`, and Pi `/api/stats`.
5. Server renders status card with local mirror timing.
6. If the chef later runs ZIP search, the store list re-fetches, but the page still does not background-auto-refresh. `app/(chef)/prices/prices-client.tsx:67-87`

For `/culinary/price-catalog`:

1. Chef opens `/culinary/price-catalog`.
2. Server loads page.
3. Page calls `getOpenClawRefreshStatus()` and renders the status card using Pi scrape timing.
4. Client-side catalog searches call Pi-backed actions on search/filter changes and infinite scroll.
5. New results only appear when the chef searches, reloads, or changes filters. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:166-178,183-245,250-265`

### 9. What is the correct implementation order?

1. Create `lib/openclaw/refresh-status-actions.ts`.
2. Create `components/pricing/openclaw-refresh-status.tsx`.
3. Wire the new component into `app/(chef)/prices/page.tsx`.
4. Replace the Food Catalog header sync crumb in `app/(chef)/culinary/price-catalog/page.tsx`.
5. Verify degraded behavior when Pi stats are unavailable.
6. Verify the old misleading copy is gone from both pages.

### 10. What are the exact success criteria?

- `/prices` no longer says "updated daily by OpenClaw." `app/(chef)/prices/page.tsx:57-60`
- `/prices` shows a refresh-status surface that labels local mirror timing and explicitly says the page is not live-auto-refreshing.
- `/culinary/price-catalog` no longer renders `synced {timeAgo(stats.lastSync)}` from the local mirror. `app/(chef)/culinary/price-catalog/page.tsx:65`
- `/culinary/price-catalog` shows Pi scrape timing in its status surface.
- If Pi stats fail, both pages still render and show an honest degraded status.
- No schema or migration changes are introduced.

### 11. What are the non-negotiable constraints?

- Chef auth only. Do not broaden access beyond `requireChef()`. `lib/auth/get-user.ts:118-143`
- No fake countdown or promised exact next refresh time
- No fake zero timestamps
- No mutation of sync state, cron state, or database rows
- Preserve the distinction between local mirror data and Pi-direct catalog data

### 12. What should NOT be touched?

- `app/(admin)/admin/price-catalog/` admin UI
- `app/api/sentinel/sync-status/route.ts` cron-auth status route
- `scripts/openclaw-pull/pull.mjs` scheduling behavior
- `app/api/cron/price-sync/route.ts` and `app/api/cron/openclaw-sync/route.ts`
- row-level freshness indicators in `app/(chef)/prices/prices-client.tsx`, `app/(chef)/prices/store/[storeId]/store-inventory-browser.tsx`, and `components/pricing/freshness-dot.tsx`

### 13. Is this the simplest complete version?

Yes.

The smallest complete fix is:

- one read-only status action,
- one shared status component,
- two page integrations,
- and removal of misleading copy.

Anything larger, such as a polling loop, a scheduler dashboard, or a predictive countdown, would add scope without verified correctness.

### 14. If implemented exactly as written, what would still be wrong?

The product would still not know an exact future refresh time, only the last known relevant timestamps. That is acceptable for this spec because the repo does not verify a single canonical schedule. What remains "wrong" after v1 is that the system still lacks a config-level source of truth for future scrape/pull timing. `scripts/openclaw-pull/pull.mjs:12-13`, `docs/openclaw-data-pipeline.md:294-305`, `docs/food-catalog-pipeline-update.md:12,24-31`

### What would a builder get wrong building this as written?

1. Reusing `stats.lastSync` everywhere and calling it refresh status. On `/prices` that value is only local pull start time, and on Food Catalog it is the wrong pipeline entirely. `lib/openclaw/store-catalog-actions.ts:101,128-132`, `app/(chef)/culinary/price-catalog/page.tsx:25-26,65`
2. Treating Store Prices and Food Catalog as one pipeline. They are not. Store Prices is local PostgreSQL mirror data, while Food Catalog browsing calls Pi APIs directly. `lib/openclaw/store-catalog-actions.ts:79-138`, `lib/openclaw/catalog-actions.ts:309-445`
3. Building a countdown or "refreshes every 2 hours" promise from comments alone. The repo contradicts itself on cadence. `scripts/openclaw-pull/pull.mjs:12-13`, `docs/openclaw-price-intelligence.md:50-67,73`, `docs/food-catalog-pipeline-update.md:12,24-31`
4. Reaching for the admin page or cron-auth sentinel route instead of building a chef-safe read-only action. `app/(admin)/admin/price-catalog/page.tsx:8-10`, `app/api/sentinel/sync-status/route.ts:6-42`
5. Using red/yellow/green age buckets or a countdown to imply an SLA that the repo does not verify. `scripts/openclaw-pull/pull.mjs:12-13`, `docs/openclaw-data-pipeline.md:294-305`, `docs/research/openclaw-refresh-status-operator-patterns.md`

### Is anything assumed but not verified?

Yes.

- An exact future refresh schedule for chef-facing UI is not verified and is contradicted by repo sources. `app/(chef)/prices/page.tsx:57-60`, `scripts/openclaw-pull/pull.mjs:12-13`, `docs/openclaw-data-pipeline.md:294-305`, `docs/food-catalog-pipeline-update.md:12,24-31`
- The Pi does not expose scrape history in this repo beyond current `lastScrapeAt`, so the spec cannot truthfully compute a future countdown from code alone. `lib/openclaw/sync.ts:43-50,94-104`
- The current local `openclaw.sync_runs` table shape supports "last pull" truth, not "next pull" truth. `database/migrations/20260401000119_openclaw_inventory_schema.sql:127-141`
- External product research supports last-verified and alert patterns, but it does not itself prove that OpenClaw should infer age-based health states. That remains intentionally out of scope for v1. `docs/research/openclaw-refresh-status-operator-patterns.md`

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

This spec is production-ready for a truthful refresh-status surface.

The uncertainty is explicitly fenced off: there is no verified exact next-refresh schedule, so the spec does not promise one. If the product later wants a real countdown, that requires a separate source-of-truth schedule in code or config before the UI can present it honestly.
