# HANDOFF: OpenClaw-to-Hermes Migration Planning

**Context:** This prompt continues a crashed session. Two deep-research agents completed their work but results never reached the developer. All research has been recovered and is summarized below. Pick up exactly where we left off: the developer has decided to retire OpenClaw and consolidate under Hermes.

---

## DEVELOPER INTENT (verbatim from crashed session)

1. "Hermes is far better than OpenClaw, through and through."
2. "We need to form a plan to stop using OpenClaw and transfer everything to Hermes."
3. "Do massive research on both to find the pros and cons. But all of tech is saying Hermes killed OpenClaw."
4. "Yes, Hermes replaces OpenClaw as the umbrella. We also need to run MORE Hermes agents in parallel so we don't overload them."

## RESEARCH COMPLETED (recovered from crash)

Two parallel agents exhaustively mapped both systems. Key findings:

### OpenClaw: Deeply Embedded, Currently Broken

**What it owns:**

- `openclaw.*` PostgreSQL schema: 20+ tables (chains, stores, products, store_products, canonical_ingredients, ingredient_variants, normalization_map, scrape_jobs, quarantined_prices, price_anomalies, expansion_targets, resolved_prices, pricing_regions, ingredient_census, census_coverage, price_predictions, method_weights, regional_bias_corrections, confidence_calibration, chef_price_feedback, usda_price_baselines)
- Pi SQLite DB: `prices.db` (WAL mode, ~442MB, 19 tables, ~245K prices, ~9,270 canonical ingredients)
- 3 Pi systemd services: sync-api (8081), receipt-processor (8082), dashboard (8090)
- 130+ Pi cron jobs: 11 synthesizers, 8+ scrapers, 4 Instacart walkers, cross-match, enrichers, catalog cleaning, aggregator, OSM backfill, SNAP retailer ingest
- Pi Price Bridge (port 7700): live ethernet API, 1.1M prices, tier 2.7 in resolve-price.ts
- 30+ ChefFlow app routes consuming OpenClaw data
- Core lib code: `lib/openclaw/` (enrichment, archive digester), `lib/pricing/` (5+ files with hard-coded openclaw.\* queries)
- AI integration: Remy fetches price drops, cost impact, stock from Pi API at `http://10.0.0.177:8081`
- Scripts: `scripts/openclaw-pull/` (sync-all.mjs, pull.mjs, auto-sync daemon), 30+ scraper/patch scripts
- `.openclaw-deploy/` directory: Instacart/store-locator automation (Puppeteer)
- `.openclaw-build/` directory: editable mirror of Pi source code
- 40+ docs/specs/research files

**Current state: BROKEN**

- `docs/sync-status.json` (2026-05-23): STATUS FAILED, 10 consecutive failures, `last_success_at: null`
- Pi unreachable: SSH connection refused to 10.0.0.177:22
- Only 2 of 10 sync steps succeed (both local-only: normalization sync, ingredient knowledge enrichment)

**What breaks if removed without replacement:**

- All pricing intelligence (store comparisons, trends, anomalies, seasonal)
- Remy AI context (price drops, cost impact, stock alerts)
- Event money tabs, recipe costing
- Price catalog pages (chef + admin + public)
- Store inventory browser
- PIE accuracy checks, trends, health
- Prospecting page
- Dashboard pricing section
- Seasonal calendar pricing context
- Census coverage metrics

### Hermes: Lightweight Monitor, Still Running

**What it owns:**

- Night shift operator: 10 cron jobs in WSL2 (health pulse 15m, OpenClaw freshness 2h, DB health 2h, git changelog 4h, disk resources 4h, error scan 1h, build state 6h, backup 12h, morning report daily, weekly digest)
- Windows Task Scheduler watchdog: `hermes-watchdog.ps1` every 5 min
- Discord bot: `scripts/hermes/discord-bot.mjs` with slash commands
- `hermes-normalizer.ts`: Hermes 3 8B via Ollama for ingredient name normalization (batch size 20)
- Output directory: `docs/hermes/` (19 files: morning-report.md, ALERTS.md, health-pulse.jsonl, etc.)
- Persona-pairing subsystem (5 daemon processes, currently broken: `node: command not found` in WSL)

**Current state: RUNNING (as of 2026-05-21)**

- Morning report compiled, alerts logging, health pulse appending every 15 min
- Detecting: ChefFlow server down, OpenClaw sync stale (66-84h), C: drive 97-98% full, Pi intermittently unreachable

**What Hermes is NOT:**

- Not a multi-agent system (independent bash scripts on cron, no swarm orchestration)
- Not a data pipeline (no scraping, no price collection, no synthesis)
- Not a database owner (produces markdown/JSONL reports, no tables)
- Has no parallelization model (sequential cron, no worker pool)

### Decision Memo (2026-04-23): Previously Recommended AGAINST Hermes

File: `docs/research/2026-04-23-hermes-vs-openclaw-decision-memo.md`

That memo said: "Do not deploy Hermes for ChefFlow V1. The only material deltas are Hermes' learning loop, wider execution backends, and API surface. None improve ChefFlow's current bottleneck." Hermes was deployed anyway in reduced read-only monitoring role (2026-05-03).

