# OpenClaw Autonomy Boundaries

> Single source of truth for what OpenClaw does on its own vs. what requires human involvement.
> Last updated: 2026-04-05

---

## Fully Autonomous (No Human Approval)

These operations run on cron with zero human interaction.

### Pi-Side (Raspberry Pi, 53 cron jobs)

| Operation                           | Schedule                       | Writes To                       | Guardrails                      | On Failure                     |
| ----------------------------------- | ------------------------------ | ------------------------------- | ------------------------------- | ------------------------------ |
| Flipp API scrape                    | 3:00 AM daily                  | `prices.db` (SQLite)            | Append/upsert only              | Logs error, next run retries   |
| Whole Foods (Amazon ALM)            | 5:00 AM daily                  | `prices.db`                     | Append/upsert only              | Logs error, skips              |
| Target Redsky API                   | 6:00 AM daily                  | `prices.db`                     | Append/upsert only              | Logs error, skips              |
| Walmart scrape                      | 6:30 AM daily                  | `prices.db`                     | Append/upsert only              | Logs error, skips              |
| Stop & Shop                         | 7:00 AM Tue/Thu/Sat            | `prices.db`                     | Append/upsert only              | Logs error, skips              |
| Instacart (20 chains, 4 slots/day)  | 7:30 AM / 12 PM / 5 PM / 10 PM | `prices.db`                     | Append/upsert only              | Logs error, skips chain        |
| Government data (BLS, FRED, USDA)   | 2:00 AM Mon                    | `prices.db`                     | Append/upsert only              | Logs error, weekly retry       |
| Open Food Facts enricher            | 2:00 PM Sun                    | `prices.db`                     | 50-error threshold, then stops  | Stops enrichment run           |
| Wholesale catalog                   | 3:00 PM Wed                    | `prices.db`                     | Append/upsert only              | Logs error, skips              |
| Cross-match (4 rounds/day)          | 4 AM / 11 AM / 8 PM / 10:30 PM | `prices.db`                     | Read-only matching              | Logs error, skips round        |
| Aggregator (trends, aging, anomaly) | 9:00 PM daily                  | `prices.db`                     | Append-only analytics           | Logs error, skips              |
| Watchdog                            | Every 15 min                   | stdout/logs                     | Flipp threshold: 192h           | Desktop alert on failure       |
| Receipt batch processing            | Every 30 min                   | `prices.db`                     | Append/upsert only              | Logs error, skips batch        |
| Docket processor (Groq AI)          | Every 10 min                   | `docket.db`, output `.md` files | Overlap detection, quality gate | Logs error, retries next cycle |
| Log rotation                        | Sun midnight                   | Log files                       | Rotates, does not delete data   | Logs error                     |

### PC-Side (Windows Task Scheduler)

| Operation                               | Schedule                        | Writes To                  | Guardrails                                                     | On Failure                               |
| --------------------------------------- | ------------------------------- | -------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| OpenClaw-Pull (Pi SQLite to PostgreSQL) | 6 AM + every 4h (6/10/14/18/22) | `openclaw.*` schema tables | Upsert only (ON CONFLICT), no DELETEs, 30-min timeout per step | Logs error, continues with existing data |
| Pipeline audit                          | 7:00 AM daily                   | `logs/pipeline-audit.log`  | Read-only comparison                                           | Logs results                             |

**Key fact:** All Pi scrapers write to SQLite only. They never touch ChefFlow PostgreSQL directly. The PC pull script is the only bridge.

---

## Requires Human Trigger (But No Approval Gate)

These run when a human starts them. No review step needed; the operation is safe by design.

