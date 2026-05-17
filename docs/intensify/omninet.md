# Omninet - Intensify Zone Log

## Deep-Pass Run 2026-05-17

STATUS: fresh
DEPTH: normal (2+1 agents, 5 lenses)

SURFACED:

- 4 independent routers in ChefFlow evolved with zero shared vocabulary (omninet, AI dispatch, command-intent-parser, god-mode-dispatcher)
- Detection is 90% built, autonomous action is 10% wired (CIL, signals, lifecycle all detect but wait for click)
- 2 safety hooks exist but are NOT registered in settings.json (scope-guard.sh, regression-block.sh) - 60% enforcement
- Lifecycle Stage Detector: spec detailed, tables migrated, zero code written
- Email inbound webhook stores but never extracts entities or feeds CIL
- Remy advises but cannot execute (advisor, not operator)
- Omninet Common Routing has zero entries for PIE, session, wiring, docs, CIL, or app-implementation categories
- Automation rules are opt-in hidden (defeats purpose of autonomous system)
- skill-inventory.mjs produces 5 false positives (model tier names match regex)

LENSES_USED:

- Systems Architect: integration patterns, 4-router taxonomy, coupling analysis
- Automation/Control Engineer: feedback loops, dispatch safety, dead-man switches
- Product Philosopher (Chef Ops): "creative decisions only" boundary validation
- DevOps Reliability: dormant guards, enforcement coverage, operational trust
- Privacy/Safety Auditor: autonomous action consent, irreversibility gates

EXPERT_VALIDATION:

- Wire dead hooks: endorsed (all) - "dormant guard worse than no guard"
- Email entity extraction: endorsed (all) - "chef should not re-enter data from emails"
- Lifecycle Stage Detector: endorsed (all) - "THE single highest-value missing piece"
- Expand routing table: endorsed (all) - "router must know its full system"
- CIL auto-dispatch: cautioned (Safety) - "auto-draft yes, auto-send never. T1/T2/T3 tiers"
- Remy execute: cautioned (Safety) - "draft+stage only, never auto-send client comms"
- Automation rules default-on: endorsed (Product+Safety) - "only for T1-safe rules"

EXPERT_ADDITIONS:

- Shared routing taxonomy doc (4 routers need cross-reference, not code coupling)
- Automation confidence tiers (T1 auto-execute, T2 auto-stage, T3 never-auto) as universal pattern

REJECTED:

- Remy auto-SEND: Safety - "irreversible client communication without chef approval violates trust"
- Cadence auto-send without enrollment: Safety - "chef-brand-voice emails require style confirmation"
- Inventory script exit non-zero: Premature - false positive fix must land first

ACTED ON:

- Wire dead hooks: scope-guard.sh (PreToolUse Edit|Write) + regression-block.sh (PostToolUse Edit|Write) registered in settings.json
- Fix skill inventory: added 10 terms to nonSkillRefs (3 model tiers + 7 status tags). Zero false positives now
- Expand omninet routing: added 6 categories (PIE, session, wiring, docs, CIL, app implementation) to Common Routing

SKIPPED:

- Align dev/runtime vocabulary: taxonomy-only, no behavioral improvement yet
- Document 4-router architecture: documentation-only

CROSS_REFS:

- [[cil]]: signal-actions auto-dispatch, observer email gap
- [[remy]]: execute vs advise boundary
- [[lifecycle]]: stage detector (highest-value missing piece)
- [[pie]]: unrouted in omninet
- [[hermes]]: morning reports disconnected from session-start

NEXT TRIGGER: Lifecycle Stage Detector built + email entity extraction wired. Re-intensify after real usage data shows remaining mechanical chef work.

BUILD_PROMPTS: WAVE 1 COMPLETE (7 agents: 4 haiku + 3 opus, 3 waves)

- Wave 1: wire-dead-hooks (haiku) DONE, fix-skill-inventory (haiku) DONE, expand-omninet-routing (haiku) DONE
- Wave 2: email-entity-extraction (opus), lifecycle-stage-detector (opus), cil-auto-dispatch-drafts (opus)
- Wave 3: automation-rules-default-on (haiku), hermes-omninet-bridge (haiku)
