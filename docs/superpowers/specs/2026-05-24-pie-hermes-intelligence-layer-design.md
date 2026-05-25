# PIE x Hermes: Intelligence Layer Redesign

> Ratified: 2026-05-24
> Status: SPEC READY

---

## The Problem

PIE's operational backbone is dead:

- Pi (Raspberry Pi) is unreachable. SSH refused. Sync failing (4 consecutive, `last_success_at: null`).
- Nothing runs automatically. The 8-skill runbook is aspirational. Skills only fire when manually invoked.
- Coverage stuck at ~61%. Can't reach the 80% gate for Layer 2 intelligence.
- Prior agents repeatedly misunderstood Hermes as "6 bash scripts" instead of the NousResearch AI agent platform.
- The intelligence layer was never properly integrated. It needs a full redesign.

## The Solution

Hermes (NousResearch hermes-agent) becomes PIE's autonomous operator. It runs 24/7, acquires data, maintains freshness, expands coverage, and self-heals. ChefFlow's deterministic fallback cron handles operations if Hermes goes down. PostgreSQL is the single data store (Pi is decommissioned).

## Core Principles

1. **PIE = `resolvePrice(item, location, radius) -> number`.** 24/7 crawling + pricing resolution for any food item at any US location. Never null. Everything else is a consumer.
2. **Hermes is invisible.** Users never see the name "Hermes." No user-facing UI, no branding, no status pages. Hermes monitoring is strictly dev tools (`/dev/*` routes, Discord, CLI).
3. **Algorithm First.** Everything works without AI. Deterministic fallback handles 100% of operations mechanically. Hermes makes it smarter, not possible.
4. **PostgreSQL is the single source.** No Pi. No SQLite. No sync. One database.
5. **$0 infrastructure.** Self-hosted. No cloud services. No paid APIs.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PC (always-on)                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          HERMES (NousResearch hermes-agent)            │  │
│  │          Installed via: curl installer + uv            │  │
│  │          Gateway service: hermes gateway install       │  │
│  │                                                       │  │
│  │  Skills (in ~/.hermes/skills/):                        │  │
│  │  pie-measure, pie-ratchet, pie-census, pie-alert,     │  │
│  │  pie-accuracy, pie-forecast, pie-fix, pie-acquire     │  │
│  │                                                       │  │
│  │  MCP: connects to ChefFlow PostgreSQL                 │  │
│  │  Cron: built-in scheduler, natural language           │  │
│  │  Memory: persistent across sessions                   │  │
│  │  Model: Ollama (Gemma 4) via local provider           │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │ writes via MCP                       │
│  ┌───────────────────┐                                      │
│  │ Ollama (Gemma 4)  │                                      │
│  └───────────────────┘                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    POSTGRESQL (single source)                 │
│                                                              │
│  Pricing tables: ingredient_census, synthetic_prices,        │
│  ingredient_trends, openclaw.*, freshness_policy,            │
│  coverage_gaps, volatility_alerts, etc.                      │
│                                                              │
│  Hermes ops tables (NEW):                                    │
│  hermes_heartbeats, hermes_actions, hermes_queue,            │
│  hermes_feedback                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ reads
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                 CHEFFLOW (Next.js @ :3100)                    │
│                                                              │
│  PIE Engine (lib/pricing/resolve-price.ts)                   │
│  15 tiers (Pi Bridge removed). Reads PG. Returns price.     │
│                                                              │
│  Fallback Cron (/api/pie/v1/cron)                            │
│  Watches hermes_heartbeats. No heartbeat > 5 min?            │
│  Fires deterministic operations.                             │
│                                                              │
│  Event Bus: writes to hermes_queue on chef actions            │
│  (menu.created, price.overridden, ingredient.added)          │
│                                                              │
│  Dev monitoring: /dev/hermes (reads hermes_actions,          │
│  hermes_heartbeats). DEVELOPER ONLY. Never user-facing.      │
└──────────────────────────────────────────────────────────────┘
```

### Communication Pattern

Hermes and ChefFlow never talk directly. PostgreSQL is the communication channel:

- **ChefFlow → Hermes:** Writes events to `hermes_queue` table (menu created, price overridden, ingredient added). Hermes polls this table.
- **Hermes → ChefFlow:** Writes results to pricing tables + `hermes_actions` log. Writes heartbeat to `hermes_heartbeats` every 60s.
- **Feedback loop:** Chef overrides a price → written to `hermes_feedback` → Hermes reads it → adjusts acquisition priorities and method weights.

Zero new infrastructure. Just shared PG tables.

---

## Hermes Setup

Hermes is a Python CLI tool, not a Docker container.

### Installation

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes setup  # Configure Ollama as provider
hermes gateway install  # Install gateway service (cron + messaging)
```

