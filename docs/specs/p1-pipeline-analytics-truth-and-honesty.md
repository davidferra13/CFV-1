# Spec: Pipeline Analytics Truth and Honesty

> **Status:** ready
> **Priority:** P1
> **Depends on:** `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`
> **Estimated complexity:** medium (5-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Claimed (in-progress) |                      |                 |        |
| Spike completed       |                      |                 |        |
| Pre-flight passed     |                      |                 |        |
| Build completed       |                      |                 |        |
| Type check passed     |                      |                 |        |
| Build check passed    |                      |                 |        |
| Playwright verified   |                      |                 |        |
| Status: verified      |                      |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- Ground truth vs claims: identify what the system appears intended to do, what it actually does right now, and where those diverge.
- Explicitly identify false completion: happy-path-only systems, features without error handling or recovery, and systems without real state tracking.
- Coverage validation: if a core system cannot start, progress, complete, recover, and be observed, it is incomplete.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.

### Developer Intent

- **Core goal:** make the pipeline section of Analytics Hub tell the truth by replacing stale deferred zeros with real calculations where the schema supports them and honest degraded-state messaging where it does not.
- **Key constraints:** do not widen this into a broad analytics rewrite, do not change route ownership that belongs to the analytics surface-ownership spec, and do not keep rendering fake zeros as if they were business truth.
- **Motivation:** the pipeline tab is already operator-facing, so zeroed ghost rate, lead time, decline reasons, and negotiation metrics are not harmless placeholders anymore.
- **Success from the developer's perspective:** the pipeline tab either shows real numbers from the current schema or clearly says which metric is unavailable and why. It must never silently imply "0" when the real state is "not computed."

---

## What This Does (Plain English)

This spec finishes the truth layer for pipeline analytics. After it is built, the Analytics Hub pipeline tab will stop claiming that several metrics are deferred because of missing schema that already exists, and the page will stop silently substituting zero-value fallback objects where the fetch actually failed.

---

## Why It Matters

Analytics is only valuable if it is honest. A visible operator metric that silently returns zero is worse than an empty state because it looks authoritative while hiding that the system never computed the value.

---

## Current State (What Already Exists)

### Verified live pipeline surface

- `/analytics` already loads the pipeline tab.
- The tab renders ghost rate, lead time, sales cycle, negotiation rate, average discount, response time, and decline reasons.

### Verified false-complete logic

- `getGhostRateStats()` still says `ghost_at` is missing and returns `avgDaysToGhost: 0`, even though `inquiries.ghost_at` exists in the schema.
- `getDeclineReasonStats()` still returns empty data while claiming `decline_reason` is missing, even though the schema has `inquiries.decline_reason`.
- `getNegotiationStats()` still returns zero data while claiming `quotes.negotiation_occurred` and `quotes.original_quoted_cents` are missing, even though both exist in the schema.
- `getLeadTimeStats()` still hard-codes `avgLeadTimeDays: 0` and empty buckets.
- `app/(chef)/analytics/page.tsx` currently uses `Promise.allSettled` and substitutes zero-value fallbacks, which means fetch failures are displayed as real zero metrics.

---

## Files to Create

None.

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/analytics/pipeline-analytics.ts`                                      | Replace stale deferred-zero logic with real calculations for ghost rate, decline reasons, negotiation stats, and any lead-time components supported by the current schema.      |
| `app/(chef)/analytics/page.tsx`                                            | Stop silently converting pipeline-fetch failures into believable zero data; pass degraded-state metadata into the analytics client for the pipeline tab.                        |
| `components/analytics/analytics-hub-client.tsx`                            | Render an explicit degraded/unavailable state for pipeline metrics when the page reports a pipeline fetch failure or incomplete metric instead of silently implying real zeros. |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Reference this spec as the false-complete pipeline analytics lane after route ownership is handled.                                                                             |
| `docs/app-complete-audit.md`                                               | Update analytics notes so the audit reflects the repaired truth model once this lands.                                                                                          |

Optional if the builder needs a helper type:

| File                                                       | What to Change                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/analytics/types.ts` or the local analytics prop types | Add explicit pipeline availability metadata if the existing prop surface is too implicit. |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- This slice should use the current schema as-is.
- Do not open a migration just because old comments still say the columns are missing.

---

## Data Model

### Supported current schema

- `inquiries.ghost_at`
- `inquiries.decline_reason`
- `quotes.negotiation_occurred`
- `quotes.original_quoted_cents`

### Metric truth rules

- Ghost rate may still define "ghosted" however the current product uses inquiry expiry, but if `ghost_at` exists the code must use it for the average-days-to-ghost calculation instead of hard-coding zero.
- Decline reasons must aggregate the current `decline_reason` values already constrained in schema.
- Negotiation stats must use `negotiation_occurred` and `original_quoted_cents` to compute rate and average discount values.
- Lead time may remain partially degraded if the current event-side data needed for one sub-metric truly does not exist, but the UI must mark that state as unavailable instead of silently showing authoritative zeros.

### Required invariants

- No pipeline metric may return a fake business zero when the real state is "query failed" or "not computable."
- If a metric is partially supported, the supported portion may render while the unavailable portion is labeled explicitly.

---

## Server Actions

No new server actions are required.

| Function                            | Auth            | Input | Output        | Side Effects |
| ----------------------------------- | --------------- | ----- | ------------- | ------------ |
| existing pipeline analytics helpers | `requireChef()` | none  | stats objects | none         |

Builder note:

- Keep this slice inside the existing analytics helper layer.
- Do not add persistence or background jobs just to compute these metrics.

---

## UI / Component Spec

### Page Layout

- `/analytics` keeps the current tab structure.
- The pipeline tab remains a reporting surface, not a new workflow.
- Add a visible degraded-state banner or inline notice inside the pipeline tab when any pipeline metric failed to compute.

### States

- **Loading:** unchanged.
- **Empty:** if there is truly no pipeline data yet, render honest zero-ish empty states that read as "no activity yet," not "metric failed."
- **Error:** if a pipeline helper rejects or a sub-metric is unavailable, show explicit copy such as "Unavailable" or "Could not compute from current data," not believable zeros.
- **Populated:** render real computed stats with the existing cards/charts.

### Interactions

- Switching to the pipeline tab still works the same way.
- If decline reasons are available, render the chart/list.
- If decline reasons are unavailable because there are no declined inquiries, show an honest empty state.
- If a helper fails, the pipeline tab stays usable and explains which portion degraded.

---

## Edge Cases and Error Handling

| Scenario                                                          | Correct Behavior                                                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| There are zero declined inquiries                                 | Show an honest empty state for decline reasons, not an error.                                                                         |
| There are inquiries but none have `ghost_at` set yet              | Compute the rate from the current business rule, but do not invent average days to ghost. Mark that sub-metric unavailable if needed. |
| There are negotiated quotes but some lack `original_quoted_cents` | Compute what is safe and explicitly mark discount averages unavailable if the baseline amount is missing.                             |
| The pipeline helper throws                                        | The pipeline tab renders a degraded-state banner and does not silently substitute a full believable stat object.                      |
| Lead-time calculation is only partially supported                 | Render the supported portions and label the unsupported portion clearly.                                                              |

---

## Verification Steps

1. Sign in as a chef user with pipeline data.
2. Open `/analytics?tab=pipeline`.
3. Verify: ghost rate, decline reasons, and negotiation stats are no longer hard-coded deferred zeros when backing data exists.
4. Verify: if the dataset contains declined inquiries, decline reasons render with counts.
5. Verify: if negotiated quotes exist, negotiation rate and discount metrics render from real data.
6. Temporarily force one pipeline helper failure in a local test harness or by mocking the helper.
7. Verify: the pipeline tab shows an explicit degraded/unavailable state rather than silently rendering zero cards.
8. Refresh and confirm the page remains stable with no console/runtime errors.

---

## Out of Scope

- Analytics route ownership and nav truth beyond the existing dependency spec.
- Rewriting the whole analytics stack.
- Adding new warehouse/reporting infrastructure.
- Re-defining product-level business semantics beyond what the current schema and existing copy already imply.

---

## Notes for Builder Agent

- Start by reading `docs/specs/p1-analytics-surface-ownership-and-route-truth.md` because both specs touch the same analytics surface.
- Be careful to distinguish "real zero" from "unavailable."
- Delete stale "column missing" comments if the schema already proves otherwise.
- If a lead-time sub-metric truly remains impossible, preserve honesty over completeness.
