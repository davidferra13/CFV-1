# OpenClaw Runtime Builder Handoff

> **Date:** 2026-04-02
> **Status:** ready for builder execution
> **Purpose:** convert the OpenClaw vision into a dependency-ordered build plan that expands the system safely, preserves the current runtime, and creates visible progression across the site.

---

## Executive Summary

The current OpenClaw system is useful, but it is still mostly a fixed regional scrape loop with a sync layer.

That means the next builder should not try to "replace OpenClaw" or jump straight to nationwide completeness. The correct move is to add the missing control plane in bounded slices:

- durable queue and runtime limits
- founder-only runtime visibility
- source discovery and stale-source repair
- coverage tracking and inference
- capacity-aware orchestration
- then carefully expanded website surfaces that consume the improved data

This handoff gives the exact order to do that without destroying the current Pi runtime, the existing sync path, or the current website behavior.

---

## Canonical Read Order

Read these in this exact order:

1. `docs/build-state.md`
2. `docs/specs/openclaw-canonical-scope-and-sequence.md`
3. `docs/specs/openclaw-internal-only-boundary-and-debranding.md`
4. `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`
5. `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`

Only then inspect live implementation files in this order:

1. `.openclaw-build/lib/db.mjs`
2. `.openclaw-build/services/sync-api.mjs`
3. `.openclaw-deploy/crontab-v7.txt`
4. `scripts/openclaw-dashboard/server.mjs`
5. `app/(admin)/admin/openclaw/page.tsx`
6. `components/admin/openclaw-usage-page.tsx`
7. `lib/openclaw/store-catalog-actions.ts`
8. `app/(chef)/prices/page.tsx`

---

## What Exists Today

Treat these as baseline truths, not as pending design questions:

- the Pi runtime already stores sources, canonical ingredients, current prices, price changes, and normalization mappings
- the Pi runtime already exposes a simple sync and query API
- the Pi runtime already exposes some useful ingredient detail fields such as stock state, source URL, image URL, brand, category, and last confirmation time
- the Pi runtime already runs on fixed cron cadences
- the app already has chef-facing price surfaces consuming mirrored OpenClaw outputs
- the app already has an app-side polish job that fills images, categories, nutrition links, and source URLs outside the Pi runtime control plane
- the app already has a separate packaged-product lookup surface for nutrition and allergen research
- the app already has a founder-only `/admin/openclaw` route, but it is still a static usage/policy page rather than a runtime console
- the ideal future-state spec is already written

Do not restart the vision from zero. Build from this baseline.

---

## Core Build Rule

Every OpenClaw build step must satisfy all four conditions:

1. preserve the current Pi runtime unless the new slice fully replaces an old behavior with verification
2. be additive before it is substitutive
3. improve either coverage, reliability, visibility, or website usefulness
4. leave the chef/public boundary intact unless a spec explicitly authorizes new outcome-facing value there
5. classify the change as OpenClaw-owned, ChefFlow-owned, or handshake-owned before building it

If a change does not create progression in one of those four ways, it is not the next best use of time.

Also: if developer Q&A clarifies intended behavior for this lane, the spec and this handoff should be updated before more implementation planning continues. Do not rely on chat memory.

If ownership is unclear, that uncertainty must be called out before the builder expands the feature. Ambiguous ownership is an architecture risk.

---

## Responsibility Split

Use this split when deciding where new work belongs:

- `OpenClaw-owned`
  Source discovery, scraping, pingability, source health, direct observations, metadata enrichment, nutrition/allergen evidence linking, anomaly detection, coverage heat maps, internal runtime truth.
- `ChefFlow-owned`
  Search UX, filters, product cards, recipe flows, recipe scaling, shopping workflows, exports, saved lists, manual chef overrides, public or chef-facing presentation.
- `Handshake-owned`
  OpenClaw emits evidence-rich facts and statuses; ChefFlow consumes them into usable workflows without re-owning the underlying acquisition or inference logic.

