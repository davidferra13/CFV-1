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

They added one more operational requirement after the initial draft:

5. OpenClaw should have a dedicated internal capacity agent that continuously measures real machine headroom and recommends or enforces higher safe parallelism when the Raspberry Pi is under-utilized.
6. OpenClaw should also have a meta-level task router that can create new bounded tasks for other agents whenever the runtime detects a gap, a bottleneck, or a repair need.
7. When a town, ZIP, or state lacks a direct observed price for an ingredient, OpenClaw should usually fill the gap with the best defensible estimate it can produce rather than leaving the price blank.
8. A blank result is only acceptable when the evidence is genuinely too weak to support a trustworthy estimate.
9. Nearby geography, same-chain stores, and comparable markets should all be used as fallback evidence before the system gives up.
10. The developer wants thread-level Q&A like this to function as a refinement loop: once behavior is clarified and agreed, it should be captured in Developer Notes and reflected into the build plan immediately.
11. When a chef looks up a product or ingredient, the ideal system should eventually make it easy to see price, stock state, last confirmation time, source website, and a quick image without forcing slow manual reading.
12. Product metadata completeness matters: nutritional facts, gluten-free or allergy-related flags, ingredient text, titles, categories, and subcategories should be filled and audited wherever credible source evidence exists.
13. OpenClaw should also know which products and sources are reliably pingable, which ones are weak, and where metadata coverage is strong or thin across the country.
14. Heat maps or similar geography views should show where more information is flowing in and where the system is still weak.
15. The right architecture is not one tiny agent per field. The runtime should group this work into a few bounded specialist agents for metadata enrichment, nutrition and allergen enrichment, source reliability, and quality auditing.
16. Recipe scaling is important, but it belongs to ChefFlow's recipe and ingredient math layer rather than the OpenClaw runtime itself.
17. Expiration dates are not universal OpenClaw catalog facts unless the system has real lot-level or inventory-level evidence from a downstream inventory surface.
18. Going forward, every new responsibility must be classified as OpenClaw-owned, ChefFlow-owned, or a handshake between them, and any drift across that boundary should be flagged immediately.
19. The meta-agent should not be treated as an omniscient founder substitute. It should be good at noticing operational patterns and routing bounded work, but it will only reason from the policies, signals, and task types we explicitly give it.
20. The developer wants concrete examples of what the meta-agent would spin up, so builders understand it as a task router, not a magic intelligence blob.
21. The developer wants the growth pattern itself to be explicit: how OpenClaw spreads across the country, where it starts, and whether it moves in a coherent order or just behaves randomly.
22. They want the expansion to feel like a colony slowly growing outward, not a scattered blob doing whatever it wants.
23. They want to know whether the runtime should move state by state, region by region, ZIP by ZIP, store by store, or some hybrid of those.

They specifically want this planning doc to say, in plain terms, that the current version mostly keeps refreshing a limited footprint, while the ideal version would become a self-expanding national pricing intelligence engine. The goal is to plan exactly how that ideal OpenClaw should run.

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** Turn OpenClaw from a bounded regional scrape rig into an internal national pricing intelligence control plane with a full source directory, a coverage map, a formula-first inference engine, and self-healing operational loops.
- **Expanded runtime goal:** Add explicit control-plane logic that measures actual hardware headroom and uses that evidence to raise or lower safe concurrency, rather than leaving the machine idle while queues remain under-served.
- **Key constraints:** Keep OpenClaw internal-only and founder-facing; do not expose raw OpenClaw branding or internals to chef/public product surfaces; preserve additive migrations only; keep direct observations authoritative; do not replace math with opaque AI guesses.
- **Capacity constraint:** CPU alone is not the truth. Capacity decisions must consider CPU, RAM, I/O wait, SQLite contention, network saturation, and external source rate limits before increasing concurrency.
- **Gap-fill constraint:** Missing local prices should usually degrade to explicit inferred estimates, not empty results. Empty is the fallback of last resort when evidence quality is below threshold.
- **Metadata completeness goal:** Price coverage by itself is not enough. The runtime should continuously improve image coverage, source URL coverage, stock freshness, classification quality, and nutrition/allergen completeness where credible evidence exists.
- **Agent boundary goal:** Use a small number of bounded specialist agents rather than one agent per tiny attribute. Metadata enrichment, nutrition/allergen enrichment, source reliability, and quality auditing are separate responsibilities, but they should each own a coherent domain.
- **Boundary note:** Recipe scaling belongs to ChefFlow's culinary math and recipe engine, not the OpenClaw runtime. Lot expiration is only a valid OpenClaw fact when backed by real purchased-inventory or lot evidence.
- **Ownership-enforcement goal:** Every new function must be classified as runtime-owned, website-owned, or handshake-owned. Misalignment is a real defect, not a stylistic preference.
- **Meta-agent expectation:** The meta-agent is a bounded operational router. It should catch repetitive, measurable classes of runtime gaps, but it will not automatically invent all product requirements unless those requirements are encoded in policy, thresholds, and available task types.
- **Expansion-order goal:** Growth should be deliberate and explainable. The runtime should expand as a ranked frontier from seeded coverage cells and directory facts, not as a random scatter and not as a simplistic one-state-at-a-time march.
- **Motivation:** The current runtime proves the concept, but it mostly densifies known coverage instead of systematically expanding across the country, repairing stale areas, and estimating missing prices with disciplined confidence.
- **Refinement rule:** Behavior clarified through developer Q&A must be recorded quickly enough that the downstream builder is operating from the updated spec, not from memory.
- **Success from the developer's perspective:** OpenClaw continuously grows a national source directory, decides what should be scanned next, estimates missing prices with explicit evidence and confidence, avoids unnecessary blanks, notices stale or broken sources automatically, routes recovery work to bounded specialist agents, measures metadata completeness and reliability, monitors whether the Pi is under-used, and raises safe parallelism when capacity actually exists.