| Operation            | How to Run                                          | What It Does                                    |
| -------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Full sync pipeline   | `node scripts/openclaw-pull/sync-all.mjs`           | Pull + normalize + price sync + refresh views   |
| Delta sync           | `node scripts/openclaw-pull/sync-all.mjs --delta`   | Incremental changes since last sync             |
| Manual price sync    | `node scripts/run-openclaw-sync.mjs`                | Fetch enriched prices from Pi API               |
| Pi patches           | `python scripts/openclaw-pull/patches/upgrade-*.py` | Deploy upgrades to Pi (9 patch scripts)         |
| Docket item creation | Via dashboard at Pi:8090/docket                     | Queue a new planning document for AI processing |
| Chef-triggered sync  | "Sync prices" button in ChefFlow UI                 | Calls same sync pipeline via server action      |
| Profile swap         | `bash F:/OpenClaw-Vault/swap.sh load <name>`        | Switch active OpenClaw profile on Pi            |

---

## Requires Human Approval

These operations need a human to review output before it takes effect.

| Operation               | What Happens Automatically                                                                   | What Needs Human Review                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Docket output documents | AI generates `.md` files on Pi, pull script copies them to `docs/specs/` or `docs/research/` | Developer must read, edit, and commit the document. Pulled files are not auto-committed. |
| Database migrations     | Migration SQL files are written by agents                                                    | `drizzle-kit push` requires explicit developer approval. Backup must run first.          |
| New scraper deployment  | Patch script deploys code to Pi                                                              | Developer triggers the patch. Cron entry added manually or via patch.                    |
| Price quarantine review | (Being built) Validator flags suspicious prices                                              | Developer reviews quarantined entries before they enter the price chain                  |

---

## Safety Guardrails (What Prevents Bad Data)

### Delete Guards (10 tables, PostgreSQL triggers)

Migration: `20260403000001_openclaw_no_delete_guard.sql`

Protected tables:

- `openclaw.chains`, `openclaw.stores`, `openclaw.products`, `openclaw.product_categories`
- `openclaw.store_products`, `openclaw.scrape_runs`, `openclaw.sync_runs`
- `openclaw_leads`, `openclaw_market_stats`, `ingredient_price_history`

Both `DELETE` and `TRUNCATE` are blocked. Bypass requires explicit transaction-scoped override (see Emergency Procedures).

### Existing ChefFlow Immutability Triggers

These protect core business tables even if OpenClaw code somehow referenced them:

- `ledger_entries` - append-only, mutation blocked
- `event_transitions` - append-only, mutation blocked
- `quote_state_transitions` - append-only, mutation blocked

### Sync Pipeline Safety

| Guardrail                  | How It Works                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Idempotent upserts         | All writes use `INSERT ... ON CONFLICT DO UPDATE`. Re-running is safe.                     |
| Read-only SQLite           | Pi database opened with `{ readonly: true }` during pull                                   |
| One-way data flow          | Pi to PC only. ChefFlow never writes back to Pi (except non-blocking catalog suggestions). |
| Pi unreachable = hard stop | Sync returns `{ success: false }`, no fallback writes                                      |
| 30-min timeout per step    | `sync-all.mjs` kills any step that runs longer than 30 minutes                             |
| Schema isolation           | OpenClaw data in `openclaw.*` schema, separate from core business tables                   |
| Non-blocking side effects  | Side effect failures (notifications, logs) never roll back main operations                 |

### Quality Controls (Pi-Side)

| Control                  | What It Does                                               |
| ------------------------ | ---------------------------------------------------------- |
| Food quality gate        | Filters non-food products from entering the pipeline       |
| Docket overlap detection | Prevents duplicate planning documents                      |
| Anomaly detector         | Flags price outliers (50K+ unacknowledged, needs consumer) |
| Growth tracker           | Hourly snapshots for regression detection                  |
| Watchdog                 | 15-min health checks with desktop alerts on failure        |

### Known Gaps

- No transaction boundaries on sync (partial sync possible, self-heals on next run)
- Shared database connection (no separate PostgreSQL role for OpenClaw)
- No automated write-scope test (enforced by code review, not automation)
- 50K+ unacknowledged price anomalies (no consumer built yet)

---

## Data Flow Diagram

