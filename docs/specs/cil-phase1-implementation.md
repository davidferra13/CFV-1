# CIL Phase 1: Graph Foundation + Signal Pipeline

> **Status:** BUILT (Phase 1 + Phase 2 implemented 2026-04-18)
> **Priority:** P0
> **Parent spec:** `docs/specs/continuous-intelligence-layer.md`
> **Depends on:** Gemma 4 (e4b), chef_activity_log, SSE broadcast, Graphify (dev tool)
> **Informed by:** Graphify's knowledge graph architecture (edge confidence, community detection, incremental updates)

---

## What This Phase Delivers

Three things, each independently useful:

1. **Per-tenant SQLite database** with Entity/Relation/Signal tables
2. **`notifyCIL()` side effect** wired into 7 existing hook points (same pattern as `logChefActivity()`)
3. **Signal-to-graph pipeline** that creates/updates Entities and Relations from incoming Signals

After Phase 1: every chef action, event transition, financial entry, and Remy memory automatically feeds a persistent knowledge graph. No UI yet. No predictions. Just the graph accumulating.

---

## Architecture (from parent spec, refined)

### File Structure

```
lib/cil/
  index.ts          -- module init, called from server startup
  notify.ts         -- exported notifyCIL() function
  observer.ts       -- EventEmitter subscription + signal writes
  db.ts             -- per-tenant SQLite init, WAL mode, schema creation
  ingest.ts         -- Signal -> Entity/Relation pipeline
  types.ts          -- Entity, Relation, Signal TypeScript interfaces
  decay.ts          -- exponential decay sweep (daily scheduled job)
```

### Storage

Per-tenant SQLite file: `storage/cil/{tenantId}.db`

- WAL mode for concurrent reads + one writer
- GDPR deletion = `rm storage/cil/{tenantId}.db`
- Complete tenant isolation at filesystem level
- Uses `better-sqlite3` (synchronous, in-process, no connection pool overhead)
- Lives under `storage/` alongside existing file storage (already gitignored, already backed up)

### Why SQLite (Not PostgreSQL)

The parent spec decided this. Key reasons:

- Cross-tenant leakage impossible (separate files)
- GDPR deletion is instant and complete
- Independent of app DB corruption
- WAL gives read concurrency without connection limits
- CIL data is write-heavy, read-occasional (opposite of app DB pattern)

---

## SQLite Schema

```sql
-- Entities: things CIL tracks (clients, events, recipes, ingredients, vendors, staff)
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,                    -- format: {type}_{app_id} e.g. "client_abc123"
  type TEXT NOT NULL,                     -- chef|client|event|ingredient|vendor|recipe|staff
  label TEXT NOT NULL,                    -- human-readable name
  state TEXT NOT NULL DEFAULT '{}',       -- JSON: current known attributes
  velocity TEXT NOT NULL DEFAULT '{}',    -- JSON: rate of change per attribute
  last_observed INTEGER NOT NULL,         -- epoch ms
  created_at INTEGER NOT NULL,
  observation_count INTEGER NOT NULL DEFAULT 1
);

-- Relations: connections between entities (with Graphify-inspired confidence model)
CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,                    -- deterministic: {from}_{type}_{to}
  from_entity TEXT NOT NULL REFERENCES entities(id),
  to_entity TEXT NOT NULL REFERENCES entities(id),
  type TEXT NOT NULL,                     -- books|contains|supplies|requires|prefers|precedes|uses|pays
  strength REAL NOT NULL DEFAULT 0.5,     -- 0.0-1.0, decays over time, reinforced by observation
  confidence TEXT NOT NULL DEFAULT 'INFERRED', -- EXTRACTED|INFERRED|AMBIGUOUS (from Graphify)
  confidence_score REAL NOT NULL DEFAULT 0.8,  -- 0.0-1.0 numeric confidence
  evidence TEXT NOT NULL DEFAULT '[]',    -- JSON: signal IDs that established/reinforced this
  periodicity INTEGER,                    -- days (365=seasonal), null=not periodic
  chef_override INTEGER NOT NULL DEFAULT 0, -- 1=chef explicitly set, won't auto-decay
  created_at INTEGER NOT NULL,
  last_reinforced INTEGER NOT NULL
);

-- Signals: raw observations from hook points
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,                    -- ulid
  source TEXT NOT NULL,                   -- db_mutation|event_transition|ledger|conversation|memory|automation|inventory
  entity_ids TEXT NOT NULL DEFAULT '[]',  -- JSON: entity IDs involved
  payload TEXT NOT NULL DEFAULT '{}',     -- JSON: source-specific data
  timestamp INTEGER NOT NULL,             -- source event time, NOT receipt time
  interpretation_status TEXT NOT NULL DEFAULT 'pending', -- pending|interpreted|skipped
  created_at INTEGER NOT NULL
);

-- Indexes for query patterns
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_last_observed ON entities(last_observed);
CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_entity);
CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_entity);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(type);
CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(interpretation_status);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
```