### Configuration

- **Provider:** Ollama (local, $0). Gemma 4 e4b model.
- **MCP:** PostgreSQL MCP server connecting to ChefFlow's database.
- **Skills:** 8 PIE skills in `~/.hermes/skills/` (Hermes-native format, adapted from existing Claude skills).
- **Cron:** Built-in scheduler using natural language. Runs via gateway service.
- **Memory:** Persistent. Hermes remembers source reliability, acquisition patterns, what worked.
- **Messaging:** Discord (Hermes Discord server already exists). Morning reports, critical alerts.
- **SOUL.md:** Identity file: "You are PIE's autonomous operator. Your job: ensure every food item in America has a price."

### Directory Structure

```
~/.hermes/
├── config.yaml          # Provider (Ollama), MCP servers, toolsets
├── .env                 # Local env vars
├── skills/
│   ├── pie-measure.md
│   ├── pie-ratchet.md
│   ├── pie-census.md
│   ├── pie-alert.md
│   ├── pie-accuracy.md
│   ├── pie-forecast.md
│   ├── pie-fix.md
│   └── pie-acquire.md   # NEW: replaces Pi sync
├── memory/              # Persistent memory (grows over time)
├── cron/                # Cron job definitions
├── sessions/            # Session history
└── logs/                # Execution logs
```

---

## Attention Engine

Hermes doesn't just run cron. It thinks about what matters most right now.

### Input Streams

| Stream    | Source            | Examples                                                      |
| --------- | ----------------- | ------------------------------------------------------------- |
| Scheduled | Hermes cron       | Daily census, 6h alert checks, weekly accuracy                |
| Reactive  | hermes_queue (PG) | Chef created menu with unpriced items, price overridden       |
| Health    | Self-monitoring   | Source went dark, data stale past SLA, coverage dropped       |
| Learning  | Compound feedback | Accuracy drifted, method weight shifted, new pattern detected |

### Priority Levels

| Level | Name      | Response Time           | Examples                                                      |
| ----- | --------- | ----------------------- | ------------------------------------------------------------- |
| P0    | CRITICAL  | Interrupts current work | Source dead, coverage regression, accuracy below 75%          |
| P1    | REACTIVE  | Within 5 minutes        | Unpriced ingredients in new menu, price override feedback     |
| P2    | SCHEDULED | Normal cron timing      | Daily ratchet, census expansion, alert checks                 |
| P3    | IMPROVE   | When idle               | Compound learning suggestions, forecast builds, deep accuracy |

### Skill Dispatch

The attention engine picks the highest-priority item and dispatches the appropriate skill.

---

## The 8 PIE Skills

Each skill has an AI-enhanced path (Hermes running) and a deterministic fallback (Hermes down).

### pie-measure

- **Purpose:** Read-only snapshot of all PIE metrics
- **Triggers:** Daily cron, on-demand
- **AI path:** Snapshot + trend narrative ("coverage up 2% this week, 400 dairy items added")
- **Fallback:** Raw SQL snapshot, numbers only

### pie-ratchet

- **Purpose:** Find and fix the highest-ROI coverage gap
- **Triggers:** Daily cron, post-acquisition
- **AI path:** Picks gap considering source reliability, geographic need, category importance
- **Fallback:** Fix largest gap by category size

### pie-census

