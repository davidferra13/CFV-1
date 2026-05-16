# Intensify: build-performance

Zone covering Next.js build times, tsc compilation, OOM crashes, and app page count growth.

## Run 2026-05-16

STATUS: fresh
DEPTH: deep

SURFACED:

- 29 stale .next-dev-\* dirs = 11.41 GB disk waste, force unnecessary I/O during builds
- 80+ dead tsconfig.next.json include entries force tsc to stat nonexistent directories
- stageBuildSurface() scaffold exists in run-next-build.mjs but not wired for route subsetting
- ~60 status-as-page routes (events/confirmed, events/cancelled, etc.) each compile as separate webpack entries
- lib/ai (242 files), lib/discovery (119), lib/pricing (98) traced for client boundaries but are server-only
- Project references (composite tsconfigs) would enable incremental tsc but needs design phase
- GC tuning flags (--max-semi-space-size=64) could prevent OOM without raising heap ceiling
- Turbopack dev available (Next 14.2.35) but not configured; prod turbopack requires Next 15
- 932 page.tsx files (up from 265 in March, 771 in April)
- Build times: 241s (May 2) -> 1310s (May 9) peak, typically 400-600s

DEAD ENDS:

- optimizePackageImports: only works for node_modules, not internal @/ paths
- Route group splitting: webpack compiles all groups in single pass regardless
- Turbopack prod: requires Next 15 migration

ACTED ON:

- Move #1: Pruned 82 dead tsconfig includes + deleted 28 stale .next-dev-\* dirs (9.75 GB recovered). tsc dropped from 90-330s to 72.4s.
- Moves #2-3: Handed off to route-consolidation swarm (docs/handoffs/2026-05-16-route-consolidation-swarm.md)

SKIPPED:

- Deleting 101 orphan routes: needs per-route explicit approval
- Bundle analyzer: diagnostic only
- Turbopack prod: premature (Next 15 needed)

NEXT TRIGGER: After ranks 1-3 wired and measured. If build < 8min, near-saturated until Next 15.