---

## What This Does (Plain English)

This spec defines the ideal future OpenClaw runtime as an internal control plane. Instead of only running fixed scrapers on a regional loop, OpenClaw becomes a national source-directory engine with five always-on layers: direct observation, source coverage tracking, price inference, bounded specialist agents, and capacity-aware orchestration. Founder-only internal surfaces get a real runtime console that shows what sources exist, what geography is covered, what is inferred versus observed, what is stale or broken, which agents are working on each gap, and whether the machine is being used close to its safe operating ceiling. ChefFlow continues consuming the results without exposing OpenClaw internals publicly.

---

## Why It Matters

The current system is useful because it captures real grocery price data, but it is still structurally optimized for repeated refreshes of a narrow footprint. That leaves national coverage, source discovery, gap repair, and price estimation underpowered even though the surrounding app and specs already point toward a much larger intelligence system.

---

## Ownership Split

Every OpenClaw-related feature must have a clear owner.

| Concern                          | OpenClaw Owns                                                                                                                                                                   | ChefFlow Owns                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Source discovery and acquisition | Source discovery, scraping, pingability checks, source health, source reliability, freshness sampling                                                                           | None                                                                                                                       |
| Direct product facts             | Observed prices, stock observations, last-confirmed timestamps, source URLs, image sourcing, canonical product metadata, classification, nutrition or allergen evidence linking | Rendering those facts to chefs in usable product views                                                                     |
| Missing-data recovery            | Metadata enrichment tasks, quality audits, anomaly review, price inference, coverage heat maps, internal completeness tracking                                                  | Deciding how to present incomplete data to the chef without leaking internals                                              |
| Workflow UX                      | None                                                                                                                                                                            | Search, filters, product cards, detail pages, recipe costing flows, shopping flows, saved lists, manual overrides, exports |
| Recipe intelligence              | Package and unit evidence only                                                                                                                                                  | Recipe scaling, culinary unit math, substitutions in workflow context, menu costing behavior                               |
| Inventory-specific facts         | None unless real inventory evidence is synced upstream                                                                                                                          | Inventory management, lot tracking, expiration dates, purchase-specific availability                                       |
| Admin observability              | Founder-only runtime console, incidents, queue state, coverage state, metadata completeness, capacity state                                                                     | Any website-admin surface that consumes those internal reads under the founder gate                                        |

### Boundary Rules

- If OpenClaw starts owning chef-specific workflow UX, recipe scaling, saved-list behavior, or public presentation logic, that is a misalignment and should be flagged.
- If ChefFlow starts owning durable scraping, canonical metadata enrichment, source health logic, price inference, or source pingability truth, that is a misalignment and should be flagged.
- If a feature needs both layers, OpenClaw should emit evidence-rich facts and statuses, and ChefFlow should consume them into chef-facing workflows.
- Transitional bridges are acceptable, but they must be labeled as bridges so they do not quietly become the permanent owner.

### Meta-Agent Scope

Treat the meta-agent as a bounded runtime supervisor, not as a creative architect.

It should be able to:

- detect stale-source, backlog, rate-limit, metadata-gap, anomaly, and capacity patterns from stored runtime facts
- escalate or enqueue bounded tasks for existing agent types
- raise task priority when a known threshold is crossed
- reduce low-value expansion work when repair or reliability work is more urgent

Planning rule:

- if we expect the meta-agent to notice something, the triggering signal, threshold, and spawned task type must be written explicitly into the spec or handoff before builders rely on that behavior

It should not be expected to:

- independently invent all the product requirements discussed in a conversation unless they were encoded into policy or task types
- generate arbitrary code
- create entirely new agent classes on its own
- decide ChefFlow workflow behavior or public UX

Examples of bounded tasks the meta-agent should spin up:

- `repair_source` for a source that became stale and accumulated repeated failures
- `verify_pingability` for a source whose stock freshness degraded or whose availability probes became unreliable
- `enrich_metadata` for popular ingredients missing image or source URL coverage
- `refresh_nutrition` for packaged products that still lack nutrition or allergen evidence
- `audit_quality` when price movements look contradictory or suspicious
- `recompute_metadata_heatmap` after a large ingestion batch changes geography-level completeness
- `rebalance_parallelism` when queue depth is high and the capacity agent confirms safe headroom

### Expansion Order

The ideal OpenClaw runtime should grow like a deliberate frontier, not like a random spray and not like a rigid 50-state checklist.

The order should be:

1. **Build the national directory skeleton first**
   Know what chains, stores, vendors, and source surfaces exist across the country before pretending coverage exists everywhere.

2. **Seed anchor cells**
   Start from the strongest currently observed regions and the highest-value reachable markets. Today that means the existing New England footprint is a practical anchor, not the final intended scope.

3. **Expand outward from strong cells**
   Prefer neighboring ZIPs, metros, and same-chain footprints that are adjacent to already-strong coverage. This creates a visible frontier rather than isolated dots.

