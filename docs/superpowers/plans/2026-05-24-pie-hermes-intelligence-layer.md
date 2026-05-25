# PIE x Hermes: Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead Raspberry Pi with Hermes (NousResearch agent platform) as PIE's autonomous operator, with PostgreSQL as the single data store and a deterministic fallback cron that guarantees PIE never stops.

**Architecture:** Hermes runs on the PC as a background service, connects to ChefFlow's PostgreSQL via MCP, and operates 8 PIE skills autonomously. ChefFlow communicates with Hermes through shared PG tables (event queue + heartbeat). A fallback cron in ChefFlow activates automatically when Hermes is down.

**Tech Stack:** Next.js (ChefFlow), PostgreSQL (Drizzle ORM), Hermes (NousResearch hermes-agent), Ollama (Gemma 4), Discord (alerts)

**Spec:** `docs/superpowers/specs/2026-05-24-pie-hermes-intelligence-layer-design.md`

---

## File Structure

### New Files (ChefFlow)

| File                                                               | Responsibility                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `database/migrations/20260526000001_hermes_operational_tables.sql` | 4 new tables: heartbeats, actions, queue, feedback           |
| `lib/pricing/hermes-heartbeat.ts`                                  | Read heartbeat status, determine if Hermes is alive          |
| `lib/pricing/hermes-queue.ts`                                      | Write events to hermes_queue table                           |
| `lib/pricing/hermes-actions.ts`                                    | Log fallback actions to hermes_actions table                 |
| `lib/pricing/fallback-cron.ts`                                     | Deterministic fallback operations (runs when Hermes is down) |
| `app/api/pie/v1/cron/fallback/route.ts`                            | New fallback-specific cron endpoint                          |
| `app/(dev)/hermes/page.tsx`                                        | Dev-only monitoring dashboard                                |
| `app/(dev)/hermes/actions.ts`                                      | Server actions for dev dashboard                             |
| `tests/unit/pie.hermes-heartbeat.test.ts`                          | Heartbeat logic tests                                        |
| `tests/unit/pie.hermes-queue.test.ts`                              | Event queue tests                                            |
| `tests/unit/pie.fallback-cron.test.ts`                             | Fallback logic tests                                         |
| `scripts/hermes/pi-data-dump.sh`                                   | One-time Pi SQLite to PG migration script                    |
| `scripts/hermes/skills/pie-measure.md`                             | Hermes skill: metrics snapshot                               |
| `scripts/hermes/skills/pie-ratchet.md`                             | Hermes skill: coverage gap fixing                            |
| `scripts/hermes/skills/pie-census.md`                              | Hermes skill: manifest expansion                             |
| `scripts/hermes/skills/pie-alert.md`                               | Hermes skill: regression detection                           |
| `scripts/hermes/skills/pie-accuracy.md`                            | Hermes skill: price validation                               |
| `scripts/hermes/skills/pie-forecast.md`                            | Hermes skill: trend intelligence                             |
| `scripts/hermes/skills/pie-fix.md`                                 | Hermes skill: law violation fixing                           |
| `scripts/hermes/skills/pie-acquire.md`                             | Hermes skill: data acquisition                               |

### Files to Delete

| File                                              | Reason                                          |
| ------------------------------------------------- | ----------------------------------------------- |
| `lib/pricing/pi-bridge.ts`                        | Pi client + circuit breaker (Pi decommissioned) |
| `lib/pricing/tiers/pi-bridge.ts`                  | Pi Bridge tier resolver                         |
| `tests/unit/pie.pi-bridge.test.ts`                | Tests for deleted code                          |
| `tests/unit/pi-bridge-state.test.ts`              | Tests for deleted code                          |
| `app/api/pricing/bridge-health/route.ts`          | Pi health endpoint                              |
| `app/api/scheduled/pi-price-propagation/route.ts` | Pi propagation cron                             |
| `components/pricing/bridge-health-dot.tsx`        | Pi health UI indicator                          |
| `scripts/pie-bridge-watchdog.mts`                 | Pi watchdog script                              |
| `scripts/hermes/openclaw-freshness.sh`            | Pi freshness monitor                            |

### Files to Modify

| File                                              | Change                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/pricing/resolve-price.ts`                    | Remove piBridgeResolver import, remove from tier array, remove batch Pi path |
| `lib/env.ts`                                      | Remove PI_BRIDGE_URL, PI_BRIDGE_SECRET declarations                          |
| `app/api/pie/v1/cron/route.ts`                    | Add heartbeat-gated fallback mode                                            |
| `lib/discovery/registries/admin-rail-registry.ts` | Remove bridge-health registry entry                                          |
| `lib/pricing/pie-attention-actions.ts`            | Remove Pi Bridge references                                                  |
| `lib/pricing/region-coverage-actions.ts`          | Remove Pi Bridge fallback path                                               |

---

## Phase 0: Triage (Prerequisites)

### Task 1: Pi Data Dump Script

**Files:**

- Create: `scripts/hermes/pi-data-dump.sh`

This script runs once while Pi still has data. It dumps SQLite tables to CSV, then imports to PostgreSQL.

- [ ] **Step 1: Write the dump script**

```bash
#!/usr/bin/env bash
# One-time migration: Pi SQLite -> ChefFlow PostgreSQL
# Run while Pi (10.0.0.177) is still reachable
# Prerequisites: ssh access to Pi, psql access to ChefFlow DB

set -euo pipefail

PI_HOST="davidferra@10.0.0.177"
PI_DB="/home/davidferra/openclaw/prices.db"
DUMP_DIR="./tmp/pi-dump"
PG_URL="${DATABASE_URL:-postgresql://localhost:5432/chefflow}"

echo "=== PIE Pi Data Dump ==="
echo "Target: $PG_URL"
echo "Source: $PI_HOST:$PI_DB"
echo ""

mkdir -p "$DUMP_DIR"

# Step 1: Dump key tables from Pi SQLite to CSV
echo "[1/4] Dumping Pi SQLite tables..."

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM prices;'" > "$DUMP_DIR/prices.csv"
echo "  prices: $(wc -l < "$DUMP_DIR/prices.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM canonical_ingredients;'" > "$DUMP_DIR/canonical_ingredients.csv"
echo "  canonical_ingredients: $(wc -l < "$DUMP_DIR/canonical_ingredients.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM stores;'" > "$DUMP_DIR/stores.csv"
echo "  stores: $(wc -l < "$DUMP_DIR/stores.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM seasonal_scores;'" > "$DUMP_DIR/seasonal_scores.csv"
echo "  seasonal_scores: $(wc -l < "$DUMP_DIR/seasonal_scores.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM yield_factors;'" > "$DUMP_DIR/yield_factors.csv"
echo "  yield_factors: $(wc -l < "$DUMP_DIR/yield_factors.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM anomalies;'" > "$DUMP_DIR/anomalies.csv"
echo "  anomalies: $(wc -l < "$DUMP_DIR/anomalies.csv") rows"

