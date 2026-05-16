# ORCHESTRATION MISSION: Intensify Wiring Swarm

> Generated 2026-05-16 from /intensify deep runs on communication, cil, lifecycle, pricing, intelligence zones.
> Philosophy: intensification over extension. Wire existing, deepen connections, eliminate dead-ends. No new features.

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/UNIFIED-BUILD-QUEUE.md` (items AI #11-14, COMM #27-31)
- `docs/intensify/communication.md`
- `docs/intensify/cil.md`
- `docs/intensify/lifecycle.md`
- `docs/intensify/pricing.md`
- `docs/intensify/intelligence.md`

## Session Decisions (Do Not Re-Debate)

- CIL actOnSignal() is a no-op (console.log + dismiss). Wire it to real dispatchers.
- brand-voice.ts has zero importers. Wire it into email sends.
- lib/invoices/reminder-actions.ts uses raw `<pre>` body. The proper template is in lib/email/notifications.ts#sendPaymentReminderEmail. Consolidate to proper version.
- Lifecycle has 8/13 orphaned files. Event FSM (transitions.ts) is the activation hook.
- PIE resolve-price chain is solid but invisible at event creation. Wire for margin visibility.
- Dual push systems exist; channel-router is canonical. push-notify.ts has exactly one consumer.
- Dual follow-up engines need AUDIT before merge (may serve different stages).

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: CIL Action Bridge

- **Model:** opus
- **Task:** Wire `actOnSignal()` in `lib/cil/signal-actions.ts` to dispatch real communication actions based on signal source. Map:
  - `finance.overdueInvoices` -> `sendPaymentReminder()` from `lib/invoices/reminder-actions.ts`
  - `pipeline.expiringProposals` -> `sendFollowUpDueChefEmail()` from `lib/email/notifications.ts`
  - `pipeline.staleLeads` -> `sendFollowUpDueEmailDelivery()` from `lib/inquiries/follow-up-delivery.ts`
  - `clients.dormant` -> appropriate dormancy nudge email
  - `clients.atRisk` -> appropriate re-engagement email
- **Read first:** `lib/cil/signal-actions.ts`, `lib/cil/types.ts`, `lib/invoices/reminder-actions.ts`, `lib/email/notifications.ts`, `lib/inquiries/follow-up-delivery.ts`
- **Done when:** actOnSignal() dispatches to real server actions for all 5 signal types. No console.log fallback. Type-safe. Auth-gated.

### Agent 2: Lifecycle Engine Activation

- **Model:** opus
- **Task:** Wire `trigger-engine.ts` and `journey-orchestrator.ts` into event state transitions so lifecycle fires automatically on stage changes.
  - In `lib/events/transitions.ts` (around line 1794 per prior intensify), after successful transition call `orchestrateJourney()` with the new state.
  - In `lib/inquiries/actions.ts` (around line 1218), after inquiry state change call orchestrateJourney().
  - Implement the 4 stub executeAction handlers in journey-orchestrator.ts: generate_invoice, generate_contract, schedule_cadence, send_checklist.
- **Read first:** `lib/lifecycle/journey-orchestrator.ts`, `lib/lifecycle/trigger-engine.ts`, `lib/events/transitions.ts`, `lib/inquiries/actions.ts`, `docs/intensify/lifecycle.md`
- **Done when:** Event transitions trigger lifecycle orchestration. Journey actions dispatch to real handlers. No stubs remain for the 4 listed actions.

### Agent 3: Brand Voice Wiring

- **Model:** haiku
- **Task:** Wire `lib/email/brand-voice.ts` into email sending infrastructure. Specifically:
  - Import and apply `applyGreeting()` and `applySignOff()` in `lib/communication/cadence-scheduler.ts` (sendCadenceEmail function)
  - Import and apply in `lib/communication/auto-response.ts` where tone is constructed inline
  - Add forbidden-phrase lint check in `lib/email/send.ts` (warn in dev, silent in prod)
- **Read first:** `lib/email/brand-voice.ts`, `lib/communication/cadence-scheduler.ts`, `lib/communication/auto-response.ts`, `lib/email/send.ts`
- **Done when:** Brand voice presets apply to cadence emails and auto-responses. Forbidden phrases flagged in dev.

### Agent 4: Payment Reminder Consolidation

- **Model:** haiku
- **Task:** Consolidate dual payment reminder paths. The canonical path is `lib/email/notifications.ts#sendPaymentReminderEmail` (uses proper React template with payment URL, days-until-event). Update `lib/invoices/reminder-actions.ts#sendPaymentReminder` to delegate to the canonical version instead of constructing raw `<pre>` body. Keep the 3-day idempotency guard from reminder-actions.ts.
- **Read first:** `lib/invoices/reminder-actions.ts`, `lib/email/notifications.ts` (search for sendPaymentReminderEmail), `lib/dashboard/widget-actions.ts` (existing caller)
- **Done when:** Single code path for payment reminders. reminder-actions.ts uses the template version. Idempotency guard preserved. Both callers (dashboard + lifecycle scheduler) work.