- **Purpose:** Expand the ingredient manifest
- **Triggers:** Weekly cron, after new products discovered
- **AI path:** Fuzzy-match new products to census via Gemma 4. Prioritize underserved categories.
- **Fallback:** Exact-match only. Unmatched items queued for review.

### pie-alert

- **Purpose:** Detect regressions and failures
- **Triggers:** Every 6 hours, source health events
- **AI path:** Investigate root cause. Auto-quarantine bad source. Shift weight to alternates.
- **Fallback:** Threshold checks only. Flag violations without investigation.

### pie-accuracy

- **Purpose:** Validate prices against ground truth
- **Triggers:** Weekly, price override events
- **AI path:** Compare resolved vs actual. Adjust method weights and confidence calibration.
- **Fallback:** SQL comparison, log deltas. No recalibration.

### pie-forecast

- **Purpose:** Build Layer 2 trend intelligence
- **Triggers:** Weekly (gated: coverage > 80%)
- **AI path:** 14d/30d price predictions using trend + seasonal + event data
- **Fallback:** Simple linear projection from last 30 days

### pie-fix

- **Purpose:** Fix the worst active PIE Law violation
- **Triggers:** Anomaly detected, price override
- **AI path:** Diagnose why price was wrong (bad source? stale? wrong unit?). Fix root cause.
- **Fallback:** Quarantine flagged price. Bump to next tier in waterfall.

### pie-acquire (NEW)

- **Purpose:** Continuous data acquisition. Replaces Pi sync + OpenClaw cron.
- **Triggers:** Continuous (idle time), reactive (unpriced items needed)
- **AI path:** Decide which sources to pull, what regions need refreshing, which items are stale. Smart scheduling based on source reliability history.
- **Fallback:** Round-robin through sources on fixed schedule. Refresh oldest data first.

---

## Data Acquisition Pipeline

### Sources (all $0)

| Tier | Source                | Coverage           | Freshness          | Notes                       |
| ---- | --------------------- | ------------------ | ------------------ | --------------------------- |
| 1    | Chef override         | Sparse             | Realtime           | Highest trust               |
| 2    | Receipt OCR           | Sparse             | Days               | Passive signal (future)     |
| 3    | Store API/scrape      | High               | Hours-days         | Rate limited                |
| 4    | Instacart proxy       | High               | Hours              | Careful usage               |
| 5    | Wholesale catalog     | Medium             | Weekly             | Sysco, US Foods, etc.       |
| 6    | Government (BLS/USDA) | Broad categories   | Monthly            | Authoritative for baselines |
| 7    | Flyer/circular        | Seasonal           | Weekly             | Sale prices                 |
| 8    | Regional average      | Derived            | Computed           | Aggregated from other tiers |
| 9    | Historical trend      | Where data existed | Decayed confidence | Age-adjusted                |
| 10   | Synthetic (Law 9)     | 100%               | Generated          | NEVER null. Last resort.    |

### Continuous Acquisition Loop

```
1. CHECK FRESHNESS
   → Find items past SLA (volatile 7d, moderate 14d, stable 30d)
   → Stale items enter acquisition queue

2. CHECK COVERAGE GAPS
   → Find regions/categories with low coverage
   → Gap items enter acquisition queue

3. PRIORITIZE
   AI: rank by freshness urgency, coverage impact, source reliability, geographic need
   Fallback: sort by staleness DESC, largest gap first

4. EXECUTE
   → Pick best source for item+region
   → Fetch price
   → Normalize (unit, name, category)
   → Validate (anomaly check, range check)
   → Write to PostgreSQL
   → Update source health, freshness timestamps
   → Log action to hermes_actions

5. LEARN (AI only)
   → Track which sources returned good data
   → Adjust method weights
   → Update regional bias corrections

REPEAT FOREVER
```

---

## Pi Decommission

### Kill (remove from codebase)

- `lib/pricing/pi-bridge.ts` - bridge client + circuit breaker
- `lib/pricing/tiers/pi-bridge.ts` - tier resolver
- Pi Bridge tier from `resolve-price.ts` waterfall
- `PI_BRIDGE_URL` / `PI_BRIDGE_SECRET` env vars
- All sync scripts that SSH to 10.0.0.177
- `scripts/hermes/openclaw-freshness.sh` - Pi health monitor
- `tests/unit/pie.pi-bridge.test.ts`