Current boundary smells that should be treated as transitional rather than final architecture:

- `lib/openclaw/polish-job.ts` currently performs important enrichment work from the app layer. That is acceptable as a bridge, but long-term canonical enrichment ownership should move into the OpenClaw runtime control plane.
- `components/recipes/product-lookup-panel.tsx` is a useful website-side lookup tool, but it should not quietly become the durable system-of-record for nutrition or allergen completeness.
- Recipe scaling should stay on the ChefFlow side even when OpenClaw provides better package, unit, and product evidence.

Meta-agent interpretation rule:

- do not treat the meta-agent as if it will think of every product requirement the founder might later describe
- do treat it as a bounded supervisor that notices measurable runtime patterns and routes pre-defined task types
- if a new idea depends on the meta-agent noticing something, make sure the triggering signal, threshold, and spawned task type are actually written down in the spec first

Examples of valid meta-agent spawns:

- `repair_source` when a source becomes stale and incident severity rises
- `verify_pingability` when a source can still price products but stock freshness becomes unreliable
- `enrich_metadata` when high-traffic ingredients are still missing images or source links
- `refresh_nutrition` when packaged-product categories still lack nutrition or allergen evidence
- `audit_quality` when price changes or stock states look contradictory
- `rebalance_parallelism` when queue depth is high and safe host capacity is available

---

## What "Progression" Means

For this lane, progression is not vague activity. It means one or more of these outcomes:

- more sources are known
- more geography is covered
- more prices are directly observed
- more gaps are inferred with auditability
- fewer ingredient lookups fall back to blank results when defensible estimated prices are available
- more products carry image, source URL, stock freshness, and classification completeness
- more products carry verified or partial nutrition and allergen evidence with provenance
- more source pingability or reliability truth is visible instead of guessed
- more stale or broken sources are repaired automatically
- more machine capacity is used safely
- founder visibility is more truthful
- metadata heat maps and completeness audits are more truthful
- chef-facing outcomes get more useful without exposing OpenClaw internals

---

## Do Not Break These Things

- do not wipe or reset the Pi database
- do not delete current scrapers just because the control plane is being added
- do not expose OpenClaw branding or runtime internals on chef/public surfaces
- do not replace direct observations with inferred prices
- do not use hardware utilization as an excuse for unbounded concurrency
- do not block the existing sync path before the replacement path is verified

---

## Exact Execution Order

The next builder should follow this order exactly.

### Phase 0. Preserve and instrument the baseline

Goal:

- make the existing runtime easier to observe before changing behavior

Tasks:

- verify current `/health` and `/api/stats` behavior
- verify existing SQLite schema and cron jobs
- verify what the current ingredient-detail and catalog endpoints already expose for image, stock, source URL, and freshness
- verify what the current app-side polish job and packaged-product lookup already do so the new runtime slice extends them instead of duplicating them blindly
- add missing runtime readouts only if they do not change scheduling behavior yet
- document current source count, price count, scrape freshness, and known stale-source behavior

Primary files:

- `.openclaw-build/lib/db.mjs`
- `.openclaw-build/services/sync-api.mjs`
- `.openclaw-deploy/crontab-v7.txt`
- `scripts/openclaw-dashboard/server.mjs`

Exit condition:

- the builder can describe exactly what the current runtime is doing, what is stale, and where the first additive slice will attach

### Phase 1. Build the control-plane schema

Goal:

- create the data structures required for queueing, coverage, inference, incidents, metadata completeness, and capacity without changing public behavior yet

Tasks:

- add `coverage_cells`
- add `ingredient_metadata_profiles`
- add `host_capacity_snapshots`
- add `runtime_limits`
- add `agent_runs`
- add `agent_tasks`
- add `source_incidents`
- add `price_inference_cache`
- extend `source_registry` with directory, rate-limit, and ping-reliability fields
- preserve WAL and add `busy_timeout` plus observable checkpoint behavior

