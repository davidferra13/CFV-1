# Spec: OpenClaw Ideal Runtime and National Intelligence

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `openclaw-canonical-scope-and-sequence.md`, `openclaw-internal-only-boundary-and-debranding.md`, `openclaw-inventory-evolution.md`, `openclaw-data-completeness-engine.md`, `openclaw-total-capture.md`, `openclaw-mission-control.md`
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                | Agent/Session   | Commit |
| --------------------- | ------------------- | --------------- | ------ |
| Created               | 2026-04-02 21:34 ET | Planner (Codex) |        |
| Status: ready         | 2026-04-02 21:34 ET | Planner (Codex) |        |
| Claimed (in-progress) |                     |                 |        |
| Spike completed       |                     |                 |        |
| Pre-flight passed     |                     |                 |        |
| Build completed       |                     |                 |        |
| Type check passed     |                     |                 |        |
| Build check passed    |                     |                 |        |
| Playwright verified   |                     |                 |        |
| Status: verified      |                     |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer said the current OpenClaw system is good, but nowhere near good enough for what it could be doing over a full year. They want an explicit plan for the ideal runtime, not a flattering description of the current one.

They called out four missing ambitions very clearly:

1. OpenClaw should be building a full directory instead of barely doing a few things.
2. Covering only three states is bizarrely small compared to the real opportunity.
3. The system should use serious math to estimate what almost anything should cost anywhere in the country, not just replay a tiny regional scrape loop.
4. OpenClaw should have constantly running internal agents working on source discovery, repair, coverage expansion, and pricing logic, including a meta-level agent that notices failures and routes work to the right specialist.

They specifically want this planning doc to say, in plain terms, that the current version mostly keeps refreshing a limited footprint, while the ideal version would become a self-expanding national pricing intelligence engine. The goal is to plan exactly how that ideal OpenClaw should run.

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** Turn OpenClaw from a bounded regional scrape rig into an internal national pricing intelligence control plane with a full source directory, a coverage map, a formula-first inference engine, and self-healing operational loops.
- **Key constraints:** Keep OpenClaw internal-only and founder-facing; do not expose raw OpenClaw branding or internals to chef/public product surfaces; preserve additive migrations only; keep direct observations authoritative; do not replace math with opaque AI guesses.
- **Motivation:** The current runtime proves the concept, but it mostly densifies known coverage instead of systematically expanding across the country, repairing stale areas, and estimating missing prices with disciplined confidence.
- **Success from the developer's perspective:** OpenClaw continuously grows a national source directory, decides what should be scanned next, estimates missing prices with explicit evidence and confidence, notices stale or broken sources automatically, routes recovery work to bounded specialist agents, and gives the founder a truthful internal mission-control view of all of that.

---

## What This Does (Plain English)

This spec defines the ideal future OpenClaw runtime as an internal control plane. Instead of only running fixed scrapers on a regional loop, OpenClaw becomes a national source-directory engine with four always-on layers: direct observation, source coverage tracking, price inference, and bounded specialist agents. Founder-only internal surfaces get a real runtime console that shows what sources exist, what geography is covered, what is inferred versus observed, what is stale or broken, and which agents are working on each gap. ChefFlow continues consuming the results without exposing OpenClaw internals publicly.

---

## Why It Matters

