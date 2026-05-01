# Prune Candidate Register

- Date: 2026-05-01
- Scope: first-pass code reachability and route discoverability candidates
- Rule: no product deletion is authorized by this register alone

## Decision Classes

| Class | Meaning | Deletion allowed now |
| --- | --- | --- |
| keep | Fresh evidence proves production use or critical contract value. | No |
| recover | Code or route appears valuable but poorly wired or hidden. | No |
| duplicate | Two modules appear to own similar behavior. Pick a canonical module first. | No |
| test-only | Referenced by tests but not production. Decide whether it protects a contract. | No |
| tool-only | Referenced by scripts but not production. Decide whether it supports operations. | No |
| uncertain | Evidence is incomplete or external activation is possible. | No |
| prune-candidate | No caller found and no recovery value proven yet. Needs focused deletion proof. | Not yet |

## Register

| Candidate | Class | Proof | Risk | Next action |
| --- | --- | --- | --- | --- |
| `lib/events/fsm.ts` | keep | Imported by `app/api/v2/events/[id]/transition/route.ts`, `lib/events/transitions.ts`, and `lib/events/readiness.ts`; covered by `tests/unit/events.fsm.test.ts`. | High, event FSM is core V1 Spine behavior. | Remove old stale claim that this is test-only from future cleanup assumptions. |
| `hooks/use-field-validation.ts` and `lib/validation/use-field-validation.ts` | resolved | Both defined `useFieldValidation`; no production, test, or script imports found in targeted search. | Medium, future forms could choose the wrong interface. | Completed 2026-05-01: deleted `hooks/use-field-validation.ts`; kept `lib/validation/use-field-validation.ts` as canonical. |
| `lib/ai/menu-suggestions.ts` | resolved | Static graph reported no inbound callers; targeted search found only self string and privacy audit mention. | High, stale AI menu interfaces can violate product rules if reconnected. | Completed 2026-05-01: deleted unused compatibility wrapper; kept `lib/menus/recipe-book-suggestions-actions.ts` as canonical read-only recipe-book interface. |
| `components/ai/remy-public-widget.tsx` | uncertain | Static graph reports no inbound callers. | High, Remy public surfaces may be externally embedded or route-owned. | Compare against public Remy API routes and current public page widgets before deciding. |
| `components/admin/admin-sidebar.tsx` | duplicate-or-prune-candidate | Static graph reports no inbound callers. | High, admin shell is a control-plane trust boundary. | Verify `app/(admin)/layout.tsx` and admin navigation owner before cleanup. |
| `components/activity/client-activity-timeline.tsx` | recover-or-prune-candidate | Static graph reports no inbound callers. | Medium, client memory is part of the V1 Spine. | Check client detail and activity routes for a missing timeline surface. |
| `components/dashboard/*` orphan bucket | uncertain | 31 component files in dashboard bucket have no production inbound references in static graph. | Medium, dashboard is the chef command plane. | Cluster by feature, then classify as dashboard widget recoveries or stale duplicates. |
| `components/events/*` orphan bucket | uncertain | 27 component files in events bucket have no production inbound references in static graph. | High, event workflow owns proposal, payment, prep, service, and follow-up. | Do not delete as a batch. Classify by event lifecycle stage. |
| `components/finance/*` orphan bucket | uncertain | 22 component files in finance bucket have no production inbound references in static graph. | High, money surfaces can hide ledger or quote behavior. | Check ledger, quote, payment, and reporting flows before any pruning. |
| `components/ui/*` orphan bucket | uncertain | 21 component files in UI bucket have no production inbound references in static graph. | Low to medium, but shared UI can be dynamically imported or retained for design system consistency. | Check barrel exports, string registries, Storybook-like references, and replacement modules. |
| `lib/activity/activity-load-state.ts` | test-only | Referenced by `tests/unit/activity-load-state.test.ts`, not production graph. | Low to medium, may protect loading-state contract. | Keep unless activity load-state contract is obsolete. |
| `lib/ai/dispatch/index.ts` | tool-only | Referenced by `scripts/migrate-to-dispatch.ts`, not production graph. | Medium, AI routing migration tool may be historical. | Decide whether the migration script remains useful. |
| `lib/auth/google-oauth-errors.ts` | test-only | Referenced by `tests/unit/google-oauth-errors.test.ts`, not production graph. | Medium, auth error policy can be contract-only. | Keep if tests protect active OAuth UX. |
| `lib/auth/website-signup.ts` | test-only | Referenced by `tests/unit/website-signup.test.ts`, not production graph. | Medium, public signup may use newer code. | Check signup route owner before cleanup. |
| `lib/interface/surface-completeness.ts` | tool-only | Referenced by `scripts/audit-surface-completeness.ts` and unit tests. | Low, audit tooling can be intentionally non-production. | Keep as tool module unless audit surface is retired. |
| `lib/openclaw/food-promotion.ts` | tool-only | Referenced by `scripts/openclaw-promote-foods.ts` and unit tests. | Medium, internal data pipeline tool. | Keep or move under tooling only after pipeline owner review. |
| Chef route nav gaps | recover | 42 implemented non-placeholder static chef routes are missing from nav. | Medium to high, hidden features can be more valuable than dead code. | Fix discoverability through canonical route ownership before deleting route-adjacent modules. |
| Staff route cluster | recover | 8 static staff routes exist with no manual coverage routes recorded. | Medium, staff surface may be real but under-covered. | Decide staff route ownership and add coverage or nav entrypoints. |
| Partner route cluster | recover | 5 static partner routes and 1 dynamic route exist with no manual coverage routes recorded. | Medium, partner surface may be under-owned. | Decide partner route ownership and coverage before pruning related code. |

## Current Prune Permission

No product code is cleared for deletion yet.

The first cleanup pass resolved the two narrowest stale modules: the duplicate root form-validation hook and the unused AI menu suggestion compatibility wrapper.

## Next Safe Cleanup Sequence

1. Review admin shell ownership before touching `components/admin/admin-sidebar.tsx`.
2. Review client activity ownership before touching `components/activity/client-activity-timeline.tsx`.
3. Cluster the dashboard orphan bucket into recover, duplicate, and prune candidates.
4. Convert route discoverability gaps into recover tickets, not prune tickets.