Primary file:

- `.openclaw-build/lib/db.mjs`

Exit condition:

- the Pi runtime boots cleanly with the additive schema and no regression to existing price storage

### Phase 2. Expose founder-only runtime reads

Goal:

- make the control plane visible before letting it drive more behavior

Tasks:

- extend the Pi `sync-api` with runtime overview, source directory, incidents, coverage, metadata summary, metadata audit, agent-run, and inference-audit endpoints
- build founder-only server actions to read those endpoints
- replace the static usage page with a live runtime console while keeping the existing boundary copy

Primary files:

- `.openclaw-build/services/sync-api.mjs`
- `lib/openclaw/runtime-control-actions.ts`
- `app/(admin)/admin/openclaw/page.tsx`
- `components/admin/openclaw-usage-page.tsx`
- `components/admin/openclaw-runtime-console.tsx`

Exit condition:

- founder can truthfully answer what sources exist, what is stale, and what the runtime is doing, from the admin UI alone

### Phase 3. Add bounded task orchestration

Goal:

- move from fixed cron-only behavior toward a durable queue without disrupting known-good scrapes

Tasks:

- implement queue claim, dedupe, heartbeat, lease-expiry, retry, and dead-letter behavior
- build `runtime-orchestrator.mjs`
- keep cron as the coarse trigger, but move job selection into queue logic
- add runtime limits for scarce resources such as queue groups, domains, and the SQLite writer path

Primary files:

- `.openclaw-build/lib/db.mjs`
- `.openclaw-build/services/runtime-orchestrator.mjs`
- `.openclaw-build/services/sync-api.mjs`
- `.openclaw-deploy/crontab-v7.txt`

Exit condition:

- at least one real runtime job is selected and executed through the queue path rather than only through hard-coded cron routing

### Phase 4. Add the first specialist agents

Goal:

- create the minimum self-healing loops before attempting larger national expansion

Tasks:

- implement `source-repair-agent.mjs`
- implement `source-discovery-agent.mjs`
- implement `catalog-enrichment-agent.mjs`
- implement `nutrition-allergen-agent.mjs`
- implement `quality-audit-agent.mjs`
- implement `meta-agent.mjs` as bounded task creation, not uncontrolled process spawning
- connect watchdog outputs to `source_incidents` and repair tasks

Primary files:

- `.openclaw-build/services/source-repair-agent.mjs`
- `.openclaw-build/services/source-discovery-agent.mjs`
- `.openclaw-build/services/catalog-enrichment-agent.mjs`
- `.openclaw-build/services/nutrition-allergen-agent.mjs`
- `.openclaw-build/services/quality-audit-agent.mjs`
- `.openclaw-build/services/meta-agent.mjs`
- `.openclaw-build/services/watchdog.mjs`

Exit condition:

- stale or broken sources can automatically become incidents and then real repair work, with visible state transitions, while missing metadata gaps can become real enrichment work instead of remaining invisible forever

### Phase 5. Add inference and coverage expansion

Goal:

- stop relying only on direct scrape density and start building a national intelligence layer

Tasks:

- implement `price-inference-engine.mjs`
- compute and store coverage cells from direct observations
- compute metadata completeness rollups and geography heat-map inputs from direct observations plus enrichment state
- keep inferred prices separate from direct prices
- implement the fallback order for missing local prices: nearby geography, same-chain evidence, then comparable-market evidence
- leave results blank only when confidence remains below threshold after fallback evidence is exhausted
- expose direct versus inferred state in the founder console
- expose image, source URL, nutrition, allergen, and ping-reliability completeness in the founder console
- prioritize under-covered geography over low-value repeated refreshes

Primary files:

- `.openclaw-build/services/aggregator.mjs`
- `.openclaw-build/services/price-inference-engine.mjs`
- `.openclaw-build/services/runtime-orchestrator.mjs`
- `components/admin/openclaw-runtime-console.tsx`

