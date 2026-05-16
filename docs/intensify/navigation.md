# Intensify: navigation

Zone covering the progressive disclosure layer, nav intelligence wiring, and "ultimate instrument" cockpit architecture.

## Run 2026-05-16

STATUS: fresh
DEPTH: normal (2+1 agents)

ARCHITECTURAL INSIGHT:
Navigation has 6 sophisticated HIDE systems (suppress irrelevant items via TenantDataPresence, SurfaceGraph, focus-mode, archetype, modules, visibility) but ZERO PROMOTE systems (elevate urgent/contextual items). The cockpit has no heads-up display. All instruments require equal attention regardless of flight phase.

Nav knows WHAT exists (data presence) and WHO the chef is (archetype) but NOT:

- WHEN (temporal awareness, proximity to events, time-of-day patterns)
- WHERE in workflow (lifecycle stage doesn't drive nav prominence)
- HOW OFTEN (usage frequency data exists server-side, never influences client nav)
- WHAT'S URGENT (CIL signals exist, zero surfaced in navigation)

SURFACED:

- getSurfaceUsageStats() has per-chef visit frequency in PostgreSQL; action bar doesn't consume it
- chef_pinned_surfaces table exists with data; zero rendering in nav
- rail-tier-assigner built in lib/surfaces, imported by zero files (orphaned)
- RecentPagesSection uses localStorage (device-bound, max 8) while server has full usage history
- CIL ProactiveSignals formatted for Remy only; no client-side channel
- Create dropdown has 5 items but spec says 15
- Focus mode hardcodes STRICT_FOCUS_GROUP_ORDER instead of deriving from usage + lifecycle
- surface-graph.ts wraps 6 visibility systems but results NOT fed back to action-bar filtering
- 269 routes with no nav path (dead ends)
- 6 nav queue items SPEC-READY, none IN-FLIGHT from Claude

ACTED ON:

- Move 1: Wire usage-tracking -> action bar ordering (dispatched)
- Move 2: Render chef_pinned_surfaces in nav sidebar (dispatched)
- Move 3: Wire orphaned rail-tier-assigner (dispatched)

SKIPPED:

- Command palette: already SPEC-READY in queue, Codex active
- Lifecycle -> nav re-ranking: premature (needs focus-entity context provider)
- Completion % -> nav badges: premature (needs tenant completion summary cache)
- Next-action -> create dropdown: premature (needs focus-entity provider)
- Hub consolidation wiring: route-consolidation swarm in-flight
- CIL urgency badges: needs new API endpoint (medium effort, deferred to run #2)

NEXT TRIGGER: After moves 1-3 land + route-consolidation Wave 1 completes. Re-measure if nav feels "alive." Next pass: CIL badges (move 5) + hub mode-switching.