### Confidence Model (adapted from Graphify)

| Label       | Meaning                                         | Score Range | When Used                                        |
| ----------- | ----------------------------------------------- | ----------- | ------------------------------------------------ |
| `EXTRACTED` | Directly observed from app data (DB row exists) | 1.0         | Entity created from clients/events/recipes table |
| `INFERRED`  | Derived from behavioral signals                 | 0.4-0.9     | Relation created from activity patterns          |
| `AMBIGUOUS` | Uncertain, needs more evidence                  | 0.1-0.3     | Provisional relation from single observation     |

Relations start at `INFERRED` with score 0.8 when created from clear signals (ledger entry, event transition). Start at `AMBIGUOUS` with score 0.2 when created from weak signals (single Remy memory, single activity log entry). Promote to `EXTRACTED` with score 1.0 when backed by direct DB references (foreign key relationship exists).

---

## `notifyCIL()` Implementation

Follows exact same pattern as `logChefActivity()`:

```typescript
// lib/cil/notify.ts
import { getOrCreateDB } from './db'
import { ingestSignal } from './ingest'
import type { SignalSource } from './types'

export async function notifyCIL(input: {
  tenantId: string
  source: SignalSource
  entityIds: string[] // format: {type}_{id}
  payload: Record<string, unknown>
  timestamp?: number // defaults to Date.now()
}): Promise<void> {
  try {
    const db = getOrCreateDB(input.tenantId)
    const signal = {
      id: generateULID(),
      source: input.source,
      entity_ids: JSON.stringify(input.entityIds),
      payload: JSON.stringify(input.payload),
      timestamp: input.timestamp ?? Date.now(),
      interpretation_status: 'pending' as const,
      created_at: Date.now(),
    }

    db.prepare(
      `
      INSERT INTO signals (id, source, entity_ids, payload, timestamp, interpretation_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      signal.id,
      signal.source,
      signal.entity_ids,
      signal.payload,
      signal.timestamp,
      signal.interpretation_status,
      signal.created_at
    )

    // Synchronous ingestion (SQLite is fast enough)
    ingestSignal(db, signal)
  } catch (err) {
    console.error('[CIL] notifyCIL failed (non-fatal)', err)
    // Never throw. Never block the caller.
  }
}
```

### Hook Points (7 sources, wired Phase 1)

| #   | Source                 | Where to add `notifyCIL()`                                 | Signal source type | Entity IDs pattern                           |
| --- | ---------------------- | ---------------------------------------------------------- | ------------------ | -------------------------------------------- |
| 1   | Activity log           | `lib/activity/log-chef.ts` after successful insert         | `db_mutation`      | `[chef_{tenantId}, {entityType}_{entityId}]` |
| 2   | Event transitions      | `lib/events/transitions.ts` after `transitionEvent()`      | `event_transition` | `[event_{eventId}, client_{clientId}]`       |
| 3   | Ledger entries         | `lib/ledger/append.ts` after `appendLedgerEntryInternal()` | `ledger`           | `[event_{eventId}]` + client if known        |
| 4   | Remy memories          | `lib/ai/remy-memory-actions.ts` after memory extraction    | `memory`           | `[chef_{tenantId}]` + entities mentioned     |
| 5   | Automation executions  | automation engine after rule evaluation                    | `automation`       | `[event_{eventId}]`                          |
| 6   | Inventory transactions | inventory transaction actions                              | `inventory`        | `[ingredient_{ingredientId}]`                |
| 7   | SSE bus                | `lib/cil/observer.ts` EventEmitter subscription            | varies             | parsed from event payload                    |

**Phase 1 priority:** Sources 1-4 first (highest signal volume, easiest to wire). Sources 5-7 in Phase 1b.

---

## Signal-to-Graph Pipeline (`ingest.ts`)

When a Signal arrives, the ingestion pipeline:

1. **Parse entity_ids** from the signal
2. **Upsert Entities**: create if new, update `last_observed` + `observation_count` if existing
3. **Detect Relations**: from signal payload, determine if entities are related
4. **Upsert Relations**: create if new, reinforce `strength` + append to `evidence` if existing
5. **Mark signal** as `interpreted`

### Entity Creation Rules

| Signal Source                | Entities Created                                                             |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `db_mutation` (activity log) | Entity per `entityType/entityId`. Update state from `context` JSONB          |
| `event_transition`           | Event entity (update FSM state). Client entity (update last interaction)     |
| `ledger`                     | Event entity (update financial state). Optionally vendor/ingredient entities |
| `memory`                     | Chef entity (update preferences). Mentioned client/ingredient entities       |

### Relation Detection Rules

| Pattern                                   | Relation Type | Confidence | Score |
| ----------------------------------------- | ------------- | ---------- | ----- |
| Client appears in event transition        | `books`       | EXTRACTED  | 1.0   |
| Ingredient appears in event context       | `requires`    | INFERRED   | 0.8   |
| Chef logs same vendor repeatedly (3+)     | `prefers`     | INFERRED   | 0.6   |
| Two events within 14 days for same client | `precedes`    | INFERRED   | 0.5   |
| Remy memory mentions client preference    | `prefers`     | AMBIGUOUS  | 0.3   |
| Single activity log with ingredient       | `uses`        | AMBIGUOUS  | 0.2   |

### Strength Reinforcement

Each time an existing Relation is observed again:

```
new_strength = min(1.0, old_strength + (1.0 - old_strength) * 0.1)
```

Asymptotic approach to 1.0. First few reinforcements matter most. Diminishing returns.

If AMBIGUOUS relation gets reinforced 3+ times, promote to INFERRED.
If INFERRED relation has direct DB foreign key backing, promote to EXTRACTED.

---

## Exponential Decay (`decay.ts`)

Runs as a scheduled job (daily, off-peak). Same scheduling infrastructure as existing `lib/ai/scheduled/`.

```typescript
// Per-entity-type decay rates (from parent spec)
const DECAY_RATES: Record<string, number> = {
  client: 0.003, // half-life: 231 days
  event: 0.03, // half-life: 23 days
  ingredient: 0.01, // half-life: 69 days
  vendor: 0.005, // half-life: 139 days
  recipe: 0.005, // half-life: 139 days
  staff: 0.01, // half-life: 69 days
}