4. **Deepen active cells**
   Once a cell is active, improve store density, vendor coverage, metadata completeness, ping reliability, and refresh quality inside that area.

5. **Repair and stabilize before skipping too far ahead**
   Stale or broken high-value cells should usually outrank faraway speculative expansion.

6. **Backfill the long tail**
   Lower-priority remote or sparse cells should still be worked, but only after stronger frontier opportunities, major gaps, or repair work are served.

What this means operationally:

- OpenClaw should not behave as pure state-by-state serial crawling.
- OpenClaw should not behave as unstructured nationwide randomness.
- OpenClaw should behave as a ranked frontier: region by region, then metro by metro, then ZIP or store by ZIP or store inside the active frontier, with density and metadata work interleaved behind the frontier edge.

The frontier should be ranked by a weighted score, not by geography alone. The score should favor:

- adjacency to already-strong cells
- same-chain or same-source-family extensions
- repair urgency for cells or sources that recently degraded
- reachable source richness in the next cell
- ingredient or category demand value for ChefFlow outcomes
- metadata completeness opportunity inside the cell
- safe capacity and rate-limit feasibility

The score should penalize:

- faraway isolated cells with no strong neighboring anchor
- low-signal source surfaces that repeatedly fail
- speculative expansion that would starve repair or freshness work

What a founder should see if they watched it all day:

- repair work at the top when strong cells become stale or broken
- frontier expansion tasks on adjacent uncovered cells or same-chain extensions
- density and metadata tasks inside active cells
- slower long-tail backfill tasks when capacity exists

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                                    | Purpose                                                                                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `.openclaw-build/services/runtime-orchestrator.mjs`     | Main control-plane scheduler that ranks sources, coverage gaps, and repair work, then enqueues tasks                                    |
| `.openclaw-build/services/source-discovery-agent.mjs`   | Expands the national source directory with new chains, stores, markets, and source surfaces                                             |
| `.openclaw-build/services/source-repair-agent.mjs`      | Re-tests stale or broken sources, records incidents, and restores source health                                                         |
| `.openclaw-build/services/catalog-enrichment-agent.mjs` | Fills image, source URL, title, brand, category, and subcategory gaps for products and ingredients                                      |
| `.openclaw-build/services/nutrition-allergen-agent.mjs` | Links nutrition facts, ingredient text, dietary flags, and allergen evidence from trusted upstream sources                              |
| `.openclaw-build/services/quality-audit-agent.mjs`      | Flags weird prices, contradictory stock signals, missing metadata clusters, and unreliable source pingability                           |
| `.openclaw-build/services/price-inference-engine.mjs`   | Computes formula-based price estimates for uncovered ingredient/geography combinations                                                  |
| `.openclaw-build/services/hardware-capacity-agent.mjs`  | Measures CPU, RAM, I/O, DB contention, rate-limit pressure, and safe concurrency recommendations                                        |
| `.openclaw-build/services/meta-agent.mjs`               | Reviews queue state, incidents, capacity drift, and coverage gaps, then creates bounded follow-up tasks for the right specialist agents |
| `lib/openclaw/runtime-control-actions.ts`               | Founder-only server actions that expose runtime, directory, coverage, incident, inference, and metadata-completeness views              |
| `components/admin/openclaw-runtime-console.tsx`         | Founder-only internal console for the live OpenClaw runtime                                                                             |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                       | What to Change                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `.openclaw-build/lib/db.mjs`               | Add additive control-plane tables, metadata-completeness schema, and directory or reliability columns to the Pi SQLite runtime schema |
| `.openclaw-build/services/aggregator.mjs`  | Roll up direct-observation coverage into geography-cell coverage facts, metadata heat maps, and inference freshness summaries         |
| `.openclaw-build/services/watchdog.mjs`    | Promote stale, broken, or unreliable-source detection into durable incidents and queue nudges instead of log-only alerts              |
| `.openclaw-build/services/sync-api.mjs`    | Expose runtime overview, source directory, agent runs, incidents, coverage, metadata completeness, and inference audit endpoints      |
| `.openclaw-deploy/crontab-v7.txt`          | Add orchestrator and agent cadences; reduce fixed re-scan bias in favor of queue-driven expansion and enrichment logic                |
| `scripts/openclaw-dashboard/server.mjs`    | Surface agent health, coverage cells, metadata heat maps, incidents, and inference status for mission-control parity                  |
| `app/(admin)/admin/openclaw/page.tsx`      | Keep founder-only gate, but load a live runtime console instead of a static usage-only page                                           |
| `components/admin/openclaw-usage-page.tsx` | Convert the current static page into a hybrid policy + live runtime console without losing boundary copy                              |

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
  metadata_complete_count INTEGER NOT NULL DEFAULT 0,
  distinct_ingredient_count INTEGER NOT NULL DEFAULT 0,
  image_coverage_pct REAL NOT NULL DEFAULT 0,
  source_url_coverage_pct REAL NOT NULL DEFAULT 0,
  nutrition_coverage_pct REAL NOT NULL DEFAULT 0,
  allergen_coverage_pct REAL NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS host_capacity_snapshots (
  snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
  host_name TEXT NOT NULL,
  cpu_percent REAL NOT NULL,
  load_avg_1m REAL,
  load_avg_5m REAL,
  total_memory_mb INTEGER NOT NULL,
  used_memory_mb INTEGER NOT NULL,
  available_memory_mb INTEGER NOT NULL,
  disk_busy_percent REAL,
  network_rx_kbps REAL,
  network_tx_kbps REAL,
  sqlite_write_wait_ms REAL,
  active_worker_count INTEGER NOT NULL DEFAULT 0,
  queued_task_count INTEGER NOT NULL DEFAULT 0,
  rate_limit_pressure REAL NOT NULL DEFAULT 0,
  recommended_parallelism INTEGER NOT NULL DEFAULT 1,
  max_safe_parallelism INTEGER NOT NULL DEFAULT 1,
  bottleneck TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_host_capacity_host_captured
  ON host_capacity_snapshots(host_name, captured_at DESC);

CREATE TABLE IF NOT EXISTS ingredient_metadata_profiles (
  profile_id TEXT PRIMARY KEY,
  canonical_ingredient_id TEXT NOT NULL UNIQUE,
  representative_title TEXT,
  representative_brand TEXT,
  primary_image_url TEXT,
  primary_source_url TEXT,
  ingredient_text TEXT,
  category_l1 TEXT,
  category_l2 TEXT,
  dietary_flags_json TEXT,
  allergens_json TEXT,
  nutrition_json TEXT,
  image_status TEXT NOT NULL DEFAULT 'missing' CHECK (image_status IN ('missing', 'direct', 'external', 'rejected')),
  source_url_status TEXT NOT NULL DEFAULT 'missing' CHECK (source_url_status IN ('missing', 'direct', 'derived', 'rejected')),
  classification_status TEXT NOT NULL DEFAULT 'missing' CHECK (classification_status IN ('missing', 'partial', 'linked', 'verified')),
  nutrition_status TEXT NOT NULL DEFAULT 'missing' CHECK (nutrition_status IN ('missing', 'partial', 'linked', 'verified', 'blocked')),
  allergen_status TEXT NOT NULL DEFAULT 'missing' CHECK (allergen_status IN ('missing', 'partial', 'linked', 'verified', 'blocked')),
  metadata_confidence REAL NOT NULL DEFAULT 0 CHECK (metadata_confidence >= 0 AND metadata_confidence <= 1),
  provenance_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ingredient_metadata_profiles_ingredient
  ON ingredient_metadata_profiles(canonical_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_metadata_profiles_quality
  ON ingredient_metadata_profiles(image_status, nutrition_status, allergen_status, classification_status);

CREATE TABLE IF NOT EXISTS runtime_limits (
  limit_id TEXT PRIMARY KEY,
  limit_key TEXT NOT NULL UNIQUE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'host', 'queue', 'source', 'domain', 'resource')),
  scope_key TEXT NOT NULL,
  limit_type TEXT NOT NULL CHECK (limit_type IN ('concurrency', 'rate')),
  slot_limit INTEGER NOT NULL,
  slot_decay_per_second REAL,
  strict INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_runtime_limits_scope
  ON runtime_limits(scope_type, scope_key, active);

CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('orchestrator', 'discovery', 'repair', 'enrichment', 'nutrition', 'quality', 'math', 'coverage', 'capacity', 'meta')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'partial', 'skipped')),
  queue_name TEXT NOT NULL DEFAULT 'default',
  started_at TEXT,
  finished_at TEXT,
  duration_ms INTEGER,
  parent_run_id TEXT,
  host_name TEXT,
  heartbeat_at TEXT,
  lease_expires_at TEXT,
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
  task_type TEXT NOT NULL CHECK (task_type IN ('discover_source', 'crawl_source', 'repair_source', 'infer_price', 'recompute_cell', 'verify_source', 'verify_pingability', 'enrich_metadata', 'refresh_nutrition', 'audit_quality', 'recompute_metadata_heatmap', 'sample_capacity', 'rebalance_parallelism')),
  preferred_agent_type TEXT NOT NULL CHECK (preferred_agent_type IN ('discovery', 'repair', 'enrichment', 'nutrition', 'quality', 'math', 'coverage', 'capacity', 'meta', 'orchestrator')),
  queue_name TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'succeeded', 'failed', 'dead_letter', 'skipped')),
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  pool_slots INTEGER NOT NULL DEFAULT 1,
  source_id TEXT,
  cell_id TEXT,
  canonical_ingredient_id TEXT,
  dedupe_key TEXT,
  payload_json TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  claimed_by_run_id TEXT,
  heartbeat_at TEXT,
  lease_expires_at TEXT,
  next_attempt_at TEXT,
  not_before TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_tasks_active_dedupe
  ON agent_tasks(dedupe_key)
  WHERE dedupe_key IS NOT NULL
    AND status IN ('queued', 'claimed', 'running');

CREATE TABLE IF NOT EXISTS source_incidents (
  incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('stale', 'http', 'schema', 'auth', 'empty', 'quality', 'anomaly', 'metadata', 'reliability')),
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
ALTER TABLE source_registry ADD COLUMN rate_limit_key TEXT;
ALTER TABLE source_registry ADD COLUMN rate_limit_backoff_until TEXT;
ALTER TABLE source_registry ADD COLUMN last_rate_limited_at TEXT;
ALTER TABLE source_registry ADD COLUMN ping_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (ping_status IN ('unknown', 'healthy', 'degraded', 'blocked'));
ALTER TABLE source_registry ADD COLUMN ping_reliability_score REAL NOT NULL DEFAULT 0;
ALTER TABLE source_registry ADD COLUMN last_ping_at TEXT;
ALTER TABLE source_registry ADD COLUMN last_inventory_probe_at TEXT;
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
- The current runtime already enables WAL mode in `.openclaw-build/lib/db.mjs`; this slice must keep WAL enabled and add an explicit `busy_timeout` plus observable checkpoint behavior rather than assuming write contention will never happen.
- SQLite remains a Pi-local durability layer, not a license for unbounded concurrent writers. Queue claiming, heartbeats, and run bookkeeping should favor short transactions and a small number of write-active workers.
- A later implementation spec may mirror selected control-plane facts into PostgreSQL, but that is not part of this slice.