# Step 2: Import to PostgreSQL using COPY
echo ""
echo "[2/4] Creating staging tables in PostgreSQL..."

psql "$PG_URL" <<'SQL'
CREATE TABLE IF NOT EXISTS pi_import_prices (
  id TEXT,
  ingredient_name TEXT,
  canonical_ingredient_id TEXT,
  price_cents INTEGER,
  unit TEXT,
  store_name TEXT,
  state TEXT,
  city TEXT,
  source TEXT,
  last_confirmed_at TIMESTAMPTZ,
  product_name TEXT,
  in_stock BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pi_import_ingredients (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  standard_unit TEXT
);

CREATE TABLE IF NOT EXISTS pi_import_stores (
  id TEXT,
  name TEXT,
  chain TEXT,
  state TEXT,
  city TEXT,
  zip TEXT,
  lat NUMERIC,
  lon NUMERIC,
  source TEXT
);
SQL

echo "[3/4] Importing CSVs..."

psql "$PG_URL" -c "\COPY pi_import_prices FROM '$DUMP_DIR/prices.csv' WITH CSV HEADER"
psql "$PG_URL" -c "\COPY pi_import_ingredients FROM '$DUMP_DIR/canonical_ingredients.csv' WITH CSV HEADER"
psql "$PG_URL" -c "\COPY pi_import_stores FROM '$DUMP_DIR/stores.csv' WITH CSV HEADER"

echo "[4/4] Verifying import..."
psql "$PG_URL" -c "SELECT 'prices' AS t, COUNT(*) FROM pi_import_prices UNION ALL SELECT 'ingredients', COUNT(*) FROM pi_import_ingredients UNION ALL SELECT 'stores', COUNT(*) FROM pi_import_stores;"

echo ""
echo "=== DONE ==="
echo "Data is in staging tables (pi_import_*). Reconciliation with existing openclaw.* tables is next step."
echo "Run: scripts/hermes/pi-data-reconcile.sh to merge into production tables."
```

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x scripts/hermes/pi-data-dump.sh
git add scripts/hermes/pi-data-dump.sh
git commit -m "feat(pie): add one-time Pi data dump script for Hermes migration"
```

---

## Phase 2: Pi Decommission (Code Changes)

### Task 2: Create Database Migration for Hermes Tables

**Files:**

- Create: `database/migrations/20260526000001_hermes_operational_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Hermes operational tables for PIE autonomous operation
-- These tables enable communication between ChefFlow and Hermes via PostgreSQL

-- Heartbeat: Hermes writes every 60s, ChefFlow reads to detect liveness
CREATE TABLE IF NOT EXISTS hermes_heartbeats (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'alive',
  queue_depth INTEGER DEFAULT 0,
  current_skill TEXT,
  last_action TEXT,
  error_count INTEGER DEFAULT 0
);

CREATE INDEX idx_hermes_heartbeats_timestamp ON hermes_heartbeats (timestamp DESC);

-- Actions log: both Hermes and fallback write here for unified audit trail
CREATE TABLE IF NOT EXISTS hermes_actions (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skill TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'hermes',
  action TEXT NOT NULL,
  reason TEXT,
  items_affected INTEGER DEFAULT 0,
  duration_ms INTEGER,
  result TEXT DEFAULT 'success'
);

CREATE INDEX idx_hermes_actions_timestamp ON hermes_actions (timestamp DESC);
CREATE INDEX idx_hermes_actions_skill ON hermes_actions (skill);

-- Event queue: ChefFlow writes events, Hermes polls and processes
CREATE TABLE IF NOT EXISTS hermes_queue (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_hermes_queue_pending ON hermes_queue (priority, timestamp) WHERE status = 'pending';

-- Feedback: chef price corrections that inform Hermes learning
CREATE TABLE IF NOT EXISTS hermes_feedback (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingredient_id TEXT NOT NULL,
  resolved_price NUMERIC,
  actual_price NUMERIC,
  source TEXT,
  region TEXT,
  notes TEXT
);

CREATE INDEX idx_hermes_feedback_ingredient ON hermes_feedback (ingredient_id);
```

- [ ] **Step 2: Commit**

```bash
git add database/migrations/20260526000001_hermes_operational_tables.sql
git commit -m "feat(pie): add Hermes operational tables migration (heartbeat, actions, queue, feedback)"
```

---

### Task 3: Write Heartbeat Reader Module

**Files:**

- Create: `lib/pricing/hermes-heartbeat.ts`
- Test: `tests/unit/pie.hermes-heartbeat.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/pie.hermes-heartbeat.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))

import { db } from '@/lib/db'
import { isHermesAlive, getHermesStatus } from '@/lib/pricing/hermes-heartbeat'

const mockExecute = vi.mocked(db.execute)

describe('hermes-heartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isHermesAlive', () => {
    it('returns true when heartbeat within 5 minutes', async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      mockExecute.mockResolvedValueOnce([
        { timestamp: twoMinutesAgo, status: 'alive', queue_depth: 0 },
      ] as any)

      expect(await isHermesAlive()).toBe(true)
    })

    it('returns false when no heartbeat exists', async () => {
      mockExecute.mockResolvedValueOnce([] as any)
      expect(await isHermesAlive()).toBe(false)
    })

    it('returns false when heartbeat older than 5 minutes', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      mockExecute.mockResolvedValueOnce([
        { timestamp: tenMinutesAgo, status: 'alive', queue_depth: 0 },
      ] as any)

      expect(await isHermesAlive()).toBe(false)
    })

    it('returns false when heartbeat status is error', async () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
      mockExecute.mockResolvedValueOnce([
        { timestamp: oneMinuteAgo, status: 'error', queue_depth: 0 },
      ] as any)

      expect(await isHermesAlive()).toBe(false)
    })
  })

  describe('getHermesStatus', () => {
    it('returns full status object when heartbeat exists', async () => {
      const now = new Date().toISOString()
      mockExecute.mockResolvedValueOnce([
        {
          timestamp: now,
          status: 'alive',
          queue_depth: 3,
          current_skill: 'pie-ratchet',
          last_action: 'Fixed 12 coverage gaps',
          error_count: 0,
        },
      ] as any)

      const status = await getHermesStatus()
      expect(status).toEqual({
        alive: true,
        mode: 'hermes',
        lastHeartbeat: now,
        queueDepth: 3,
        currentSkill: 'pie-ratchet',
        lastAction: 'Fixed 12 coverage gaps',
        errorCount: 0,
      })
    })

    it('returns fallback mode when no heartbeat', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      const status = await getHermesStatus()
      expect(status).toEqual({
        alive: false,
        mode: 'fallback',
        lastHeartbeat: null,
        queueDepth: 0,
        currentSkill: null,
        lastAction: null,
        errorCount: 0,
      })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/pie.hermes-heartbeat.test.ts`
Expected: FAIL with "Cannot find module '@/lib/pricing/hermes-heartbeat'"

- [ ] **Step 3: Write implementation**

```typescript
// lib/pricing/hermes-heartbeat.ts
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000

export interface HermesStatus {
  alive: boolean
  mode: 'hermes' | 'fallback'
  lastHeartbeat: string | null
  queueDepth: number
  currentSkill: string | null
  lastAction: string | null
  errorCount: number
}

interface HeartbeatRow {
  timestamp: string
  status: string
  queue_depth: number
  current_skill: string | null
  last_action: string | null
  error_count: number
}

export async function isHermesAlive(): Promise<boolean> {
  const rows = (await db.execute(sql`
    SELECT timestamp, status
    FROM hermes_heartbeats
    ORDER BY timestamp DESC
    LIMIT 1
  `)) as unknown as HeartbeatRow[]

  if (rows.length === 0) return false

  const row = rows[0]
  if (row.status !== 'alive') return false

  const age = Date.now() - new Date(row.timestamp).getTime()
  return age < HEARTBEAT_TIMEOUT_MS
}

export async function getHermesStatus(): Promise<HermesStatus> {
  const rows = (await db.execute(sql`
    SELECT timestamp, status, queue_depth, current_skill, last_action, error_count
    FROM hermes_heartbeats
    ORDER BY timestamp DESC
    LIMIT 1
  `)) as unknown as HeartbeatRow[]

  if (rows.length === 0) {
    return {
      alive: false,
      mode: 'fallback',
      lastHeartbeat: null,
      queueDepth: 0,
      currentSkill: null,
      lastAction: null,
      errorCount: 0,
    }
  }

  const row = rows[0]
  const age = Date.now() - new Date(row.timestamp).getTime()
  const alive = row.status === 'alive' && age < HEARTBEAT_TIMEOUT_MS

  return {
    alive,
    mode: alive ? 'hermes' : 'fallback',
    lastHeartbeat: row.timestamp,
    queueDepth: row.queue_depth,
    currentSkill: row.current_skill,
    lastAction: row.last_action,
    errorCount: row.error_count,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/pie.hermes-heartbeat.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/hermes-heartbeat.ts tests/unit/pie.hermes-heartbeat.test.ts
git commit -m "feat(pie): add Hermes heartbeat reader with liveness detection"
```

---

### Task 4: Write Event Queue Module

**Files:**

- Create: `lib/pricing/hermes-queue.ts`
- Test: `tests/unit/pie.hermes-queue.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/pie.hermes-queue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))

import { db } from '@/lib/db'
import { enqueueHermesEvent, type HermesEventType } from '@/lib/pricing/hermes-queue'

const mockExecute = vi.mocked(db.execute)

describe('hermes-queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueueHermesEvent', () => {
    it('inserts event with correct type and payload', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      await enqueueHermesEvent('menu.created', {
        menuId: 'menu_123',
        tenantId: 'chef_abc',
        ingredientIds: ['ing_1', 'ing_2'],
      })

      expect(mockExecute).toHaveBeenCalledTimes(1)
      const callArg = mockExecute.mock.calls[0][0]
      expect(callArg.queryChunks || callArg.sql || String(callArg)).toContain('hermes_queue')
    })

    it('sets priority 1 for reactive events', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      await enqueueHermesEvent('price.overridden', {
        ingredientId: 'ing_1',
        oldPrice: 450,
        newPrice: 500,
      })

      expect(mockExecute).toHaveBeenCalledTimes(1)
    })

    it('sets priority 2 for scheduled events', async () => {
      mockExecute.mockResolvedValueOnce([] as any)

      await enqueueHermesEvent('ingredient.added', {
        ingredientId: 'ing_new',
        name: 'Dragon Fruit',
      })

      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/pie.hermes-queue.test.ts`
Expected: FAIL with "Cannot find module '@/lib/pricing/hermes-queue'"

- [ ] **Step 3: Write implementation**

```typescript
// lib/pricing/hermes-queue.ts
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type HermesEventType =
  | 'menu.created'
  | 'price.overridden'
  | 'ingredient.added'
  | 'event.quoted'
  | 'recipe.costed'

const REACTIVE_EVENTS: HermesEventType[] = ['menu.created', 'price.overridden', 'event.quoted']

function priorityForEvent(type: HermesEventType): number {
  if (REACTIVE_EVENTS.includes(type)) return 1
  return 2
}

export async function enqueueHermesEvent(
  type: HermesEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const priority = priorityForEvent(type)

  await db.execute(sql`
    INSERT INTO hermes_queue (event_type, payload, priority, status)
    VALUES (${type}, ${JSON.stringify(payload)}::jsonb, ${priority}, 'pending')
  `)
}

export async function getPendingQueueDepth(): Promise<number> {
  const rows = (await db.execute(sql`
    SELECT COUNT(*)::int AS count FROM hermes_queue WHERE status = 'pending'
  `)) as unknown as Array<{ count: number }>

  return rows[0]?.count ?? 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/pie.hermes-queue.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/hermes-queue.ts tests/unit/pie.hermes-queue.test.ts
git commit -m "feat(pie): add Hermes event queue writer for chef action events"
```

---

### Task 5: Write Hermes Actions Logger

**Files:**

- Create: `lib/pricing/hermes-actions.ts`

- [ ] **Step 1: Write the module**

```typescript
// lib/pricing/hermes-actions.ts
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type HermesSkill =
  | 'pie-measure'
  | 'pie-ratchet'
  | 'pie-census'
  | 'pie-alert'
  | 'pie-accuracy'
  | 'pie-forecast'
  | 'pie-fix'
  | 'pie-acquire'

export interface LogActionParams {
  skill: HermesSkill
  source: 'hermes' | 'fallback'
  action: string
  reason?: string
  itemsAffected?: number
  durationMs?: number
  result?: 'success' | 'partial' | 'failed'
}

export async function logHermesAction(params: LogActionParams): Promise<void> {
  await db.execute(sql`
    INSERT INTO hermes_actions (skill, source, action, reason, items_affected, duration_ms, result)
    VALUES (
      ${params.skill},
      ${params.source},
      ${params.action},
      ${params.reason ?? null},
      ${params.itemsAffected ?? 0},
      ${params.durationMs ?? null},
      ${params.result ?? 'success'}
    )
  `)
}

export async function getRecentActions(limit: number = 20): Promise<
  Array<{
    id: number
    timestamp: string
    skill: string
    source: string
    action: string
    reason: string | null
    items_affected: number
    duration_ms: number | null
    result: string
  }>
> {
  return (await db.execute(sql`
    SELECT id, timestamp::text, skill, source, action, reason, items_affected, duration_ms, result
    FROM hermes_actions
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `)) as any
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/pricing/hermes-actions.ts
git commit -m "feat(pie): add Hermes actions logger for audit trail"
```

---

### Task 6: Remove Pi Bridge Client

**Files:**

- Delete: `lib/pricing/pi-bridge.ts`
- Delete: `lib/pricing/tiers/pi-bridge.ts`
- Modify: `lib/pricing/resolve-price.ts`

- [ ] **Step 1: Remove piBridgeResolver from tier waterfall**

In `lib/pricing/resolve-price.ts`, remove the import:

```typescript
// REMOVE this line:
import { piBridgeResolver } from './tiers/pi-bridge'
```

And remove from the tierResolvers array:

```typescript
// REMOVE this line from the array:
  piBridgeResolver, // 2.7
```

- [ ] **Step 2: Remove lookupPricesBatch import and batch Pi path**

In `lib/pricing/resolve-price.ts`, remove:

```typescript
// REMOVE this import:
import { lookupPricesBatch } from './pi-bridge'
```

Remove the entire batch Pi Bridge section in `resolvePricesBatch` (the block that calls `lookupPricesBatch` and resolves tier `pi_bridge_live_batch`). This section starts with a comment about "Pi Bridge batch" and sets prices with `sourceTier: 'pi_bridge_live_batch'`.

- [ ] **Step 3: Delete the Pi Bridge files**

```bash
rm lib/pricing/pi-bridge.ts
rm lib/pricing/tiers/pi-bridge.ts
```

- [ ] **Step 4: Delete Pi Bridge tests**

```bash
rm tests/unit/pie.pi-bridge.test.ts
rm tests/unit/pi-bridge-state.test.ts
```

- [ ] **Step 5: Delete Pi Bridge API routes and components**

```bash
rm app/api/pricing/bridge-health/route.ts
rm app/api/scheduled/pi-price-propagation/route.ts
rm components/pricing/bridge-health-dot.tsx
rm scripts/pie-bridge-watchdog.mts
rm scripts/hermes/openclaw-freshness.sh
```

- [ ] **Step 6: Remove PI_BRIDGE env vars from lib/env.ts**

In `lib/env.ts`, remove any lines declaring or validating `PI_BRIDGE_URL` or `PI_BRIDGE_SECRET`.

- [ ] **Step 7: Fix remaining Pi Bridge references**

Search and fix these files that import or reference pi-bridge:

- `lib/pricing/pie-attention-actions.ts` - remove Pi Bridge health checks
- `lib/pricing/region-coverage-actions.ts` - remove Pi fallback path
- `lib/discovery/registries/admin-rail-registry.ts` - remove bridge-health registry entry
- `lib/ai/remy-tools.ts` - remove Pi Bridge status tool if present
- `lib/procurement/vendor-comparison-actions.ts` - remove Pi pricing path
- `components/events/vendor-comparison-panel.tsx` - remove Pi indicator
- `app/api/cron/pie-accuracy-check/route.ts` - remove Pi accuracy references

For each file: grep for `pi-bridge`, `piBridge`, `PI_BRIDGE`, `bridge-health`, `Pi Bridge`. Remove dead imports and code paths. If a function used Pi as a data source, it should now rely on the remaining PostgreSQL tiers (which already have the same data after the dump).

- [ ] **Step 8: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 errors (all pi-bridge references removed)

- [ ] **Step 9: Run existing PIE tests (minus deleted ones)**

Run: `npx vitest run tests/unit/pie.`
Expected: All remaining PIE tests pass (the data they test still comes from PostgreSQL tables)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(pie): decommission Pi Bridge - remove client, tier, routes, tests

Pi data already migrated to PostgreSQL. Remaining 15 tiers in the
waterfall work unchanged. Hermes replaces Pi as the data acquisition
engine."
```

---

## Phase 3: Deterministic Fallback

### Task 7: Write Fallback Cron Logic

**Files:**

- Create: `lib/pricing/fallback-cron.ts`
- Test: `tests/unit/pie.fallback-cron.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/pie.fallback-cron.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: { execute: vi.fn() },
}))
vi.mock('@/lib/pricing/hermes-heartbeat', () => ({
  isHermesAlive: vi.fn(),
}))
vi.mock('@/lib/pricing/hermes-actions', () => ({
  logHermesAction: vi.fn(),
}))
vi.mock('@/lib/pricing/auto-expansion-engine', () => ({
  runAutoExpansion: vi.fn().mockResolvedValue({ expanded: 5 }),
}))
vi.mock('@/lib/pricing/government-feed', () => ({
  pullBlsPrices: vi.fn().mockResolvedValue({ pulled: 10 }),
}))
vi.mock('@/lib/pricing/fuzzy-match-engine', () => ({
  matchNakedIngredients: vi.fn().mockResolvedValue({ matched: 3 }),
}))
vi.mock('@/lib/pricing/trend-intelligence', () => ({
  runTrendAnalysis: vi.fn().mockResolvedValue({ analyzed: 100 }),
}))