function decayRelations(db: Database, now: number): void {
  const relations = db.prepare('SELECT * FROM relations WHERE chef_override = 0').all()
  for (const rel of relations) {
    const daysSinceReinforced = (now - rel.last_reinforced) / 86_400_000
    const entityType = rel.from_entity.split('_')[0]
    const lambda = DECAY_RATES[entityType] ?? 0.01
    const decayFactor = Math.exp(-lambda * daysSinceReinforced)
    const newStrength = rel.strength * decayFactor

    if (newStrength < 0.05 && daysSinceReinforced > 90) {
      // Archive: move to archived_relations table (not deleted)
      archiveRelation(db, rel)
    } else {
      db.prepare('UPDATE relations SET strength = ? WHERE id = ?').run(newStrength, rel.id)
    }
  }
}
```

Periodic relations (`periodicity IS NOT NULL`) use extended decay: `periodicity * 1.5` without confirmation before archival. Yearly pattern gets 18 months.

Chef-override relations (`chef_override = 1`) never decay.

---

## Module Initialization

```typescript
// lib/cil/index.ts
import { subscribeToEvents } from './observer'

let initialized = false

export function initCIL(): void {
  if (initialized) return
  initialized = true

  // Subscribe to SSE EventEmitter for real-time signals
  subscribeToEvents()

  console.log('[CIL] Initialized')
}
```

Called from server startup (same place as worker init). If CIL fails to initialize, log and continue. App works without it.

---

## What This Does NOT Include (Phase 2+)

- **Pattern Recognizer** (deviation detection) -- Phase 2
- **Predictions** (future state estimation) -- Phase 3
- **Causal DAG** (why things happen) -- Phase 4
- **Gemma interpretation** (meaning from deviations) -- Phase 5
- **UI surfaces** (ambient state, contextual inserts) -- Phase 6+
- **Remy integration** (`cilInsights` in context) -- Phase 7

Phase 1 is the foundation: observe, record, build the graph. Everything else builds on having a graph that exists and grows.

---

## Graphify Influence Map

What we took from Graphify's architecture and adapted for CIL:

| Graphify Concept                                      | CIL Adaptation                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Edge confidence labels (EXTRACTED/INFERRED/AMBIGUOUS) | Same 3-tier system for Relation confidence                       |
| Numeric confidence_score (0.0-1.0)                    | Same, maps to evidence strength                                  |
| Community detection (Leiden clustering)               | Phase 2: cluster entities to find behavioral communities         |
| God nodes (most connected entities)                   | Phase 2: identify high-velocity entities for pattern recognition |
| Incremental updates (`graphify update`)               | `notifyCIL()` is continuous incremental update                   |
| Knowledge gaps (isolated nodes, thin communities)     | Phase 2: flag entities with weak/missing relations               |
| Graph diff (`graph_diff()`)                           | Phase 3: compare graph snapshots for drift detection             |
| Feedback loop (save_query_result)                     | Phase 7: Remy interactions reinforce/weaken graph edges          |

What we explicitly did NOT take:

- Tree-sitter AST parsing (code analysis tool, not business intelligence)
- LLM subagent extraction (CIL observes app events, not documents)
- HTML visualization (CIL surfaces through Remy and ambient UI, not a graph viewer)
- NetworkX (Python). CIL is TypeScript + SQLite for consistency with ChefFlow stack

---

## Implementation Checklist

### Phase 1a: Foundation (estimate: 1 session)

- [ ] Create `lib/cil/types.ts` with Entity, Relation, Signal interfaces
- [ ] Create `lib/cil/db.ts` with per-tenant SQLite init + schema creation
- [ ] Create `lib/cil/notify.ts` with `notifyCIL()` function
- [ ] Create `lib/cil/ingest.ts` with signal-to-entity/relation pipeline
- [ ] Create `lib/cil/index.ts` with module init
- [ ] Install `better-sqlite3` + `@types/better-sqlite3`
- [ ] Wire `notifyCIL()` into `logChefActivity()` (Source 1)
- [ ] Wire `notifyCIL()` into `transitionEvent()` (Source 2)

### Phase 1b: Remaining Sources (estimate: 1 session)

- [ ] Wire `notifyCIL()` into `appendLedgerEntryInternal()` (Source 3)
- [ ] Wire `notifyCIL()` into Remy memory extraction (Source 4)
- [ ] Wire `notifyCIL()` into automation engine (Source 5)
- [ ] Wire `notifyCIL()` into inventory transactions (Source 6)
- [ ] Create `lib/cil/observer.ts` for SSE EventEmitter subscription (Source 7)

### Phase 1c: Maintenance (estimate: half session)

- [ ] Create `lib/cil/decay.ts` with exponential decay sweep
- [ ] Register decay as scheduled job in `lib/ai/scheduled/job-definitions.ts`
- [ ] Add CIL backup to existing backup script
- [ ] Add `storage/cil/` to appropriate backup/ignore configs

### Verification

- [ ] Create test tenant, fire 10 signals, verify entities/relations in SQLite
- [ ] Verify `notifyCIL()` never throws (non-blocking contract)
- [ ] Verify decay preserves chef-override and periodic relations
- [ ] Verify GDPR: delete tenant SQLite file, confirm no orphaned data
- [ ] Load test: 1000 signals in 10 seconds, confirm no blocking

---

## Connection to Hourly Scanning Vision

From the ChatGPT conversation (2026-04-18): "every hour it scans this, this, this, and pings everything... always look for cohesiveness."

Phase 1 makes this possible by building the graph continuously. Phase 2 (Pattern Recognizer) will run hourly scans on this graph, using the same scheduled job infrastructure. The scanning loop:

1. Read graph from `cil/{tenantId}.db`
2. Run deviation detection (pure math, no Gemma)
3. Flag anomalies (entity velocity spikes, relation strength drops, isolated entities)
4. Feed flags to Remy context (Phase 7)

The graph is the substrate. Scanning is the heartbeat. Remy is the voice. All three layers already have infrastructure; CIL Phase 1 provides the missing piece: persistent, accumulative state.

---

## Dependencies

| Package          | Purpose                                 | Size Impact        |
| ---------------- | --------------------------------------- | ------------------ |
| `better-sqlite3` | SQLite driver (synchronous, in-process) | ~20MB native addon |
| `ulid`           | Signal IDs (time-sortable, unique)      | ~2KB               |

No new AI dependencies. No new cloud services. No new database servers. Self-hosted, local, $0.
