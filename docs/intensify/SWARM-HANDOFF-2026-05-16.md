# ORCHESTRATION MISSION

## Context Load (Read These First)

- `docs/intensify/intelligence.md` (just completed, near-saturated)
- `docs/intensify/communication.md` (near-saturated, 2 remaining moves)
- `docs/intensify/cil.md` (stale doc, signals NOW wired via intelligence swarm)
- `docs/intensify/client-messaging.md` (partially-mined, 4 ranked moves)
- `docs/intensify/discovery.md` (6 moves already DONE)
- `docs/UNIFIED-BUILD-QUEUE.md` (237 items, check for PARTIAL needing verification)
- `lib/cil/signal-dedup.ts` (new, dedup registry)
- `lib/cil/signal-actions.ts` (expanded, 13+ handlers now)

## Session Decisions (Do Not Re-Debate)

- Intelligence zone is near-saturated. Do not re-intensify it.
- Discovery zone is done (6 moves built). Do not re-run.
- CIL intensify doc is stale (says "fresh" but intelligence swarm wired everything). Update status to partially-mined.
- Communication zone: near-saturated BUT client-messaging has 4 fresh moves
- Signal dedup registry is built and wired. All new dispatches go through it.
- price-anomaly goes through decision-queue, NOT CIL finance (rejected path)
- Remy now has: client-lifetime-journey + seasonal-menu-correlation in context

## Wave 0 (Verification - Sequential, Orchestrator Does This)

### Task: Runtime Verification

- **Start dev server** at localhost:3100 (or confirm running)
- **Trigger CIL scanner** for a test tenant: verify new signal handlers fire, dedup blocks duplicates
- **Test Remy context**: hit `/api/remy/stream` with test tenant, confirm lifetime-journey + seasonal data appears in prompt
- **Check decision-queue**: verify price-anomaly items surface
- **Done when:** At least one signal deduped, Remy prompt contains "SEASONAL MENU INTELLIGENCE" section, decision-queue includes pricing category

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: SMS Cadence Channel Variant

- **Model:** sonnet
- **Task:** Add SMS channel variant to cadence-scheduler.processDueCadenceItems. When client.preferred_contact_method is 'text' or 'phone', generate SMS variant of cadence messages instead of email. Must respect agent.send_sms restriction (chef-review, no auto-send).
- **Read first:** `lib/communication/cadence-scheduler.ts`, `lib/sms/pipeline.ts`, `lib/communication/channel-router.ts`, `docs/intensify/client-messaging.md`
- **Done when:** tsc passes, SMS cadence messages created as drafts (not auto-sent), existing email path unchanged

### Agent 2: CIL-to-Communication Bridge Dispatch

- **Model:** haiku
- **Task:** Wire CIL signal-actions dispatch to channel-router for client-facing signals. When CIL emits clients.dormant, clients.atRisk, or clients.rebookingOverdue, route through channel-router to create outreach draft (not auto-send). One-way: CIL dispatches, communication receives.
- **Read first:** `lib/cil/signal-actions.ts`, `lib/communication/channel-router.ts`, `lib/notifications/channel-router.ts`, `docs/intensify/client-messaging.md`
- **Done when:** tsc passes, CIL client signals produce draft notifications via channel-router

### Agent 3: Cadence Schedule Rail Source

- **Model:** haiku
- **Task:** Add cadence_schedule as a rail source in Rail Item Lifecycle Engine. Currently rail reads scheduled_messages but not cadence_schedule, making upcoming automated messages invisible to chef surface.
- **Read first:** `lib/rail/sources/`, `lib/communication/cadence-scheduler.ts`, `database/schema.ts` (cadence_schedule table)
- **Done when:** tsc passes, cadence items appear in rail assembly alongside scheduled messages

### Agent 4: CIL Zone Doc Update

- **Model:** haiku
- **Task:** Update `docs/intensify/cil.md` to reflect current state. The intelligence swarm (this session) wired actOnSignal to 13 handlers, added dedup registry, expanded rebooking signals. Mark status: partially-mined. List what was done. Set NEXT TRIGGER to: "After Remy reverse-reads CIL insights for suggestion generation -> near-saturated"
- **Read first:** `docs/intensify/cil.md`, `lib/cil/signal-actions.ts`, `lib/cil/signal-dedup.ts`
- **Done when:** Doc accurately reflects built state

## Wave 2 (After Wave 1 Verified)

### Agent 5: Passive Channel Preference Writer

- **Model:** haiku
- **Task:** In pipeline.ts (SMS/communication pipeline), after processing a client reply, update clients.preferred_contact_method based on reply histogram. If client replies via SMS 3+ times and email 0 times, set preferred to 'text'. Passive, no UI, just a 3-line write.
- **Read first:** `lib/sms/pipeline.ts`, `lib/communication/pipeline.ts`, `database/schema.ts` (clients table)
- **Done when:** tsc passes, preferred_contact_method updates on inbound message processing

### Agent 6: Intensify Next Zone Selection

- **Model:** opus
- **Task:** Run `/intensify` on the lifecycle zone (`docs/intensify/lifecycle.md`). It cross-refs from communication and intelligence. Read the current doc, scan `lib/lifecycle/` and `lib/events/`, identify orphaned outputs and unwired connections. Follow the intensify skill pattern exactly. Write results to the doc.
- **Read first:** `docs/intensify/lifecycle.md`, `docs/intensify/intelligence.md` (cross-refs), `lib/lifecycle/`, `lib/events/`
- **Done when:** lifecycle.md updated with surfaced moves, ranked, cross-referenced

## Wave 3 (After Wave 2 Verified)

### Agent 7: PARTIAL Items Playwright Verification

- **Model:** sonnet
- **Task:** From UNIFIED-BUILD-QUEUE CLIENT COMMUNICATION section, items #12-18 are all marked PARTIAL (built, needs verification). Pick the top 3 by priority (Inquiry-to-Booking #12, Pre-Event Confidence #13, Social Proof Loop #14). Start dev server, run Playwright against each flow. Report pass/fail. Mark DONE or log specific failures.
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md` (CLIENT COMMUNICATION section), test files in `tests/`
- **Done when:** At least 2 of 3 verified or specific failures documented with line numbers

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` before reporting done
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After each wave: full tsc must pass
- After Wave 3: Playwright verification of communication flows
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot, behavioral test).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update intensify docs, push.
8. Update UNIFIED-BUILD-QUEUE.md status for any items that move to DONE.
