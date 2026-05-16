# Intensify: Discovery Zone

Zone: discovery (141 files: 119 lib, 7 components, 15 app routes)

## Run 2026-05-16

STATUS: fresh
DEPTH: deep (first run, 90+ files)

SURFACED:

- CIL (7 signal sources) has ZERO imports into discovery; god-mode-dispatcher is ideal consumption point
- lib/intelligence/ (20+ functions: client-risk, churn, dietary-trends, event-profitability) has ZERO imports into discovery
- 3 parallel scoring paths (discovery-rail-scoring, universal-rail-scoring, god-mode-assembly) are disconnected
- rail-tier-assigner imports god-mode + universal-rail-scoring but is imported by ZERO files (orphan bridge)
- cadence-trigger-handler (untracked) could feed lifecycle rail items but no resolver consumes it
- search-autocomplete uses 15 hardcoded entries instead of querying 8 registries with thousands of items
- ~12 contract files (~3500 lines) are types-only stubs: social, shortlist, recovery, compare, sharing, session lifecycle
- Staff/partner/admin registries (1400-4300 lines each) resolve to static labels only (no data resolvers)
- Remy integration is one-directional (Remy reads discovery; discovery never reads Remy)
- discovery-rail-scoring.ts appears to be older pre-god-mode scoring path (redundancy candidate)

ACTED ON:

- All 6 moves BUILT and marked DONE in UNIFIED-BUILD-QUEUE.md (2026-05-16)
- #1: lib/discovery/resolvers/chef/cil-signal-resolver.ts (CIL -> god-mode)
- #2: lib/discovery/resolvers/chef/intelligence-resolver.ts (4 intelligence sources -> god-mode)
- #3-4: getTieredRail() server action in universal-rail-actions.ts (canonical unified path)
- #5: lib/discovery/resolvers/chef/scheduled-message-resolver.ts (cadence -> rail)
- #6: buildDynamicAutocompleteSources() in search-autocomplete.ts (registry-fed)

SKIPPED:

- Staff/partner/admin resolvers: premature (no users of those roles)
- Social rail contracts (557 lines): premature (no signal producer)
- Shortlist/recovery/compare/sharing contracts: premature (types-only)
- Session lifecycle contract (422 lines): premature (no persistence)
- Remy reverse-wire: blocked (architectural decision needed)
- Onboarding -> culinary profile: blocked (config engine not finalized)
- image-map static->DB: low-yield
- Discount/last-minute rails, relationship graph, circle rules, "what to eat now": new features (violates intensification)

NEXT TRIGGER: Rail Item Lifecycle Engine (P0) ships. Scoring decay, TTL, tier promotion create new wiring surfaces.