---

## Data Model

The ideal runtime has eight data planes, each with a different trust rule:

1. **Direct observation plane**
   `current_prices`, `price_changes`, receipt prices, and scraper outputs are authoritative observations. Nothing inferred may overwrite them.

2. **Metadata plane**
   `ingredient_metadata_profiles` stores representative product metadata that improves lookup usefulness: images, source URLs, ingredient text, title or brand normalization, category hierarchy, dietary flags, allergens, and nutrition evidence. These facts must carry provenance and confidence, and they must never be hallucinated when the source evidence is missing.

3. **Source directory plane**
   `source_registry` becomes the national directory of known chains, stores, source surfaces, and source capabilities. This is where OpenClaw stops behaving like a tiny list of current jobs and starts behaving like a complete map of what still needs to be captured.

4. **Coverage plane**
   `coverage_cells` describes where coverage is strong, partial, stale, or absent by ZIP, metro, state, and region. It also carries metadata completeness rollups so the founder can see not just where price coverage is strong, but where images, source URLs, nutrition, and allergen data are weak.

5. **Agent plane**
   `agent_tasks` and `agent_runs` form the durable control plane. Agents do not invent new runtime behavior on the fly; they claim bounded tasks, emit evidence, and update status.

6. **Inference plane**
   `price_inference_cache` stores estimated prices for uncovered combinations. These rows are clearly separate from direct observations and must carry method, evidence count, and expiration.

7. **Capacity plane**
   `host_capacity_snapshots` stores observed machine headroom and bottleneck facts. Capacity decisions must be made from this evidence, not from guesswork or a single CPU number.

8. **Limits plane**
   `runtime_limits` stores the enforced concurrency and rate-limit budgets for queues, sources, domains, and scarce resources like the SQLite writer path. The orchestrator and workers must obey this table instead of improvising their own local limits.

Key constraints:

- Direct prices outrank inferred prices everywhere.
- Inferred prices must be queryable and auditable, not silently mixed into `current_prices`.
- Missing local observations should trigger fallback estimation in a clear order: direct local -> nearby geography -> same-chain evidence -> comparable-market evidence -> blank only if confidence stays below threshold.
- The meta-agent may create tasks for existing agent types and may escalate task priority, but it may not generate arbitrary code or mutate runtime configuration without explicit developer approval.
- The capacity agent may recommend or enforce bounded concurrency changes for queue-driven workers, but it may not override source rate-limit rules or starve repair work in favor of raw throughput.
- `10% CPU` does not imply `9x more safe parallelism`. The control plane must treat CPU, memory, I/O wait, database contention, and upstream rate limits as separate ceilings.
- Queue work must be idempotent enough to survive retries, duplicate delivery, or lease loss without corrupting state.
- Duplicate tasks for the same active unit of work should be coalesced through `dedupe_key`, not allowed to pile up indefinitely.
- Long-running tasks must refresh a lease or heartbeat so stalled work can be recovered without waiting for a human.
- CPU-heavy math or transformation work must run in an isolated worker path so bookkeeping, heartbeats, and queue claiming are not starved by a blocked Node event loop.
- Per-source and per-domain rate-limit budgets are first-class constraints, not just retry delays after failure.
- Unnecessary blanks are a product failure. If no direct price exists, the runtime should prefer a clearly labeled estimate over an empty response whenever confidence is sufficient.
- Coverage expansion wins over repeated low-value re-scrapes when a source or geography is under-covered.
- Coverage expansion should follow a frontier model: adjacent weak cells, same-chain extensions, and high-value nearby markets should outrank random faraway expansion when all else is equal.
- Metadata gaps should not silently persist forever. Missing image, source URL, nutrition, allergen, or classification fields should be visible, queueable, and measurable.
- Do not create one tiny runtime agent per attribute. Group product completeness work into bounded enrichment, nutrition/allergen, reliability, and quality domains.
- Recipe scaling stays in ChefFlow's recipe and ingredient math layer. The OpenClaw runtime may expose unit or package metadata that supports scaling, but it is not the owner of recipe-scaling behavior.
- Lot expiration is out of scope for default catalog scraping. Only real lot-level or inventory evidence may create expiration facts.

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

