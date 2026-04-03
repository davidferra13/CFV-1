# Research: OpenClaw Failure Modes, Destructive Risk, and Safeguard Audit

> **Date:** 2026-04-03
> **Question:** Can OpenClaw bypass its operational scope and corrupt the ChefFlow database, autonomously delete project data, or cause regressions? What safeguards exist, and where are the gaps?
> **Status:** complete

## Origin Context

Concerns were raised about AI-managed systems making critical, destructive errors: bypassing operational scope to corrupt databases, autonomously deleting or overwriting project data, and causing constant regressions. The developer wants a thorough assessment of whether OpenClaw's architecture actually protects against these failure modes, or whether the system is vulnerable to the "horror stories" described.

## Summary

**OpenClaw cannot autonomously corrupt the ChefFlow database in the way described.** The system is a passive, pull-based data pipeline that runs on a Raspberry Pi and feeds pricing data into isolated `openclaw.*` schema tables via scheduled scripts. It has no autonomous decision-making, no self-modifying code, no ability to spawn repair loops, and no write access to ChefFlow's core business tables (events, clients, quotes, ledger) through its own code paths.

However, there are real architectural gaps: the sync pipeline lacks transaction boundaries, the `openclaw.*` schema shares the same database connection as the application, and there are no PostgreSQL role-based write restrictions preventing application code from accidentally writing to OpenClaw tables (or vice versa). These are design-time risks, not runtime autonomy risks.

## Detailed Findings

### 1. Architecture: OpenClaw Is Not an Autonomous Agent

OpenClaw is a **data collection pipeline**, not an autonomous AI agent. It consists of:

| Component   | Location                                | What It Does                          | Autonomy Level                         |
| ----------- | --------------------------------------- | ------------------------------------- | -------------------------------------- |
| Pi scrapers | Raspberry Pi (10.0.0.177)               | Scrape retail prices, store in SQLite | Cron-scheduled, no decision-making     |
| Pull script | `scripts/openclaw-pull/pull.mjs`        | Download SQLite, upsert to PostgreSQL | Manual or Windows Scheduled Task       |
| Price sync  | `lib/openclaw/sync.ts`                  | Fetch enriched prices from Pi API     | Triggered by cron route or chef action |
| Dashboard   | `scripts/openclaw-dashboard/server.mjs` | Real-time monitoring                  | Read-only display                      |

**Critical distinction:** OpenClaw has zero autonomous judgment. It does not "encounter a bug and decide to fix it." It does not interpret errors and take corrective action. If a sync fails, it logs the error and stops (`sync.ts:521-525`). If the Pi is unreachable, it returns `{ success: false }` (`sync.ts:331-339`). There is no self-repair, no retry loop, and no fallback that writes to different tables.

### 2. Schema Isolation: What OpenClaw Can and Cannot Touch

**OpenClaw's own schema** (`database/migrations/20260401000119_openclaw_inventory_schema.sql:5`):

```sql
CREATE SCHEMA IF NOT EXISTS openclaw;
```

OpenClaw data lives in 7 dedicated tables: `openclaw.chains`, `openclaw.stores`, `openclaw.products`, `openclaw.product_categories`, `openclaw.store_products`, `openclaw.scrape_runs`, `openclaw.sync_runs`.

**What OpenClaw sync writes to ChefFlow tables:**

The price sync (`lib/openclaw/sync.ts:395-413`) writes to two ChefFlow application tables:

1. **`ingredient_price_history`** - INSERT with ON CONFLICT upsert (dedup by unique index). Append-only by design.
2. **`ingredients`** - UPDATE of price metadata columns only: `last_price_cents`, `last_price_date`, `price_unit`, `last_price_source`, `last_price_store`, `last_price_confidence`, `price_trend_direction`, `price_trend_pct` (`sync.ts:432-443`).

**What OpenClaw CANNOT touch:**

- `events`, `event_transitions` - FSM-protected, immutability triggers
- `clients`, `conversations`, `messages` - no OpenClaw code path references these
- `quotes`, `quote_line_items`, `quote_state_transitions` - immutability triggers
- `ledger_entries` - immutability trigger, append-only
- `chefs`, `user_roles`, `auth.*` - no OpenClaw code path references these
- `recipes`, `menus`, `menu_items` - no OpenClaw code path references these

