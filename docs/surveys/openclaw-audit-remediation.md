# OpenClaw System Audit: Remediation Report

> Date: 2026-04-03
> Trigger: OpenClaw System Audit Survey (agent-led)
> Audit document: `docs/surveys/openclaw-system-audit-survey.md`

---

## Issues Found and Actions Taken

### Critical Issue #1: 6 OpenClaw tables lacked delete guards

**Problem:** Tables created in migrations after the original no-delete guard (20260403000001) were not covered: `flyer_archive`, `zip_centroids`, `usda_price_baselines`, `canonical_ingredients`, `source_manifest`, `usda_fdc_products`.

**Fix:** New migration `20260403000002_openclaw_no_delete_guard_extension.sql` adds DELETE + TRUNCATE triggers for all 6 tables. A `prevent_delete_generic()` variant was created for tables without an `id` column (`zip_centroids`, `canonical_ingredients`). Same escape hatch applies.

**Verification:** Migration applied. 32 total triggers confirmed via `pg_trigger` catalog. Live test: INSERT then DELETE on `canonical_ingredients` returned `ERROR: DELETE is prohibited on OpenClaw tables`.

**Status:** Fixed and verified.

---

### Critical Issue #2: Archive digester writes to core business tables

**Problem:** `lib/openclaw/archive-digester-handler.ts` inserts into `clients` and `events` directly, bypassing the OpenClaw data isolation principle.

**Decision: Accepted as intentional exception.** Rationale:

1. One-time bootstrap tool (importing 10 years of business history), not a recurring pipeline
2. Auth-gated via `requireChef()` (fails on cron path, only works when admin manually triggers)
3. All writes are INSERT-only with name-based dedup (no updates, no deletes)
4. All writes are tenant-scoped
5. Restructuring into a staging table would be over-engineering for a tool that runs once

**Action:** Added documenting comment to the handler file explaining the exception and audit date.

**Status:** Documented and accepted.

---

### Critical Issue #3: DB notes field leaks "OpenClaw" name

**Problem:** `lib/openclaw/sync.ts:404` wrote `"Synced from OpenClaw - {store}"` to `ingredient_price_history.notes`, which could surface to chef-facing UI.

**Fix:** Changed to `"Automated price sync - {store}"`. Neutral language, no functional change.

**Status:** Fixed.

---

## Recommendations Not Yet Acted On

These are infrastructure/Pi-side items that require manual action or are outside the ChefFlow codebase:

1. **Install sync-api as systemd service on Pi** (currently nohup, dies on reboot). Service file exists at `~/openclaw-prices/systemd/openclaw-sync-api.service`.
2. **Schedule Puppeteer scrapers** (Hannaford, Stop & Shop, Instacart, Whole Foods) to push price coverage beyond ~8%.
3. **Verify sync_runs are being populated** by the current sync code path, or add explicit recording to `syncCore()`.

---

## Files Changed

| File                                                                        | Change                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `database/migrations/20260403000002_openclaw_no_delete_guard_extension.sql` | New migration: delete/truncate guards for 6 tables                 |
| `lib/openclaw/sync.ts`                                                      | Line 404: "Synced from OpenClaw" changed to "Automated price sync" |
| `lib/openclaw/archive-digester-handler.ts`                                  | Added data isolation exception comment                             |
| `backups/backup-20260403-pre-guard-ext.sql`                                 | Pre-migration database backup                                      |

---

## Guard Coverage Summary (Post-Fix)

All OpenClaw tables are now protected:

| Table                          | DELETE Guard | TRUNCATE Guard | Function               |
| ------------------------------ | ------------ | -------------- | ---------------------- |
| openclaw.chains                | Yes          | Yes            | prevent_delete         |
| openclaw.stores                | Yes          | Yes            | prevent_delete         |
| openclaw.products              | Yes          | Yes            | prevent_delete         |
| openclaw.product_categories    | Yes          | Yes            | prevent_delete         |
| openclaw.store_products        | Yes          | Yes            | prevent_delete         |
| openclaw.scrape_runs           | Yes          | Yes            | prevent_delete         |
| openclaw.sync_runs             | Yes          | Yes            | prevent_delete         |
| openclaw.flyer_archive         | Yes          | Yes            | prevent_delete         |
| openclaw.zip_centroids         | Yes          | Yes            | prevent_delete_generic |
| openclaw.usda_price_baselines  | Yes          | Yes            | prevent_delete         |
| openclaw.canonical_ingredients | Yes          | Yes            | prevent_delete_generic |
| openclaw.source_manifest       | Yes          | Yes            | prevent_delete         |
| openclaw.usda_fdc_products     | Yes          | Yes            | prevent_delete         |
| openclaw_leads                 | Yes          | Yes            | prevent_delete         |
| openclaw_market_stats          | Yes          | Yes            | prevent_delete         |
| ingredient_price_history       | Yes          | Yes            | prevent_delete         |

**Total: 16 tables, 32 triggers. Zero gaps.**