```
Pi (Raspberry Pi)                          PC (Windows)                        UI
==================                         ==========                          ==

[53 Cron Scrapers]
       |
       | autonomous
       v
  prices.db (SQLite, 298MB)
  69K ingredients
  245K prices
       |
       | autonomous (every 4h, OpenClaw-Pull)
       v
  Pi sync API (:8081)
       |
       | autonomous (pull.mjs via Task Scheduler)
       v
                                    openclaw.* schema (PostgreSQL)
                                    7 tables, upsert-only
                                           |
                                           | autonomous (price sync step)
                                           v
                                    ingredient_price_history
                                    ingredients (price columns only)
                                           |
                                           | autonomous (materialized views)
                                           v
                                    regional_price_averages
                                    category_price_baselines
                                           |
                                           | autonomous (served on request)
                                           v
                                                                         Recipe costing
                                                                         Price trends
                                                                         Ingredient prices

  [Docket Processor]
       |
       | autonomous (AI generates docs)
       v
  docket output/ (.md files)
       |
       | autonomous (pulled to PC)
       v
                                    docs/specs/ or docs/research/
                                           |
                                           | GATED (human must review + commit)
                                           v
                                                                         Committed to repo
```

---

## Emergency Procedures

### Pause All OpenClaw Operations

**On Pi (stop all scrapers and services):**

```bash
ssh pi
crontab -e   # Comment out all openclaw lines, or:
crontab -l > ~/crontab-backup.txt && crontab -r   # Remove all cron (nuclear option)
sudo systemctl stop openclaw-sync-api
sudo systemctl stop openclaw-dashboard
```

**On PC (stop all scheduled pulls):**

```powershell
Disable-ScheduledTask -TaskName "OpenClaw-Pull"
```

**Resume:** Reverse the steps. Restore crontab from `~/crontab-backup.txt` if removed.

### Roll Back Bad Data

**Remove bad price history entries:**

```sql
BEGIN;
SET LOCAL app.allow_openclaw_delete = 'true';
DELETE FROM ingredient_price_history
  WHERE source LIKE 'openclaw_%'
  AND purchase_date = '2026-04-05';  -- target the bad sync date
COMMIT;
```

**Reset ingredient prices to pre-sync state:**

```sql
UPDATE ingredients
SET last_price_cents = NULL,
    last_price_date = NULL,
    last_price_source = NULL,
    last_price_store = NULL
WHERE last_price_source LIKE 'openclaw_%';
```

**Re-sync from clean Pi data after fixing the source:**

```bash
node scripts/openclaw-pull/sync-all.mjs
```

### Emergency Deletes on Pi (Maintenance Override)

The `_maintenance_override` table on Pi provides a controlled escape hatch for deleting data from guarded tables.

```bash
ssh pi
cd ~/openclaw-prices
sqlite3 data/prices.db
```

```sql
-- Check what's in the override table
SELECT * FROM _maintenance_override;

-- Enable maintenance mode for a specific operation
INSERT INTO _maintenance_override (reason, operator) VALUES ('removing corrupt batch', 'david');

-- Perform the delete
DELETE FROM store_products WHERE scrape_run_id = 'corrupt-run-id';

-- Disable maintenance mode
DELETE FROM _maintenance_override;
```

### Check Quarantine Table for Rejected Prices

```bash
ssh pi
cd ~/openclaw-prices
sqlite3 data/prices.db
```

```sql
-- View quarantined prices (flagged as suspicious)
SELECT * FROM price_anomalies WHERE acknowledged = 0 ORDER BY detected_at DESC LIMIT 20;

-- Count unacknowledged anomalies
SELECT COUNT(*) FROM price_anomalies WHERE acknowledged = 0;

-- Acknowledge after review
UPDATE price_anomalies SET acknowledged = 1 WHERE id = <anomaly_id>;
```

### Verify Sync Health

```bash
# Check last sync timestamp
cat scripts/openclaw-pull/.last-sync-time

# Run pipeline audit
node scripts/pipeline-audit.mjs

# Check sync logs
cat .openclaw-deploy/logs/pull.log | tail -50
```
