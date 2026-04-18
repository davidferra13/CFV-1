# Continuous Intelligence Layer (CIL) - Full Specification

> **Status:** DRAFT (40-question integrity audit complete)
> **Priority:** P0
> **Depends on:** Gemma 4 (e4b), existing chef_activity_log, SSE broadcast, Completion Contract
> **Subsumes:** SLI Prediction Engine (Component 4, deferred)

---

## Vision

Accumulative per-chef intelligence that compounds understanding over time. A chef on the platform for 1 year has a fundamentally smarter system than a day-1 chef. Not because the model improved, but because the context it reasons over grew. Every event planned, client preference discovered, price fluctuation absorbed, prep mistake corrected, and seasonal pattern observed feeds a persistent context graph that Gemma 4 interprets continuously.

"Google Takeout but alive." A living archive that reads itself, finds patterns, and acts while you sleep.

---

## Key Architectural Decisions

| Decision                  | Choice                                                                                  | Why                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Storage                   | **Per-tenant SQLite file** (`cil/{tenantId}.db`)                                        | Perfect isolation, GDPR deletion = delete file, portable, independent of app DB corruption                                           |
| Process model             | **In-process module + worker thread**                                                   | Subscribes to EventEmitter directly (no IPC), worker crash doesn't crash ChefFlow, follows existing non-blocking side effect pattern |
| Observation method        | **`notifyCIL()` non-blocking side effect** (same as `logChefActivity()`, `broadcast()`) | Established pattern, no new infrastructure                                                                                           |
| Gemma usage               | **Interpretation only** (20-40 calls/day)                                               | Pattern detection and reconciliation are math. Gemma fires only when deviations need meaning                                         |
| Cross-tenant intelligence | **None.** Per-chef only                                                                 | OpenClaw = market intelligence. CIL = business intelligence. Separate by design                                                      |
| Autonomy level            | **Recommendations only.** CIL never acts on behalf of the chef                          | AI policy: AI assists, chef decides                                                                                                  |

---

## Primitives (5 types)

```typescript
interface Entity {
  id: string
  tenant_id: string
  type: 'chef' | 'client' | 'event' | 'ingredient' | 'vendor' | 'recipe' | 'staff'
  state: Record<string, unknown>
  velocity: Record<string, number> // rate of change per attribute
  last_observed: number // epoch ms
}

interface Relation {
  id: string
  tenant_id: string
  from_entity: string
  to_entity: string
  type: string // 'books' | 'contains' | 'supplies' | 'requires' | 'prefers' | 'precedes'
  strength: number // 0.0-1.0, decays over time, reinforced by observation
  evidence: string[] // signal IDs that established this
  periodicity: number | null // days (365 = seasonal), null = not periodic
  chef_override: boolean // true = chef explicitly set, won't auto-decay
  created_at: number
  last_reinforced: number
}

interface Signal {
  id: string
  tenant_id: string
  source: 'db_mutation' | 'calendar' | 'email' | 'conversation' | 'price_change' | 'manual'
  entity_ids: string[]
  vector: Buffer | null // Gemma embedding (256-dim int8), null if not yet computed
  payload: Record<string, unknown>
  timestamp: number // source event time, NOT receipt time
  interpretation_status: 'pending' | 'interpreted' | 'skipped'
}

interface Prediction {
  id: string
  tenant_id: string
  entity_id: string
  attribute: string
  predicted_value: unknown
  confidence: number // 0.0-1.0
  confidence_interval: [number, number] | null
  basis: string[] // signal IDs
  causal_edges: string[] // edge IDs used in simulation
  deadline: number // when reality should be observable
  outcome: 'pending' | 'correct' | 'wrong' | 'expired' | 'self_fulfilling'
  delivered_as_intervention: boolean
}

interface Intervention {
  id: string
  tenant_id: string
  prediction_id: string
  action: string
  urgency: 'background' | 'next_idle' | 'interrupt'
  channel: 'ambient' | 'contextual' | 'push'
  delivered: boolean
  delivered_at: number | null
  preempted: boolean // chef already acted before delivery
  acted_on: boolean | null // null = unknown
  acted_on_at: number | null
  dismissed: boolean
  dismissed_at: number | null
}
```

---

## Observation Sources (ranked)

| #   | Source                         | What CIL Sees                                     | Hook Point                                       |
| --- | ------------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| 1   | `chef_activity_log`            | All actions, 17 domains, 200 types, JSONB context | `notifyCIL()` from `logChefActivity()`           |
| 2   | `event_state_transitions`      | FSM changes + metadata JSONB                      | `notifyCIL()` from `transitionEvent()`           |
| 3   | `ledger_entries`               | All financial events (immutable)                  | `notifyCIL()` from `appendLedgerEntryInternal()` |
| 4   | `remy_memories`                | Distilled conversation insights                   | `notifyCIL()` from memory extraction             |
| 5   | `automation_executions`        | Rule evaluation outcomes                          | `notifyCIL()` from automation engine             |
| 6   | `remy_alerts`                  | Alert candidates + response time                  | `notifyCIL()` from alert runner                  |
| 7   | `inventory_transactions`       | Purchase/use/deduction                            | `notifyCIL()` from transaction actions           |
| 8   | SSE EventEmitter bus           | Real-time broadcasts                              | Direct subscription (in-process)                 |
| 9   | `service_lifecycle_progress`   | Checkpoint state per inquiry/event                | `notifyCIL()` from SLI detector                  |
| 10  | Completion engine              | Readiness scores (derived)                        | Polled every 4h for active events                |
| 11  | `lib/intelligence/` (33 files) | Business health, predictions                      | CIL queries on-demand                            |
| 12  | Prep timeline                  | Workload estimates (derived)                      | Polled when event enters `confirmed`             |

### Local AI Blind Spot (Q37 resolution, added 2026-04-18)

When a chef enables opt-in local AI, Remy conversational inference runs on the chef's own machine via their local Ollama instance. The server never sees conversation content for these sessions. CIL observation sources affected:

- **Source #4 (remy_memories):** Memory extraction still runs via `autoSave` in both local and server paths, so this source is NOT affected.
- **Source #8 (SSE bus):** Local AI conversations do not trigger SSE broadcasts. CIL should not depend on SSE for Remy conversation signals.
- **Conversation summaries:** The local AI path now generates summaries and persists to MemPalace (fixed 2026-04-18), so cross-conversation context is preserved.

CIL's behavioral signals (activity log, FSM transitions, ledger, automations) are unaffected because these are server-side events independent of where Remy inference runs. The only gap is real-time SSE observation of Remy conversations, which is supplementary.

---

## 40-Question Integrity Audit

### Domain 1: Data Integrity (Q1-Q5)

**Q1. Activity log says 5000 cents, ledger says 7500. Which wins?**

Ledger is immutable source of truth for financial data. Activity log is behavioral signal (who did what, when). They answer different questions. CIL reads financial attributes exclusively from `ledger_entries`. Activity log contributes timing and behavioral signals (how fast did chef log the payment? manual or Stripe webhook?). No conflict resolution needed because they serve different purposes.

Entity state rule: financial fields (amount, balance, revenue) always derive from ledger. Behavioral fields (response_time, action_frequency) derive from activity log.

**PASS**

---

**Q2. Inventory transaction for a just-deleted recipe ingredient. Orphaned Relation?**

Signal ingested regardless. The purchase happened; money was spent. The ingredient-event Relation weakens naturally as the recipe link is severed (no new reinforcing signals). Predictions depending on that ingredient get re-evaluated at next Pattern Recognizer pass.

The transaction is still valid financial data. CIL doesn't delete or ignore it. It learns: "ingredient X was purchased but its recipe was removed from the menu." Useful for waste pattern detection.

**PASS**

---

**Q3. Two signals arrive 50ms apart, out of order (ledger before transition).**

Signals carry `timestamp` from the source event, not CIL receipt time. CIL orders by source timestamp. If two signals are within 100ms, treated as concurrent (no assumed causality). The causal DAG doesn't hardcode "transitions precede payments." It learns order from data. If a chef's workflow is "take payment, then mark accepted," the DAG reflects that.

Rule: CIL never assumes causal order. It observes and learns order.

**PASS**

---

**Q4. Remy memory says "Client M prefers seafood." CIL has 4 events showing meat-heavy (strength 0.8).**

Remy memory is one Signal with weight 1. Accumulated evidence is 4 Signals. CIL ingests the Remy memory through the normal pipeline. Creates/reinforces a new Relation (`M -> prefers -> seafood`) at low strength (~0.2) and slightly weakens the meat Relation (~0.75). No special handling. Remy memories are just another signal source. One conversation extract shouldn't override four observations.

Over the next few events, data resolves it naturally.

**PASS**

---

**Q5. Chef dormant 3 months. How much intelligence survives?**

Exponential decay: `strength *= e^(-λ * days_inactive)`

| Entity Type            | Lambda | Half-life | After 90 days    |
| ---------------------- | ------ | --------- | ---------------- |
| Client relationships   | 0.003  | 231 days  | 76% retained     |
| Financial patterns     | 0.005  | 139 days  | 64% retained     |
| Ingredient/operational | 0.01   | 69 days   | 41% retained     |
| Event-specific         | 0.03   | 23 days   | 7% (mostly gone) |

What never decays: Entity existence. Periodic Relations (seasonal). Chef-override Relations.

Relations below 0.05 strength for >90 days: archived (not deleted, recoverable).

On return: CIL enters "reacquisition mode" for 2 weeks. Lower confidence thresholds, double Gemma budget (40-80 calls/day) to rebuild graph faster.

**PASS**

---

### Domain 2: Failure Modes (Q6-Q10)

**Q6. Crash mid-reconciliation. 15 Predictions marked wrong but edges not weakened.**

Reconciliation is atomic per-prediction. SQLite transaction wraps: (1) set outcome, (2) adjust edge weights, (3) log miss. If crash between predictions, uncommitted one stays `outcome: 'pending'`.

On restart: `SELECT * FROM predictions WHERE deadline < now() AND outcome = 'pending'` and re-reconcile. Idempotent: same inputs produce same outputs. Crash during recovery: same procedure. No special recovery-of-recovery logic needed.

**PASS**

---

**Q7. Ollama offline 6 hours. 47 Signals need interpretation.**

Signals stay in `signals` table with `interpretation_status: 'pending'`. No separate queue.

When Ollama returns:

- Throttle: 5 interpretations/minute (prevents GPU spike competing with Remy)
- Priority: (1) interrupt-eligible, (2) highest deviation, (3) FIFO
- Max backlog: 200 pending. Beyond 200, oldest marked `'skipped'` (math-only analysis still applied)

