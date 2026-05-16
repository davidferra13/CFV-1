# Intensify: deep-pass (skill)

Zone: `.claude/skills/deep-pass/`

## Deep-Pass Run 2026-05-16

STATUS: fresh
DEPTH: normal

SURFACED:

- OTS findings (additions, rejections, lens selections) have no persistence fields; cannot compound
- Phase 1->2 handoff is untyped; intensify output shape != OTS input expectations
- yield_trend signal exists but OTS never receives it
- ARCHITECTURAL INSIGHT sections bypass expert validation
- Cross-zone findings don't backlink to referenced zone logs
- Quick mode still spawns 2 sequential phases (wasteful for pulse checks)
- memory/feedback_deep_pass_pattern.md referenced in MEMORY.md but file missing

LENSES_USED:

- Linear: workflow cycles that compound
- Stripe: phase contracts, composability
- Obsidian: graph compounding, backlinks
- Raycast: extension speed tiers
- Make/Zapier: inter-step data transformation

EXPERT_VALIDATION:

- Persist OTS findings: endorsed (Linear) - broken cycle = no compounding
- Define Phase 1->2 contract: endorsed (Stripe, Make) - weak contract = fragile pipeline
- Feed yield_trend to OTS: endorsed (Linear) - triage signals should change review behavior
- Route ARCHITECTURAL INSIGHT to OTS: endorsed (Obsidian) - highest-value nodes as primary targets
- Cross-zone backlinks: endorsed (Obsidian) - backlink panel pattern

EXPERT_ADDITIONS:

- Quick-mode short-circuit: 1 agent for both phases (Raycast)
- Phase composability: --skip-ots, --intensify-only flags (Stripe)
- Saturation auto-routing: suggest different zone after 3+ declining runs (Linear)

REJECTED:

- Separate reference directory: premature at current complexity (single file)
- Output template deduplication with OTS: deep-pass template IS the unique merged value

ACTED ON:

- Move #1: Added OTS persistence fields + Phase 1->2 handoff shape to SKILL.md

SKIPPED:

- CIL signal routing: zero UI consumers, no actionable output
- Full council (10+ lens) path: no demand until zones span 5+ domains

CROSS_REFS:

- [[intensify]]: persistence format needs matching update if deep-pass fields become standard
- [[over-the-shoulder]]: OTS could accept yield_trend as input to calibrate critique depth

NEXT TRIGGER: After 5+ real usage runs across diverse zones. Usage data reveals whether format mismatches cause friction or self-resolve.