### Migrate (Pi SQLite → PostgreSQL, one-time)

- **1.1M prices** → `openclaw.*` PG tables
- **143K canonical ingredients** → reconcile with `ingredient_census`
- **477K store locations** → merge with existing OSM data in PG
- **11 synthesizer outputs** → PG tables already exist (seasonal scores, anomalies, yield factors)
- **94 Pi cron jobs** → Hermes skills + attention engine

### Stays (no change)

- `resolve-price.ts` - 15 remaining tiers work unchanged
- All intelligence engines (synthetic, trend, compound learning, anomaly, etc.)
- PIE API routes (`/api/pie/v1/*`)
- PIE compliance checking (all 13 Laws)
- All existing tests (minus pi-bridge test)

### Migration Order

1. Dump Pi data to PG while Pi still has data (one-time script)
2. Verify all data accessible via PG queries
3. Remove Pi Bridge code
4. Run full test suite, verify resolve-price still works
5. Physical Pi: keep powered but no longer depended on

---

## Deterministic Fallback

ChefFlow cron checks `hermes_heartbeats` table every 5 minutes. No heartbeat in last 5 minutes? Fallback activates automatically.

### Fallback Schedule

| Frequency   | Operation                                                         |
| ----------- | ----------------------------------------------------------------- |
| Every 2h    | Freshness check → refresh stalest 100 items (round-robin sources) |
| Every 6h    | Alert check (threshold scan, no investigation)                    |
| Daily 02:00 | Census exact-match pass (no fuzzy matching)                       |
| Daily 03:00 | Ratchet: fix largest gap by count                                 |
| Daily 04:00 | Measure: snapshot metrics to hermes_actions                       |

### Where It Lives

Existing `/api/pie/v1/cron` route. Add heartbeat check gate at the top: if Hermes alive, skip. If dead, run fallback. Both Hermes and fallback write to `hermes_actions` so the log is complete regardless of mode.

### Algorithm First Guarantee

Fallback handles 100% of operations mechanically. No AI required. Coverage trends up (slower than with Hermes). Freshness maintained. Alerts fire. PIE never stops. Never returns null.

---

## Event Bus

ChefFlow writes events to `hermes_queue` in PostgreSQL when chef actions happen:

| Event              | When                         | What Hermes Does                                                                         |
| ------------------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `menu.created`     | Chef creates/edits a menu    | Check for unpriced ingredients. Prioritize acquisition for those items in chef's region. |
| `price.overridden` | Chef manually sets a price   | Learn from the correction. Adjust method weights. Log to hermes_feedback.                |
| `ingredient.added` | New ingredient enters system | Expand census entry. Begin acquisition for this item.                                    |
| `event.quoted`     | Chef sends a quote           | Validate pricing accuracy for quoted items. Flag low-confidence prices.                  |
| `recipe.costed`    | Recipe cost calculated       | Track predicted vs actual over time for accuracy calibration.                            |

Hermes polls `hermes_queue` every 30 seconds as part of its attention loop. Events are P1 priority (processed within 5 minutes of being queued).

---

## New Database Tables

```sql
-- Hermes operational tables
CREATE TABLE hermes_heartbeats (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,          -- 'alive', 'starting', 'error'
  queue_depth INTEGER DEFAULT 0,
  current_skill TEXT,
  last_action TEXT,
  error_count INTEGER DEFAULT 0
);

CREATE TABLE hermes_actions (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skill TEXT NOT NULL,           -- 'pie-measure', 'pie-ratchet', etc.
  source TEXT NOT NULL,          -- 'hermes' or 'fallback'
  action TEXT NOT NULL,          -- what it did
  reason TEXT,                   -- why (AI only, null for fallback)
  items_affected INTEGER DEFAULT 0,
  duration_ms INTEGER,
  result TEXT                    -- 'success', 'partial', 'failed'
);

CREATE TABLE hermes_queue (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,      -- 'menu.created', 'price.overridden', etc.
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 2,   -- 0=critical, 1=reactive, 2=scheduled, 3=improve
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'done'
  processed_at TIMESTAMPTZ
);

CREATE TABLE hermes_feedback (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingredient_id TEXT NOT NULL,
  resolved_price NUMERIC,
  actual_price NUMERIC,
  source TEXT,                   -- 'chef_override', 'receipt', etc.
  region TEXT,
  notes TEXT
);
```

