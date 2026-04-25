# P0 Work Continuity Control Plane

Status: ready for builder
Priority: P0
Created: 2026-04-24
Scope: additive repo-local continuity tooling for ChefFlow work state, verification debt, decisions, and handoffs

## Highest-Leverage Action

Build an additive Work Continuity Control Plane: a repo-local, source-backed registry and dashboard that turns session logs, specs, build state, verification queues, and OpenClaw ownership notes into one queryable work-state index.

This is the single highest-leverage action because the current failure is systemic repetition, not lack of isolated feature ideas:

- eight built specs still lack verification, so "built" is not enough (`docs/research/built-specs-verification-queue.md:9`)
- the default builder queue is already supposed to start with built-verification debt (`docs/research/current-builder-start-handoff-2026-04-02.md:33`, `docs/research/current-builder-start-handoff-2026-04-02.md:37`)
- fallback and research docs previously drifted over which handoff was canonical (`docs/archive/session-log-archive.md:1087`)
- dirty-checkout/build-state interpretation had to be re-clarified in later sessions (`docs/archive/session-log-archive.md:1486`)
- OpenClaw/website/Pi work needs lane classification before it is safe to claim (`docs/research/builder-docket-runtime-ownership-map-2026-04-03.md:69`)
- the live MemPalace vector path is currently unreliable due to Chroma compaction/deserialization errors, so source-backed local indexing matters (`obsidian_export/live_pipeline_report.md:55`, `obsidian_export/live_pipeline_report.md:113`, `obsidian_export/live_pipeline_report.md:171`)

## Non-Goals

- Do not replace MemPalace.
- Do not mutate product workflows.
- Do not move or delete existing specs.
- Do not resolve every verification item in this slice.
- Do not create another prose-only handoff that competes with existing docs.
- Do not require external services.

## Deliverable

Create a deterministic work-state index plus a readable report/dashboard.

Minimum outputs:

1. `lib/work-continuity/types.ts`
2. `lib/work-continuity/sources.ts`
3. `lib/work-continuity/parse-session-log.ts`
4. `lib/work-continuity/parse-spec-status.ts`
5. `lib/work-continuity/build-index.ts`
6. `scripts/generate-work-continuity-index.mjs`
7. `reports/work-continuity-index.json`
8. `docs/research/work-continuity-index.md`
9. `tests/unit/work-continuity-index.test.ts`

Optional, only if the repo pattern makes it cheap:

- `app/(admin)/admin/work-continuity/page.tsx`

If adding the admin page creates routing/auth/test complexity, skip it. The P0 is the index and generated report.

## Registry Shape

Each indexed item must include:

```ts
type WorkContinuityItem = {
  id: string
  title: string
  category:
    | 'abandoned_work'
    | 'built_unverified'
    | 'buried_decision'
    | 'overlap'
    | 'forgotten_leverage'
    | 'openclaw_gap'
    | 'release_gap'
    | 'handoff_drift'
  lane: 'website-owned' | 'runtime-owned' | 'host-owned' | 'bridge-owned' | 'docs-owned'
  status:
    | 'ready_spec'
    | 'built_unverified'
    | 'verified'
    | 'blocked'
    | 'stale'
    | 'research_backed_unspecced'
    | 'needs_triage'
  sourcePaths: Array<{ path: string; line?: number; label?: string }>
  sourceConversation?: { path: string; line?: number; label?: string }
  canonicalDecision?: string
  contradiction?: string
  nextAction: string
  lastSeen?: string
}
```

## Source Inputs

The generator must read from these files if present:

- `docs/session-log.md`
- `docs/archive/session-log-archive.md`
- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/research/built-specs-verification-queue.md`
- `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md`
- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
- `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`
- `docs/anthropic-system-audit-2026-04-18.md`
- `docs/anthropic-follow-on-audit-answers-2026-04-18.md`
- `docs/anthropic-follow-on-audit-supplement-2026-04-18.md`
- `memory/project_openclaw_social_media_orchestration.md`
- `memory/project_openclaw_vr_spatial_dashboard.md`
- `obsidian_export/live_pipeline_report.md`

Missing files should produce warnings in the generated report, not hard failures.

## Required Seed Items

The first generated index must include at least these source-backed items:

1. Built-but-unverified specs
   - Evidence: `docs/research/built-specs-verification-queue.md:9`
   - Status: `built_unverified`
   - Lane: `website-owned`
   - Next action: verify in queue order

2. Ticketed events critical blockers
   - Evidence: `docs/session-log.md:101`
   - Status: `blocked`
   - Lane: `website-owned`
   - Next action: run ticketed-events repair handoff before treating ticketing as shipped

3. OpenClaw health split
   - Evidence: `docs/anthropic-system-audit-2026-04-18.md:11`, `docs/anthropic-follow-on-audit-answers-2026-04-18.md:225`
   - Status: `ready_spec` or `research_backed_unspecced`
   - Lane: `bridge-owned`
   - Next action: build canonical stage-aware OpenClaw health contract

4. OpenClaw cadence policy scattered
   - Evidence: `docs/anthropic-follow-on-audit-answers-2026-04-18.md:381`
   - Status: `research_backed_unspecced`
   - Lane: `runtime-owned`
   - Next action: create code/config cadence authority

5. Survey handoff demotion
   - Evidence: `docs/research/current-builder-start-handoff-2026-04-02.md:33`, `docs/research/current-builder-start-handoff-2026-04-02.md:37`
   - Status: `verified`
   - Lane: `docs-owned`
   - Canonical decision: survey is explicit validation branch, not default builder queue

6. Preserved dirty checkout policy
   - Evidence: `docs/archive/session-log-archive.md:1486`
   - Status: `verified`
   - Lane: `docs-owned`
   - Canonical decision: preserved dirty mode is allowed only when build-state and active handoff both authorize it

7. OpenClaw social ingestion boundary
   - Evidence: `memory/project_openclaw_social_media_orchestration.md:103`, `memory/project_openclaw_social_media_orchestration.md:106`
   - Status: `research_backed_unspecced`
   - Lane: `bridge-owned`
   - Next action: normalized OpenClaw-to-ChefFlow package ingestion, ChefFlow owns approval/publishing

8. VR/MR source drift
   - Evidence: `memory/project_openclaw_vr_spatial_dashboard.md:14`, `memory/project_openclaw_vr_spatial_dashboard.md:140`
   - Status: `blocked`
   - Lane: `host-owned`
   - Next action: reconcile Pi-side source before feature work

9. Ingredient pricing coverage risk
   - Evidence: `docs/archive/session-log-archive.md:803`
   - Status: `needs_triage`
   - Lane: `bridge-owned`
   - Next action: tie OpenClaw health/provenance to costing confidence

10. MemPalace live query failure

- Evidence: `obsidian_export/live_pipeline_report.md:55`, `obsidian_export/live_pipeline_report.md:171`
- Status: `blocked`
- Lane: `docs-owned`
- Next action: source-backed continuity index remains required until vector path is repaired

## Report Requirements

`docs/research/work-continuity-index.md` must render:

- summary counts by category, lane, and status
- "Start Here" section with the canonical next action
- built-unverified queue
- blocked work
- buried decisions
- OpenClaw/ChefFlow bridge gaps
- stale or contradictory handoff pointers
- source coverage and warnings

The report must not invent status from filenames alone. If status is inferred, label it `needs_triage`.

## Implementation Notes

- Use Node/TypeScript-compatible parsing. Avoid adding heavy dependencies.
- Prefer regex parsing against headings and bullets for the first version.
- Keep the parser deterministic and conservative.
- Unknown or ambiguous items should be included as `needs_triage` instead of silently dropped.
- Generated files should be stable-sorted by category, lane, status, title.
- The script should be safe to run repeatedly.

## Verification

Run:

```bash
node scripts/generate-work-continuity-index.mjs
node --test --import tsx tests/unit/work-continuity-index.test.ts
npm run typecheck
```

If repo-wide typecheck is blocked by unrelated dirty-checkout issues, run the narrow temp-config typecheck pattern already used elsewhere in the repo and document the blocker in the final response.

## Acceptance Criteria

- `reports/work-continuity-index.json` exists and includes at least the 10 required seed items.
- `docs/research/work-continuity-index.md` exists and cites each seed item's source paths.
- The generated report has exactly one "Start Here" recommendation.
- The generator exits non-zero only for parser/runtime failures, not for missing optional source files.
- Unit tests cover:
  - session-log item extraction
  - built-spec queue extraction
  - lane/status normalization
  - missing source warning behavior
  - stable output ordering
- No product workflow behavior changes.

## Handoff Output For Next Session

After implementation, append a session-log entry that states:

- number of indexed work items
- number by status
- current "Start Here" recommendation
- verification commands run
- any source files missing or parse-skipped
