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

(none yet - prompts forged in deep-pass #3)

SKIPPED:

- time-of-day awareness: premature (needs rail_item_state first)
- cross-rail signal flow: premature (only one consumer surface exists)
- TTL/expiration: premature (needs state persistence layer)
- snooze mechanism: premature (needs state + UI affordance)
- shared RailItem type unification: low-yield cosmetic refactor

NEXT TRIGGER: After ranks 1-4 wired, re-assess when (a) second rail consumer surface ships, (b) rail_item_state built enabling time/snooze/TTL, or (c) new resolver domains appear.

## Deep-Pass Run 2026-05-16 (#3 - full closed loop)

STATUS: partially-mined
DEPTH: deep
YIELD_TREND: increasing (massive - 16 moves surfaced, 9 endorsed)

SURFACED:

- Slot policy function exists, never called (one-liner fix)
- Page-affinity scoring dead (currentPage hardcoded null)
- Impression data never flows to scoring (fatigue math receives zeros)
- UI never records impressions (IntersectionObserver missing)
- Complementary boosts never called (cross-role pairs declared only)
- Pin/save infra loaded but ignored in rendering
- DOP task digest has rail-ready API, no resolver
- Multi-event day conflicts detectable, no resolver
- Event readiness via completion engine, no resolver
- Finance overdue alerts structured, no resolver
- Stripe disputes with hard deadlines, no resolver
- Ingredient price spikes possible but needs menu correlation
- Constraint collisions (meta-alert)
- Event risk assessment (composite score)
- Rest day warnings (wellness nag)
- Revenue concentration risk (consulting advice)

LENSES_USED:

- Information Architecture: feed organization, information scent
- Event-Driven Architecture: signal wiring patterns
- Cognitive Load: alert fatigue thresholds
- Operational Dashboard: Google SRE alerting philosophy
- Kitchen Operations: ticket rails, brigade system, mise en place

EXPERT_VALIDATION:

- Slot policy: endorsed (trivial, all 5 lenses)
- Page-affinity: endorsed (IA + Kitchen, cap boost to prevent drowning)
- Impression scoring: endorsed (Cognitive Load, JAMA fatigue research)
- UI impression tracking: endorsed (EDA, thin wiring layer)
- Complementary boosts: cautioned (only one active user, defer to scale)
- Pinned items: cautioned (boost already applied, UI toggle sufficient)
- DOP task digest: endorsed P0 (Kitchen: "prep lists = heartbeat")
- Multi-event conflicts: endorsed P0 (Kitchen: "double-booking = catastrophe")
- Event readiness: endorsed P0 (Kitchen + IA: "mise en place for events")
- Finance overdue: endorsed P1 (Ops: binary threshold, actionable)
- Stripe disputes: endorsed P1 (Kitchen: "health inspector - drop everything")
- Price spikes: cautioned (needs menu correlation, ambient only)
- Constraint collisions: rejected (meta-alert, surface components instead)
- Risk assessment: cautioned (score without decomposition = anxiety)
- Rest day warnings: rejected (wellness nag, erodes trust)
- Revenue concentration: rejected (consulting advice, not operational)

EXPERT_ADDITIONS:

- Stale-item garbage collection (auto-expire unresolved > 2x freshness window)
- Quiet-state positive feedback ("all clear" when rail empty)
- Time-horizon bucketing (NOW/SOON/WATCH presentation grouping)

REJECTED:

- Constraint collisions: individual constraints already surfaced via readiness blockers
- Rest day warnings: patronizing, crosses into wellness app, chef works 12-14 day stretches by choice
- Revenue concentration: not actionable in moment, belongs in quarterly review
- Unusual expenses: insufficient data history with ~10 dinners, false alarm risk

SKIPPED:

- Complementary boosts: defer until client portal has traffic
- Price spike alerts: defer until menu-ingredient correlation built
- Event risk scores: use readiness blockers instead (components > composite)
- Pinned item UI: lower priority, boost already wired in scoring

BUILD_PROMPTS:

Status: PENDING (9 agents, 3 waves)
Generated: 2026-05-16
Location: docs/handoffs/2026-05-16-deep-pass-3-rail-forge.md

CROSS_REFS:

- [[completion]]: readiness resolver consumes completion-contract engine
- [[finance]]: overdue + disputes resolvers tap finance domain
- [[scheduling]]: DOP digest + multi-event resolvers tap scheduling domain
- [[lifecycle]]: already queued from deep-pass #2, separate wave

NEXT TRIGGER: After Wave 1 (foundation wiring) lands, measure fatigue decay and tier occupancy. If balanced, proceed to Wave 2 resolvers. If tier overflow despite slot policy, investigate cap tuning before adding more signal sources.