| Action                                         | Auth                                  | Input                                                    | Output                                                                      | Side Effects                                           |
| ---------------------------------------------- | ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| `getOpenClawRuntimeOverview()`                 | `requireAdmin()` + founder-email gate | none                                                     | runtime summary with directory, coverage, incidents, queue, inference stats | None                                                   |
| `getOpenClawSourceDirectory(filters)`          | `requireAdmin()` + founder-email gate | `{ query?, state?, directoryStatus?, coverageStatus? }`  | paginated source rows with queue and incident facts                         | None                                                   |
| `getOpenClawCoverageSummary(scope)`            | `requireAdmin()` + founder-email gate | `{ geographyType, geographyKey? }`                       | coverage-cell summaries and freshness rollups                               | None                                                   |
| `getOpenClawMetadataSummary(scope)`            | `requireAdmin()` + founder-email gate | `{ geographyType?, geographyKey?, category? }`           | metadata completeness rollups, heat-map inputs, and missing-field counts    | None                                                   |
| `getOpenClawAgentRuns(filters)`                | `requireAdmin()` + founder-email gate | `{ agentType?, status?, limit? }`                        | recent run history with task/result evidence                                | None                                                   |
| `getOpenClawIncidents(filters)`                | `requireAdmin()` + founder-email gate | `{ sourceId?, status?, severity? }`                      | current and recent source incidents                                         | None                                                   |
| `getOpenClawInferenceAudit(input)`             | `requireAdmin()` + founder-email gate | `{ canonicalIngredientId, geographyType, geographyKey }` | direct-price context, inferred price, method, confidence, expiry            | None                                                   |
| `getOpenClawMetadataAudit(input)`              | `requireAdmin()` + founder-email gate | `{ canonicalIngredientId }`                              | image, source URL, nutrition, allergen, dietary, and classification status  | None                                                   |
| `getOpenClawCapacityOverview()`                | `requireAdmin()` + founder-email gate | none                                                     | recent capacity snapshots, bottleneck view, and recommended parallelism     | None                                                   |
| `retryOpenClawSource(sourceId)`                | `requireAdmin()` + founder-email gate | `{ sourceId }`                                           | `{ success, queuedTaskId?, error? }`                                        | Enqueues a high-priority `repair_source` task          |
| `recomputeOpenClawCoverage(cellId)`            | `requireAdmin()` + founder-email gate | `{ cellId }`                                             | `{ success, queuedTaskId?, error? }`                                        | Enqueues a `recompute_cell` task                       |
| `retryOpenClawMetadata(canonicalIngredientId)` | `requireAdmin()` + founder-email gate | `{ canonicalIngredientId }`                              | `{ success, queuedTaskId?, error? }`                                        | Enqueues `enrich_metadata` or `refresh_nutrition` work |
| `sampleOpenClawCapacity()`                     | `requireAdmin()` + founder-email gate | none                                                     | `{ success, queuedTaskId?, error? }`                                        | Enqueues a `sample_capacity` task                      |

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

This spec only authorizes founder-only internal UI on `/admin/openclaw`. No chef-facing or public-facing OpenClaw naming is added or restored.

### Page Layout

Replace the static usage-only page with a live internal runtime console that keeps the existing boundary copy at the top and adds eight internal tabs below it:

1. **Overview**
   Global counts: known sources, queued tasks, running agents, open incidents, covered cells, inferred rows, newest scrape, newest inference, stale-source count.

2. **Directory**
   Filterable national source directory with chain/store/source rows, geography, capability flags, last success, next recommended scan, directory status, coverage status, priority score, and open-incident badge.

3. **Coverage**
   Geography rollup table with ZIP/metro/state/region scope, direct vs inferred counts, coverage score, last direct observation, and stale markers.

4. **Agents**
   Recent agent runs and queue state by agent type. Must show queued, running, failed, partial, and dead-letter counts separately.
   This tab must also show stalled-task recoveries, lease-expiry counts, and queue lag by queue name.

5. **Incidents**
   Open and recent source incidents with severity, summary, last seen, and one-click retry for founder users.

6. **Inference**
   Ingredient + geography audit view that explicitly distinguishes direct observation from inferred estimate and shows method, confidence, evidence count, and expiry.

7. **Capacity**
   Host-capacity panel showing CPU, memory, disk pressure, queue depth, active workers, recommended parallelism, max safe parallelism, the currently limiting bottleneck, and any active runtime limits. This tab must make it obvious when the machine is under-used versus when concurrency is being capped for a good reason.