Exit condition:

- the founder console can show where coverage is direct, where it is inferred, where it is missing, and where metadata completeness is strong or weak

### Phase 6. Add capacity-aware orchestration

Goal:

- safely use more of the machine when real headroom exists

Tasks:

- implement `hardware-capacity-agent.mjs`
- measure CPU, memory, I/O, queue depth, SQLite write wait, and rate-limit pressure
- adjust recommended concurrency only inside bounded limits
- surface the active bottleneck in the founder console

Primary files:

- `.openclaw-build/services/hardware-capacity-agent.mjs`
- `.openclaw-build/services/runtime-orchestrator.mjs`
- `.openclaw-build/services/sync-api.mjs`
- `components/admin/openclaw-runtime-console.tsx`

Exit condition:

- the system can explain why it is under-using the machine or why it is intentionally capped

### Phase 7. Expand website value carefully

Goal:

- turn the stronger runtime into visible website progression without leaking internals

Tasks:

- improve chef-facing pricing usefulness through better freshness, broader store coverage, and explicit "best available" behavior
- improve chef-facing product lookup usefulness through better price detail, image coverage, stock freshness, source links, and product completeness where the runtime has real evidence
- keep OpenClaw debranded on chef/public surfaces
- only surface derived value, never raw runtime internals
- use research to decide which outcome-facing site surfaces benefit most from improved pricing intelligence next

Primary files:

- `lib/openclaw/store-catalog-actions.ts`
- `app/(chef)/prices/page.tsx`
- `app/(chef)/prices/prices-client.tsx`
- any additional chef/admin product surfaces explicitly authorized by future specs

Exit condition:

- website users get better outcomes from the improved data engine without learning about the internal runtime architecture

---

## Recommended First Build Slice

Do this first if only one slice can be executed now:

1. Phase 1
2. Phase 2
3. the read-only parts of Phase 3

Reason:

- this creates the control-plane foundation
- it preserves the current runtime
- it gives truthful founder visibility
- it de-risks every later orchestration or agent change

Do not start with:

- nationwide discovery at scale
- aggressive new concurrency
- public or chef-facing UI rewrites
- inference-first product behavior

Those all depend on the control plane existing first.

---

## Verification Rules

Every phase must end with explicit verification.

Minimum required checks:

- Pi runtime still boots
- existing `/health` still returns healthy
- existing stats endpoints still work unless a verified replacement is in place
- existing sync behavior still works unless the replacement path is verified
- founder-only runtime UI loads without exposing internals publicly
- no inferred prices overwrite direct prices
- no metadata claim is fabricated when evidence is missing or conflicting
- no destructive schema migration occurs
- the builder can state whether the slice is OpenClaw-owned, ChefFlow-owned, or handshake-owned

If a builder cannot verify a phase, the phase is not complete.

---

## Research Program That Should Continue In Parallel

Going forward, research should continue, but it must feed building rather than replace it.

The parallel research program should keep answering:

- which new chains, stores, and source surfaces should enter the national directory next
- which chef/admin website surfaces would benefit most from improved price intelligence
- which upstream metadata sources best improve image, source URL, nutrition, allergen, and classification completeness
- where support, operations, or growth workflows on the site need stronger data backing
- which runtime bottlenecks are measured versus assumed
- which fallback signals most improve missing-price estimation quality without creating fake certainty

Research should produce:

- ranked source opportunities
- ranked product-surface opportunities
- proof of breakpoints or bottlenecks
- spec refinements when the current build plan is missing something real

Research should not become:

- endless re-description of the same OpenClaw ambition
- a substitute for shipping the next additive slice

---

## Completion Condition

This handoff is complete when the next builder can answer these questions without guessing:

1. What is the first additive slice?
2. What must not be broken while building it?
3. What exact files are in scope first?
4. What comes after the first slice?
5. How does research continue without blocking progression?

This handoff now answers all five.
