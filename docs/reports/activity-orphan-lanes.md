# Activity Orphan Lanes

- Date: 2026-05-01
- Scope: duplicate Client Activity Timeline prune proof
- Owned files: `components/activity/client-activity-timeline.tsx`, `docs/reports/activity-orphan-lanes.md`, `docs/reports/prune-candidate-register.md`
- Decision: prune duplicate

## Candidate

`components/activity/client-activity-timeline.tsx` exported `ClientActivityTimeline`, a merged chef and client activity widget.

## Current Reachability Proof

Commands run on branch `feature/v1-builder-runtime-scaffold`:

```text
rg -n --hidden --glob '!node_modules/**' --glob '!*.map' --glob '!*.lock' "ClientActivityTimeline" app components lib tests scripts docs
```

Result: only the candidate file declared `ClientActivityTimeline`. No app, component, lib, test, script, or doc caller imported or rendered it.

```text
rg -n --hidden --glob '!node_modules/**' --glob '!*.map' --glob '!*.lock' "client-activity-timeline" app components lib tests scripts docs
```

Result: only historical docs and reports mention the file path. No live import path exists in `app`, `components`, `lib`, `tests`, or `scripts`.

## Canonical Owners

`ClientActivityFeed` owns the client activity feed surface on `/activity`:

- `app/(chef)/activity/activity-page-client.tsx` imports `ClientActivityFeed` from `@/components/activity/client-activity-feed`.
- `app/(chef)/activity/activity-page-client.tsx` renders `<ClientActivityFeed events={clientActivity} />`.
- `app/(chef)/activity/page.tsx` loads client activity with `getRecentClientActivity` and passes the result into `ActivityPageClient`.

The unified client timeline owns the single-client relationship timeline:

- `app/(chef)/clients/[id]/page.tsx` imports `getUnifiedClientTimeline` from `@/lib/clients/unified-timeline`.
- `app/(chef)/clients/[id]/page.tsx` imports `UnifiedClientTimeline` from `@/components/clients/unified-client-timeline`.
- `app/(chef)/clients/[id]/page.tsx` loads `unifiedTimeline` with `getUnifiedClientTimeline(params.id)`.
- `app/(chef)/clients/[id]/page.tsx` renders `<UnifiedClientTimeline items={unifiedTimeline} unavailable={unifiedTimelineUnavailable} />`.

## Evidence Classification

- `current-dirty`: `git status --short` showed many unrelated dirty files owned by other agents. None were in the owned paths at task start.
- `heuristic-signal`: `rg` static reachability found no live refs to the candidate symbol or path across the requested roots.
- `current-dirty`: canonical owner proof comes from current source files in `app`, `components`, and `lib`.
- `report-artifact`: older docs already classified the candidate as orphaned or duplicate, but deletion is based on the current proof above.

## Decision

Delete `components/activity/client-activity-timeline.tsx`.

Reason: the module fails the deletion test. Removing it does not push required behavior into callers because no caller exists, and the active client activity behavior is already owned by `ClientActivityFeed` and the unified client timeline.

## Residual Risk

Historical docs still mention the deleted path. They are audit artifacts or old specs, not live callers. They were left untouched because this task only owns this report and the prune register.