47 signals at 5/minute = ~10 minutes to clear.

**PASS**

---

**Q8. cil.db corrupted. What's lost? Rebuild?**

Per-tenant SQLite: only one chef affected.

Permanently lost: Prediction history, causal DAG edge weights (calibrated over months), Relation strengths, Intervention effectiveness data.

Recoverable from PostgreSQL: Entities (rebuild from clients/events/recipes tables), raw signals (rebuild from `chef_activity_log`, `ledger_entries`, `event_state_transitions`). But learned patterns are lost.

Cold-start reconstruction: 200 events, 50 clients = 2-5 minutes (DB queries, no Gemma). Chef gets a "new CIL" with correct entities but default edge weights. Recalibrates within 5-10 events (~2-4 weeks).

Mitigation: daily SQLite backup (backup API, non-locking, <1s per file). Keep 7 daily backups. Recovery = restore most recent clean backup + replay signals since backup timestamp.

**PASS**

---

**Q9. Interrupt fires but chef offline. Action window closes.**

CIL never acts autonomously. Interventions are recommendations only.

1. Stored with `delivered: false`
2. On next SSE connection: deliver if window still open, else mark `outcome: 'expired'`
3. Expired-due-to-delivery-failure doesn't weaken causal edges (prediction may have been correct; delivery failed)
4. Weekly self-report tracks delivery failure rate. If >20%, suggest push notifications

No queueing beyond one session boundary. Stale alerts are worse than no alerts.

**PASS**

---

**Q10. #1 most-used edge turns wrong. Weakening destabilizes 30% of predictions.**

Yes. Weaken it. No edge is "too important to weaken." Keeping a false edge produces wrong predictions the chef trusts. Worse than temporary instability.

Weakening is proportional: `strength -= error_magnitude * learning_rate` (LR: 0.1). Edge doesn't die in one reconciliation. Takes 5-10 consecutive misses to drop below usefulness. During adjustment, predictions using this edge automatically get lower confidence (confidence scales with edge strength).

Safety net: weekly self-report flags edges that dropped >50% in one week.

If 30% of predictions become unreliable, CIL is working correctly. Those predictions were based on a false assumption.

**PASS**

---

### Domain 3: Multi-Tenant Security (Q11-Q15)

**Q11. Tenant isolation mechanism?**

Separate SQLite file per tenant: `cil/{tenantId}.db`. Each file contains only that chef's data. Cross-tenant queries impossible at storage layer. No row-level filtering needed. No shared tables. No accidental leakage through query bugs.

File permissions: same as ChefFlow's storage directory.

**PASS**

---

**Q12. Co-hosted event: Chef A + Farm Owner B. Shared data but private business data.**

Co-hosted events create a `shared_event_context` in both CIL instances.

Explicitly shared (defined in co-host agreement):

- Event: date, location, guest count, occasion
- Shared ingredient list: items + quantities
- Ticket sales: count + total revenue

Explicitly NOT shared:

- Chef A's pricing margins, rates, client relationships
- Owner B's farm revenue, other events, costs
- Neither party's causal DAG edges or predictions

Each CIL gets a Signal containing only shared fields. Shared data creates Relations within each CIL independently. Chef A's CIL learns "farm events need 20% more prep." Owner B's CIL learns "Chef A's events sell 90% of tickets." Neither insight leaks.

**PASS**

---

**Q13. Admin cross-tenant CIL view?**

No. Developer queries individual `cil/{tenantId}.db` files directly for debugging (standard SQLite clients). Anonymous market intelligence comes from OpenClaw, not CIL. CIL is per-chef. OpenClaw is per-market. Separate systems by design.

**PASS**

---

**Q14. GDPR: chef deletes account. Complete purge?**

`rm cil/{tenantId}.db`

The file IS the intelligence. Delete the file = delete the intelligence. No orphaned rows, no foreign key cleanup, no "did we get everything" anxiety.

Additionally purge PostgreSQL: `remy_memories`, `chef_activity_log`, etc. for that tenant (existing GDPR process, not CIL-specific).

Verification: file no longer exists. Time: instant.

Primary reason per-tenant SQLite files are the right architecture.

**PASS**

---

**Q15. Can PII be reverse-engineered from embeddings?**

Theoretically yes (nearest-neighbor attacks). Practically, risk is contained:

1. Embeddings live in per-tenant SQLite with same access control as raw Signal text. If attacker has embeddings, they already have plaintext (same database)
2. Computed locally by Gemma (never sent to cloud)
3. Stored locally (never leave the machine)
4. Deleted with tenant file (GDPR)
5. No embedding index crosses tenant boundaries

Incremental risk from embeddings beyond raw data: zero. Threat model identical to `chef_activity_log` (already contains PII in plaintext JSONB).

**PASS**

---

### Domain 4: Self-Correction Integrity (Q16-Q22)

**Q16. Price alerts correct but redundant (chef already saw on OpenClaw). Suppressed as low act-on rate. Wrong vs already-handled?**

New Intervention field: `preempted: boolean`.

Detection: before delivering Intervention, check `chef_activity_log` for matching actions within last N hours. If chef visited price catalog before CIL delivers the price alert, mark `preempted: true`.

