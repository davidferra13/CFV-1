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