### Agent 5: PIE Event Auto-Costing

- **Model:** opus
- **Task:** Wire PIE's resolve-price chain into event menu creation so chefs get instant food cost / margin visibility when building an event menu. Create a function `computeMenuCostEstimate(menuId)` that:
  - Reads menu items/recipes
  - Calls `resolvePricesBatch()` from `lib/pricing/` for all ingredients
  - Returns total food cost, cost-per-guest, suggested markup
  - Surface via a `getEventCostEstimate(eventId)` action callable from event detail page
- **Read first:** `lib/pricing/resolve-price.ts`, `lib/pricing/compute.ts`, `lib/menus/course-utils.ts`, `lib/costing/`, `lib/events/`
- **Done when:** New server action returns cost estimate for an event's menu. Uses existing resolve-price chain. No new DB tables. Type-safe. Auth-gated.

## Wave 2 (After Wave 1 Verified)

### Agent 6: Cadence Trigger Into Deposit Actions

- **Model:** haiku
- **Task:** Wire `executeCadenceTrigger()` from `lib/lifecycle/cadence-trigger-handler.ts` into `lib/finance/deposit-actions.ts` after successful deposit recording. Should call with trigger type 'deposit_received' and the event context. 3-5 lines of wiring.
- **Read first:** `lib/lifecycle/cadence-trigger-handler.ts`, `lib/finance/deposit-actions.ts`
- **Done when:** Successful deposit automatically triggers confidence cadence scheduling. No duplicate cadence on re-deposits (idempotent).

### Agent 7: Push System Consolidation

- **Model:** haiku
- **Task:** Replace `lib/communication/push-notify.ts` with delegation to `lib/notifications/channel-router.ts#deliverPush`. The single consumer is `lib/communication/pipeline.ts` (dynamic import). Update pipeline.ts to import deliverPush from channel-router instead. Remove push-notify.ts or mark deprecated.
- **Read first:** `lib/communication/push-notify.ts`, `lib/notifications/channel-router.ts`, `lib/communication/pipeline.ts`
- **Done when:** Single push notification path via channel-router. pipeline.ts updated. No duplicate subscription logic.

### Agent 8: Churn Triggers to Communication

- **Model:** opus
- **Task:** Wire `lib/intelligence/` churn-prevention-triggers output into communication cadence. When a client is flagged at-risk by the intelligence layer, automatically schedule a re-engagement sequence via the cadence scheduler. Bridge the intelligence signal to `lib/communication/cadence-scheduler.ts`.
- **Read first:** `lib/intelligence/` (find churn-prevention output), `lib/communication/cadence-scheduler.ts`, `lib/cil/signal-actions.ts` (reference for dispatch pattern from Agent 1)
- **Done when:** At-risk clients from intelligence layer get auto-scheduled re-engagement cadence. Uses same pattern as CIL bridge.

## Wave 3 (After Wave 2 Verified)

### Agent 9: Follow-Up Engine Audit

- **Model:** opus
- **Task:** READ-ONLY AUDIT. Compare `lib/communication/follow-up-actions.ts` vs `lib/follow-up/sequence-engine.ts`. Document:
  - What lifecycle stage each serves
  - Whether they share DB tables or are fully independent
  - Whether consolidation is safe or they serve genuinely different flows
  - Recommended merge plan (if safe) or boundary clarification (if not)
    Write findings to `docs/intensify/follow-up-audit.md`.
- **Read first:** `lib/communication/follow-up-actions.ts`, `lib/follow-up/sequence-engine.ts`, `lib/follow-up/follow-up-actions.ts`
- **Done when:** Audit doc written with clear recommendation. No code changes.

## Verification Protocol

- Each agent runs type check: `npx tsc --noEmit --skipLibCheck`
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After Wave 1: full `npx tsc --noEmit --skipLibCheck` + `npx next build --no-lint`
- After Wave 2: same checks
- After final wave: verify affected imports resolve, no circular deps
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, behavioral test where possible).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update `docs/intensify/*.md` zone logs with ACTED ON entries.

## Success Criteria

- Zero orphaned files in lifecycle zone (currently 8/13)
- CIL actOnSignal() dispatches to 5 real communication actions
- brand-voice.ts has 3+ importers
- Single payment reminder code path
- Single push notification code path
- PIE data visible at event creation
- Churn intelligence feeds communication automatically
- Type check passes throughout

---

# ADDENDUM: Lifecycle Intensify Run #3 (2026-05-16)

> Deeper findings from third /intensify pass. Non-conflicting with Codex queue. Focus: finance bridge, cron consolidation, dead code elimination.

## Context Load (Read These First)

