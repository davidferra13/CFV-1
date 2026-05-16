# Intensify: Rail Zone

## Run 2026-05-16

STATUS: partially-mined
DEPTH: normal
YIELD_TREND: increasing

SURFACED:

- Scoring engine divergence: god-mode-assembly (additive) vs universal-rail-scoring (multiplicative/spec-aligned). Both exist. Swap needed.
- 56 intelligence analyzers produce scoreable data, zero feed the rail. Pattern proven by pie-attention-resolver.
- Tier thresholds (90/60/30) silently starve Critical tier. Spec says 80/50/20. Config bug.
- CIL adapters in source-map.ts fully implemented but zero callers in dispatcher.
- universal-rail-connections findComplementaryBoosts() built, zero callers.
- rail-state impressions table ready, not wired into scoring path.

ACTED ON:

- Move #3: Fixed tier thresholds 90/60/30 -> 80/50/20 in rail-tier-assigner.ts
- Move #1: Scoring engine migration. New scoreGodModeItem() adapter routes through computeUniversalRailScore. Additive model replaced with spec-aligned multiplicative model.

SKIPPED:

- Discovery -> Dashboard cross-rail flow: premature (needs consumer traffic)
- CIL as baseScore provider: premature (scanner not confirmed active)
- 3x dedup consolidation: low-yield (works, just wasteful)

NEXT TRIGGER: Scoring migration lands + 3 intelligence resolvers wired. Then re-measure tier occupancy and density balance.

## Run 2026-05-16 (deep pass #2)

STATUS: fresh (trigger from run #1 met; zone unlocked)
DEPTH: deep
YIELD_TREND: increasing

TRIGGER MET: All 3 intelligence resolvers wired (cil-signal, intelligence, scheduled-message) + scoring migration landed. Tier occupancy now measurable.

SURFACED:

- lib/lifecycle/ (journey-orchestrator + trigger-engine) has ZERO rail connection. 10-stage lifecycle with evaluated triggers produce nothing on dashboard.
- lib/communication/cadence-scheduler processDueCadenceItems has 7 cadence points that fire emails silently. Chef cannot preview upcoming auto-sends.
- Dead code: GodModeRailSection (dashboard page line 2361, never in JSX), rail-full.tsx, rail-tier-group.tsx, assembleGodModeRail. All superseded by tiered-rail.tsx.
- lib/completion/ declared in chef-rail-registry but no resolver hydrates completion data. Completion engine is stable and built.
- No density caps (spec: 3/8/12/6 per tier). Tier overflow possible as resolver count grows.
- source-map.ts from prior findings DOES NOT EXIST. Stale finding invalidated.
- rail_item_state table still unbuilt (seen/snoozed/dismissed tracking).

INVALIDATED FROM PRIOR:

- "CIL adapters in source-map.ts" - file does not exist. Finding was stale.

ACTED ON:

(none yet)

SKIPPED:

- time-of-day awareness: premature (needs rail_item_state first)
- cross-rail signal flow: premature (only one consumer surface exists)
- TTL/expiration: premature (needs state persistence layer)
- snooze mechanism: premature (needs state + UI affordance)
- shared RailItem type unification: low-yield cosmetic refactor

NEXT TRIGGER: After ranks 1-4 wired, re-assess when (a) second rail consumer surface ships, (b) rail_item_state built enabling time/snooze/TTL, or (c) new resolver domains appear.
