# /intensify: lifecycle

Zone: `lib/lifecycle/` + `lib/events/` lifecycle consumers
Files: 13 (all substantive, no stubs)

---

## Run 2026-05-16

STATUS: FRESH
DEPTH: normal

SURFACED:

- orchestrateJourney() in journey-orchestrator.ts is NEVER CALLED anywhere in codebase
- 7 executeAction types (send_menu, generate_quote, schedule_followup, send_contract, request_deposit, confirm_event, send_reminder) have empty/stub handlers
- Event transitions (transitionEvent) bypass lifecycle entirely; no hook into journey orchestrator
- findSeasonalRebookCandidates() exists but no scheduler/cron invokes it
- trigger-engine.ts and critical-path.ts have overlapping stage detection (not blocking, different consumers)
- Referrals module reinvented stage tracking instead of consuming lifecycle detector

ACTED ON:

- Wire orchestrateJourney() into transitionEvent() (lib/events/transitions.ts:1794)
- Wire orchestrateJourney() into transitionInquiry() (lib/inquiries/actions.ts:1218)
- Implement 4 missing executeAction handlers: generate_invoice, generate_contract, schedule_cadence, send_checklist (lib/lifecycle/journey-orchestrator.ts:187-246)

SKIPPED:

- seasonal-rebook full wiring: job infrastructure pattern undecided (Pi cron vs Next.js cron vs Hermes)
- trigger-engine/critical-path dedup: both serve different consumers, merging is refactor not wiring
- Referral stage duplication: low yield, works as-is

NEXT TRIGGER: after ranks 1-3 wired, re-run to find next yield layer (expect: referral consumption, CIL signal flow, cadence trigger wiring)

---

## Run 2026-05-16 (second pass - quick)

STATUS: partially-mined
DEPTH: quick

NEW FINDINGS (not in prior run):

- 8/13 files still ORPHANED: detector.ts, seed.ts, seasonal-rebook.ts, cadence-trigger-handler.ts, confidence-cadence.ts, trigger-engine.ts, journey-orchestrator.ts, client-notifications.ts
- cadence-trigger-handler -> deposit-actions already queued (COMM #29)
- Event FSM (lib/events/transitions.ts) remains the natural activation hook

NEXT TRIGGER: After trigger-engine wired into event FSM -> near-saturated

---

## Run 2026-05-16 (third pass - normal)

STATUS: partially-mined
DEPTH: normal
YIELD_TREND: declining

SURFACED:

- finance/commerce have ZERO lifecycle imports; manual deposit recording (deposit-actions.ts) bypasses entire lifecycle pipeline (only Stripe webhook path triggers via transitionEvent)
- scheduled/lifecycle/route.ts (7 cron jobs, 400+ lines) operates INDEPENDENTLY from trigger-engine/orchestrator; 3 confirmed redundancies with confidence-cadence model (30d/14d/7d/3d/1d reminders, midpoint check-in, stale-leads detection)
- executeCadenceTrigger() in cadence-trigger-handler.ts has ZERO callers; journey-orchestrator imports confidence-cadence directly, skipping designed bridge
- getLifecycleTimeline() in client-notifications.ts exported but zero UI consumers (portal uses getLifecycleProgressForClient from actions.ts)
- CIL pipeline has zero imports from lib/lifecycle/ (parallel tracks, no data exchange)

ACTED ON:
(pending user selection)

SKIPPED:

- Shared Status View: Codex queue "Lifecycle Client Visibility And Redaction Rules" covers this
- Repeat-client acceleration: depends on Action Graph Builder (not yet merged)
- Circle-aware nudge suppression: low yield, tuning pass not structural
- 3 stub executeAction types: Codex "Action Vocabulary Contract" will define these
- trigger-engine FSM wiring: Codex items #3 + #9 require this; doing now would conflict
- getLifecycleTimeline UI consumption: Codex "Dashboard Lifecycle Feed" + "Event Detail Card" will consume
- CIL<->lifecycle bridge: low yield until CIL has UI consumer

NEXT TRIGGER: Codex merges Action Vocabulary (#1) + Action Graph Builder (#3). Unlocks trigger-engine FSM wiring, stub implementations, repeat-client acceleration. Until then, only finance bridge + cron consolidation are non-conflicting.