- `docs/intensify/lifecycle.md` (3 runs, full history)
- `lib/lifecycle/journey-orchestrator.ts` (main orchestration, lines 50-200)
- `lib/lifecycle/cadence-trigger-handler.ts` (dead bridge, zero callers)
- `lib/lifecycle/confidence-cadence.ts` (7 milestone model)
- `lib/finance/deposit-actions.ts` (recordDeposit at line 183)
- `app/api/scheduled/lifecycle/route.ts` (7 sections; target: 3+5)
- `lib/communication/cadence-scheduler.ts` (createCadenceSchedule)

## Session Decisions (Do Not Re-Debate)

- Manual deposits MUST trigger orchestrateJourney() (full pipeline, not just cadence)
- Scheduled route Sections 1-2 (expire inquiries/quotes), 4 (payment reminders), 6 (quote expiry warnings), 7 (review requests) are NOT redundant; they stay untouched
- Only Sections 3 (24h reminder) and 5 (30d/14d/7d/2d/1d) overlap with confidence-cadence
- cadence-trigger-handler.ts is the designed bridge; journey-orchestrator should call it, not inline cadence logic
- Legacy events (created before cadence scheduling) need fallback path in cron

## Wave 1 (Parallel - Launch Immediately)

### Agent A: Wire manual deposit -> lifecycle pipeline

- **Model:** haiku
- **Task:** In `lib/finance/deposit-actions.ts`, after the ledger append succeeds (line 217) and before the revalidatePath calls, add a non-blocking call to `orchestrateJourney(user.tenantId!, null, eventId)`. Use the same try/catch pattern as the auto-invoice block (lines 222-228). Dynamic import: `const { orchestrateJourney } = await import('@/lib/lifecycle/journey-orchestrator')`.
- **Read first:** `lib/finance/deposit-actions.ts`, `lib/lifecycle/journey-orchestrator.ts` (signature + return type only)
- **Done when:** `recordDeposit()` calls `orchestrateJourney` non-blocking. Type check passes. Pattern matches existing auto-invoice block.

### Agent B: Wire executeCadenceTrigger into journey-orchestrator

- **Model:** haiku
- **Task:** In `lib/lifecycle/journey-orchestrator.ts`, find the `schedule_cadence` case in `executeAction()` (around line 187+). Currently it has inline logic. Replace the body with: `await executeCadenceTrigger(chefId, eventId!, triggered)` where `triggered` is the full TriggerResult array passed to executeAction. Import `executeCadenceTrigger` from `./cadence-trigger-handler`. The handler already does the event date lookup and calls createCadenceSchedule.
- **Read first:** `lib/lifecycle/journey-orchestrator.ts` (full executeAction switch), `lib/lifecycle/cadence-trigger-handler.ts` (full file, 49 lines)
- **Done when:** `schedule_cadence` delegates to cadence-trigger-handler. Handler has 1+ caller. No duplicate event-date lookup. Type check passes.

## Wave 2 (After Wave 1 Verified)

### Agent C: Consolidate scheduled route Sections 3+5 into cadence model

- **Model:** opus
- **Task:** Refactor `app/api/scheduled/lifecycle/route.ts` Sections 3 and 5:
  1. **Section 5 (lines 585-1020):** Replace with: query `cadence_schedules` table for points due today (scheduled_at <= now AND sent_at IS NULL). For each, call the appropriate email send function using template data from `getAllCadencePointsWithContent()`. Mark sent_at after success. Legacy fallback: events without a cadence_schedule row still use the old column-dedup path.
  2. **Section 3 (lines 312-437):** Before sending 24h reminder, check if cadence schedule's `1_day_before` point was already sent. If yes, skip (no double-send). If no cadence schedule exists (legacy event), use existing path.
  3. Preserve all opt-out checks (chef-level + client-level).
  4. Add `results.cadencePointsSent` counter.
  5. Do NOT touch Sections 1, 2, 4, 6, or 7.
- **Read first:** `app/api/scheduled/lifecycle/route.ts` (full file), `lib/lifecycle/confidence-cadence.ts`, `lib/communication/cadence-scheduler.ts`, `database/migrations/` (find cadence_schedules table schema)
- **Done when:** Section 5 uses cadence model as primary. Section 3 checks for double-send. Legacy fallback preserved. Type check passes. Route still returns 200 with results JSON.

## Verification Protocol

- After Wave 1: `npx tsc --noEmit --skipLibCheck` must pass
- After Wave 2: same + manually verify route structure (sections numbered correctly, no orphaned variables)
- Anti-Loop: 3 strikes = stop, commit partial, report

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch Wave 1 agents in parallel (both haiku, independent files).
3. Verify Wave 1 (type check), then dispatch Wave 2 (opus, depends on Wave 1 wiring being complete).
4. At completion: commit with `feat(lifecycle): deposit bridge + cadence consolidation (intensify #3)`