8. **Metadata**
   Completeness tables and heat maps for image coverage, source URL coverage, nutrition coverage, allergen coverage, category hierarchy quality, and source ping reliability. This tab must make it easy to find which categories, regions, or ingredients still need enrichment.

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
- Founder-only action `Retry Metadata` enqueues metadata enrichment or nutrition refresh work; it does not fetch or compute metadata synchronously in the browser.
- Founder-only action `Sample Capacity` queues a fresh capacity measurement and parallelism recommendation.
- Capacity and agent views must expose when a queue is globally limited, source-limited, or database-limited, instead of collapsing all throttling into a generic `busy` label.
- Inference audit must always show the underlying direct evidence count and expiry. It may not present inferred rows as if they were scraped facts.
- Metadata views must distinguish `missing`, `partial`, `linked`, and `verified` states rather than collapsing everything into `present` or `not present`.

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                                            | Correct Behavior                                                                                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pi runtime API is offline                                           | Founder console loads in degraded mode with explicit `runtime unreachable` state                                                                                           |
| A source keeps failing and being retried repeatedly                 | Create or update one open incident, increment failure evidence, and dead-letter the task after the retry budget                                                            |
| Inference exists but there is no direct data in that area           | Show the inferred result only with method, confidence, and evidence count, never as a direct price                                                                         |
| No direct local price exists but nearby or chain evidence is strong | Return a clearly labeled inferred estimate instead of a blank result                                                                                                       |
| Direct and inferred prices disagree sharply                         | Keep direct price authoritative, flag a quality incident, and queue repair or recompute                                                                                    |
| Queue grows faster than workers can drain it                        | Show backlog counts by priority and status; meta-agent reduces low-priority expansion before dropping repair work                                                          |
| Discovery finds the same source twice                               | Deduplicate by stable source identity and update the existing source row instead of creating duplicates                                                                    |
| Founder clicks retry repeatedly                                     | Coalesce duplicate queued repair tasks per source unless the existing task is dead-lettered or completed                                                                   |
| CPU is low but rate-limit pressure is high                          | Keep concurrency capped, record the bottleneck truthfully, and do not mistake idle CPU for safe spare capacity                                                             |
| CPU is low and queues are deep with no external bottleneck          | Capacity agent raises recommended parallelism within configured safety bounds and records the reason                                                                       |
| Meta-agent keeps spawning low-value work                            | Enforce per-agent and per-task-type concurrency ceilings so task creation cannot flood the queue or starve repair                                                          |
| No direct local price exists and the evidence remains weak          | Leave the result blank or unavailable, mark the reason explicitly, and queue discovery or repair work instead of inventing certainty                                       |
| A price row exists but image or source URL data is missing          | Keep the price visible, mark the metadata gap explicitly, and queue bounded enrichment instead of pretending the row is complete                                           |
| Nutrition or allergen evidence is unavailable or conflicting        | Keep the field missing or partial, record provenance, and never invent gluten-free or allergen claims without source support                                               |
| A source can be priced but not reliably pinged for stock            | Show stock freshness or reliability as degraded or unknown, and queue pingability verification rather than reporting false certainty                                       |
| Metadata coverage is strong in one region but weak in another       | Show separate metadata heat maps and completeness percentages so gaps are visible even when direct price coverage looks healthy                                            |
| A source returns HTTP `429` or equivalent throttling                | Record rate-limit evidence, back off via `rate_limit_backoff_until`, and keep the task in a waiting or rescheduled state instead of treating it as a normal scrape failure |
| A worker loses its lease while a task is running                    | Mark the task stalled, requeue it only if it is idempotent, and keep the recovery visible in the founder console                                                           |
| SQLite write contention rises under load                            | Preserve WAL, honor `busy_timeout`, keep write-heavy work bounded by the SQLite resource limit, and surface the bottleneck in capacity metrics                             |
| CPU-heavy inference blocks queue bookkeeping                        | Route math work to isolated workers or threads and reduce math concurrency before control-plane heartbeats are lost                                                        |

---

## Success Criteria

- The Pi runtime has a durable queue and agent-run log instead of only fixed cron-side behavior.
- `source_registry` can represent national directory state, not just a small list of currently scraped sources.
- Coverage breadth is measurable by geography cells, not inferred from raw counts alone.
- The runtime can store inferred prices separately from direct observations and explain how they were derived.
- The runtime can explain why worker parallelism is currently low, moderate, or high using stored capacity evidence instead of hand-waving.
- Queue-driven work obeys explicit concurrency and rate-limit budgets for queues, source groups, and scarce resources instead of assuming one global limit fits everything.
- Task duplication is bounded: repeated founder clicks, repeated incident detection, or repeated scheduler passes do not create unbounded copies of the same active task.
- Long-running tasks can be recovered after worker death or lease loss without silent duplication or orphaned `running` state.
- A missing local price usually resolves to a labeled inferred estimate rather than an empty value.
- Empty results occur only when evidence is below threshold, and that weakness is visible and actionable rather than silent.
- Product metadata completeness is measurable by ingredient, category, and geography instead of being treated as an invisible best-effort side effect.
- The runtime can explain which products still lack an image, source URL, nutrition evidence, allergen evidence, or reliable stock freshness.
- The runtime can distinguish a missing field from an unverified field and from a conflicting field.
- Each new OpenClaw-related feature can be classified cleanly as runtime-owned, website-owned, or handshake-owned without ambiguous responsibility.
- The founder can explain where the current expansion frontier is, why those cells or sources are next, and why other regions are waiting.
- Founder-only internal UI can answer five questions truthfully:
  1. What sources do we know about?
  2. What geography is directly covered?
  3. What is inferred instead of observed?
  4. What is stale or broken?
  5. Which agent is working on which gap?
- Founder-only internal UI can also answer a sixth question truthfully: `Are we actually using the machine close to its safe capacity, and if not, why not?`
- Founder-only internal UI can also answer four more questions truthfully: 7. Which products are still missing critical metadata? 8. Which products have verified versus partial nutrition or allergen evidence? 9. Which sources can be reliably pinged for freshness or stock? 10. Where is metadata coverage strong or weak across the country?
- Repeated re-scrapes of already-covered chains no longer dominate the whole schedule when uncovered geography or broken sources have higher priority.
- Chef-facing and public-facing product surfaces remain OpenClaw-debranded and outcome-focused.

---

## Implementation Order