There is no code path in any OpenClaw file that runs `DELETE`, `DROP`, or `TRUNCATE` on any table.

### 3. Data Flow Is One-Way (Pi -> PC, Never Reverse)

The pull script (`scripts/openclaw-pull/pull.mjs:191`) opens the downloaded SQLite in **read-only mode**:

```js
const sqlite = new Database(dbPath, { readonly: true })
```

The only write-back to the Pi is a non-blocking catalog suggestion (`sync.ts:213-225`), which sends unmatched ingredient names via POST. This is a suggestion, not a data modification. If it fails, it's silently ignored.

**OpenClaw never writes to ChefFlow's core business data. ChefFlow never writes to the Pi's SQLite.**

### 4. The "Horror Stories" Do Not Map to OpenClaw's Architecture

| Reported Concern                                             | OpenClaw Reality                                                                                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Encountered a bug, bypassed scope, modified database"       | OpenClaw has no error-handling logic that "decides" to write to different tables. Errors return `{ success: false }` or log warnings. No corrective write paths exist. |
| "Autonomously deleting or overwriting critical project data" | No OpenClaw code runs `DELETE` on any ChefFlow table. Price syncs use `INSERT ... ON CONFLICT DO UPDATE` (upsert), which updates existing rows but never deletes.      |
| "Constant regression rather than progress"                   | OpenClaw sync is idempotent. Running it twice produces the same result. The ON CONFLICT clauses (`pull.mjs:243`, `sync.ts:406`) ensure deterministic outcomes.         |
| "Lack of control and predictability"                         | Every OpenClaw operation is triggered by explicit action (cron job, manual script, chef-initiated sync). Nothing runs autonomously or self-modifies.                   |

### 5. Real Gaps That Do Exist

While the horror scenarios don't apply, these genuine architectural gaps were found:

#### Gap A: No Transaction Boundaries on Sync Operations

**Severity: Medium**

The sync pipeline (`sync.ts:283-526`, `pull.mjs:159-719`) runs individual INSERT/UPDATE statements without wrapping them in a database transaction. If a sync fails mid-way (network drop, process kill, OOM):

- Some ingredients get updated prices, others don't
- `ingredient_price_history` has partial entries for that sync run
- Recipe costing becomes temporarily inconsistent

**Mitigation:** The sync is idempotent. Re-running it fills in the gaps. But there's no automatic recovery; someone must notice and re-trigger.

**Impact:** Temporarily inconsistent pricing data. Not data corruption or deletion. Self-heals on next successful sync.

#### Gap B: Shared Database Connection (No Role Isolation)

**Severity: Low-Medium**

OpenClaw server actions (`lib/openclaw/*.ts`) use the same `db` import from `lib/db/index.ts` as all ChefFlow application code. There is no separate PostgreSQL role with restricted permissions for OpenClaw operations.

**What this means:** A bug in OpenClaw server action code could theoretically execute arbitrary SQL against any table, not just `openclaw.*`. This is a code-quality risk, not a runtime autonomy risk. OpenClaw code doesn't contain such queries, but there's no database-level enforcement preventing it.

**Recommendation:** Create a dedicated PostgreSQL role (`openclaw_sync`) with:

- `SELECT, INSERT, UPDATE` on `openclaw.*` tables
- `INSERT` on `ingredient_price_history`
- `UPDATE (last_price_cents, last_price_date, price_unit, last_price_source, last_price_store, last_price_confidence, price_trend_direction, price_trend_pct)` on `ingredients`
- No permissions on any other table

#### Gap C: No Immutability Trigger on `ingredient_price_history`

**Severity: Low**