### Migration Spec Exists But Not Executed

File: `docs/specs/openclaw-hermes-migration.md`

Plans Docker Compose migration: OpenClaw engine + dashboard + Ollama in containers on PC, Pi demoted to watchdog/backup. Status: PROMPT READY, never executed.

---

## THE REAL SITUATION (analysis for the new agent)

The developer says "Hermes killed OpenClaw." The technical reality is more nuanced:

1. **OpenClaw's infrastructure collapsed** (Pi unreachable, sync broken for days)
2. **Hermes is still running** (the only autonomous system producing value)
3. **The developer correctly concludes:** the thing that works beats the thing that doesn't

But Hermes currently has NONE of OpenClaw's data capabilities. "Transfer everything to Hermes" means one of:

- **Option A:** Hermes becomes the umbrella brand. OpenClaw's pipelines, data, and scripts get rebuilt/migrated under Hermes management (Docker on PC per existing migration spec). Hermes agents orchestrate what OpenClaw cron jobs used to do.
- **Option B:** Hermes absorbs the monitoring/ops role permanently. OpenClaw's data assets (prices.db, scrapers, synthesizers) are migrated to PC infrastructure independent of both brands. Hermes watches it all.
- **Option C:** Full rebuild. New pipeline architecture designed from scratch under Hermes identity, using Hermes 3 8B for normalization, new scraper orchestration, new data flow.

The developer's second request ("run MORE Hermes agents in parallel") suggests Option A or C: expand Hermes into an agentic orchestration layer where parallel Hermes agents handle scraping, synthesis, monitoring, and reporting.

---

## WHAT THE NEW AGENT SHOULD DO

### Phase 1: Confirm Direction

Present the three options above to the developer. Get a clear decision before planning.

### Phase 2: Inventory the Migration Surface

Based on choice, map every file that needs to change. The blast radius is significant:

- 20+ PostgreSQL tables in `openclaw.*` schema
- 5+ `lib/pricing/` files with hard-coded openclaw queries
- 30+ app routes rendering openclaw data
- Remy AI context fetching from Pi API
- 130+ Pi cron jobs
- 3 Pi systemd services
- All sync scripts in `scripts/openclaw-pull/`
- All scraper scripts (30+)
- Navigation configs referencing openclaw
- Admin pages for openclaw health/quarantine/review
- Environment variables (OPENCLAW_API_URL, etc.)
- 10+ database migrations
- 40+ docs referencing openclaw

### Phase 3: Design the Target Architecture

- Where does data live? (Docker on PC per migration spec? New location?)
- What orchestrates scraping? (Hermes agents? Node cron in container? Both?)
- How does ChefFlow consume prices? (Same REST API contract? Direct DB? New interface?)
- Parallelization model for Hermes agents (the developer explicitly wants this)
- What happens to the Pi? (Watchdog? Decommission? Backup?)

### Phase 4: Migration Plan

Phased, reversible, data-safe. OpenClaw has 245K+ prices and 9,270 canonical ingredients. Data loss is unacceptable (see CLAUDE.md data safety rules). The plan must:

- Never delete Pi data
- Maintain price resolution during transition
- Keep PIE operational
- Preserve all synthesis pipeline outputs
- Have rollback at each phase

---

## KEY FILES TO READ

| File                                                           | Why                                              |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `docs/research/2026-04-23-hermes-vs-openclaw-decision-memo.md` | Full prior analysis, pros/cons, kill criteria    |
| `docs/specs/openclaw-hermes-migration.md`                      | Existing Docker migration spec (never executed)  |
| `docs/specs/hermes-night-shift-spec.md`                        | What Hermes does today, job definitions, SOUL.md |
| `lib/pricing/resolve-price.ts`                                 | 8-tier price resolution, OpenClaw integration    |
| `scripts/openclaw-pull/sync-all.mjs`                           | Full sync orchestrator                           |
| `docs/sync-status.json`                                        | Current sync state (FAILED)                      |
| `memory/project_hermes_setup.md`                               | Hermes setup history                             |
| `memory/project_pi_price_bridge.md`                            | Price Bridge architecture                        |
| `memory/project_pie_identity.md`                               | PIE = 5-layer pricing infrastructure             |
| `memory/project_pie_laws.md`                                   | 10 immutable PIE laws                            |
| `CLAUDE.md`                                                    | Project rules, data safety, no-cloud mandate     |

## CONSTRAINTS

- Self-hosted only. No cloud providers, no hosted DBs, no S3, no monthly bills. (CLAUDE.md absolute rule)
- Single Ollama-compatible AI endpoint. No second provider.
- Data loss is unacceptable. Live production app with real client data.
- OpenClaw must not appear on user-facing surfaces (already a rule).
- Pi exists to work. Push it harder if keeping it.
- Developer speaks business language, not engineering. Translate.

## SESSION STATE

- No code changes made in the crashed session
- No commits from the crashed session
- No plans written
- Research is complete (summarized above)
- Next step: present options to developer, get direction, then plan
