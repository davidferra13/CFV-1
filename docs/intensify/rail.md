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