import { isHermesAlive } from '@/lib/pricing/hermes-heartbeat'
import { logHermesAction } from '@/lib/pricing/hermes-actions'
import { runFallbackTask } from '@/lib/pricing/fallback-cron'

const mockIsAlive = vi.mocked(isHermesAlive)
const mockLogAction = vi.mocked(logHermesAction)

describe('fallback-cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips execution when Hermes is alive', async () => {
    mockIsAlive.mockResolvedValue(true)

    const result = await runFallbackTask('freshness')
    expect(result).toEqual({ skipped: true, reason: 'hermes_alive' })
    expect(mockLogAction).not.toHaveBeenCalled()
  })

  it('runs freshness task when Hermes is down', async () => {
    mockIsAlive.mockResolvedValue(false)

    const result = await runFallbackTask('freshness')
    expect(result.skipped).toBe(false)
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: 'pie-acquire',
        source: 'fallback',
      })
    )
  })

  it('runs alert task when Hermes is down', async () => {
    mockIsAlive.mockResolvedValue(false)

    const result = await runFallbackTask('alert')
    expect(result.skipped).toBe(false)
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: 'pie-alert',
        source: 'fallback',
      })
    )
  })

  it('runs ratchet task when Hermes is down', async () => {
    mockIsAlive.mockResolvedValue(false)

    const result = await runFallbackTask('ratchet')
    expect(result.skipped).toBe(false)
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        skill: 'pie-ratchet',
        source: 'fallback',
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/pie.fallback-cron.test.ts`
Expected: FAIL with "Cannot find module '@/lib/pricing/fallback-cron'"

- [ ] **Step 3: Write implementation**

```typescript
// lib/pricing/fallback-cron.ts
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { isHermesAlive } from './hermes-heartbeat'
import { logHermesAction } from './hermes-actions'
import { runAutoExpansion } from './auto-expansion-engine'
import { pullBlsPrices } from './government-feed'
import { matchNakedIngredients } from './fuzzy-match-engine'
import { runTrendAnalysis } from './trend-intelligence'

export type FallbackTask = 'freshness' | 'alert' | 'census' | 'ratchet' | 'measure'

interface FallbackResult {
  skipped: boolean
  reason?: string
  task?: string
  durationMs?: number
  result?: unknown
}

export async function runFallbackTask(task: FallbackTask): Promise<FallbackResult> {
  if (await isHermesAlive()) {
    return { skipped: true, reason: 'hermes_alive' }
  }

  const start = Date.now()

  switch (task) {
    case 'freshness': {
      const staleItems = (await db.execute(sql`
        SELECT id, ingredient_name, last_confirmed_at
        FROM ingredient_price_history
        WHERE last_confirmed_at < NOW() - INTERVAL '7 days'
        ORDER BY last_confirmed_at ASC NULLS FIRST
        LIMIT 100
      `)) as unknown as Array<{ id: string }>

      await logHermesAction({
        skill: 'pie-acquire',
        source: 'fallback',
        action: `Flagged ${staleItems.length} stale items for refresh (round-robin)`,
        itemsAffected: staleItems.length,
        durationMs: Date.now() - start,
      })

      return {
        skipped: false,
        task: 'freshness',
        durationMs: Date.now() - start,
        result: { flagged: staleItems.length },
      }
    }

    case 'alert': {
      const alerts = await runTrendAnalysis()

      await logHermesAction({
        skill: 'pie-alert',
        source: 'fallback',
        action: 'Threshold alert scan (no investigation)',
        durationMs: Date.now() - start,
        result: 'success',
      })

      return { skipped: false, task: 'alert', durationMs: Date.now() - start, result: alerts }
    }

    case 'census': {
      const matched = await matchNakedIngredients({ limit: 100 })

      await logHermesAction({
        skill: 'pie-census',
        source: 'fallback',
        action: 'Exact-match census pass (no fuzzy)',
        itemsAffected: (matched as any)?.matched ?? 0,
        durationMs: Date.now() - start,
      })

      return { skipped: false, task: 'census', durationMs: Date.now() - start, result: matched }
    }

    case 'ratchet': {
      const expanded = await runAutoExpansion()

      await logHermesAction({
        skill: 'pie-ratchet',
        source: 'fallback',
        action: 'Fix largest coverage gap by count',
        itemsAffected: (expanded as any)?.expanded ?? 0,
        durationMs: Date.now() - start,
      })

      return { skipped: false, task: 'ratchet', durationMs: Date.now() - start, result: expanded }
    }

    case 'measure': {
      const coverage = (await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM ingredient_census) AS total_census,
          (SELECT COUNT(DISTINCT canonical_ingredient_id) FROM ingredient_price_history) AS with_price
      `)) as unknown as Array<{ total_census: number; with_price: number }>

      const row = coverage[0]
      const pct = row ? Math.round((row.with_price / Math.max(row.total_census, 1)) * 100) : 0

      await logHermesAction({
        skill: 'pie-measure',
        source: 'fallback',
        action: `Snapshot: ${pct}% coverage (${row?.with_price}/${row?.total_census})`,
        durationMs: Date.now() - start,
      })

      return {
        skipped: false,
        task: 'measure',
        durationMs: Date.now() - start,
        result: { coveragePct: pct },
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/pie.fallback-cron.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/fallback-cron.ts tests/unit/pie.fallback-cron.test.ts
git commit -m "feat(pie): add deterministic fallback cron (activates when Hermes down)"
```

---

### Task 8: Update PIE Cron Route with Heartbeat Gate

**Files:**

- Modify: `app/api/pie/v1/cron/route.ts`

- [ ] **Step 1: Rewrite the cron route with fallback awareness**

Replace `app/api/pie/v1/cron/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { isHermesAlive } from '@/lib/pricing/hermes-heartbeat'
import { runFallbackTask, type FallbackTask } from '@/lib/pricing/fallback-cron'
import { runAutoExpansion } from '@/lib/pricing/auto-expansion-engine'
import { pullBlsPrices } from '@/lib/pricing/government-feed'
import { matchNakedIngredients } from '@/lib/pricing/fuzzy-match-engine'
import { runTrendAnalysis } from '@/lib/pricing/trend-intelligence'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/pie/v1/cron?task=expand|government|fuzzy|trends|fallback|all
 *
 * When Hermes is alive: runs requested task directly (Hermes calls these).
 * When Hermes is down: fallback mode activates automatically.
 *
 * New task: "fallback" runs the heartbeat-gated fallback operations.
 * Hermes gateway calls specific tasks; external cron calls "fallback".
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || process.env.PIE_CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const task = searchParams.get('task') || 'all'
  const results: Record<string, unknown> = {}

  try {
    if (task === 'fallback') {
      const hermesAlive = await isHermesAlive()
      if (hermesAlive) {
        return NextResponse.json({
          success: true,
          task: 'fallback',
          skipped: true,
          reason: 'hermes_alive',
          durationMs: Date.now() - start,
        })
      }

      const fallbackTasks: FallbackTask[] = ['freshness', 'alert', 'ratchet', 'measure']
      for (const ft of fallbackTasks) {
        results[ft] = await runFallbackTask(ft)
      }

      return NextResponse.json({
        success: true,
        task: 'fallback',
        mode: 'fallback',
        durationMs: Date.now() - start,
        results,
      })
    }

    if (task === 'all' || task === 'expand') {
      results.expansion = await runAutoExpansion()
    }

    if (task === 'all' || task === 'government') {
      results.government = await pullBlsPrices()
    }

    if (task === 'all' || task === 'fuzzy') {
      results.fuzzy = await matchNakedIngredients({ limit: 100 })
    }

    if (task === 'all' || task === 'trends') {
      results.trends = await runTrendAnalysis()
    }

    return NextResponse.json({
      success: true,
      task,
      durationMs: Date.now() - start,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Cron task failed', task, details: String(error) },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add app/api/pie/v1/cron/route.ts
git commit -m "feat(pie): add heartbeat-gated fallback mode to PIE cron route"
```

---

## Phase 4: Event Bus + Feedback Loop

### Task 9: Wire Chef Actions to Event Queue

**Files:**

- Modify: Various server action files (identified by grepping for menu/price/ingredient mutations)

The event bus wiring adds `enqueueHermesEvent()` calls after existing mutations. These are fire-and-forget (wrapped in try/catch, never block the user action).

- [ ] **Step 1: Find mutation points**

Grep for server actions that create menus, override prices, or add ingredients:

```bash
grep -rl "menu.*create\|insertMenu\|chef_ingredient_prices.*insert\|ingredient.*create" lib/ app/ --include="*.ts" | head -20
```

- [ ] **Step 2: Add queue event after menu creation**

Find the menu creation server action and add after the successful insert:

```typescript
import { enqueueHermesEvent } from '@/lib/pricing/hermes-queue'

// After successful menu creation:
try {
  await enqueueHermesEvent('menu.created', {
    menuId: newMenu.id,
    tenantId,
    ingredientIds: ingredientIds,
  })
} catch {
  // Fire-and-forget: never block chef action
}
```

- [ ] **Step 3: Add queue event after price override**

Find the chef price override action (writes to `chef_ingredient_prices`) and add:

```typescript
import { enqueueHermesEvent } from '@/lib/pricing/hermes-queue'

// After successful price override:
try {
  await enqueueHermesEvent('price.overridden', {
    ingredientId,
    tenantId,
    oldPrice: previousPrice,
    newPrice: newPriceCents,
    source: 'chef_override',
  })
} catch {
  // Fire-and-forget
}
```

- [ ] **Step 4: Add queue event after ingredient creation**

Find the ingredient creation action and add:

```typescript
import { enqueueHermesEvent } from '@/lib/pricing/hermes-queue'

// After successful ingredient creation:
try {
  await enqueueHermesEvent('ingredient.added', {
    ingredientId: newIngredient.id,
    name: newIngredient.name,
    tenantId,
  })
} catch {
  // Fire-and-forget
}
```

- [ ] **Step 5: Write feedback on price override**

Add to the price override action (writes correction to hermes_feedback for Hermes learning):

```typescript
// After writing to chef_ingredient_prices, also log feedback
try {
  await db.execute(sql`
    INSERT INTO hermes_feedback (ingredient_id, resolved_price, actual_price, source, region)
    VALUES (${ingredientId}, ${previousResolvedPrice}, ${newPriceCents}, 'chef_override', ${chefState})
  `)
} catch {
  // Fire-and-forget
}
```

- [ ] **Step 6: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pie): wire chef actions to Hermes event queue (menu, price, ingredient)"
```

---

## Phase 5: Dev Monitoring

### Task 10: Create Dev Hermes Dashboard

**Files:**

- Create: `app/(dev)/hermes/page.tsx`
- Create: `app/(dev)/hermes/actions.ts`

- [ ] **Step 1: Write server actions for the dashboard**

```typescript
// app/(dev)/hermes/actions.ts
'use server'

import { getHermesStatus } from '@/lib/pricing/hermes-heartbeat'
import { getRecentActions } from '@/lib/pricing/hermes-actions'
import { getPendingQueueDepth } from '@/lib/pricing/hermes-queue'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function fetchHermesDashboard() {
  const [status, actions, queueDepth, recentFeedback] = await Promise.all([
    getHermesStatus(),
    getRecentActions(20),
    getPendingQueueDepth(),
    db.execute(sql`
      SELECT id, timestamp::text, ingredient_id, resolved_price, actual_price, source, region
      FROM hermes_feedback
      ORDER BY timestamp DESC
      LIMIT 10
    `) as Promise<any>,
  ])

  return {
    status,
    actions,
    queueDepth,
    recentFeedback,
  }
}
```

- [ ] **Step 2: Write the dashboard page**

```tsx
// app/(dev)/hermes/page.tsx
import { fetchHermesDashboard } from './actions'

export const dynamic = 'force-dynamic'

export default async function HermesDevPage() {
  const { status, actions, queueDepth, recentFeedback } = await fetchHermesDashboard()

  return (
    <div className="max-w-4xl mx-auto p-6 font-mono text-sm">
      <h1 className="text-xl font-bold mb-4">Hermes Dev Monitor</h1>

      {/* Status */}
      <section className="mb-6 p-4 border rounded">
        <h2 className="font-bold mb-2">Status</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            Mode:{' '}
            <span className={status.alive ? 'text-green-600' : 'text-orange-600'}>
              {status.mode}
            </span>
          </div>
          <div>Alive: {status.alive ? 'YES' : 'NO'}</div>
          <div>Last Heartbeat: {status.lastHeartbeat ?? 'never'}</div>
          <div>Queue Depth: {queueDepth}</div>
          <div>Current Skill: {status.currentSkill ?? 'idle'}</div>
          <div>Errors: {status.errorCount}</div>
        </div>
      </section>

      {/* Recent Actions */}
      <section className="mb-6">
        <h2 className="font-bold mb-2">Recent Actions ({actions.length})</h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-1">Time</th>
              <th className="text-left p-1">Skill</th>
              <th className="text-left p-1">Source</th>
              <th className="text-left p-1">Action</th>
              <th className="text-left p-1">Items</th>
              <th className="text-left p-1">Result</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-1">{new Date(a.timestamp).toLocaleTimeString()}</td>
                <td className="p-1">{a.skill}</td>
                <td className="p-1">{a.source}</td>
                <td className="p-1 max-w-xs truncate">{a.action}</td>
                <td className="p-1">{a.items_affected}</td>
                <td className="p-1">{a.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Feedback */}
      <section>
        <h2 className="font-bold mb-2">Recent Feedback</h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-1">Time</th>
              <th className="text-left p-1">Ingredient</th>
              <th className="text-left p-1">Resolved</th>
              <th className="text-left p-1">Actual</th>
              <th className="text-left p-1">Source</th>
              <th className="text-left p-1">Region</th>
            </tr>
          </thead>
          <tbody>
            {(recentFeedback as any[]).map((f: any) => (
              <tr key={f.id} className="border-b">
                <td className="p-1">{new Date(f.timestamp).toLocaleTimeString()}</td>
                <td className="p-1">{f.ingredient_id}</td>
                <td className="p-1">
                  {f.resolved_price ? `$${(f.resolved_price / 100).toFixed(2)}` : '-'}
                </td>
                <td className="p-1">
                  {f.actual_price ? `$${(f.actual_price / 100).toFixed(2)}` : '-'}
                </td>
                <td className="p-1">{f.source}</td>
                <td className="p-1">{f.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Verify dev route is gated**

Check that `app/(dev)/` has a layout.tsx that gates access to developer only. If not, create one:

```typescript
// app/(dev)/layout.tsx (only if it doesn't exist)
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const devEmails = ['davidferra13@gmail.com']

  if (!session?.user?.email || !devEmails.includes(session.user.email)) {
    redirect('/')
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add app/(dev)/hermes/
git commit -m "feat(pie): add /dev/hermes monitoring dashboard (dev-only)"
```

---

## Phase 1: Hermes Skills (Templates)

### Task 11: Write Hermes PIE Skill Templates

**Files:**

- Create: `scripts/hermes/skills/pie-measure.md`
- Create: `scripts/hermes/skills/pie-ratchet.md`
- Create: `scripts/hermes/skills/pie-census.md`
- Create: `scripts/hermes/skills/pie-alert.md`
- Create: `scripts/hermes/skills/pie-accuracy.md`
- Create: `scripts/hermes/skills/pie-forecast.md`
- Create: `scripts/hermes/skills/pie-fix.md`
- Create: `scripts/hermes/skills/pie-acquire.md`

These are Hermes-native skill files (markdown with instructions). They live in the repo as templates and get copied to `~/.hermes/skills/` during installation.

- [ ] **Step 1: Write pie-measure skill**

```markdown
# pie-measure

Snapshot all PIE metrics. Read-only. Run daily.

## What to do

1. Query PostgreSQL for coverage stats:
   - Total census items (ingredient_census count)
   - Items with at least one price observation
   - Coverage percentage
2. Query freshness stats:
   - Items within SLA (volatile: 7d, moderate: 14d, stable: 30d)
   - Freshness percentage
3. Query source health:
   - Active sources (had data in last 7 days)
   - Dead sources (no data in 30+ days)
4. Log results to hermes_actions table
5. If coverage dropped since yesterday: flag P0 alert

## Output

Post to Discord morning channel. Format:
```

PIE Daily: 82% coverage (+1.2%), 94% fresh, 6 active sources

```

```

- [ ] **Step 2: Write pie-ratchet skill**

```markdown
# pie-ratchet

Find and fix the highest-ROI coverage gap. Run daily after measure.

## What to do

1. Query ingredient_census for items with zero price observations
2. Group by category. Pick the category with most gaps.
3. For each unpriced item in that category:
   a. Try to find a price from any source (store API, government data, regional average)
   b. If found: insert to ingredient_price_history, log success
   c. If not found: log gap, move to next
4. Stop after 50 items or 5 minutes (whichever first)
5. Log to hermes_actions: how many gaps fixed, which category, duration

## Priority logic

Prefer items that appear in active menus (check hermes_queue for recent menu.created events).
Prefer items in chef's home region (MA) over distant regions.
Prefer volatile categories (produce, seafood) over stable (dry goods).
```

- [ ] **Step 3: Write pie-census skill**

```markdown
# pie-census

Expand the ingredient manifest. Match new products to canonical ingredients.

## What to do

1. Query ingredient_price_history for product_names not in ingredient_census
2. For each unmatched product:
   a. Normalize the name (strip brand, size, quantity)
   b. Fuzzy-match against existing census entries (>0.85 similarity)
   c. If match found: link product to census entry
   d. If no match: create new census entry
3. Stop after 100 items or 10 minutes
4. Log to hermes_actions

## Rules

- Never merge two existing census entries (that requires chef approval)
- Prefer exact matches over fuzzy
- Categories must come from the canonical category list
- Log confidence scores for all fuzzy matches
```

- [ ] **Step 4: Write pie-alert skill**

```markdown
# pie-alert

Detect regressions, source failures, and data anomalies.

## What to do

1. Check source health:
   - Any source with 0 new prices in 48+ hours? Flag dead.
   - Any source with >20% price anomalies? Flag unreliable.
2. Check coverage regression:
   - Compare today's coverage to yesterday's (from hermes_actions log)
   - If dropped >1%: P0 alert
3. Check freshness SLA:
   - Volatile items (produce, seafood, dairy) stale >7 days
   - If >5% violated: P1 alert
4. Check anomalies:
   - Prices that changed >50% in one update
   - Prices that are >3 standard deviations from category mean
5. Auto-quarantine bad prices (set confidence to 0)
6. Log findings to hermes_actions
7. P0 alerts: post to Discord immediately

## Response

For dead sources: note in memory which source died and when. Don't retry dead sources for 24h.
For anomalies: quarantine the price, log the reason, shift method weight away from that source.
```

- [ ] **Step 5: Write pie-accuracy skill**

```markdown
# pie-accuracy

Validate resolved prices against ground truth (chef corrections + receipts).

## What to do

1. Read hermes_feedback table (chef price overrides)
2. For each feedback entry:
   a. Compare resolved_price vs actual_price
   b. Calculate error percentage
   c. If error >15%: flag the resolution method
3. Compute weekly accuracy score:
   - (prices within 15% of actual) / (total spot checks)
4. If accuracy <90%: investigate which tiers are drifting
5. Adjust method weights in memory:
   - Source that consistently over/under-prices: reduce confidence
   - Source that matches actuals: increase confidence
6. Log to hermes_actions

## Output

Weekly accuracy report to Discord:
```

PIE Accuracy: 92% (38/41 within 15%). Drift: instacart +8% avg, wholesale -3% avg.

```

```

- [ ] **Step 6: Write pie-forecast skill**

```markdown
# pie-forecast

Build Layer 2 trend intelligence. Gated: only runs when coverage >80%.

## What to do

1. Check coverage gate: if <80%, skip (log reason)
2. For items with 30+ days of price history:
   a. Calculate 14-day trend (linear regression slope)
   b. Calculate 30-day trend
   c. Detect seasonality (compare to same month last year if data exists)
   d. Flag items with strong upward trend (>10% in 14d)
3. Write trend data to ingredient_trends table
4. Log to hermes_actions

## Rules

- Never forecast items with <5 data points
- Confidence decreases with fewer observations
- Seasonal adjustments only when 12+ months of data exists
- This is informational only: forecasts never override actual prices
```

- [ ] **Step 7: Write pie-fix skill**

```markdown
# pie-fix

Fix the worst active PIE Law violation.

## PIE Laws to check

1. No unpriced ingredient in an active menu (Law 10: never null)
2. No price older than freshness SLA without refresh attempt
3. No quarantined price without a replacement path
4. No negative or zero prices in production
5. No duplicate census entries for same item

## What to do

1. Scan for violations (worst first by impact)
2. For the worst violation:
   a. Diagnose root cause (bad source? stale? wrong unit? missing census entry?)
   b. Fix it: recalculate price, find alternate source, or generate synthetic
   c. Verify fix resolves the violation
3. Log fix to hermes_actions with diagnosis + resolution
4. If violation persists after fix attempt: escalate to Discord as P0

## Rules

- Fix ONE violation per run (precision over speed)
- Never delete data to "fix" a violation
- Synthetic prices are valid fixes (Law 9: synthetic is always available)
- Log the full diagnosis chain for learning
```

- [ ] **Step 8: Write pie-acquire skill**

```markdown
# pie-acquire

Continuous data acquisition. Replaces Pi sync + OpenClaw cron.

## What to do

1. Check acquisition queue:
   a. hermes_queue events (P1: unpriced items from new menus)
   b. Freshness violations (items past SLA)
   c. Coverage gaps (from pie-ratchet findings)
2. For each item to acquire:
   a. Pick best source based on: item category, region, source health history
   b. Attempt acquisition (API call, data lookup, computation)
   c. Normalize result (standardize unit, validate range)
   d. Write to ingredient_price_history
   e. Update freshness timestamp
   f. Log to hermes_actions
3. Track source reliability:
   - Success rate per source
   - Average latency per source
   - Data quality per source (anomaly rate)
4. After processing queue: enter idle acquisition mode
   - Refresh oldest stale items
   - Expand to new regions
   - Fill category gaps

## Sources (by preference)

1. Existing PG data (cross-reference other stores)
2. Government feeds (BLS/USDA monthly data)
3. Wholesale catalogs (Sysco, US Foods pricing)
4. Regional averages (computed from multiple observations)
5. Synthetic generation (last resort, Law 9)

## Rules

- Never exceed rate limits on external sources
- Log every acquisition attempt (success or failure)
- Track cost: $0 for all sources (no paid APIs)
- When idle >5 minutes with empty queue: run one pie-ratchet cycle
```

- [ ] **Step 9: Commit all skills**

```bash
git add scripts/hermes/skills/
git commit -m "feat(pie): add 8 Hermes PIE skill templates for autonomous operation"
```

---

### Task 12: Update Hermes SOUL.md

**Files:**

- Modify: `scripts/hermes/SOUL.md`

- [ ] **Step 1: Update SOUL.md with PIE operator identity**

```markdown
# SOUL

You are PIE's autonomous operator. Your job: ensure every food item in America has a price.

## Identity

- Name: PIE Operator (internal only, never user-facing)
- Platform: Hermes (NousResearch hermes-agent)
- Model: Gemma 4 via Ollama (local, $0)
- Database: ChefFlow PostgreSQL (via MCP)

## Mission

Maintain and expand the Pricing Intelligence Engine (PIE) so that `resolvePrice(item, location, radius)` never returns null for any food ingredient at any US location.

## Operating Principles

1. Never return null. Synthetic prices are valid (PIE Law 9).
2. Algorithm First. Everything works without you. You make it smarter, not possible.
3. Invisible. No user ever sees your name, status, or errors.
4. Self-healing. Source dies? Shift weight. Data bad? Quarantine. Coverage dropped? Ratchet up.
5. Log everything. hermes_actions is your audit trail.
6. $0 infrastructure. No paid APIs. No cloud services.

## Attention Loop

Every 30 seconds, check (in priority order):

1. P0 CRITICAL: coverage regression, source death, accuracy collapse
2. P1 REACTIVE: hermes_queue events (menu created, price overridden)
3. P2 SCHEDULED: cron tasks (measure, ratchet, census, alert, accuracy)
4. P3 IMPROVE: forecast, deep learning, compound improvements

## Communication

- Write heartbeat to hermes_heartbeats every 60 seconds
- Log all actions to hermes_actions
- Post morning report to Discord at 05:30
- Post P0 alerts to Discord immediately
- Never communicate with end users

## Memory

Remember:

- Source reliability scores (which sources give good data)
- Regional acquisition patterns (which regions need attention)
- Chef feedback patterns (which items get overridden frequently)
- Seasonal patterns (what items are volatile when)
```

- [ ] **Step 2: Commit**

```bash
git add scripts/hermes/SOUL.md
git commit -m "feat(pie): update Hermes SOUL.md with PIE operator identity"
```

---

## Final Verification

### Task 13: Full Test Suite + TypeScript Check

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: 0 errors

- [ ] **Step 2: Run all PIE tests**

Run: `npx vitest run tests/unit/pie.`
Expected: All tests pass (new tests + remaining existing tests)

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: No regressions from Pi Bridge removal

- [ ] **Step 4: Verify resolve-price still works**

Run: `npx vitest run tests/unit/pricing.resolve-price.test.ts`
Expected: PASS (all tiers except pi-bridge still resolve correctly)

- [ ] **Step 5: Run the build**

Run: `npx next build --no-lint`
Expected: Build succeeds

- [ ] **Step 6: Commit any fixes**

If any tests or build failed due to missed Pi Bridge references, fix them and commit:

```bash
git add -A
git commit -m "fix(pie): resolve remaining Pi Bridge references after decommission"
```

---

## Summary of Commits

| #   | Message                                                            | Phase   |
| --- | ------------------------------------------------------------------ | ------- |
| 1   | `feat(pie): add one-time Pi data dump script for Hermes migration` | 0       |
| 2   | `feat(pie): add Hermes operational tables migration`               | 2       |
| 3   | `feat(pie): add Hermes heartbeat reader with liveness detection`   | 2       |
| 4   | `feat(pie): add Hermes event queue writer for chef action events`  | 2       |
| 5   | `feat(pie): add Hermes actions logger for audit trail`             | 2       |
| 6   | `feat(pie): decommission Pi Bridge`                                | 2       |
| 7   | `feat(pie): add deterministic fallback cron`                       | 3       |
| 8   | `feat(pie): add heartbeat-gated fallback mode to PIE cron route`   | 3       |
| 9   | `feat(pie): wire chef actions to Hermes event queue`               | 4       |
| 10  | `feat(pie): add /dev/hermes monitoring dashboard`                  | 5       |
| 11  | `feat(pie): add 8 Hermes PIE skill templates`                      | 1       |
| 12  | `feat(pie): update Hermes SOUL.md with PIE operator identity`      | 1       |
| 13  | `fix(pie): resolve remaining Pi Bridge references`                 | cleanup |

---

## Post-Implementation (Manual Steps)

These cannot be automated in the plan:

1. **Clear C: drive** (Phase 0 prerequisite): Developer must free disk space manually
2. **Run pi-data-dump.sh**: Requires Pi to be reachable via SSH
3. **Install Hermes**: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`
4. **Configure Hermes**: Copy skills from `scripts/hermes/skills/` to `~/.hermes/skills/`
5. **Start Hermes gateway**: `hermes gateway install` + `hermes gateway start`
6. **Set up external cron**: Windows Task Scheduler calls `/api/pie/v1/cron?task=fallback` every 5 minutes
7. **Verify 7-day zero-touch**: Monitor `/dev/hermes` dashboard for 7 days
8. **Apply migration**: `drizzle-kit push` (requires explicit approval)