---

## Dev Monitoring (Developer Only)

Hermes is invisible to users. All monitoring is developer-only.

### /dev/hermes (ChefFlow route, dev-gated)

Reads `hermes_heartbeats` + `hermes_actions` from PG. Shows:

- Alive/dead status (last heartbeat)
- Mode: Hermes or Fallback
- Coverage trend (from pie-measure snapshots)
- Last 20 actions with reasons
- Queue depth
- Error count

### Discord (Hermes Discord server)

- Morning report at 05:30 (compiled by Hermes or fallback from hermes_actions)
- Critical alerts (P0 events)
- Weekly accuracy summary

### CLI

- `hermes` - interactive session with PIE's operator
- Check logs at `~/.hermes/logs/`

---

## Success Metrics

| Gate       | Metric                                          | Target              | Measured By                            |
| ---------- | ----------------------------------------------- | ------------------- | -------------------------------------- |
| Coverage   | Census items with at least one price source     | >80%                | pie-measure daily snapshot             |
| Zero-touch | Consecutive days without manual intervention    | >30 days            | hermes_actions log (no manual entries) |
| Accuracy   | Resolved price within 15% of actual shelf price | >90% of spot checks | pie-accuracy weekly validation         |
| Freshness  | Volatile items refreshed within 7d              | >95%                | freshness_policy enforcement           |
| Uptime     | PIE resolves a price (Hermes or fallback)       | 100% (Law 10)       | Apple Test smoke test                  |

---

## What This Spec Does NOT Cover

- User-facing PIE UI (dashboard cards, price popovers, etc.) - separate spec
- Menu costing, quote generation, shopping optimization - these CONSUME PIE, they are not PIE
- Other Hermes domains (CIL, Remy, communications) - future specs after PIE proves the pattern
- Hermes branding or user-facing surfaces - Hermes is invisible infrastructure

---

## Implementation Phases

### Phase 0: Triage (prerequisite)

- Clear C: drive (98% full blocks everything)
- One-time Pi data dump to PostgreSQL
- Verify data accessible via PG queries

### Phase 1: Hermes Installation + PIE Skills

- Install Hermes on PC
- Configure Ollama provider (Gemma 4)
- Configure PostgreSQL MCP server
- Write 8 PIE skills in Hermes-native format
- Write SOUL.md identity
- Set up cron schedule via Hermes gateway

### Phase 2: Pi Decommission

- Remove Pi Bridge code from ChefFlow
- Remove pi-bridge tier from resolve-price.ts waterfall
- Clean up env vars, sync scripts, tests
- Verify resolve-price still works with remaining 15 tiers

### Phase 3: Deterministic Fallback

- Create hermes_heartbeats, hermes_actions, hermes_queue, hermes_feedback tables
- Add heartbeat check gate to /api/pie/v1/cron
- Implement fallback schedule
- Verify PIE operates in both Hermes and fallback modes

### Phase 4: Event Bus + Feedback Loop

- Wire ChefFlow chef actions to write hermes_queue events
- Hermes polls queue as part of attention loop
- Chef price overrides write to hermes_feedback
- Hermes reads feedback, adjusts acquisition priorities

### Phase 5: Dev Monitoring

- /dev/hermes route (dev-gated, reads PG)
- Discord morning report + critical alerts
- Verify zero-touch operation for 7 consecutive days

### Gate: PIE Operational

- Coverage >80%
- Freshness >95% within SLA
- Accuracy >90% spot checks
- Zero-touch >30 days
- Hermes or fallback running 24/7