Preempted interventions excluded from act-on rate calculations. They count as "correctly identified, chef was ahead of it." Result: either surface earlier (before chef's manual check) or suppress category (chef monitors independently).

**PASS**

---

**Q17. Guest count predictions fail 60%. Intervals widened until useless. Usefulness floor?**

Prediction is useless when confidence interval spans >60% of the plausible range.

Example: plausible guest count range 5-50 (45-unit span). CIL's interval: 10-40 (30-unit span). 30/45 = 67%. Useless.

When attribute hits usefulness floor:

1. Stop generating Predictions for that attribute on that entity
2. Log: "Guest count for Client M is unpredictable (variance: 67%)"
3. Switch to factual observation: "Client M's recent counts: 8, 14, 21. Confirm 48h before service." Data, not prediction.
4. Re-evaluate quarterly if new data reduces variance

The system is honest about what it doesn't know.

**PASS**

---

**Q18. Seasonal edge pruned after 30 days. December holiday surge is valid yearly.**

Detection at edge creation: if >70% of supporting Signals fall within a 60-day calendar window (same period across years), auto-flag `periodicity: 365`.

Decay rules:

- Non-periodic: archived after 90 days without reinforcement
- Periodic: validated once per period. Edge weakens only if the period arrives and the pattern doesn't manifest
- Max decay: `periodicity * 1.5` without confirmation. Yearly pattern gets 18 months before archival

Manual flag: chef can mark edge as seasonal. Sets `chef_override: true` + `periodicity: 365`, preventing auto-prune.

**PASS**

---

**Q19. Self-defeating prediction: CIL predicts cancellation, chef intervenes, event saved. Correct or wrong?**

New outcome: `'self_fulfilling'`.

Detection:

1. Prediction delivered as Intervention (`delivered_as_intervention: true`)
2. Chef acted on it (`acted_on: true`)
3. Predicted outcome did NOT occur

All three true: `outcome: 'self_fulfilling'`. This is a SUCCESS. System correctly identified risk. Chef's action mitigated it. Edge strength REINFORCED, not weakened.

If prediction was NOT delivered and outcome didn't match: `outcome: 'wrong'`. Weaken edges.

The distinction: did CIL's output change the outcome?

**PASS**

---

**Q20. Slow systemic drift: no single reconciliation wrong, but accuracy drops 10% over 30 days.**

Meta-metric: 30-day rolling prediction accuracy rate, computed daily.

Drift detection: accuracy drops >10 points in 30 days AND no single edge accounts for >50% of the drop = systemic drift.

Response:

1. Freeze edge weight adjustments for 48 hours
2. Full reconciliation audit: re-evaluate all predictions from last 30 days
3. Compute per-edge accuracy contribution
4. Flag in weekly self-report with full context
5. After freeze: resume with halved learning rate for 2 weeks

Guard: edges with <10 observations excluded from drift analysis (expected to be unstable).

**PASS**

---

**Q21. Spurious correlation: full_moon -> larger_tips (0.3 strength, 8 observations). Accept?**

No. Minimum evidence thresholds:

| Criterion            | Threshold |
| -------------------- | --------- |
| Minimum observations | 20        |
| Minimum correlation  | 0.5       |
| Maximum p-value      | 0.05      |
| Minimum time span    | 60 days   |

Gemma-proposed edges start at strength 0.1 (provisional). Must reach 0.3 through reinforcement within 90 days or auto-pruned.

Full_moon edge: 8 observations, 0.3 correlation. Fails observations (need 20) and correlation (need 0.5). Logged as `"observed_insufficient_evidence"`. Revisited after 20+ observations. If still correlates at 0.5+ with p < 0.05, accepted. If not, permanently discarded.

**PASS**

---

**Q22. Chef says "Client M doesn't prefer seafood, that was one-time." CIL has 4 data points. Who wins?**

Chef explicit feedback: Signal with `source: 'manual'`, weight multiplier 5x. One explicit statement = five implicit observations.

Two tiers:

| Tier          | Trigger                                            | Effect                                                                                    |
| ------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Soft override | "Not really" / "That's not accurate"               | 5x weight. Relation weakens heavily but can rebuild if 10+ future observations support it |
| Hard override | "Never" / "always" / "stop showing" / "I told you" | `chef_override: true`. Won't re-learn until chef explicitly un-overrides                  |

Detection: keyword matching on feedback text. Definitive language = hard. Everything else = soft.

Chef's word is heavy but (for soft overrides) not permanent. Preferences change. The chef might be wrong about their own patterns.

**PASS**

---

### Domain 5: Performance & Resource Limits (Q23-Q27)

**Q23. 300+ Signals/day, 80 deviations, 40 Gemma budget. Which 40?**

Priority scoring: `urgency = deviation_magnitude * entity_importance * time_pressure`

- `entity_importance`: active events (1.0) > upcoming 7d (0.8) > clients with upcoming (0.6) > all others (0.3)
- `time_pressure`: `1.0 / max(hours_until_deadline, 1)`

Budget allocation: 60% interrupt-eligible (24 calls), 30% next-idle (12), 10% background (4).

Remaining 40: math-only analysis recorded, flagged `interpretation_status: 'skipped'`. Priority next day if entity still active and deviation persists.

**PASS**

---

**Q24. After 3 years: 36MB, 100K+ Signals. Archival strategy?**

Weekly archival:

| Data Type     | Hot Retention        | Archive Trigger               |
| ------------- | -------------------- | ----------------------------- |
| Signals       | 6 months             | Older, no active Relations    |
| Relations     | Unlimited (if alive) | Strength < 0.05 for > 90 days |
| Predictions   | 3 months             | Reconciled > 3 months ago     |
| Interventions | 3 months             | Delivered > 3 months ago      |
| Entities      | Never                | Lightweight, always relevant  |

Archive tables in same SQLite file. Not indexed for graph traversal. Queryable for historical analysis.

Hot database after 3 years: <10MB. Graph traversal (all Relations for Entity) stays <5ms with WAL mode + indexes.

`VACUUM` weekly after archival. `ANALYZE` after each pass.

**PASS**

---

**Q25. Heavy day: chef actively using app + CIL running daily pruning + Gemma calls. Contention?**

CIL yields to user-facing operations:

1. Worker thread runs CIL computation. Main event loop unaffected
2. CIL Gemma calls: separate queue, max concurrency 1. Remy calls get priority queue. Ollama processes sequentially; CIL waits for Remy
3. Active session deferral: SSE connections exist + activity in last 5 min = defer non-urgent CIL work. Pattern Recognizer still runs (pure math, <1ms). Simulator and Gemma wait for idle
4. Daily pruning: 2-4 AM local OR no SSE connections for >30 min (whichever first)

**PASS**

---

**Q26. Three micro-models scheduling, threads, SQLite contention?**

| Model              | Frequency                       | Thread | DB Access        |
| ------------------ | ------------------------------- | ------ | ---------------- |
| Pattern Recognizer | Per signal batch (debounced 5s) | Main   | Read-only        |
| Causal Simulator   | Every 15 min                    | Worker | Read-write (WAL) |
| Decision Timer     | Every 60s                       | Main   | Read-only scan   |

SQLite WAL mode: concurrent reads + one writer. Causal Simulator is the only writer during simulation. Signal ingestion writes (main thread) happen in the 5s debounce window. Simulation writes on 15-min cycle. If collision, SQLite WAL handles it (one waits, no corruption).

Connections: main thread holds one read connection (shared by PR + DT). Worker holds one read-write connection. Both long-lived.

**PASS**

---

**Q27. 500-recipe bulk import. 500 Entities, 2000 Relations, 500 Signals at once. Backpressure?**

`notifyCIL()` writes directly to SQLite `signals` table (append, <1ms per row). Observer queries unprocessed signals every 5 seconds.

500 signals at <1ms = <500ms total write time. Observer picks them up next 5s cycle. Pattern Recognizer processes batch (math-only, <100ms for 500). No Gemma calls triggered (no baseline exists for new entities, so no deviations to interpret).

Zero backpressure on the import. Chef's UI never waits for CIL. No ring buffer, no overflow, no dropped signals.

**PASS**

---

### Domain 6: Interaction Design (Q28-Q32)

**Q28. Ambient state: 3 competing insights, 1 line. Ranking?**

`display_score = confidence * impact_weight * time_pressure`

| Domain               | Impact Weight |
| -------------------- | ------------- |
| Food safety          | 1.0           |
| Financial            | 1.0           |
| Timeline conflict    | 0.9           |
| Client communication | 0.7           |
| Pricing              | 0.5           |
| Operational          | 0.4           |

Highest score wins. Ties broken by recency. Updates at most once per 60 seconds (no flickering).

If best insight has `display_score < 0.3`, show nothing. Silence is valid output.

**PASS**

---

**Q29. Contextual Insert: chef navigates away and back. Reappear?**

| State                        | Behavior                                              |
| ---------------------------- | ----------------------------------------------------- |
| First show                   | Page load + insight exists + confidence > 0.7         |
| Navigate away, come back     | Reappears (not dismissed)                             |
| Chef clicks dismiss          | Hidden for this entity for 7 days                     |
| Underlying data changes      | Re-evaluated. If invalidated, expires                 |
| Prediction deadline passes   | Expires permanently                                   |
| Confidence drops below 0.7   | Expires                                               |
| Re-eligibility after dismiss | After 7 days IF new data arrived AND pattern persists |

One insight per page max. Multiple qualifying: highest confidence wins. Others queue for next visit after winner dismissed/expired.

**PASS**

---

**Q30. 3 Interrupts this week. 4th qualifies. Budget exhausted. Deliver?**

Weekly budget: 5. Hard cap. If exhausted, suppress. Even if higher confidence than previous ones. Interrupt fatigue is real.

**Exception:** food safety alerts (temperature, allergen, contamination) bypass budget entirely. Never suppressed.

Suppressed non-safety interrupt: downgraded to `next_idle`, surfaces as Contextual Insert on next relevant page visit. Insight isn't lost; channel changes.

Budget resets Monday 00:00 local time.

**PASS**

---

**Q31. CIL says "prep time averages 45min not 30min." Chef updates to 45. Attribution?**

Passive attribution through existing signal pipeline:

1. CIL delivers Contextual Insert for Entity E, attribute A, at time T1
2. `chef_activity_log` records: `{ action: 'recipe_updated', context: { field: 'prep_time', old: 30, new: 45 } }` at T2
3. If `T2 - T1 < 30 minutes` AND updated field matches insight's target attribute: mark `acted_on: true`

No special tracking. Activity log already captures field-level changes with timestamps and JSONB context. CIL correlates Intervention with subsequent activity on same entity.

Different field or different value: `acted_on: null` (uncertain).

**PASS**

---

**Q32. Chef asks Remy "How's my week?" Should Remy query CIL?**

Yes. `loadRemyContext()` gains a Tier 2 section: `cilInsights`.

```typescript
cilInsights: getCILInsights(tenantId)
// Returns: top 5 predictions, ambient state line, pending interventions
```

Remy context = authoritative for CURRENT state ("3 events this week"). CIL provides PREDICTIVE layer ("Client X usually books last-minute; expect 4th"). Both presented, clearly labeled:

> "You have 3 events this week. Thursday looks tight with overlapping prep. Client X typically books within 48h, so a 4th may come in."

Fact + prediction. No ambiguity about which is which.

Remy does NOT write to CIL. CIL observes Remy through normal pipeline (remy_messages -> activity_log -> notifyCIL).

**PASS**

---

### Domain 7: Integration Seams (Q33-Q37)

**Q33. `logChefActivity()` silently fails. CIL never sees that action. Gap detection?**

Daily integrity check:

1. Count signals per source per day
2. If activity_log typically produces 20-30/day and today shows 3: flag "potential observation gap"
3. Cross-reference: check if `ledger_entries` or `event_state_transitions` show mutations without corresponding activity_log entries
4. If gaps: lower confidence on all predictions from sparse data (mark as "degraded observation period")

`notifyCIL()` has its own try/catch independent of `logChefActivity()`. CIL subscribes to multiple sources for redundancy. If activity_log fails but SSE broadcasts succeed, CIL still sees the mutation (less metadata).

Gap detection doesn't fix missing data. Prevents confident predictions on incomplete information.

**PASS**

---

**Q34. Completion Contract is derived (no stored state). CIL wants trajectories. Polling?**

Active events only (draft through confirmed, not completed/cancelled).

| Schedule         | When                       |
| ---------------- | -------------------------- |
| Every 4 hours    | Business hours (8AM-10PM)  |
| Once at midnight | Overnight snapshot         |
| On-demand        | Event FSM state transition |

10 active events x 7/day = 70 evaluations/day. Each is 3-5 DB queries (lightweight, uses existing views).

CIL stores in `completion_trajectory` table:

```sql
CREATE TABLE completion_trajectory (
  entity_type TEXT,
  entity_id TEXT,
  score INTEGER,
  status TEXT,
  missing_count INTEGER,
  blocking_count INTEGER,
  evaluated_at INTEGER,
  PRIMARY KEY (entity_type, entity_id, evaluated_at)
);
```

Enables: "Events for Client M typically reach 90% completion 3 days before service. This one is at 60% with 2 days left."

**PASS**

---

**Q35. `lib/intelligence/` has 33 stateless functions. CIL does similar work with persistent state. Migration?**

CIL runs ALONGSIDE the 33 files. Not replaces them.

Intelligence functions serve real-time requests (Remy context, dashboard widgets). CIL provides temporal/predictive layer stateless functions can't compute.

| Phase                     | What Changes                                                               |
| ------------------------- | -------------------------------------------------------------------------- |
| 1 (launch)                | CIL observes same sources. Functions unchanged. CIL is additive            |
| 2 (enrichment)            | `getBusinessHealthSummary()` adds `cilPredictions` section by querying CIL |
| 3 (delegation, if earned) | Functions where CIL proves >80% accuracy for 3+ months delegate to CIL     |

`getBusinessHealthSummary()` survives as API surface. CIL becomes one of its data providers. No rip-and-replace.

**PASS**

---

**Q36. CIL learns optimal automation thresholds. Write to settings directly or recommend?**

Surface as recommendation. CIL never writes to settings tables.

Example: "Based on Client M's response patterns, reducing no-response timeout from 3 to 2 days would catch 80% of at-risk inquiries 24h earlier. [Accept] [Dismiss]"

Accept: CIL calls existing `updateAutomationSettings()` server action. Action is the chef's, not CIL's. Full audit trail.

Dismiss: recorded. Won't re-suggest same threshold for 30 days. If pattern strengthens, re-suggests with updated evidence.

Boundary: CIL = intelligence. Automation engine = execution. Chef = authorization. Three roles, no crossover.

**PASS**

---

**Q37. SSE is in-memory EventEmitter. CIL design said daemon. Process architecture?**

In-process module with worker thread.

```
lib/cil/
  index.ts      -- module init, called from server startup
  observer.ts   -- main thread: EventEmitter subscription, signal writes
  worker.ts     -- Worker thread: Pattern Recognizer + Causal Simulator
  timer.ts      -- main thread: 60s Decision Timer interval
  api.ts        -- getCILInsights(), getCILAmbientState() for Remy/UI
  notify.ts     -- exported notifyCIL() function
```

Crash isolation:

- Worker crash: main catches `worker.on('error')`, logs, respawns within 5s. ChefFlow continues. CIL degraded (no simulation) until respawn
- Observer error: each EventEmitter callback in try/catch. Single signal failure doesn't crash observer
- CIL module catastrophic failure: ChefFlow runs normally. All `notifyCIL()` calls already in try/catch. Zero impact on core app

Why not separate process: EventEmitter subscription (no IPC overhead), follows established pattern, simpler deployment, worker thread provides sufficient isolation.

**PASS**

---

### Domain 8: Accumulation & Growth (Q38-Q40)

**Q38. Mature CIL: 3K entities, 15K relations, 200 calibrated edges. New chef starts empty. Transfer?**

Limited transfer of STRUCTURAL knowledge only. Never weights.

On signup, CIL creates from `cil-bootstrap.json`:

```json
{
  "default_edges": [
    { "from": "event.confirmed", "to": "prep_list.within_48h", "weight": 0.5 },
    { "from": "guest_count.>20", "to": "prep_time.+15pct", "weight": 0.5 },
    { "from": "client.response_delay.>72h", "to": "cancellation_risk", "weight": 0.5 }
  ]
}
```

All edges at 0.5 (neutral). Calibrate to individual chef within 5-10 events (~2-4 weeks).

`cil-bootstrap.json` is hand-curated by developer from domain expertise. NOT auto-generated from other tenants. Encodes "how the private chef business generally works," not "how Chef A works."

Usefulness timeline: Day 1 (generic edges, no predictions) -> Week 2 (first predictions, low confidence) -> Month 1 (edges calibrating) -> Month 3 (meaningfully personalized) -> Month 6+ (compounding intelligence).

**PASS**

---

**Q39. Old data vs new data. Annual dinner from 2 years ago vs event from last week.**

Entity-type-specific decay on Relation strength:

| Entity Type          | Lambda | Half-life | Rationale                 |
| -------------------- | ------ | --------- | ------------------------- |
| Event-specific       | 0.03   | 23 days   | Events are ephemeral      |
| Operational          | 0.01   | 69 days   | Habits change slowly      |
| Ingredient           | 0.01   | 69 days   | Seasonal, moderate churn  |
| Financial            | 0.005  | 139 days  | Payment habits are sticky |
| Client relationships | 0.003  | 231 days  | Relationships are durable |

Applied daily during maintenance window. NOT applied to:

- Entities (Client M always exists)
- Relations with `chef_override: true`
- Relations with `periodicity` set (seasonal, validated per-cycle)

The "annual December dinner" Relation has `periodicity: 365`. Doesn't decay between Decembers. Validated when December arrives. If booking doesn't happen, THEN weakens.

**PASS**

---

**Q40. Chef leaves ChefFlow. Can they take their CIL? Format? Portable?**

Yes. Chef owns their accumulated intelligence.

Primary export: the SQLite file itself (`cil/{tenantId}.db`). Standard, universal, queryable by any SQLite client on any platform.

JSON export option:

```typescript
interface CILExport {
  exported_at: string
  chef_id: string
  entities: Entity[]
  relations: Relation[] // with strengths and evidence
  signals: Signal[] // without embeddings
  predictions: Prediction[] // with outcomes
  interventions: Intervention[] // with effectiveness
  causal_dag: CausalEdge[] // with calibrated weights
  metadata: {
    total_signals_processed: number
    prediction_accuracy_rate: number
    oldest_signal: string
    newest_signal: string
  }
}
```

Portability: data is accessible and readable. Not plug-and-play into another platform (ChefFlow-specific schema). But raw intelligence (client preferences, timing patterns, cost patterns) is universally useful.

Downloadable from settings page. No vendor lock-in on accumulated intelligence.

**PASS**

---

## Scorecard

| Domain                | Questions | Status              |
| --------------------- | --------- | ------------------- |
| Data Integrity        | Q1-Q5     | 5/5 PASS            |
| Failure Modes         | Q6-Q10    | 5/5 PASS            |
| Multi-Tenant Security | Q11-Q15   | 5/5 PASS            |
| Self-Correction       | Q16-Q22   | 7/7 PASS            |
| Performance           | Q23-Q27   | 5/5 PASS            |
| Interaction           | Q28-Q32   | 5/5 PASS            |
| Integration Seams     | Q33-Q37   | 5/5 PASS            |
| Accumulation          | Q38-Q40   | 3/3 PASS            |
| **Total**             | **40/40** | **40 PASS, 0 FAIL** |

---

## File Structure

```
lib/cil/
  index.ts              -- module init, called from server startup
  observer.ts           -- EventEmitter subscription + signal drain
  notify.ts             -- exported notifyCIL() (non-blocking side effect)
  worker.ts             -- Worker thread: pattern recognition + causal simulation
  timer.ts              -- Decision Timer (60s interval)
  api.ts                -- getCILInsights(), getCILAmbientState()
  types.ts              -- Entity, Relation, Signal, Prediction, Intervention
  schema.ts             -- SQLite schema + migrations
  bootstrap.ts          -- cil-bootstrap.json loader
  decay.ts              -- Temporal decay functions per entity type
  archival.ts           -- Hot/cold data lifecycle
  reconciler.ts         -- Prediction outcome reconciliation
  causal-dag.ts         -- DAG construction, simulation, edge management
  integrity.ts          -- Daily observation gap detection
  priority.ts           -- Signal prioritization + Gemma budget allocation

cil/                    -- Per-tenant SQLite files (gitignored)
  {tenantId}.db

cil-bootstrap.json      -- Default causal DAG for new chefs (checked in)
```

---

## Build Order

| Phase | What                                               | Independently Useful?     |
| ----- | -------------------------------------------------- | ------------------------- |
| 1     | SQLite schema + `notify.ts` + `observer.ts`        | Yes (starts recording)    |
| 2     | `types.ts` + Entity/Relation creation from signals | Yes (builds graph)        |
| 3     | Pattern Recognizer (math-only deviation detection) | Yes (flags anomalies)     |
| 4     | `reconciler.ts` + Prediction/outcome loop          | Yes (learning begins)     |
| 5     | `causal-dag.ts` + Causal Simulator                 | Yes (predictions improve) |
| 6     | Gemma interpretation integration                   | Yes (meaning layer)       |
| 7     | `timer.ts` + Decision Timer                        | Yes (time-aware)          |
| 8     | `api.ts` + ambient state SSE channel               | Yes (first UI surface)    |
| 9     | Contextual Insert component                        | Yes (second UI surface)   |
| 10    | Interrupt channel (PWA push)                       | Yes (third UI surface)    |
| 11    | Self-correction weekly review                      | Yes (full loop closes)    |
| 12    | `decay.ts` + `archival.ts`                         | Yes (sustainable growth)  |
| 13    | Remy integration (`cilInsights` in context)        | Yes (Remy gets smarter)   |
| 14    | CIL export (settings page)                         | Yes (data ownership)      |

Each phase is a separate commit. Each testable in isolation. Phase 4 is where learning starts. Phase 8 is where the chef first sees it.

---

## Systems CIL Absorbs

| Current System                               | CIL Replaces? | Relationship                                            |
| -------------------------------------------- | ------------- | ------------------------------------------------------- |
| SLI Prediction Engine (deferred Component 4) | Yes           | CIL's Pattern Recognizer + Decision Timer is a superset |
| `lib/intelligence/` (33 files)               | No            | CIL enriches their output, doesn't replace              |
| Remy memories                                | No            | CIL consumes as signal source, Remy keeps its own table |
| Proactive alerts (static rules)              | Partially     | CIL adds learned patterns alongside existing rules      |
| Automation thresholds                        | No            | CIL recommends optimal values, chef accepts             |
| Completion Contract                          | No            | CIL tracks trajectories, Contract provides snapshots    |

---

## System-Wide Cohesion Audit (Q41-Q80)

> **Context:** The first 40 questions validated CIL's internal architecture. This second audit validates that CIL actually REACHES every user, every surface, every module. Sources: MemPalace mining (535 conversations + 6,755 codex drawers), surface audit (25 universal surfaces mapped), cross-system continuity audit, gap analysis, and MemPalace backlog.
>
> **Key finding from MemPalace:** "The real gap is the wiring between systems, not the systems themselves." CIL IS that wiring.

### Domain 9: Universal Benefit (Q41-Q47)

Every chef, regardless of archetype, module, or tenure, must benefit from CIL. These questions ensure no user class is left behind.

**Q41. A brand-new chef signs up, completes onboarding with archetype "Private Chef," and creates zero events. CIL has zero signals. What does the chef see? Is CIL invisible, or does it provide value from minute one?**

CIL is invisible until it has something to say. Zero signals = zero predictions = ambient line shows nothing. This is correct behavior. An empty intelligence layer that makes things up to look useful violates the Zero Hallucination rule.

But CIL is not useless. From minute one:

1. `cil-bootstrap.json` creates archetype-specific default edges. "Private Chef" bootstrap includes edges that caterers don't get (intimate dinner patterns, client relationship depth, seasonal booking cycles). "Caterer" bootstrap includes volume-specific edges (staff scaling, equipment logistics, batch purchasing).
2. CIL starts recording signals immediately. Every recipe added, every client created, every setting configured = a Signal. The graph grows silently.
3. Onboarding completion itself generates 10-20 signals (archetype selected, profile completed, first recipe added, etc.). These seed the Entity graph.

First visible CIL output: after the chef creates their first event AND completes it (the reconciliation loop needs outcomes). For most chefs: 1-4 weeks. Until then, CIL silently accumulates.

**PASS**

---

**Q42. A high-volume caterer has 200 events/year. A once-a-month private dinner chef has 12 events/year. CIL's causal DAG calibrates within "5-10 events." The caterer gets useful CIL in 2 weeks; the dinner chef waits 6-12 months. How does CIL remain useful for low-frequency chefs during the calibration desert?**

Two modes before calibration completes:

**Mode 1: Factual observations (no prediction needed).** CIL surfaces data the chef already has but doesn't actively track:

- "You've spent $X on ingredients this quarter across Y events"
- "Client M has booked 3 times; their average spend is $Z/guest"
- "Your most-used recipe is [X], appearing in 60% of events"

These are database queries with CIL's temporal context. No causal edges needed. Available after 2-3 events.

**Mode 2: Bootstrap predictions with explicit confidence labels.** Default edges from `cil-bootstrap.json` fire with low confidence (0.3-0.5). These are shown with clear labeling: "Based on typical patterns (not your specific data yet)." As events accumulate, confidence rises and the label drops.

The dinner chef gets useful observations within 2-3 events (~2-3 months). Calibrated predictions within 10-12 events (~10-12 months). The system remains honest about what it knows vs. guesses.

**PASS**

---

**Q43. A chef uses ONLY the recipe book and event planning. Never touches finance, never uses Remy, never imports inquiries from Gmail. CIL observes via `chef_activity_log`, but this chef generates 5 signals/day instead of 30. Does CIL degrade gracefully to "what it can observe" or does it show broken/empty predictions?**

Graceful degradation. CIL operates per-domain. Each domain (events, finance, clients, recipes, communication) has its own set of edges. If a domain has no signals, CIL makes zero predictions for that domain. No empty states, no "$0.00", no broken cards.

What this chef DOES get:

- Event pattern intelligence (they use event planning)
- Recipe usage patterns (they use the recipe book)
- Prep time learning (derived from events + recipes)

What this chef DOESN'T get:

- Financial predictions (no ledger entries observed)
- Communication pattern intelligence (no Remy/email signals)
- Client response prediction (no inquiry data)

CIL's ambient state line only draws from domains with sufficient data. If only 2 of 5 domains have data, the ambient line uses those 2. The `display_score` formula (Q28) naturally filters out domains with no signal (zero confidence = zero display score).

**PASS**

---

**Q44. A chef enables the cannabis module (`app/(chef)/cannabis/`). Cannabis events have regulatory compliance signals (ledger entries, control packets, RSVP manifests) that standard events don't. Does CIL understand module-specific signals? Does it create cannabis-specific causal edges (e.g., `compliance_packet_incomplete -> event_delay_risk`)? Or does it treat cannabis events identically to standard events?**

CIL uses **module-tagged signals**. Every Signal has the existing `payload` field; cannabis signals include `{ module: 'cannabis' }` in the payload. CIL's Pattern Recognizer groups signals by module tag before computing deviations.

Module-specific edges:

- `cil-bootstrap.json` includes a `cannabis` section with domain-specific default edges: `compliance_packet_incomplete -> event_delay_risk`, `rsvp_manifest_missing -> regulatory_violation_risk`, `cannabis_ingredient_variance > 2% -> compliance_flag`
- These edges only activate for tenants with the cannabis module enabled
- Cannabis-specific edges never pollute standard event predictions. The module tag prevents cross-contamination

Cannabis events also generate standard signals (FSM transitions, ledger entries, prep timelines). Those feed standard edges normally. The module tag adds an additional dimension, it doesn't replace the base signal.

**PASS**

---

**Q45. A meal-prep chef (`app/(chef)/meal-prep/`) runs weekly recurring programs, not one-off events. Their pattern is fundamentally different: same clients, same cadence, incremental menu changes. Does CIL's event-centric causal DAG work for recurring programs? What entity type represents a meal-prep program vs. a one-off event?**

New Entity type: `'program'` (alongside existing `'event'`).

A meal-prep program is a recurring container. Each week's delivery is still an `event` Entity, but it has a Relation (`belongs_to -> program`) that groups weekly instances. CIL's Pattern Recognizer handles programs differently:

| Aspect             | One-off Event            | Recurring Program                                                |
| ------------------ | ------------------------ | ---------------------------------------------------------------- |
| Pattern detection  | Cross-event comparison   | Week-over-week comparison within program                         |
| Deviation baseline | Chef's event average     | This program's rolling average                                   |
| Predictions        | "This event will need X" | "Next week's delivery will need X based on this program's trend" |
| Client Relations   | Per-event preferences    | Program-level preferences that compound                          |

The causal DAG works because programs generate MORE data faster (weekly events instead of monthly). A meal-prep chef with 3 programs running simultaneously generates 12+ events/month; CIL calibrates faster, not slower.

`cil-bootstrap.json` includes a `meal-prep` section: `ingredient_usage_stable_3_weeks -> auto_order_candidate`, `client_portion_increase_trend -> scale_recipe`, `delivery_day_change -> prep_schedule_conflict`.

**PASS**

---

**Q46. The staff portal (`app/(staff)/`) shows zero intelligence today. A sous chef logs into their portal. Can CIL surface "This recipe typically takes you 45 minutes" to the staff member? Or is CIL strictly chef-facing? If staff benefit, whose CIL instance serves them (the hiring chef's)?**

Staff benefit from the hiring chef's CIL instance. Read-only.

The staff portal queries CIL via the same `getCILInsights()` API, but scoped:

1. Staff member authenticated via token -> resolves to `chef_id` (hiring chef) + `staff_member_id`
2. CIL returns insights relevant to this staff member's tasks: recipe time estimates, station-specific patterns, today's event predictions
3. Staff CANNOT see: financial predictions, client relationship data, business health scores, pricing intelligence

What staff see (via their hiring chef's CIL):

- "This recipe typically takes 45 minutes based on 12 past preparations" (from completion_trajectory + prep timeline data)
- "Chef usually starts plating 15 minutes before service for this guest count" (from event pattern data)
- Task time estimates on their task list

What staff don't see: anything about other staff members' performance, financial data, client personal information.

CIL signals FROM staff activity (task completions, time tracking entries) flow INTO the chef's CIL. Staff are Signal sources and insight consumers, but the intelligence lives in the chef's per-tenant `.db` file.

**PASS**

---

**Q47. A client visits their portal (`app/(client)/`). They see their upcoming events, booking history, and Remy chat. CIL knows "this client usually changes guest count 3 days before." Can the client portal proactively ask "Have you finalized your guest count?" at the right moment? Or is CIL invisible to clients?**

CIL is visible to clients INDIRECTLY. The chef's CIL drives timed prompts on the client portal.

Mechanism:

1. CIL's Decision Timer identifies: "Client M's event is 3 days out. Historical pattern: guest count changes 3 days before (4/5 past events)."
2. CIL creates an Intervention with `channel: 'contextual'`, `urgency: 'next_idle'`, `target: 'client_portal'`
3. When Client M visits their portal, the event page shows: "Have you finalized your guest count? Update here." (contextual insert, but on the client portal)

The client sees a helpful prompt. They don't see "CIL predicted this." The intelligence is invisible; the benefit is visible.

What clients DON'T see: predictions about their own behavior, confidence scores, CIL's assessment of their relationship with the chef, or any data the chef hasn't explicitly shared.

Client-portal CIL inserts are limited to:

- Guest count confirmation prompts
- Dietary worksheet completion prompts (if incomplete)
- Menu approval nudges (if pending)
- Review/feedback timing (after event completion)

All of these are actions the client would eventually need to take anyway. CIL just times them optimally.

**PASS**

---

### Domain 10: Surface Coverage (Q48-Q55)

22 of 25 universal surfaces have zero AI today. These questions ensure CIL reaches them.

**Q48. The dashboard has 24 section components. CIL's ambient state line is one sentence in the subtitle. But the dashboard already has: SmartSuggestions, RemyAlertsWidget, BusinessHealthScore, PriorityQueue, IntelligenceCards. How does CIL's ambient state coexist with these existing intelligence surfaces? Does it replace any of them? Supplement? Where exactly does the ambient line render?**

CIL supplements; replaces nothing.

Render location: the ambient line goes INSIDE the existing greeting subtitle area (below "Good morning, David" and above the hero metrics). One sentence, updated via SSE. It coexists with the greeting, doesn't replace it.

Coexistence with existing widgets:

| Widget              | CIL Relationship                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| SmartSuggestions    | CIL re-ranks suggestions by accumulated pattern confidence. Same component, better ordering       |
| RemyAlertsWidget    | CIL Interventions feed INTO this widget as a new alert source alongside deterministic rules       |
| BusinessHealthScore | CIL enriches sub-scores with trend data. Score component unchanged; data provider gains CIL input |
| PriorityQueue       | CIL's Decision Timer contributes items to the queue alongside existing sources                    |
| IntelligenceCards   | CIL predictions appear as new card types within the existing card system                          |

No new dashboard sections. CIL feeds data into existing components. The only new UI element is the one-line ambient state in the greeting area.

**PASS**

---

**Q49. The morning briefing (`app/(chef)/briefing/page.tsx`) shows today's events with prep tasks, dietary complexity, staff, alerts. This is the chef's "what do I need to know right now" page. CIL has predictions about today's events. Does the briefing page get Contextual Inserts? Or does CIL feed data into the existing briefing components? Define the integration point.**

CIL feeds INTO existing briefing components. No separate Contextual Inserts on the briefing page.

The briefing is already structured as discrete sections per event. CIL enriches each section:

- **Prep tasks section:** estimated durations annotated with CIL's learned actual times. "Prep: Risotto (est. 45min, typically takes you 55min)"
- **Staff section:** if staff member has worked this recipe before, show their historical performance
- **Alerts section:** CIL predictions about today's events appear as additional alert items. "Client M has changed guest count on 4/5 past events within 24h of service. Current count: 8."

Integration point: `getBriefingData()` server action (wherever it's defined) calls `getCILInsights(tenantId, { filter: 'today' })` and merges CIL predictions into the existing briefing data structure. The briefing components render them as native elements, not foreign inserts.

**PASS**

---

**Q50. The calendar page (`app/(chef)/calendar/page.tsx`) uses FullCalendar with deterministic intelligence bars (SchedulingInsightsBar, CapacitySeasonalBar). CIL can predict workload and capacity. Does CIL render predictions ON the calendar (e.g., color-coding days by predicted stress level)? Or alongside it (intelligence bars enriched with CIL data)?**

Alongside it. CIL enriches the existing intelligence bars. Nothing renders ON the calendar surface itself.

FullCalendar is a third-party component with constrained rendering. Injecting CIL data into calendar cells adds visual noise to an already dense view. The intelligence bars are the designed surface for analytical overlays.

What changes:

- `SchedulingInsightsBar` gains CIL-powered predictions: "Next week looks heavy based on your historical pattern; consider blocking Wednesday for prep"
- `CapacitySeasonalBar` gains CIL-calibrated seasonal forecasts using periodic edges instead of raw historical averages

One addition: a small "predicted workload" indicator on the calendar's week header (not per-cell). Three levels: light / moderate / heavy. Derived from CIL's accumulated prep-time-per-event-complexity model. Non-interactive.

**PASS**

---

**Q51. Quote acceptance prediction: CIL observes `event_state_transitions` and can learn which quotes convert to accepted events. The quotes page (`app/(chef)/quotes/page.tsx`) has a `QuoteAcceptanceInsightsPanel` (deterministic). Does CIL feed into this existing panel, or create a separate Contextual Insert? What's the data flow: CIL -> existing panel vs. CIL -> new component?**

CIL feeds into the existing `QuoteAcceptanceInsightsPanel`. No new component.

Data flow:

1. Panel component calls `getQuoteInsights(tenantId)` (existing)
2. That function adds a CIL query: `getCILPrediction(tenantId, 'quote', quoteId, 'acceptance_likelihood')`
3. If CIL has a prediction (confidence > 0.6), it's included in the panel data: "Predicted acceptance: 78% (based on 12 similar quotes)"
4. If CIL has no prediction (insufficient data), the panel shows only deterministic insights (unchanged behavior)

Per-quote, CIL's prediction draws from: client's historical acceptance rate, quote amount vs. client's average spend, occasion type vs. historical conversion by occasion, response delay patterns. All from the causal DAG, not a separate model.

**PASS**

---

**Q52. Email notifications: 60+ email templates are dispatched without intelligence about recipient behavior. CIL knows client email interaction patterns (from activity_log: `email_sent`, `email_opened` if tracked, `client_responded`). Does CIL optimize email send times? How? Does the email dispatch system query CIL before sending, or is this a separate scheduled pass?**

CIL provides optimal send time; the email system queries it.

Implementation:

1. Email dispatch function (`lib/email/notifications.ts`) gains a `getOptimalSendTime(tenantId, clientId)` call
2. CIL checks the client entity for `preferred_contact_hour` (learned from historical response patterns: when does this client typically respond fastest after receiving an email?)
3. If CIL has data: returns a time window (e.g., "9am-11am local"). Email is queued via the existing scheduled messages system (`lib/communication/scheduled-message-actions.ts`) for that window
4. If CIL has no data: returns null. Email sends immediately (current behavior)

NOT all emails get timing optimization. Only non-urgent client-facing emails: quote sent, follow-up reminders, review requests, re-engagement campaigns. Time-sensitive emails (payment confirmation, event reminders, safety alerts) always send immediately regardless of CIL.

**PASS**

---

**Q53. The embeddable widget (`app/embed/inquiry/[chefId]/page.tsx`) runs on external websites with no auth context. CIL data is per-tenant and requires auth. Can the widget benefit from CIL at all? If yes, how does it access CIL data without auth? If no, is this an acceptable gap?**

Limited benefit via server-side bake-in. No runtime CIL queries from the widget.

The widget's page component runs server-side before sending HTML to the client. On the server:

1. `chefId` is in the URL params
2. Server calls `getCILWidgetHints(chefId)` which returns non-sensitive, aggregated hints:
   - Most popular event types for this chef (for pre-selecting dropdowns)
   - Typical lead time (for date picker min range)
   - Common guest count range (for suggesting defaults)
3. These hints are baked into the widget HTML as data attributes. No CIL runtime queries from the client.

No client data is exposed. Widget hints are derived from the chef's aggregate patterns, not any individual client's data. The hints are equivalent to what a visitor could infer from the chef's public profile.

Acceptable gap: the widget doesn't get personalized CIL intelligence for unknown visitors. This is correct; CIL has nothing to say about someone it's never seen.

**PASS**

---

**Q54. Public token pages (RSVP, review, tip, worksheet, guest-feedback) are unauthenticated. CIL could pre-populate worksheet fields if the guest has prior history. But these pages use one-time tokens, not authenticated sessions. Can CIL contribute to these pages? Through what mechanism (token -> client_id -> CIL lookup)?**

Yes. Server-side lookup via the token chain.

Mechanism:

1. Token resolves to `event_id` (existing; all token pages already do this)
2. `event_id` resolves to `client_id` (from event record)
3. `client_id` resolves to CIL Entity (from chef's CIL instance via `event.tenant_id`)
4. CIL returns relevant client data for the page type

Per page type:

| Page           | CIL Contribution                                                                  |
| -------------- | --------------------------------------------------------------------------------- |
| Worksheet      | Pre-fill dietary preferences from prior events (if client has been served before) |
| RSVP           | Show personalized greeting if returning guest                                     |
| Review         | No CIL needed (review form is generic)                                            |
| Tip            | Suggested amounts calibrated to event price tier (from CIL event entity)          |
| Guest Feedback | No CIL needed (feedback form is generic)                                          |

All lookups happen server-side during page render. No CIL data exposed to the client beyond what's rendered in the pre-populated form fields. The client doesn't know CIL exists; they just see a conveniently pre-filled form.

Security: the token already grants access to event and client data for that page. CIL lookup doesn't expand the access scope; it just adds intelligence to what's already authorized.

**PASS**

---

**Q55. The command palette (Cmd+K) searches across all entities. CIL understands which entities the chef interacts with most. Does CIL re-rank search results by predicted relevance? How? Does the command palette call CIL's API, or does CIL inject ranking data into the search index?**

CIL provides a boost signal; the command palette incorporates it into ranking.

Implementation:

1. Command palette calls `universalSearch(query, tenantId)` (existing)
2. After results return, a lightweight CIL call: `getCILEntityBoosts(tenantId)` returns a map of `{ entityId: boostScore }` for entities the chef interacts with frequently
3. Search results are re-sorted: `finalScore = searchRelevance + (cilBoost * 0.3)`. CIL contributes 30% weight to ranking; text relevance still dominates at 70%
4. `getCILEntityBoosts()` is cached per session (5-minute TTL). One CIL read per session, not per keystroke

Boost signal comes from CIL's Entity `velocity` field (rate of interaction). High-velocity entities (clients being actively served, events in progress, recipes recently edited) get higher boost scores.

Time-of-day factor: during morning hours, boost today's events. During evening, boost recipes and menus (prep planning). Derived from the chef's navigation patterns in CIL.

**PASS**

---

### Domain 11: Cross-Module Coherence (Q56-Q62)

ChefFlow has distinct modules (cannabis, meal-prep, farm dinner, kiosk). CIL must handle all of them coherently.

**Q56. The cannabis module has its own ledger, compliance packets, and RSVP manifests. When CIL observes a cannabis event's ledger entries, does it create separate causal edges for cannabis-specific patterns? Or do cannabis and standard event financial patterns merge into the same edges? What happens if cannabis compliance patterns pollute standard event predictions?**

Separate edge namespaces. Cannabis-specific edges carry a `module: 'cannabis'` tag. Standard edges carry no module tag (default).

When CIL's Pattern Recognizer processes signals:

1. Check signal payload for `module` field
2. If `module: 'cannabis'`: route to cannabis-specific edges only. Do NOT update standard event edges
3. If no module tag: route to standard edges only

Cannabis financial patterns (regulatory compliance costs, specialized ingredient pricing, RSVP manifest completion rates) live in their own edge set. A cannabis chef's CIL has two edge populations: standard (for all events) and cannabis (for cannabis events). They don't cross-pollinate.

Exception: shared attributes that are module-agnostic (client response time, guest count accuracy, prep time per recipe) feed standard edges regardless of module. The module tag only isolates module-SPECIFIC patterns.

**PASS**

---

**Q57. Farm dinner co-hosting creates events with two parties. CIL handles this (Q12). But the Dinner Circle (`hub/`) is a social feature where multiple chefs and clients interact. CIL is per-tenant. Who "owns" intelligence about a Dinner Circle conversation? The chef who created it? All members? Nobody?**

The chef who created the circle owns the intelligence. Circle conversations generate signals in the creator's CIL only.

Reasoning: Dinner Circles are social features, not business operations. CIL is business intelligence. A circle conversation about "favorite fall ingredients" doesn't generate business-actionable predictions. If a booking emerges FROM a circle conversation, that booking creates its own signals in the relevant chef's CIL via the normal inquiry/event pipeline.

What CIL does observe:

- Circle member count and activity level (as a Relation: `chef -> manages -> circle` with strength based on engagement)
- If a client who's a circle member books with the chef, CIL notes the relationship path: `client -> member_of -> circle -> created_by -> chef`

What CIL does NOT observe:

- Content of circle conversations (privacy; circle members haven't consented to business intelligence extraction)
- Other chefs' activity within the circle

This keeps CIL's scope clean. Circles are community. CIL is business.

**PASS**

---

**Q58. The kiosk module (`app/api/kiosk/`) processes real-time orders at events. A kiosk event generates dozens of signals per hour (each order). This is 10-100x the signal volume of a normal event. Does CIL's 5-second debounce handle kiosk signal bursts? Does the Pattern Recognizer treat kiosk signals differently from planning signals?**

Kiosk signals are aggregated, not individual.

CIL does NOT receive one signal per kiosk order. Instead, `notifyCIL()` is called with aggregated kiosk data at the END of the event (or at periodic intervals during long events):

```typescript
// In kiosk checkout handler, NOT per-order:
// Aggregated signal sent every 30 minutes during event + once at close
notifyCIL({
  source: 'db_mutation',
  payload: {
    module: 'kiosk',
    event_id: eventId,
    aggregate: true,
    orders_count: 47,
    total_revenue_cents: 235000,
    popular_items: ['risotto', 'bruschetta'],
    avg_order_cents: 5000,
    peak_hour: '7pm-8pm',
  },
})
```

Per-order signals would waste CIL's budget. CIL doesn't need to know "order #23 was a risotto." CIL needs to know "kiosk events average 47 orders/event and risotto is the top seller."

The 5-second debounce handles this fine because it receives 2-3 aggregate signals per event, not 50 individual ones.

Pattern Recognizer treats kiosk aggregates as a distinct signal type. Kiosk edges: `kiosk_event.guest_count > 30 -> popular_item_sellout_risk`, `kiosk_event.peak_hour -> staffing_need`.

**PASS**

---

**Q59. Recipe sharing via the chef network (`hub/`) means one chef's recipe appears in another chef's book (with provenance). If Chef A's CIL learns "this recipe takes 45 minutes" and Chef B uses the same shared recipe, does Chef B's CIL inherit that insight? Or does each CIL learn independently? What about the bootstrap.json default for shared recipes?**

Each CIL learns independently. No cross-tenant insight transfer.

Chef A's "45 minutes" is calibrated to Chef A's kitchen, equipment, skill level, and prep workflow. Chef B might do it in 30 minutes or 60. Transferring Chef A's timing data would produce wrong predictions for Chef B.

When Chef B adds a shared recipe to their book:

1. Chef B's CIL creates a new Entity for the recipe with `provenance: chefA.recipeId` in the state
2. The Entity starts with zero timing data
3. As Chef B cooks the recipe, their CIL learns their own timing independently

No bootstrap.json defaults for shared recipes. Shared recipes are treated as new entities with no prior assumptions. The chef's overall prep time patterns (from their other recipes) provide indirect calibration through existing edges like `recipe.complexity:high -> prep_time.+20pct`.

**PASS**

---

**Q60. The equipment inventory module tracks depreciation and maintenance. CIL can observe equipment usage patterns from `chef_activity_log`. Does CIL predict equipment failure or maintenance needs? "Your immersion circulator has been used in 40 events; typical maintenance interval is 50 events." Is this within scope or scope creep?**

Within scope. Equipment is an Entity type. Usage tracking is a natural Signal. Maintenance prediction is a valid Prediction.

But scoped narrowly:

- CIL tracks `equipment.usage_count` (incremented by events that use the equipment)
- Default edge from bootstrap: `equipment.usage_count > manufacturer_interval -> maintenance_due`
- This is a counter with a threshold, not a complex prediction. Math, not AI.

What CIL does:

- "Your sous vide has been used in 45 events. You typically service it every 50." (factual observation + simple edge)
- "You have 3 events next week using this equipment. Service before or after?" (Decision Timer)

What CIL does NOT do:

- Predict failure modes from vibration patterns or temperature drift (not in scope, no sensor data)
- Recommend replacement brands or models (not business intelligence)

Equipment predictions are low-frequency (monthly at most), low-Gemma-cost (math only), and universally useful. Not scope creep.

**PASS**

---

**Q61. The partner/referral system tracks which partners drive bookings. CIL's Relation type includes `'supplies'`. Does CIL create Relations between partners and conversion rates? Can CIL predict "Partner X sends you 2 referrals per quarter; it's been 4 months since the last one" and suggest outreach?**

Yes. Partners are Entities. Referral patterns are Relations.

CIL creates:

- Entity: `{ type: 'vendor', id: partnerId }` (vendor type encompasses partners/referrers)
- Relation: `partner -> refers -> chef` with strength calibrated by referral frequency and conversion rate
- Periodicity detection: if Partner X sends referrals on a quarterly cycle, the edge gets `periodicity: 90`

Predictions:

- "Partner X typically refers 2 clients per quarter. Last referral: 4 months ago. Consider outreach." (periodic edge + Decision Timer)
- "Referrals from Partner X convert at 80%, vs. 45% from Partner Y. Partner X is your highest-value referral source." (factual observation from accumulated data)

Intervention type: `next_idle` Contextual Insert on the partners page. Not an Interrupt (not time-critical).

This is valuable for ALL chefs who use the partner system. Referral relationship maintenance is a universal business need.

**PASS**

---

**Q62. Google Calendar sync exists. Calendar events from external sources (personal appointments, non-ChefFlow bookings) appear on the calendar. Does CIL observe external calendar entries? If yes, it could predict scheduling conflicts with non-ChefFlow commitments. If no, CIL's workload predictions are incomplete because they miss external time commitments.**

Yes. CIL observes synced external calendar entries as signals with `source: 'calendar'`.

What CIL sees:

- External event time blocks (start/end times)
- External event titles (if synced; some chefs share full details, some share only free/busy)

What CIL does:

- Includes external time blocks in workload calculations. "You have a dentist appointment Wednesday 2-3pm; prep window for Thursday's event is shorter than usual."
- Detects scheduling pattern conflicts: "You consistently have personal commitments on Tuesday afternoons. Avoid confirming events that need Tuesday prep."

What CIL does NOT do:

- Analyze or learn from the CONTENT of external calendar entries (privacy; these might be medical appointments, family events, etc.)
- Create causal edges based on external events (not enough structure)

External entries are time-blocking signals only. They reduce available time in CIL's workload model. This makes prep timeline predictions significantly more accurate for chefs who sync their personal calendar.

**PASS**

---

### Domain 12: Remy Subsumption (Q63-Q67)

Remy has its own memory system (`remy_memories`, 8 categories). CIL is designed to subsume this. These questions force the exact integration.

**Q63. `remy_memories` stores 8 categories: chef_preference, client_insight, business_rule, communication_style, culinary_note, scheduling_pattern, pricing_pattern, workflow_preference. Each maps to CIL Relation types. Define the exact mapping: which Remy memory category becomes which CIL Relation type? Is the mapping 1:1 or many:1?**

Many-to-many. Remy memory categories are conversational labels; CIL Relations are structural. The mapping:

| Remy Category       | CIL Entity From | CIL Entity To | CIL Relation Type  | Example                           |
| ------------------- | --------------- | ------------- | ------------------ | --------------------------------- |
| chef_preference     | chef            | attribute     | `prefers`          | "Chef prefers gas over induction" |
| client_insight      | client          | attribute     | `prefers`          | "Client M prefers seafood"        |
| business_rule       | chef            | constraint    | `enforces`         | "Never books Sundays"             |
| communication_style | chef            | style         | `communicates_via` | "Prefers text over email"         |
| culinary_note       | chef            | technique     | `specializes_in`   | "Makes own pasta"                 |
| scheduling_pattern  | chef            | time_block    | `available_during` | "Preps on Tuesdays"               |
| pricing_pattern     | chef            | price_point   | `prices_at`        | "Charges $150/head for Italian"   |
| workflow_preference | chef            | process       | `follows`          | "Grocery shops day before"        |

Some Remy memories create multiple Relations. "Client M prefers seafood and always brings wine" = two Relations: `M -> prefers -> seafood` AND `M -> brings -> wine`.

CIL doesn't replicate Remy's category system. It decomposes memories into typed Entities and Relations. The Remy category is metadata on the ingested Signal, not a structural element in CIL.

**PASS**

---

**Q64. Remy extracts memories from conversations using Ollama (`lib/ai/remy-memory-actions.ts`). After CIL launches, does Remy continue extracting memories to its own table? Or does the extraction pipeline write directly to CIL's Signal table? If both tables exist, which is the source of truth for "what has the AI learned about this chef?"**

Both tables exist. Remy continues extracting to `remy_memories`. CIL observes those inserts as Signals.

Data flow:

```
Remy conversation -> remy-memory-actions.ts extracts memory -> INSERT remy_memories
                                                            -> notifyCIL() with memory as Signal
```

Source of truth split:

- `remy_memories` is truth for "what did the AI extract from conversations" (raw extraction, conversation-specific)
- CIL is truth for "what does the system understand about this chef's business" (accumulated, multi-source, calibrated)

Remy memories are ONE input to CIL alongside 11 other observation sources. CIL's understanding may diverge from a single Remy memory because it's calibrated against actual behavior (Q4 already covers this conflict resolution).

Why keep both: Remy memories have UX in the existing app (chefs can view and delete individual memories). CIL's graph is not directly editable at the individual-memory level. Different interfaces for different needs.

**PASS**

---

**Q65. Remy's runtime memory (`lib/ai/remy-runtime-memory.ts`) reads from `memory/runtime/remy.json` (file-based). This is developer-curated context, not learned. Does CIL replace this? Or does this file remain as a separate "system instructions" layer that's distinct from accumulated intelligence?**

`remy.json` stays. CIL does not replace it.

`remy.json` is system configuration: "Remy should never generate recipes," "Remy should use the chef's preferred name," "Remy should reference the service lifecycle." These are developer-curated rules, not learned patterns. They don't change based on observation.

CIL is accumulated intelligence. `remy.json` is system instructions. Different layers:

```
Remy prompt = remy.json (rules, static)
            + loadRemyContext() Tier 1-3 (current state, cached)
            + cilInsights (accumulated intelligence, from CIL)
```

If a `remy.json` rule contradicts CIL's accumulated intelligence (unlikely but possible), the rule wins. System instructions override learned patterns because they encode developer/policy decisions.

**PASS**

---

**Q66. `loadRemyContext()` already loads 31+ queries in Tier 2 (5-min cache per tenant). Adding `cilInsights` as another Tier 2 section means CIL reads happen on every Remy context load. What's the latency cost? CIL reads from per-tenant SQLite; is the file I/O acceptable at the frequency Remy loads context?**

Negligible. SQLite read from a <10MB file with proper indexes is <1ms.

Benchmarks:

- SQLite `SELECT` on indexed table with <50K rows: 0.1-0.5ms
- `getCILInsights()` runs 2-3 queries (top predictions, ambient state, active interventions): ~1-2ms total
- Compare to Remy's existing 31 PostgreSQL queries: each is 5-50ms. CIL adds <2ms to a context load that already takes 100-500ms

The 5-minute cache on Tier 2 means CIL is queried at most once per 5 minutes per tenant. Not per Remy message. This is completely fine.

Additional optimization: `getCILInsights()` caches its own result in memory (1-minute TTL, shorter than Remy's 5-minute cache). Multiple Remy calls within a minute hit the memory cache, never touch SQLite.

**PASS**

---

**Q67. Remy has reactive hooks (`lib/ai/reactive/hooks.ts`) that fire non-blocking AI tasks on state transitions (staff briefing on confirmed, thank-you on completed, etc.). CIL also observes state transitions. Does CIL coordinate with Remy's reactive hooks? Could CIL suppress a Remy hook if it predicts the action is unnecessary? (e.g., "Don't generate AAR prompt; chef never completes AARs for events under 6 guests.")**

CIL does NOT suppress Remy hooks. Hooks always fire. CIL informs hook OUTPUT, not hook execution.

Reasoning: suppressing hooks is dangerous. A hook that doesn't fire means a staff briefing that doesn't generate, a thank-you that doesn't send. If CIL's prediction is wrong ("chef never completes AARs" but this time they want to), the missing output is irrecoverable. The cost of a hook firing unnecessarily (chef ignores the AAR prompt) is far lower than the cost of a hook not firing when needed (chef wanted an AAR and it wasn't generated).

What CIL CAN do: inform the hook's behavior without suppressing it.

Example: `event_completed` hook generates an AAR prompt. CIL tells the hook: "This chef completes AARs for 20% of events, but 80% for events with 10+ guests. This event had 4 guests." The hook still fires, but it can adjust: generate a shorter AAR prompt, or add a note "Quick AAR? This was a smaller event." The hook's intelligence improves; its execution is never blocked.

CIL feeds Remy hooks context; it never gates them.

**PASS**

---

### Domain 13: Intelligence Layer Migration (Q68-Q73)

33 files in `lib/intelligence/` already compute business health. CIL must integrate, not duplicate.

**Q68. `getBusinessHealthSummary()` aggregates 13 sub-engines in parallel. CIL spec says it "adds cilPredictions section" in Phase 2. Define exactly which of the 13 sub-engines CIL enriches first. Ranked by CIL's value-add over the deterministic version.**

Ranked by CIL's delta over deterministic baseline:

| Rank | Sub-engine                    | CIL Value-Add | Why                                                                                                                                                                     |
| ---- | ----------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Rebooking prediction**      | HIGH          | Deterministic uses recency/frequency heuristics. CIL uses accumulated client behavior patterns across 10+ dimensions. Much higher accuracy                              |
| 2    | **Cashflow projection**       | HIGH          | Deterministic uses scheduled payments only. CIL predicts payment TIMING based on client historical payment behavior (early/late patterns)                               |
| 3    | **Churn prevention**          | HIGH          | Deterministic uses "days since last contact" threshold. CIL uses multi-signal engagement patterns (visit frequency decay, communication tone, booking interval changes) |
| 4    | **Seasonal demand**           | MEDIUM        | Deterministic uses calendar math. CIL uses calibrated periodic edges with per-chef seasonal adjustments                                                                 |
| 5    | **Scheduling intelligence**   | MEDIUM        | Deterministic uses time-block math. CIL adds historical prep-time accuracy and external calendar awareness                                                              |
| 6    | **Price anomaly detection**   | MEDIUM        | Deterministic uses static thresholds. CIL uses per-ingredient historical variance to set dynamic thresholds                                                             |
| 7    | **Inquiry triage**            | MEDIUM        | Deterministic uses booking score formula. CIL adds conversion-pattern matching from historical inquiry outcomes                                                         |
| 8    | **Capacity ceiling**          | LOW           | Deterministic is already good (math-based). CIL adds minor refinement with workload-per-event-complexity patterns                                                       |
| 9    | **Client LTV journeys**       | LOW           | Deterministic uses financial totals. CIL adds trajectory prediction but LTV calculation is fundamentally arithmetic                                                     |
| 10   | **Event profitability**       | LOW           | Deterministic uses ledger math. CIL can predict profitability before the event, but post-event it's just math                                                           |
| 11   | **Price elasticity**          | LOW           | Requires large sample sizes CIL may not have                                                                                                                            |
| 12   | **Vendor price intelligence** | LOW           | OpenClaw handles this better than per-chef CIL                                                                                                                          |
| 13   | **Communication cadence**     | LOW           | Deterministic already handles well with simple interval math                                                                                                            |

Phase 2 enrichment order: engines 1-3 first (highest delta), then 4-7.

**PASS**

---

**Q69. `lib/intelligence/business-health-summary.ts` produces a `remyContext` paragraph that feeds Remy. When CIL launches, this paragraph should include CIL predictions. But the paragraph is generated by the intelligence layer, not by CIL. Who writes the unified paragraph? Does the intelligence layer query CIL and compose it? Or does CIL provide its own paragraph that gets appended?**

Intelligence layer queries CIL and composes one unified paragraph. CIL does not generate its own prose.

Flow:

1. `getBusinessHealthSummary()` runs its 13 sub-engines (existing)
2. Additionally calls `getCILSummaryContext(tenantId)` which returns structured data: `{ topPredictions: [...], activeRisks: [...], recentPatterns: [...] }`
3. The existing `buildRemyContextParagraph()` function incorporates CIL data into its output. Example: current paragraph says "Revenue is strong this month." With CIL: "Revenue is strong this month. Two clients are predicted to rebook within 2 weeks based on their historical patterns."

CIL provides structured data. The intelligence layer composes prose. One voice, one paragraph, no seams.

Why not let CIL write its own paragraph: two paragraphs from different sources would have inconsistent tone and potentially contradictory information. Single composition point prevents that.

**PASS**

---

**Q70. The 23 deterministic intelligence components (`components/intelligence/`) render bars and panels across 10+ surfaces. Each queries its own data source. After CIL, some of these components should show CIL-enriched data. Does each component query CIL independently? Or is there a shared CIL context provider at the layout level that all intelligence components read from?**

Shared CIL context provider at the layout level.

```typescript
// In app/(chef)/layout.tsx (or a sub-layout for intelligence-aware pages)
<CILProvider tenantId={chef.id}>
  {children}
</CILProvider>

// CILProvider loads once per page render:
// - Top 10 active predictions
// - Ambient state line
// - Entity boosts (for search ranking)
// - Active interventions
// Cached for 60 seconds. Single SQLite read.

// In any intelligence component:
const { predictions, ambient } = useCIL()
// Filter predictions relevant to this component's domain
const myPredictions = predictions.filter(p => p.attribute.startsWith('rebooking'))
```

Why shared provider, not per-component queries:

- 23 components x independent SQLite reads = 23 file I/O operations per page. Wasteful
- Provider loads ONCE, components filter. 1 read instead of 23
- Consistent data snapshot across all components on the same page (no stale reads)
- Cache invalidation happens in one place

Components that DON'T need CIL data (pure historical summaries, raw stats) simply don't call `useCIL()`. No overhead for non-enriched components.

**PASS**

---

**Q71. `lib/intelligence/rebooking-prediction.ts` predicts which clients will rebook. CIL's causal DAG can also predict rebooking. When both exist, which prediction does the UI show? The deterministic one, the CIL one, or a blended score? Define the blending rule.**

Show CIL when confident; fall back to deterministic.

Rule:

```
if (cilPrediction.confidence > 0.65) {
  show cilPrediction  // CIL has enough data
} else {
  show deterministicPrediction  // CIL still calibrating, use baseline
}
```

No blending. One or the other. Blended scores are harder to explain ("why does the system think this?") and harder to debug. A clean handoff is more honest.

When CIL is shown, the UI includes a confidence indicator: "78% likely to rebook (based on 8 past interactions)." When deterministic is shown, no confidence indicator (it's a heuristic, not a prediction).

The transition happens per-client, not globally. Client M might have CIL predictions (8 events of history) while Client N uses deterministic (1 event of history). This is correct; CIL earns authority per entity, not per system.

Over time, as CIL accumulates data for all clients, the deterministic path fires less and less. It's a graceful migration, not a flag day.

**PASS**

---

**Q72. `lib/intelligence/seasonal-demand.ts` computes seasonal patterns from historical data. CIL's periodic edge detection (Q18) also handles seasonality. The seasonal demand function is stateless and recomputes each call. CIL's seasonal edges persist and calibrate. When both exist, does the seasonal demand function delegate to CIL's edges? Or do they remain independent?**

They remain independent until Phase 3. Then seasonal demand delegates to CIL.

Phase timeline:

| Phase                                   | Behavior                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 1-2 (CIL launch)                  | Both run independently. CIL is accumulating seasonal data but hasn't been validated                                                                          |
| Phase 3 (after 1 full year of CIL data) | Seasonal demand function checks CIL first. If CIL has periodic edges for the queried month with >0.6 strength, use CIL. Otherwise fall back to deterministic |
| Long-term                               | CIL's seasonal edges ARE the seasonal demand system. The deterministic function exists only as fallback for data gaps                                        |

Why wait for Phase 3: seasonal patterns require a full annual cycle to validate. CIL can't have calibrated yearly edges until it's observed a full year. Delegating too early produces less-accurate results than the deterministic version.

The deterministic function is never deleted. It serves as the fallback for: new chefs (no CIL history), corrupt CIL recovery (Q8), and months with sparse data.

**PASS**

---

**Q73. The proactive alerts system (`lib/ai/remy-proactive-alerts.ts`) runs hourly via cron. It has deterministic rules (missing prep list, missing grocery list, overdue installments). CIL also generates Interventions. Does CIL replace the cron-based alert system? Run alongside it? What prevents duplicate alerts (one from rules, one from CIL prediction)?**

Run alongside. CIL does NOT replace the deterministic alert system.

Deterministic alerts are safety nets: "prep list missing 48h before event" is a rule that must fire regardless of CIL's opinion. These are checklist items, not predictions. They catch things CIL might miss (CIL is probabilistic; rules are absolute).

Deduplication mechanism:

1. When `runAlertRulesAdmin()` inserts a `remy_alerts` row, it includes `alert_type` and `entity_id`
2. Before CIL creates an Intervention for the same entity and domain, it checks `remy_alerts` for an existing alert with matching `entity_id` and matching domain within the last 24 hours
3. If a deterministic alert already exists: CIL skips the Intervention (the chef is already alerted)
4. If no deterministic alert exists: CIL creates its Intervention normally

CIL adds VALUE beyond the rules by alerting on things rules can't catch:

- "This client's prep list was ready 5 days early for the last 3 events but hasn't been created yet for this one. That's unusual." (pattern deviation, not a time threshold)
- "This event has the same menu as the cancelled event from 2 months ago. The cancellation was guest-count related." (pattern matching)

Rules catch the obvious. CIL catches the subtle. No overlap because they operate at different abstraction levels.

**PASS**

---

### Domain 14: Safety & Compliance (Q74-Q77)

CIL must enhance, not compromise, food safety and regulatory compliance.

**Q74. Gap analysis found: "Menu assignment does NOT trigger allergen check." A menu with shellfish can be assigned to a guest with shellfish allergy with zero warning. CIL observes menu assignments. Should CIL catch this as a safety alert? If yes, this is an Interrupt that bypasses the weekly budget (like temperature alerts). Define: does CIL's allergen safety detection replace or supplement the deterministic allergen check?**

**Q75. Instant-book silently drops dietary records (gap analysis finding). CIL observes booking signals. If CIL detects "dietary records were submitted but not persisted" (signal from activity_log shows booking without corresponding dietary_records insert), does CIL fire a safety alert? This is a data integrity failure, not a prediction.**

**Q76. Cannabis compliance requires precise ingredient tracking (regulated inputs). CIL's ingredient lifecycle observation tracks purchase/use/waste. Does CIL apply stricter variance thresholds for cannabis ingredients? A 5% variance in regular oregano is fine; a 5% variance in a regulated ingredient is a compliance violation.**

**Q77. Temperature logging (`TempSafetyPanel`) tracks HACCP compliance. CIL observes temperature signals. Can CIL predict "based on this venue's history, temperature will drift out of range after 3 hours"? Is predictive food safety within CIL's scope, or is food safety always deterministic-only?**

---

### Domain 15: Developer Experience & Observability (Q78-Q80)

CIL must be debuggable, observable, and maintainable.

**Q78. A chef reports "CIL told me Client M would cancel, but that's wrong." The developer needs to understand WHY CIL made that prediction. What's the debugging workflow? Can the developer inspect the causal DAG, see which edges contributed, trace back to source signals? Define the developer observability tooling.**

**Q79. CIL's weekly self-report is generated by Gemma. The developer reads it. But the developer also has Gustav (dev ops AI), OpenClaw Operator, and Claude Code. Should the weekly self-report be available via an API endpoint so other tools can consume it? Or is it a human-readable artifact only?**

**Q80. CIL uses per-tenant SQLite files. In production, there could be 100+ tenants. Each with a `.db` file. Backup runs daily. That's 100+ file backups. At what tenant count does this architecture become unwieldy? Define the scaling ceiling and the migration path if it's exceeded (e.g., switch to single PostgreSQL schema with row-level isolation).**
