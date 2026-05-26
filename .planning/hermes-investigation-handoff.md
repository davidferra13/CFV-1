# Hermes Investigation Report

**Date:** 2026-05-25
**Status:** COMPLETE

## KEY FINDING: lib/hermes/ DOES NOT EXIST

Handoff references `lib/hermes/hermes-queue.ts`, `lib/hermes/hermes-heartbeat.ts`, `lib/hermes/hermes-actions.ts`. These files live at `lib/pricing/` instead. No `/hermes` app route exists either; dev dashboard is at `app/(dev)/hermes/`.

## Summary Table

| #   | Status   | Verdict                                           |
| --- | -------- | ------------------------------------------------- |
| Q1  | GAP      | Queue durable but no TTL/sweep/dead-letter        |
| Q2  | OK       | Shared DB, no HTTP surface, acceptable            |
| Q3  | OK       | Full audit in hermes_actions table                |
| Q4  | OK       | Intentionally divergent, correct design           |
| Q5  | GAP      | Tenant in payload, not enforced at schema         |
| Q6  | UNBUILT  | Priority levels exist, attention engine not built |
| Q7  | PARTIAL  | Source tagging yes, explicit undo no              |
| Q8  | GAP      | Heartbeat works, no alerting on death             |
| Q9  | GAP      | No idempotency guards                             |
| Q10 | OK       | Chef-wins by design                               |
| Q11 | EXTERNAL | Hermes responsibility, not ChefFlow               |
| Q12 | EXPECTED | Different scope (data vs intelligence)            |
| Q13 | EXTERNAL | ChefFlow flat, Hermes chains internally           |

## Top 3 Actionable Fixes

1. **Dead-man-switch alert** when Hermes offline > 1 hour
2. **Add `tenant_id` column** to hermes_queue table
3. **Queue sweep cron** (archive pending events > 7 days)

## CRITICAL (Q1-Q4)

### Q1: Queued events when Hermes offline?

**Verdict:** DB-backed, durable, no TTL, no retry logic.

`hermes-queue.ts:24-28` inserts to `hermes_queue` PostgreSQL table with `status = 'pending'`. Events persist indefinitely. No TTL, no expiry, no max-age sweep.

**Gap:** No consumer exists in ChefFlow. Hermes (external) polls table via MCP/SQL. No dequeue, no status transitions (pending->processing->done), no retry-on-failure, no dead-letter. Queue grows unbounded when Hermes offline.

**Recommendation:** Daily sweep cron archives events older than 7 days. Dashboard warning when queue depth > 50.

### Q2: Auth between ChefFlow and Hermes?

**Verdict:** NO AUTH. Shared database is the only communication channel.

Zero tokens, keys, or secrets found. Communication exclusively through shared PostgreSQL tables. Hermes reads/writes via MCP PostgreSQL connection.

**Risk:** LOW. No HTTP API surface. Attack requires PostgreSQL credentials. Database is security boundary.

**Recommendation:** Acceptable. Add a `hermes_agent` Postgres role with restricted permissions (SELECT/INSERT/UPDATE on hermes\_\* tables only).

### Q3: Audit trail for autonomous actions?

**Verdict:** YES, full audit logging to hermes_actions table.

`hermes-actions.ts:24-37` logs every action with: skill, source, action description, reason, items_affected, duration_ms, result.

**Gap:** No alerting on `result = 'failed'`. Dashboard is dev-only. No retention policy.

### Q4: Fallback cron vs Hermes: identical or divergent?

**Verdict:** INTENTIONALLY DIVERGENT. Fallback is deterministic subset.

`fallback-cron.ts` implements 5 tasks (freshness, alert, census, ratchet, measure). Simplified, deterministic versions. Hermes has 8 skills (adds pie-forecast, pie-fix, pie-acquire) with AI judgment.

Key safety: `if (await isHermesAlive()) return { skipped: true, reason: 'hermes_alive' }`. Fallback only runs when heartbeat stale (>5min).

**Verdict:** Correct design. Algorithm First principle.

## IMPORTANT (Q5-Q9)

### Q5: Multi-tenant safety?

**Verdict:** Tenant ID passed in event payload, NOT enforced.

Callers pass `tenantId` in payload but `hermes_queue` table has no `tenant_id` column. Embedded in JSONB `payload` field.

**Recommendation:** Add explicit `tenant_id TEXT NOT NULL` column.

### Q6: Attention engine?

**Verdict:** Two priority levels exist, no time-based routing. Unbuilt.

### Q7: Chef undo path?

**Verdict:** Source tagging EXISTS but NO rollback mechanism. Chef override IS the undo (chef-wins model).

### Q8: Who monitors Hermes?

**Verdict:** Heartbeat table + 5-minute timeout. No dead-man-switch alerting.

**Recommendation:** Wire heartbeat death to Discord alert. Add to developer-digest cron.

### Q9: Skills idempotent?

**Verdict:** NO idempotency guards found. Most tasks are READ+FLAG (safe for double-run). Only `ratchet` could create duplicates.

**Recommendation:** Add `last_run` timestamp per task in `hermes_task_state` table.

## EDGE (Q10-Q13)

### Q10: Simultaneous price edit conflict?

**Verdict:** CHEF WINS by design. Last-write-wins + override events. Acceptable per PIE Laws.

### Q11: Gemma 4 hallucination guardrails?

**Verdict:** Hermes-side responsibility. ChefFlow has tier waterfall in `resolve-price.ts`.

### Q12: OpenClaw capabilities without Hermes equivalent?

**Verdict:** Different scope. OpenClaw = data acquisition (5 cartridges). Hermes = pricing intelligence (8 skills). Archive Digester needs separate handling.

### Q13: Can Hermes skills chain?

**Verdict:** No chaining in ChefFlow code. External Hermes handles chaining internally.
