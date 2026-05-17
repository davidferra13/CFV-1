# /intensify: events

Central operational unit. 337 files. Connects to every pillar.

## Run 2026-05-17

STATUS: fresh
DEPTH: deep
YIELD_TREND: increasing

SURFACED:

- 57+ raw `.from('events')` queries in intelligence/lifecycle/communication bypass lib/events/actions.ts
- post-event-learning-logic.ts computes success scores, dish memory, learning insights consumed by ZERO intelligence modules
- CIL ingests event transitions but has no debrief/outcome signal handler
- event-risk-assessment.ts not wired to cadence-scheduler (high-risk events get same cadence as easy ones)
- cadence-scheduler.ts queries events 7+ times independently, ignores touchpoints and default-behaviors
- operating-spine.ts not consumed by lifecycle/critical-path.ts (reimplements completeness)
- touchpoint-actions.ts exists but communication/ has zero awareness
- Two parallel closeout type files (lifecycle/ and events/) with zero importers each
- recall-actions.ts has zero importers outside events/
- handoff-actions.ts not reflected in lifecycle or operating-loop

ACTED ON:

- (awaiting user selection)

SKIPPED:

- recall -> intelligence: naming collision not functional duplication (food safety vs event archive)
- countdown -> weather dedup: different auth contexts, not stable
- handoff -> lifecycle: fresh code, let stabilize
- FSM type literals in lifecycle: cosmetic, no cascading value
- event-replay vs recall dedup: different domains despite similar hydration

NEXT TRIGGER: shared event query helper lands and intelligence files migrate (changes import graph enough to re-scan)