Unlike `ledger_entries` and `quote_state_transitions`, `ingredient_price_history` has no immutability trigger. The ON CONFLICT clause in `sync.ts:406-412` performs UPDATE on duplicate entries. While this is intentional (updating today's price for the same store/source), it means historical price data can be silently overwritten.

**Recommendation:** Add a `last_modified_at` timestamp that updates on every change, providing an audit trail.

#### Gap D: RLS Only on Lead Tables, Not Inventory Schema

**Severity: Low**

`openclaw_leads` and `openclaw_market_stats` have RLS policies (`20260401000083_openclaw_leads.sql`). The core `openclaw.*` schema tables (chains, stores, products, store_products) do not have RLS. Since these are queried via server actions that require `requireChef()`, the practical risk is minimal, but a defense-in-depth gap exists.

### 6. Existing Safeguards (What's Already Working)

| Safeguard                                           | Location                                                         | Effectiveness                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Schema separation (`openclaw.*`)                    | `20260401000119_openclaw_inventory_schema.sql:5`                 | Strong: logical boundary                                                  |
| Read-only SQLite access                             | `pull.mjs:191`                                                   | Strong: Pi data cannot be corrupted by pull                               |
| Auth on all server actions                          | `sync.ts:544` (`requireChef()`), cron routes use `CRON_SECRET`   | Strong                                                                    |
| Idempotent upserts (ON CONFLICT)                    | `pull.mjs:243`, `sync.ts:406`                                    | Strong: re-runs are safe                                                  |
| Non-blocking side effects                           | `sync.ts:480-510` (fire-and-forget with catch)                   | Good: failures don't cascade                                              |
| Pi unreachable = hard stop                          | `sync.ts:331-339`                                                | Good: no fallback writes                                                  |
| 15 Never-Do Rules                                   | `docs/specs/openclaw-non-goals-and-never-do-rules.md`            | Good: policy-level guardrail                                              |
| Rule 9: No unbounded agent spawning                 | `openclaw-non-goals-and-never-do-rules.md:160-169`               | Good: explicitly prohibits autonomous code-writing                        |
| Rule 10: Never destroy without verified replacement | `openclaw-non-goals-and-never-do-rules.md:172-177`               | Good: additive-before-substitutive mandate                                |
| Immutability triggers on core tables                | `ledger_entries`, `event_transitions`, `quote_state_transitions` | Strong: even if OpenClaw somehow wrote to these, the triggers would block |
| Food quality gate                                   | `20260401000145_openclaw_food_quality_gate.sql`                  | Good: filters non-food products                                           |

### 7. Historical Incident Evidence

**No recorded incidents of OpenClaw data corruption exist in this repository.** The incident response plan (`docs/incident-response.md`) defines P0 severity as "data loss occurring" but contains no actual incident logs. No post-mortem files exist in the repo. The session log (`docs/session-log.md`) contains no entries describing OpenClaw-caused regressions.

## Gaps and Unknowns

1. **No runtime monitoring of sync consistency.** If a partial sync occurs, there's no alert. The dashboard monitors scraper health, not sync completeness.
2. **No automated test for OpenClaw write scope.** No test verifies that OpenClaw code only touches the tables it should. This is enforced by code review, not automation.
3. **The described "horror stories" more closely match AI coding agent behavior (Codex, Claude Code) than OpenClaw's actual architecture.** The pattern of "encountering a bug and autonomously modifying the database to fix it" describes an agentic coding tool, not a scheduled data pipeline. It may be worth clarifying whether the reported concerns are about OpenClaw the pipeline, or about AI coding agents operating on OpenClaw-related code.

## Recommendations

### Quick Fixes

1. **Add a sync consistency check** to the health endpoint. After each sync, compare `openclaw.sync_runs.prices_synced` against `COUNT(*) FROM ingredient_price_history WHERE purchase_date = today`. Alert if mismatch exceeds 10%.

2. **Add `last_modified_at` to `ingredient_price_history`** so overwrites are traceable.

3. **Log every sync run to `docs/session-log.md` or a dedicated sync log** so partial syncs are visible.

### Needs a Spec

4. **Create a dedicated PostgreSQL role for OpenClaw sync operations** with column-level write restrictions. This is the single most impactful hardening step. It converts the current "trust the code" model into "enforce at the database level."

5. **Wrap the sync pipeline in a transaction** with savepoints per batch. On failure, roll back incomplete batches rather than leaving partial state.

### Needs Discussion

6. **Clarify the actual source of the reported incidents.** The described behaviors (autonomous database modification, data deletion, constant regression) do not match OpenClaw's passive pipeline architecture. If these incidents occurred, they were more likely caused by an AI coding agent (Codex, Claude Code) making bad edits to OpenClaw-related code, not by OpenClaw itself operating destructively. Understanding the true root cause determines whether the fix is architectural (hardening the pipeline) or procedural (tightening agent guardrails).