1. Extend the Pi SQLite runtime schema in `.openclaw-build/lib/db.mjs`.
2. Add runtime limit, dedupe, heartbeat, incident, coverage, and inference helpers to the Pi runtime.
3. Add host-capacity sampling and safe-parallelism recommendation helpers to the Pi runtime.
4. Build `runtime-orchestrator.mjs` so the control plane can prioritize and enqueue work while honoring runtime limits.
5. Add the bounded specialist agents: discovery, repair, metadata enrichment, nutrition/allergen, quality audit, math, capacity, then meta-agent.
6. Isolate CPU-heavy math execution from bookkeeping and queue-lease maintenance.
7. Expose the runtime via new `sync-api.mjs` endpoints.
8. Wire founder-only server actions in `lib/openclaw/runtime-control-actions.ts`.
9. Replace the static founder page with the live runtime console.
10. Adjust cron so fixed scraper cadence and queue-driven work can coexist without starving core scrapes.

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Start the Pi runtime locally or on the Raspberry Pi with the new schema and services enabled.
2. Call `/health` and confirm the existing runtime still reports healthy.
3. Call the new runtime overview endpoint and verify it returns directory counts, queue counts, incident counts, coverage facts, and inference counts without breaking existing stats endpoints.
4. Seed one stale source, run the watchdog, and verify an open `source_incidents` row is created or updated.
5. Run the orchestrator once and verify it enqueues at least one `repair_source` or `discover_source` task based on current state.
6. Run the repair agent against a known stale source and verify the task, run, and incident states update correctly.
7. Run the inference engine for a known ingredient/geography gap and verify the result lands in `price_inference_cache`, not `current_prices`, using fallback evidence from nearby geography, same-chain stores, or comparable markets when available.
8. Queue the same repair task twice with the same `dedupe_key` and verify only one active queued or running copy exists.
9. Simulate a lease-expired or lock-lost task and verify it becomes recoverable without leaving a silent orphaned `running` task forever.
10. Simulate source throttling (`429` or equivalent) and verify the source is backed off via `rate_limit_backoff_until` instead of being treated as a generic failure loop.
11. Verify that a lookup with no direct local price but strong fallback evidence returns a labeled inferred estimate instead of a blank.
12. Verify that a lookup with genuinely weak evidence stays blank or unavailable, with the reason exposed and follow-up work queued.
13. Run the catalog enrichment agent on ingredients missing images or source URLs and verify the resulting metadata lands in `ingredient_metadata_profiles` with explicit status fields and provenance.
14. Run the nutrition/allergen agent on a known packaged product and verify it stores linked or partial evidence without inventing unsupported dietary claims.
15. Verify the metadata summary or heat-map endpoint shows geography-level completeness for image, source URL, nutrition, and allergen coverage.
16. Run the capacity agent on an intentionally under-utilized queue and verify it records a `host_capacity_snapshots` row and increases recommended parallelism only when no harder bottleneck is present.
17. Open `/admin/openclaw` as the founder account and verify the runtime console renders live data, degraded states, capacity evidence, queue limits, metadata completeness, and founder-only action buttons.
18. Confirm chef-facing pricing pages and public surfaces still do not expose OpenClaw naming or raw runtime internals.
19. Review one product-detail feature and one recipe-workflow feature and verify runtime-owned acquisition or enrichment logic stays in OpenClaw while website-owned workflow logic stays in ChefFlow.
20. Seed a mix of adjacent weak cells and distant weak cells, run the orchestrator, and verify that adjacent frontier expansion and same-chain extensions outrank random distant expansion when priority inputs are otherwise similar.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Public or chef-facing exposure of OpenClaw runtime internals
- Rewriting every existing scraper in the first slice
- Shipping literal 50-state completeness in one build
- Multi-node cluster orchestration beyond the current Pi-first runtime
- Dynamic code-generation agents that write or deploy new runtime code on their own
- Replacing direct observation with AI-only price guessing
- Assuming unused CPU automatically means safe spare throughput
- Recipe scaling logic that belongs to ChefFlow's recipe math and culinary workflow layer
- Expiration-date facts without real lot-level or inventory-level evidence

---

## Notes for Builder Agent

1. Treat this as a master runtime spec with a concrete first slice, not a mandate to ship the entire national vision in one pass.
2. Preserve the existing internal-only and debranding boundary from the canonical scope specs.
3. Keep the runtime formula-first. The price-inference engine may use disciplined statistical methods, but it must remain explainable and auditable.
4. Do not silently merge inferred prices into direct-observation tables.
5. Do not delete or rewrite current scrapers just to make the architecture look cleaner. The first slice is additive.
6. When choosing between dense re-scan work and breadth-expansion work, prefer breadth whenever coverage is absent or stale enough that repeated density adds less value than expansion.
7. Treat agent spawning as durable task creation inside bounded queues, not uncontrolled process forking.
8. The capacity agent is only useful if it measures the real bottleneck. CPU percentage by itself is not a scheduling policy.
9. Use explicit runtime limits and pool-style budgets for scarce resources such as the SQLite writer path, source-domain request slots, and math-worker concurrency.
10. Keep the orchestrator and lease or heartbeat path lightweight. Do not colocate them with CPU-heavy inference in a way that can stall the queue's own bookkeeping.
11. Treat blank price results as exceptions to be justified, not as the normal answer when direct coverage is missing.
12. Do not create one tiny agent per field. Group metadata completeness work into coherent bounded agents.
13. Recipe scaling belongs to ChefFlow, not this runtime. Use OpenClaw to supply package, unit, and product evidence that ChefFlow can consume.
14. Do not invent expiration dates, gluten-free claims, or allergen labels without explicit upstream evidence.
15. Before implementing new functionality, classify it as OpenClaw-owned, ChefFlow-owned, or handshake-owned and flag misalignments immediately.
16. When developer Q&A clarifies intended runtime behavior, update Developer Notes and the build-facing plan before moving on.