The current system is useful because it captures real grocery price data, but it is still structurally optimized for repeated refreshes of a narrow footprint. That leaves national coverage, source discovery, gap repair, and price estimation underpowered even though the surrounding app and specs already point toward a much larger intelligence system.

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                                  | Purpose                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.openclaw-build/services/runtime-orchestrator.mjs`   | Main control-plane scheduler that ranks sources, coverage gaps, and repair work, then enqueues tasks |
| `.openclaw-build/services/source-discovery-agent.mjs` | Expands the national source directory with new chains, stores, markets, and source surfaces          |
| `.openclaw-build/services/source-repair-agent.mjs`    | Re-tests stale or broken sources, records incidents, and restores source health                      |
| `.openclaw-build/services/price-inference-engine.mjs` | Computes formula-based price estimates for uncovered ingredient/geography combinations               |
| `.openclaw-build/services/meta-agent.mjs`             | Reviews queue state, incidents, and coverage drift, then nudges the right specialist agents          |
| `lib/openclaw/runtime-control-actions.ts`             | Founder-only server actions that expose runtime, directory, coverage, incident, and inference views  |
| `components/admin/openclaw-runtime-console.tsx`       | Founder-only internal console for the live OpenClaw runtime                                          |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                       | What to Change                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `.openclaw-build/lib/db.mjs`               | Add additive control-plane tables and directory columns to the Pi SQLite runtime schema                   |
| `.openclaw-build/services/aggregator.mjs`  | Roll up direct-observation coverage into geography-cell coverage facts and inference freshness summaries  |
| `.openclaw-build/services/watchdog.mjs`    | Promote stale/broken-source detection into durable incidents and queue nudges instead of log-only alerts  |
| `.openclaw-build/services/sync-api.mjs`    | Expose runtime overview, source directory, agent runs, incidents, coverage, and inference audit endpoints |
| `.openclaw-deploy/crontab-v7.txt`          | Add orchestrator and agent cadences; reduce fixed re-scan bias in favor of queue-driven expansion logic   |
| `scripts/openclaw-dashboard/server.mjs`    | Surface agent health, coverage cells, incidents, and inference status for mission-control parity          |
| `app/(admin)/admin/openclaw/page.tsx`      | Keep founder-only gate, but load a live runtime console instead of a static usage-only page               |
| `components/admin/openclaw-usage-page.tsx` | Convert the current static page into a hybrid policy + live runtime console without losing boundary copy  |

---

## Database Changes

_If no DB changes, write "None" and skip the subsections._

This spec adds new runtime schema to the Pi SQLite database and extends the existing `source_registry`. No PostgreSQL migration is required in this first runtime-control slice.

### New Tables

```sql
CREATE TABLE IF NOT EXISTS coverage_cells (
  cell_id TEXT PRIMARY KEY,
  geography_type TEXT NOT NULL CHECK (geography_type IN ('zip', 'metro', 'state', 'region')),
  geography_key TEXT NOT NULL,
  city TEXT,
  state TEXT,
  county TEXT,
  region TEXT,
  lat REAL,
  lon REAL,
  active_source_count INTEGER NOT NULL DEFAULT 0,
  current_source_count INTEGER NOT NULL DEFAULT 0,
  direct_price_count INTEGER NOT NULL DEFAULT 0,
  inferred_price_count INTEGER NOT NULL DEFAULT 0,
  distinct_ingredient_count INTEGER NOT NULL DEFAULT 0,
  last_direct_observation_at TEXT,
  last_inference_at TEXT,
  coverage_score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'seeded', 'partial', 'strong', 'stale')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (geography_type, geography_key)
);

CREATE INDEX IF NOT EXISTS idx_coverage_cells_status
  ON coverage_cells(status);
CREATE INDEX IF NOT EXISTS idx_coverage_cells_state
  ON coverage_cells(state);
CREATE INDEX IF NOT EXISTS idx_coverage_cells_region
  ON coverage_cells(region);

CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('orchestrator', 'discovery', 'repair', 'math', 'coverage', 'meta')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial', 'skipped')),
  started_at TEXT,
  finished_at TEXT,
  duration_ms INTEGER,
  parent_run_id TEXT,
  host_name TEXT,
  input_json TEXT,
  output_json TEXT,
  error_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_type_started
  ON agent_runs(agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status
  ON agent_runs(status);

CREATE TABLE IF NOT EXISTS agent_tasks (
  task_id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL CHECK (task_type IN ('discover_source', 'crawl_source', 'repair_source', 'infer_price', 'recompute_cell', 'verify_source')),
  preferred_agent_type TEXT NOT NULL CHECK (preferred_agent_type IN ('discovery', 'repair', 'math', 'coverage', 'meta', 'orchestrator')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'succeeded', 'failed', 'dead_letter', 'skipped')),
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  source_id TEXT,
  cell_id TEXT,
  canonical_ingredient_id TEXT,
  payload_json TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  claimed_by_run_id TEXT,
  next_attempt_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_priority
  ON agent_tasks(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_source
  ON agent_tasks(source_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_cell
  ON agent_tasks(cell_id);

CREATE TABLE IF NOT EXISTS source_incidents (
  incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('stale', 'http', 'schema', 'auth', 'empty', 'quality', 'anomaly')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'suppressed', 'resolved')),
  summary TEXT NOT NULL,
  evidence_json TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_incidents_source
  ON source_incidents(source_id, status);
CREATE INDEX IF NOT EXISTS idx_source_incidents_opened
  ON source_incidents(opened_at DESC);

CREATE TABLE IF NOT EXISTS price_inference_cache (
  cache_id TEXT PRIMARY KEY,
  canonical_ingredient_id TEXT NOT NULL,
  geography_type TEXT NOT NULL CHECK (geography_type IN ('zip', 'metro', 'state', 'region', 'national')),
  geography_key TEXT NOT NULL,
  pricing_tier TEXT NOT NULL DEFAULT 'retail',
  price_cents INTEGER NOT NULL,
  price_unit TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  method TEXT NOT NULL CHECK (method IN ('regional_baseline', 'nearest_neighbor', 'chain_blend', 'seasonal_adjustment', 'hybrid_math')),
  based_on_direct_count INTEGER NOT NULL DEFAULT 0,
  based_on_region TEXT,
  model_version TEXT NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  UNIQUE (canonical_ingredient_id, geography_type, geography_key, pricing_tier, price_unit)
);

CREATE INDEX IF NOT EXISTS idx_price_inference_lookup
  ON price_inference_cache(canonical_ingredient_id, geography_type, geography_key, pricing_tier);
CREATE INDEX IF NOT EXISTS idx_price_inference_expires
  ON price_inference_cache(expires_at);
```

### New Columns on Existing Tables

```sql
ALTER TABLE source_registry ADD COLUMN country TEXT DEFAULT 'US';
ALTER TABLE source_registry ADD COLUMN county TEXT;
ALTER TABLE source_registry ADD COLUMN metro TEXT;
ALTER TABLE source_registry ADD COLUMN parent_source_id TEXT;
ALTER TABLE source_registry ADD COLUMN store_type TEXT DEFAULT 'retail';
ALTER TABLE source_registry ADD COLUMN directory_status TEXT NOT NULL DEFAULT 'known'
  CHECK (directory_status IN ('known', 'discovered', 'verified', 'blocked', 'retired'));
ALTER TABLE source_registry ADD COLUMN coverage_status TEXT NOT NULL DEFAULT 'uncovered'
  CHECK (coverage_status IN ('uncovered', 'partial', 'current', 'stale'));
ALTER TABLE source_registry ADD COLUMN priority_score REAL NOT NULL DEFAULT 0;
ALTER TABLE source_registry ADD COLUMN last_success_at TEXT;
ALTER TABLE source_registry ADD COLUMN next_recommended_scan_at TEXT;
ALTER TABLE source_registry ADD COLUMN supports_delivery INTEGER DEFAULT 0;
ALTER TABLE source_registry ADD COLUMN supports_pickup INTEGER DEFAULT 0;
ALTER TABLE source_registry ADD COLUMN supports_loyalty INTEGER DEFAULT 0;
ALTER TABLE source_registry ADD COLUMN supports_promos INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_source_registry_directory_status
  ON source_registry(directory_status);
CREATE INDEX IF NOT EXISTS idx_source_registry_coverage_status
  ON source_registry(coverage_status);
CREATE INDEX IF NOT EXISTS idx_source_registry_priority
  ON source_registry(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_source_registry_next_scan
  ON source_registry(next_recommended_scan_at);
```

### Migration Notes

- No `database/migrations/*.sql` file is required for this first slice because the new control-plane schema lives in the Pi SQLite runtime, initialized and migrated inside `.openclaw-build/lib/db.mjs`.
- The SQLite changes must remain additive. No table drops, destructive rewrites, or resets of existing price data are allowed.
- A later implementation spec may mirror selected control-plane facts into PostgreSQL, but that is not part of this slice.

---

## Data Model

The ideal runtime has five data planes, each with a different trust rule:

1. **Direct observation plane**
   `current_prices`, `price_changes`, receipt prices, and scraper outputs are authoritative observations. Nothing inferred may overwrite them.

2. **Source directory plane**
   `source_registry` becomes the national directory of known chains, stores, source surfaces, and source capabilities. This is where OpenClaw stops behaving like a tiny list of current jobs and starts behaving like a complete map of what still needs to be captured.

3. **Coverage plane**
   `coverage_cells` describes where coverage is strong, partial, stale, or absent by ZIP, metro, state, and region. The orchestrator uses this to decide whether the next job should refresh density or expand breadth.

4. **Agent plane**
   `agent_tasks` and `agent_runs` form the durable control plane. Agents do not invent new runtime behavior on the fly; they claim bounded tasks, emit evidence, and update status.

5. **Inference plane**
   `price_inference_cache` stores estimated prices for uncovered combinations. These rows are clearly separate from direct observations and must carry method, evidence count, and expiration.

Key constraints:

- Direct prices outrank inferred prices everywhere.
- Inferred prices must be queryable and auditable, not silently mixed into `current_prices`.
- The meta-agent may create tasks for existing agent types, but it may not generate arbitrary code or mutate runtime configuration without explicit developer approval.
- Coverage expansion wins over repeated low-value re-scrapes when a source or geography is under-covered.

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

| Action                                | Auth                                  | Input                                                    | Output                                                                      | Side Effects                                  |
| ------------------------------------- | ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| `getOpenClawRuntimeOverview()`        | `requireAdmin()` + founder-email gate | none                                                     | runtime summary with directory, coverage, incidents, queue, inference stats | None                                          |
| `getOpenClawSourceDirectory(filters)` | `requireAdmin()` + founder-email gate | `{ query?, state?, directoryStatus?, coverageStatus? }`  | paginated source rows with queue and incident facts                         | None                                          |
| `getOpenClawCoverageSummary(scope)`   | `requireAdmin()` + founder-email gate | `{ geographyType, geographyKey? }`                       | coverage-cell summaries and freshness rollups                               | None                                          |
| `getOpenClawAgentRuns(filters)`       | `requireAdmin()` + founder-email gate | `{ agentType?, status?, limit? }`                        | recent run history with task/result evidence                                | None                                          |
| `getOpenClawIncidents(filters)`       | `requireAdmin()` + founder-email gate | `{ sourceId?, status?, severity? }`                      | current and recent source incidents                                         | None                                          |
| `getOpenClawInferenceAudit(input)`    | `requireAdmin()` + founder-email gate | `{ canonicalIngredientId, geographyType, geographyKey }` | direct-price context, inferred price, method, confidence, expiry            | None                                          |
| `retryOpenClawSource(sourceId)`       | `requireAdmin()` + founder-email gate | `{ sourceId }`                                           | `{ success, queuedTaskId?, error? }`                                        | Enqueues a high-priority `repair_source` task |
| `recomputeOpenClawCoverage(cellId)`   | `requireAdmin()` + founder-email gate | `{ cellId }`                                             | `{ success, queuedTaskId?, error? }`                                        | Enqueues a `recompute_cell` task              |

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

This spec only authorizes founder-only internal UI on `/admin/openclaw`. No chef-facing or public-facing OpenClaw naming is added or restored.

### Page Layout

Replace the static usage-only page with a live internal runtime console that keeps the existing boundary copy at the top and adds six internal tabs below it:

1. **Overview**
   Global counts: known sources, queued tasks, running agents, open incidents, covered cells, inferred rows, newest scrape, newest inference, stale-source count.

2. **Directory**
   Filterable national source directory with chain/store/source rows, geography, capability flags, last success, next recommended scan, directory status, coverage status, priority score, and open-incident badge.

3. **Coverage**
   Geography rollup table with ZIP/metro/state/region scope, direct vs inferred counts, coverage score, last direct observation, and stale markers.

4. **Agents**
   Recent agent runs and queue state by agent type. Must show queued, running, failed, partial, and dead-letter counts separately.

5. **Incidents**
   Open and recent source incidents with severity, summary, last seen, and one-click retry for founder users.

6. **Inference**
   Ingredient + geography audit view that explicitly distinguishes direct observation from inferred estimate and shows method, confidence, evidence count, and expiry.

### States

- **Loading:** Skeleton cards and tables. Never show fake zeros while data is still loading.
- **Empty:** Show truthful internal empty states like `No incidents`, `No inferred prices yet`, or `No queued tasks`, not generic placeholders.
- **Error:** Show degraded but explicit internal messaging such as `Pi runtime unreachable`, `Runtime API timed out`, or `Inference audit unavailable`.
- **Populated:** Show live counts, status tags, timestamps, and evidence details with color-coded severity and freshness.

### Interactions

- Filtering the directory or incidents table updates data without a full-page reload.
- Clicking a source opens a detail drawer or inline panel showing capabilities, last runs, current incidents, and queued tasks.
- Clicking a coverage cell opens its direct-vs-inferred summary.
- Founder-only actions `Retry Source` and `Recompute Coverage` enqueue tasks; they do not run the repair work synchronously in the browser.
- Inference audit must always show the underlying direct evidence count and expiry. It may not present inferred rows as if they were scraped facts.

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                                  | Correct Behavior                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Pi runtime API is offline                                 | Founder console loads in degraded mode with explicit `runtime unreachable` state                                  |
| A source keeps failing and being retried repeatedly       | Create or update one open incident, increment failure evidence, and dead-letter the task after the retry budget   |
| Inference exists but there is no direct data in that area | Show the inferred result only with method, confidence, and evidence count, never as a direct price                |
| Direct and inferred prices disagree sharply               | Keep direct price authoritative, flag a quality incident, and queue repair or recompute                           |
| Queue grows faster than workers can drain it              | Show backlog counts by priority and status; meta-agent reduces low-priority expansion before dropping repair work |
| Discovery finds the same source twice                     | Deduplicate by stable source identity and update the existing source row instead of creating duplicates           |
| Founder clicks retry repeatedly                           | Coalesce duplicate queued repair tasks per source unless the existing task is dead-lettered or completed          |

---

## Success Criteria

- The Pi runtime has a durable queue and agent-run log instead of only fixed cron-side behavior.
- `source_registry` can represent national directory state, not just a small list of currently scraped sources.
- Coverage breadth is measurable by geography cells, not inferred from raw counts alone.
- The runtime can store inferred prices separately from direct observations and explain how they were derived.
- Founder-only internal UI can answer five questions truthfully:
  1. What sources do we know about?
  2. What geography is directly covered?
  3. What is inferred instead of observed?
  4. What is stale or broken?
  5. Which agent is working on which gap?
- Repeated re-scrapes of already-covered chains no longer dominate the whole schedule when uncovered geography or broken sources have higher priority.
- Chef-facing and public-facing product surfaces remain OpenClaw-debranded and outcome-focused.

---

## Implementation Order

1. Extend the Pi SQLite runtime schema in `.openclaw-build/lib/db.mjs`.
2. Add queue, incident, coverage, and inference helpers to the Pi runtime.
3. Build `runtime-orchestrator.mjs` so the control plane can prioritize and enqueue work.
4. Add the bounded specialist agents: discovery, repair, math, then meta-agent.
5. Expose the runtime via new `sync-api.mjs` endpoints.
6. Wire founder-only server actions in `lib/openclaw/runtime-control-actions.ts`.
7. Replace the static founder page with the live runtime console.
8. Adjust cron so fixed scraper cadence and queue-driven work can coexist without starving core scrapes.

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Start the Pi runtime locally or on the Raspberry Pi with the new schema and services enabled.
2. Call `/health` and confirm the existing runtime still reports healthy.
3. Call the new runtime overview endpoint and verify it returns directory counts, queue counts, incident counts, coverage facts, and inference counts without breaking existing stats endpoints.
4. Seed one stale source, run the watchdog, and verify an open `source_incidents` row is created or updated.
5. Run the orchestrator once and verify it enqueues at least one `repair_source` or `discover_source` task based on current state.
6. Run the repair agent against a known stale source and verify the task, run, and incident states update correctly.
7. Run the inference engine for a known ingredient/geography gap and verify the result lands in `price_inference_cache`, not `current_prices`.
8. Open `/admin/openclaw` as the founder account and verify the runtime console renders live data, degraded states, and founder-only action buttons.
9. Confirm chef-facing pricing pages and public surfaces still do not expose OpenClaw naming or raw runtime internals.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Public or chef-facing exposure of OpenClaw runtime internals
- Rewriting every existing scraper in the first slice
- Shipping literal 50-state completeness in one build
- Multi-node cluster orchestration beyond the current Pi-first runtime
- Dynamic code-generation agents that write or deploy new runtime code on their own
- Replacing direct observation with AI-only price guessing

---

## Notes for Builder Agent

1. Treat this as a master runtime spec with a concrete first slice, not a mandate to ship the entire national vision in one pass.
2. Preserve the existing internal-only and debranding boundary from the canonical scope specs.
3. Keep the runtime formula-first. The price-inference engine may use disciplined statistical methods, but it must remain explainable and auditable.
4. Do not silently merge inferred prices into direct-observation tables.
5. Do not delete or rewrite current scrapers just to make the architecture look cleaner. The first slice is additive.
6. When choosing between dense re-scan work and breadth-expansion work, prefer breadth whenever coverage is absent or stale enough that repeated density adds less value than expansion.
